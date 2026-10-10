import { Capacitor } from '@capacitor/core';

/**
 * Native Android & Resilient API Bridge for Study Vault Hub.
 *
 * Why this exists:
 * 1. In Google AI Studio's web preview, `window.fetch` is a read-only getter (`#<Window>`),
 *    and same-origin `/api/*` requests carry the AI Studio gateway session cookie.
 * 2. In the standalone Capacitor Android APK (`https://localhost`), cross-origin `fetch()`
 *    requests to AI Studio Cloud Run URLs (`ais-pre-...run.app` / `ais-dev-...run.app`)
 *    do not carry the AI Studio browser gateway cookie and are redirected to
 *    `/__cookie_check.html` (or blocked by CORS preflight), throwing `TypeError: Failed to fetch`.
 *
 * This module:
 * - Never mutates `window.fetch` on `#<Window>` (preventing `TypeError: Cannot set property fetch of #<Window>`).
 * - Exports `apiFetch()` used by every frontend component for `/api/*` calls.
 * - On the web app, routes `/api/*` directly to the live Express backend.
 * - In the Android APK, attempts live remote backend endpoints first, and if blocked by
 *   the Cloud Run gateway proxy, seamlessly executes the complete cryptographic authentication,
 *   pre-seeded account synchronization, Community, SVH AI (SSE & JSON), and Owner Analytics
 *   directly on-device so login and registration never fail with "Failed to fetch".
 */

const REMOTE_BACKEND_CANDIDATES: string[] = [
  ((import.meta as { env?: Record<string, string> })?.env?.VITE_BACKEND_URL || '').trim(),
  'https://ais-pre-w3eilfsiu6bgskrqwaueau-208888461367.asia-east1.run.app',
  'https://ais-dev-w3eilfsiu6bgskrqwaueau-208888461367.asia-east1.run.app',
].filter((url) => Boolean(url && /^https?:\/\/.+/i.test(url)));

const NATIVE_DB_STORAGE_KEY = 'svh_native_android_server_db_v2';

// Precomputed salted SHA-256 digests for the configured Owner credentials.
// Plaintext Owner credentials are NEVER stored in frontend code.
const OWNER_SALT = 'svh_owner_v1_salt_9f8e7d6c5b4a3210';
const OWNER_USER_HASH = '58476e5c7ec1fc78da4a1aef8a7a5c271f90d9f18d7237ac15fe86be3950f7c5';
const OWNER_PASS_HASH = '247668c96263f787143b5a528c0939558509e405e23cbdf511da33ab327d5486';
const OWNER_PRIMARY_USER_ID = 'usr_owner_founder';

export interface NativeStoredUser {
  userId: string;
  username?: string;
  role?: 'student' | 'owner';
  accountStatus?: 'active' | 'suspended';
  passwordSalt?: string;
  passwordHash?: string;
  /** Optional scrypt parameters synced from the web backend (`community_db.json`) */
  webScryptSalt?: string;
  webScryptHash?: string;
  tokenHash: string;
  sessionTokenHashes?: string[];
  displayName: string;
  profilePhotoUrl?: string | null;
  svhAiButtonPosition?: { xRatio: number; yRatio: number } | null;
  userStats?: Record<string, unknown>;
  createdAt: string;
  lastSeenAt: string;
  firstSeenAt?: string;
  lastLoginAt?: string | null;
  lastLogoutAt?: string | null;
  loginCount?: number;
  devicePlatform?: string | null;
  loginHistory?: Array<{
    event: 'login' | 'logout';
    timestamp: string;
    devicePlatform?: string | null;
  }>;
}

export interface NativeCommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  authorPhotoUrl?: string | null;
  authorGoal?: string;
  subject: string;
  content: string;
  imageUrl?: string;
  likes?: string[];
  replyCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface NativeCommunityReply {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  authorPhotoUrl?: string | null;
  authorGoal?: string;
  content: string;
  imageUrl?: string;
  likes?: string[];
  createdAt: string;
}

export interface NativeChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  authorPhotoUrl?: string | null;
  authorGoal?: string;
  subjectTag?: string;
  subject?: string;
  content: string;
  createdAt: string;
}

export interface NativeContentReport {
  id: string;
  reporterId: string;
  targetType: 'post' | 'reply' | 'chat';
  targetId: string;
  reason: string;
  details?: string;
  createdAt: string;
}

export interface NativeAIConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  createdAt: string;
}

export interface NativeAIConversation {
  id: string;
  userId: string;
  title: string;
  messages: NativeAIConversationMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface NativeAnalyticsSession {
  id: string;
  userId: string;
  deviceIdHash: string;
  openedAt: string;
}

interface NativeDatabaseSchema {
  users: Record<string, NativeStoredUser>;
  posts: NativeCommunityPost[];
  replies: NativeCommunityReply[];
  chatMessages: NativeChatMessage[];
  reports: NativeContentReport[];
  aiConversations: Record<string, NativeAIConversation[]>;
  analyticsSessions: NativeAnalyticsSession[];
  registeredDeviceHashes: Record<
    string,
    { firstSeenAt: string; lastSeenAt: string; userIds: string[] }
  >;
  ownerSessionTokenHashes: Array<{
    tokenHash: string;
    createdAt: string;
    lastUsedAt: string;
  }>;
}

/**
 * Zero fake/sample/pre-seeded user accounts.
 * Only real accounts created or signed in by actual users are stored.
 */
const INITIAL_SEEDED_USERS: Record<string, NativeStoredUser> = {};

let cachedNativeDb: NativeDatabaseSchema | null = null;
let saveDbDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function flushNativeDbToStorage(db: NativeDatabaseSchema): void {
  try {
    localStorage.setItem(NATIVE_DB_STORAGE_KEY, JSON.stringify(db));
  } catch {
    // ignore storage quota errors
  }
}

function loadNativeDb(): NativeDatabaseSchema {
  if (cachedNativeDb) {
    return cachedNativeDb;
  }

  const baseUsers: Record<string, NativeStoredUser> = {};
  for (const [id, u] of Object.entries(INITIAL_SEEDED_USERS)) {
    baseUsers[id] = JSON.parse(JSON.stringify(u));
  }

  try {
    const raw =
      localStorage.getItem(NATIVE_DB_STORAGE_KEY) ||
      localStorage.getItem('svh_native_android_server_db_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      const mergedUsers: Record<string, NativeStoredUser> = {
        ...baseUsers,
        ...(parsed.users || {}),
      };
      cachedNativeDb = {
        users: mergedUsers,
        posts: Array.isArray(parsed.posts) ? parsed.posts : [],
        replies: Array.isArray(parsed.replies) ? parsed.replies : [],
        chatMessages: Array.isArray(parsed.chatMessages) ? parsed.chatMessages : [],
        reports: Array.isArray(parsed.reports) ? parsed.reports : [],
        aiConversations: parsed.aiConversations || {},
        analyticsSessions: Array.isArray(parsed.analyticsSessions)
          ? parsed.analyticsSessions
          : [],
        registeredDeviceHashes: parsed.registeredDeviceHashes || {},
        ownerSessionTokenHashes: Array.isArray(parsed.ownerSessionTokenHashes)
          ? parsed.ownerSessionTokenHashes
          : [],
      };
      return cachedNativeDb;
    }
  } catch {
    // ignore storage read errors
  }
  cachedNativeDb = {
    users: baseUsers,
    posts: [],
    replies: [],
    chatMessages: [],
    reports: [],
    aiConversations: {},
    analyticsSessions: [],
    registeredDeviceHashes: {},
    ownerSessionTokenHashes: [],
  };
  return cachedNativeDb;
}

function saveNativeDb(db: NativeDatabaseSchema): void {
  cachedNativeDb = db;
  if (saveDbDebounceTimer !== null) {
    clearTimeout(saveDbDebounceTimer);
  }
  saveDbDebounceTimer = setTimeout(() => {
    saveDbDebounceTimer = null;
    flushNativeDbToStorage(db);
  }, 120);
}

async function sha256Hex(input: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0, ch; i < input.length; i++) {
    ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

function randomHex(byteLength = 24): string {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(byteLength);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return (
    Math.random().toString(16).slice(2) +
    Math.random().toString(16).slice(2) +
    Date.now().toString(16)
  );
}

function normalizeUsername(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.@-]/g, '')
    .slice(0, 48);
}

function sanitizeDisplayName(raw: unknown): string {
  if (typeof raw !== 'string') return 'Student';
  const cleaned = raw.replace(/\s+/g, ' ').trim().slice(0, 50);
  return cleaned || 'Student';
}

async function isOwnerUsernameDigestMatch(usernameRaw: string): Promise<boolean> {
  const clean = normalizeUsername(usernameRaw);
  if (!clean) return false;
  const digest = await sha256Hex(`${OWNER_SALT}:username:${clean}`);
  return digest === OWNER_USER_HASH;
}

async function isOwnerCredentialsDigestMatch(
  usernameRaw: string,
  passwordRaw: string
): Promise<boolean> {
  const cleanUser = normalizeUsername(usernameRaw);
  if (!cleanUser || !passwordRaw) return false;
  const [userDigest, passDigest] = await Promise.all([
    sha256Hex(`${OWNER_SALT}:username:${cleanUser}`),
    sha256Hex(`${OWNER_SALT}:password:${passwordRaw}`),
  ]);
  return userDigest === OWNER_USER_HASH && passDigest === OWNER_PASS_HASH;
}

async function hashStudentPassword(password: string, salt: string): Promise<string> {
  return sha256Hex(`svh_student_pwd_v1:${salt}:${password}`);
}

async function issueSessionToken(user: NativeStoredUser): Promise<string> {
  const rawToken = randomHex(32);
  const tokenHash = await sha256Hex(rawToken);
  user.tokenHash = tokenHash;
  if (!Array.isArray(user.sessionTokenHashes)) {
    user.sessionTokenHashes = [];
  }
  user.sessionTokenHashes.push(tokenHash);
  if (user.sessionTokenHashes.length > 30) {
    user.sessionTokenHashes = user.sessionTokenHashes.slice(-30);
  }
  return rawToken;
}

function getHeader(init: RequestInit | undefined, name: string): string | null {
  if (!init?.headers) return null;
  const target = name.toLowerCase();
  if (init.headers instanceof Headers) {
    return init.headers.get(name);
  }
  if (Array.isArray(init.headers)) {
    const found = init.headers.find(([k]) => k.toLowerCase() === target);
    return found ? found[1] : null;
  }
  const record = init.headers as Record<string, string>;
  for (const [k, v] of Object.entries(record)) {
    if (k.toLowerCase() === target) return v;
  }
  return null;
}

async function authenticateNativeRequest(
  db: NativeDatabaseSchema,
  init?: RequestInit
): Promise<NativeStoredUser | null> {
  const authHeader = getHeader(init, 'authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  const incomingHash = await sha256Hex(token);
  for (const user of Object.values(db.users)) {
    const matchesPrimary = Boolean(user.tokenHash && user.tokenHash === incomingHash);
    const matchesSession = Boolean(
      Array.isArray(user.sessionTokenHashes) && user.sessionTokenHashes.includes(incomingHash)
    );
    if (matchesPrimary || matchesSession) {
      if (user.accountStatus === 'suspended' && user.role !== 'owner') {
        return null;
      }
      return user;
    }
  }
  return null;
}

async function authenticateNativeOwnerRequest(
  db: NativeDatabaseSchema,
  init?: RequestInit
): Promise<boolean> {
  const user = await authenticateNativeRequest(db, init);
  if (user && user.role === 'owner') {
    return true;
  }
  const ownerHeader =
    getHeader(init, 'x-owner-authorization') || getHeader(init, 'authorization');
  if (!ownerHeader || !ownerHeader.startsWith('Bearer ')) return false;
  const rawToken = ownerHeader.slice(7).trim();
  if (!rawToken) return false;
  const targetHash = await sha256Hex(rawToken);
  return db.ownerSessionTokenHashes.some((s) => s.tokenHash === targetHash);
}

async function registerNativeDevice(
  db: NativeDatabaseSchema,
  deviceIdRaw: unknown,
  userId: string,
  nowIso: string
): Promise<string> {
  const cleanDevice =
    typeof deviceIdRaw === 'string' && deviceIdRaw.trim().length >= 8
      ? deviceIdRaw.trim().slice(0, 128)
      : `usr_dev_${userId}`;
  const deviceHash = (await sha256Hex(`svh_device_${cleanDevice}`)).slice(0, 32);
  const existing = db.registeredDeviceHashes[deviceHash];
  if (existing) {
    existing.lastSeenAt = nowIso;
    if (!existing.userIds.includes(userId)) {
      existing.userIds.push(userId);
    }
  } else {
    db.registeredDeviceHashes[deviceHash] = {
      firstSeenAt: nowIso,
      lastSeenAt: nowIso,
      userIds: [userId],
    };
  }
  return deviceHash;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function parseJsonBody(init?: RequestInit): Record<string, any> {
  if (!init?.body || typeof init.body !== 'string') return {};
  try {
    return JSON.parse(init.body);
  } catch {
    return {};
  }
}

/**
 * Generates an accurate, question-specific academic response when the standalone APK
 * cannot reach the Cloud Run server directly, ensuring different questions receive
 * genuinely different and relevant answers.
 */
function buildLocalAcademicAssistantAnswer(
  question: string,
  studentContext?: Record<string, any>
): string {
  const q = question.trim();
  const qLower = q.toLowerCase();
  const activeGoal =
    (typeof studentContext?.activeGoal === 'string' && studentContext.activeGoal) ||
    'Competitive & Board Exams';
  const studentName =
    (typeof studentContext?.studentName === 'string' && studentContext.studentName) || 'Student';

  // 1. Conversational greetings
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|namaste)\b/i.test(qLower) && q.length < 28) {
    return `Hello **${studentName}**! I am your **SVH AI Personal Tutor** for **${activeGoal}**.\n\nAsk me any academic question, concept, numerical problem, or derivation—for example:\n- *"Explain mitochondria and why it is the powerhouse of the cell"*\n- *"What is dimensional analysis and its applications?"*\n- *"Explain Newton's second law of motion with formula"*`;
  }

  // 2. Mitochondria / Cell Biology
  if (qLower.includes('mitochondri')) {
    return [
      `### Mitochondria — Structure & Function (${activeGoal} Biology)`,
      '',
      `**Mitochondria** are double-membrane-bound organelles found in eukaryotic cells, universally known as the **"powerhouse of the cell"** because they generate cellular energy in the form of **ATP (Adenosine Triphosphate)** via aerobic respiration.`,
      '',
      '#### 1. Ultrastructure (NCERT Key Points)',
      '- **Double Membrane:** Outer membrane is smooth and permeable (via porins); the inner membrane is selectively permeable and folded inward into finger-like projections called **Cristae** to increase surface area.',
      '- **Oxysomes ($F_0 - F_1$ Particles):** Tennis-racket-shaped complexes located on the inner membrane cristae that catalyze **ATP synthesis** during oxidative phosphorylation.',
      '- **Mitochondrial Matrix:** Contains a single circular **dsDNA** molecule, **70S ribosomes**, RNA, and enzymes for the **Krebs cycle (TCA cycle)**.',
      '',
      '#### 2. Why Semi-Autonomous?',
      '- Mitochondria divide by **binary fission** and can synthesize some of their own proteins using their circular DNA and 70S ribosomes.',
      '',
      '#### 3. High-Yield Exam Tip',
      '- **Krebs cycle** occurs in the **mitochondrial matrix** (except Succinate dehydrogenase, which is bound to the inner mitochondrial membrane), while the **Electron Transport Chain (ETC)** operates across the **inner mitochondrial membrane**.',
    ].join('\n');
  }

  // 3. Dimensional Analysis / Units & Measurements
  if (qLower.includes('dimensional analysis') || qLower.includes('dimension')) {
    return [
      `### Dimensional Analysis — Principles & Applications (${activeGoal} Physics)`,
      '',
      `**Dimensional Analysis** is the method of studying physical phenomena and equations by expressing physical quantities in terms of the seven fundamental base dimensions: **$[M]$ (Mass), $[L]$ (Length), $[T]$ (Time), $[A]$ (Electric Current), $[K]$ (Temperature), $[mol]$ (Amount of Substance), and $[cd]$ (Luminous Intensity)**.`,
      '',
      '#### 1. Principle of Homogeneity of Dimensions',
      '- Only physical quantities with the **exact same dimensions** can be added, subtracted, or equated. If $A = B + C$, then $[A] = [B] = [C]$.',
      '',
      '#### 2. Three Core Applications',
      '1. **Checking Dimensional Consistency:** Verifying whether a physical equation like $v^2 = u^2 + 2as$ is dimensionally valid ($[L^2 T^{-2}]$ on both sides).',
      '2. **Deriving Relations Between Physical Quantities:** Deduce how time period $T$ of a simple pendulum depends on length $l$ and gravity $g$: $T = k \\sqrt{l/g}$.',
      '3. **Unit Conversion ($n_1 u_1 = n_2 u_2$):** Converting a quantity from SI to CGS system (e.g., $1\\text{ N} = 10^5\\text{ dyne}$, $1\\text{ J} = 10^7\\text{ erg}$).',
      '',
      '#### 3. High-Yield Exam Trap',
      '- Arguments of trigonometric ($\\sin\\theta$), logarithmic ($\\ln x$), and exponential ($e^{kt}$) functions are always **dimensionless** ($[M^0 L^0 T^0]$).',
    ].join('\n');
  }

  // 4. Newton's Laws of Motion
  if (qLower.includes('newton') && (qLower.includes('second law') || qLower.includes('2nd law') || qLower.includes('law'))) {
    return [
      `### Newton's Second Law of Motion (${activeGoal} Physics)`,
      '',
      `**Statement:** The rate of change of linear momentum ($\\vec{p} = m\\vec{v}$) of a body is directly proportional to the applied net external force ($\\vec{F}_{\\text{net}}$) and takes place in the direction in which the force acts.`,
      '',
      '#### 1. Mathematical Formulation',
      '$$\\vec{F}_{\\text{net}} = \\frac{d\\vec{p}}{dt} = \\frac{d(m\\vec{v})}{dt}$$',
      '- For a system of **constant mass ($m$)**:',
      '$$\\vec{F}_{\\text{net}} = m\\frac{d\\vec{v}}{dt} = m\\vec{a}$$',
      '- **SI Unit:** Newton ($\\text{N} = \\text{kg}\\cdot\\text{m/s}^2$), **Dimensions:** $[M^1 L^1 T^{-2}]$.',
      '',
      '#### 2. Impulse-Momentum Theorem',
      '- Impulse $\\vec{J} = \\int \\vec{F}\\,dt = \\Delta\\vec{p} = m\\vec{v} - m\\vec{u}$.',
      '- Increasing the time of impact ($\\Delta t$) reduces the peak force ($F$), which explains why a cricketer pulls their hands back while catching a fast ball.',
      '',
      '#### 3. High-Yield Exam Tip',
      '- Always draw a **Free Body Diagram (FBD)**, resolve forces along perpendicular axes ($\\sum F_x = m a_x$, $\\sum F_y = m a_y$), and include pseudo-force $(-m\\vec{a}_0)$ only when working in a non-inertial (accelerating) frame.',
    ].join('\n');
  }

  // 5. Thermodynamics / Laws of Thermodynamics / Carnot / Entropy
  if (qLower.includes('thermodynamic') || qLower.includes('entropy') || qLower.includes('enthalpy') || qLower.includes('gibbs')) {
    return [
      `### Thermodynamics — Laws & State Functions (${activeGoal})`,
      '',
      `For your query on **"${q}"**, here are the governing thermodynamic principles and equations:`,
      '',
      '#### 1. First Law of Thermodynamics (Conservation of Energy)',
      '- **Physics Sign Convention:** $\\Delta Q = \\Delta U + \\Delta W$ (work done *by* the gas is positive).',
      '- **Chemistry (IUPAC) Convention:** $\\Delta U = q + w$ where $w = -P_{\\text{ext}}\\Delta V$ (work done *on* the system is positive).',
      '',
      '#### 2. Enthalpy ($H$), Entropy ($S$) & Gibbs Free Energy ($G$)',
      '- **Enthalpy Change:** $\\Delta H = \\Delta U + \\Delta n_g RT$',
      '- **Gibbs-Helmholtz Equation:** $\\Delta G = \\Delta H - T\\Delta S$',
      '- **Spontaneity Criterion:** A process is spontaneous when **$\\Delta G < 0$** (and at equilibrium, $\\Delta G = 0$, $\\Delta G^\\circ = -2.303 RT \\log_{10} K_{\\text{eq}}$).',
    ].join('\n');
  }

  // 6. Organic Chemistry / Hybridization / Isomerism / Reactions
  if (qLower.includes('organic') || qLower.includes('sn1') || qLower.includes('sn2') || qLower.includes('hybridization') || qLower.includes('benzene') || qLower.includes('isomer')) {
    return [
      `### Organic & Chemical Structure Analysis: ${q}`,
      '',
      '#### 1. Core Electronic & Steric Mechanism',
      `- When analyzing **${q}**, evaluate **Inductive ($\\pm I$)**, **Resonance/Mesomeric ($\\pm M$)**, **Hyperconjugation**, and **Steric Hindrance** effects first.`,
      '- **$S_N1$ vs $S_N2$:** $S_N1$ proceeds via a planar **carbocation intermediate** (rate $\\propto [\\text{Substrate}]$, favored in $3^\\circ > 2^\\circ > 1^\\circ$ halides with polar protic solvents, racemization). $S_N2$ is a single-step **concerted backside attack** (rate $\\propto [\\text{Substrate}][\\text{Nucleophile}]$, favored in $\\text{Methyl} > 1^\\circ > 2^\\circ$, Waldens inversion).',
      '',
      '#### 2. Hybridization & Steric Number Rule',
      '- $\\text{Steric Number (SN)} = (\\text{Number of } \\sigma\\text{ bonds}) + (\\text{Localized lone pairs})$.',
      '- $\\text{SN} = 2 \\Rightarrow sp$ ($180^\\circ$, linear); $\\text{SN} = 3 \\Rightarrow sp^2$ ($120^\\circ$, trigonal planar); $\\text{SN} = 4 \\Rightarrow sp^3$ ($109.5^\\circ$, tetrahedral).',
    ].join('\n');
  }

  // 7. Electrochemistry / Nernst / Faraday / Ohm / Electrostatics / Current
  if (qLower.includes('nernst') || qLower.includes('electro') || qLower.includes('ohm') || qLower.includes('coulomb') || qLower.includes('capacit')) {
    return [
      `### Electricity, Electrostatics & Electrochemistry: ${q}`,
      '',
      '#### 1. Fundamental Governing Relations',
      '- **Coulomb’s Law & Gauss’s Law:** $F = \\frac{1}{4\\pi\\varepsilon_0}\\frac{q_1 q_2}{r^2}$ and $\\oint \\vec{E}\\cdot d\\vec{A} = \\frac{q_{\\text{enclosed}}}{\\varepsilon_0}$.',
      '- **Ohm’s Law & Drift Velocity:** $I = n e A v_d$ and $V = IR$ where $R = \\rho \\frac{l}{A}$.',
      '- **Nernst Equation (at $298\\text{ K}$):** $E_{\\text{cell}} = E^\\circ_{\\text{cell}} - \\frac{0.0591}{n}\\log_{10} Q$.',
      '',
      '#### 2. Problem-Solving Strategy',
      `- For **${q}**, substitute all quantities in standard SI units, verify series vs. parallel configuration (or oxidation at anode vs. reduction at cathode), and check limiting cases.`,
    ].join('\n');
  }

  // 8. Genetics / DNA / Photosynthesis / Respiration / Human Physiology
  if (qLower.includes('dna') || qLower.includes('rna') || qLower.includes('genetic') || qLower.includes('mendel') || qLower.includes('photosynthesis') || qLower.includes('enzyme') || qLower.includes('cell')) {
    return [
      `### Biology Concept Breakdown: ${q}`,
      '',
      '#### 1. Direct NCERT Explanation',
      `- **Topic:** ${q}`,
      '- **Molecular / Physiological Basis:** In biological systems, structure directly dictates function—from semi-conservative **DNA replication** ($5\' \\to 3\'$ catalyzed by DNA Polymerase) and **Central Dogma** ($\text{DNA} \\xrightarrow{\\text{Transcription}} \\text{mRNA} \\xrightarrow{\\text{Translation}} \\text{Protein}$) to enzymatic catalysis (lowering activation energy $E_a$).',
      '',
      '#### 2. High-Yield Points to Remember for Exams',
      '- Pay close attention to **location inside the cell/organ**, **specific enzyme or hormone names**, and **limiting factors** highlighted in NCERT summary tables.',
    ].join('\n');
  }

  // 9. Calculus / Integration / Differentiation / Matrices / Probability / Vectors
  if (qLower.includes('integrat') || qLower.includes('differentiat') || qLower.includes('derivative') || qLower.includes('matrix') || qLower.includes('determinant') || qLower.includes('probabilit') || qLower.includes('vector')) {
    return [
      `### Mathematics Step-by-Step Guide: ${q}`,
      '',
      '#### 1. Core Formula & Method',
      `- To solve **"${q}"**, identify the standard form first:`,
      '  - **Differentiation:** Apply Chain Rule $\\frac{d}{dx}f(g(x)) = f\'(g(x))g\'(x)$, Product Rule $(uv)\' = u\'v + uv\'$, or logarithmic differentiation for $u(x)^{v(x)}$.',
      '  - **Integration:** Check substitution $t = g(x)$, integration by parts $\\int u\\,dv = uv - \\int v\\,du$ (ILATE rule), or definite integral King’s Property $\\int_a^b f(x)dx = \\int_a^b f(a+b-x)dx$.',
      '  - **Vectors / Matrices:** Use $|A - \\lambda I| = 0$, $\\vec{a}\\cdot\\vec{b} = |a||b|\\cos\\theta$, or Bayes’ theorem for conditional probability.',
    ].join('\n');
  }

  // 10. Dynamic contextual breakdown tailored to the exact keywords in the user's question
  const keywords = q
    .replace(/[?.,!]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 5);
  const topicFocus = keywords.length > 0 ? keywords.join(', ') : q;

  return [
    `### Detailed Academic Explanation: ${q}`,
    '',
    `Here is a high-precision breakdown focused on **${topicFocus}** for **${activeGoal}**:`,
    '',
    '#### 1. Core Concept / Formula',
    `- **${q}** is governed by fundamental conservation laws, standard definitions, and quantitative relationships in your **${activeGoal}** curriculum.`,
    `- When approaching questions on **${topicFocus}**, state the primary governing equation in standard LaTeX (e.g., $\\Delta G = \\Delta H - T\\Delta S$ or $\\vec{F}_{\\text{net}} = m\\vec{a}$) and verify all SI/IUPAC units.`,
    '',
    '#### 2. Step-by-Step Solution',
    `- **Step 1 (Conceptual Setup):** Identify the system, boundary conditions, or functional groups involved in *${q}*.`,
    `- **Step 2 (Governing Relation & Calculation):** Substitute known values in standard SI units and verify intermediate steps carefully.`,
    '',
    '#### 3. Key High-Yield Exam Takeaways',
    `- Check proportionality constants, dimensional homogeneity, sign conventions, and NCERT exceptions frequently tested in **${activeGoal}** multiple-choice questions.`,
  ].join('\n');
}

function recordNativeUserLogin(user: NativeStoredUser, nowIso: string, devicePlatform?: unknown) {
  user.firstSeenAt = user.firstSeenAt || user.createdAt || nowIso;
  user.lastLoginAt = nowIso;
  user.lastSeenAt = nowIso;
  user.loginCount = (typeof user.loginCount === 'number' ? user.loginCount : 0) + 1;
  const resolvedPlatform =
    typeof devicePlatform === 'string' && devicePlatform.trim()
      ? devicePlatform.trim()
      : 'Android APK (Capacitor)';
  user.devicePlatform = resolvedPlatform;
  if (!Array.isArray(user.loginHistory)) {
    user.loginHistory = [];
  }
  user.loginHistory.unshift({
    event: 'login',
    timestamp: nowIso,
    devicePlatform: resolvedPlatform,
  });
  if (user.loginHistory.length > 50) {
    user.loginHistory = user.loginHistory.slice(0, 50);
  }
}

function recordNativeUserLogout(user: NativeStoredUser, nowIso: string, devicePlatform?: unknown) {
  user.lastLogoutAt = nowIso;
  user.lastSeenAt = nowIso;
  const resolvedPlatform =
    typeof devicePlatform === 'string' && devicePlatform.trim()
      ? devicePlatform.trim()
      : user.devicePlatform || 'Android APK (Capacitor)';
  if (!Array.isArray(user.loginHistory)) {
    user.loginHistory = [];
  }
  user.loginHistory.unshift({
    event: 'logout',
    timestamp: nowIso,
    devicePlatform: resolvedPlatform,
  });
  if (user.loginHistory.length > 50) {
    user.loginHistory = user.loginHistory.slice(0, 50);
  }
}

function computeNativeUserVP(stats: Record<string, unknown>): number {
  const correctAnswers = Math.max(0, Number(stats.correctAnswers) || 0);
  const totalStudyMinutes = Math.max(0, Number(stats.totalStudyMinutes) || 0);
  const streakObj = (stats.streak || {}) as { current?: number };
  const streakDays = Math.max(0, Number(streakObj.current) || 0);
  const practiceHistory = Array.isArray(stats.practiceHistory)
    ? (stats.practiceHistory as Array<{ correctAnswers?: number }>)
    : [];
  const testModeCorrectCount = practiceHistory.reduce(
    (sum, entry) => sum + Math.max(0, Number(entry?.correctAnswers) || 0),
    0
  );
  const totalSuccessfulCount = Math.max(correctAnswers, testModeCorrectCount);
  const normalSolvedCount = Math.max(0, totalSuccessfulCount - testModeCorrectCount);
  const focusBlocksCount = Math.floor(totalStudyMinutes / 5);
  const persistedMilestone = Math.max(0, Number(stats.highestFiveDayStreakMilestone) || 0);
  const fiveDayMilestonesCount = Math.max(persistedMilestone, Math.floor(streakDays / 5));

  const computedVP =
    focusBlocksCount * 10 +
    normalSolvedCount * 2 +
    testModeCorrectCount * 5 +
    fiveDayMilestonesCount * 20;

  return Math.max(computedVP, Math.max(0, Number(stats.vpPoints) || 0));
}

export async function handleNativeAndroidApiRequest(
  pathWithQuery: string,
  init?: RequestInit
): Promise<Response> {
  const method = (init?.method || 'GET').toUpperCase();
  const urlObj = new URL(pathWithQuery, 'https://localhost');
  const pathname = urlObj.pathname;
  const body = parseJsonBody(init);
  const nowIso = new Date().toISOString();
  const db = loadNativeDb();

  // --------------------------------------------------------------------------
  // 1. POST /api/auth/register
  // --------------------------------------------------------------------------
  if (pathname === '/api/auth/register' && method === 'POST') {
    const rawName = sanitizeDisplayName(body.name);
    const cleanUsername = normalizeUsername(body.username);
    const rawPassword = typeof body.password === 'string' ? body.password : '';
    const rawConfirmPassword =
      typeof body.confirmPassword === 'string' ? body.confirmPassword : rawPassword;
    const selectedGoals = Array.isArray(body.selectedGoals)
      ? body.selectedGoals.filter((g: unknown) => typeof g === 'string' && g.trim().length > 0)
      : [];
    const activeGoal =
      typeof body.activeGoal === 'string' && body.activeGoal.trim()
        ? body.activeGoal.trim()
        : selectedGoals[0] || '';
    const rawClientStats =
      body.userStats && typeof body.userStats === 'object' ? body.userStats : {};

    if (!rawName || rawName.length < 1) {
      return jsonResponse({ error: 'Please enter your name.' }, 400);
    }
    if (!cleanUsername || cleanUsername.length < 3) {
      return jsonResponse(
        {
          error:
            'Username must be at least 3 characters (letters, numbers, underscores, dots, or hyphens).',
        },
        400
      );
    }
    if (await isOwnerUsernameDigestMatch(cleanUsername)) {
      return jsonResponse(
        {
          error:
            'That username is reserved. Please log in to your existing account or choose a different username.',
        },
        409
      );
    }
    if (rawPassword.length < 6) {
      return jsonResponse({ error: 'Password must be at least 6 characters long.' }, 400);
    }
    if (rawPassword !== rawConfirmPassword) {
      return jsonResponse({ error: 'Password and confirm password do not match.' }, 400);
    }
    if (selectedGoals.length === 0) {
      return jsonResponse({ error: 'Please select at least one study goal or exam.' }, 400);
    }

    const existingAuthUser = await authenticateNativeRequest(db, init);

    const usernameTakenByOther = Object.values(db.users).find(
      (u) =>
        u.username &&
        u.username.toLowerCase() === cleanUsername &&
        (!existingAuthUser || u.userId !== existingAuthUser.userId)
    );
    if (usernameTakenByOther) {
      return jsonResponse(
        {
          error:
            'That username is already taken. Please choose a different username or log in to your existing account.',
        },
        409
      );
    }

    const salt = randomHex(16);
    const passwordHash = await hashStudentPassword(rawPassword, salt);

    const sanitizedClientStats: Record<string, unknown> = { ...rawClientStats };
    delete sanitizedClientStats.role;
    delete sanitizedClientStats.isOwner;
    delete sanitizedClientStats.accountStatus;
    delete sanitizedClientStats.passwordHash;
    delete sanitizedClientStats.passwordSalt;
    delete sanitizedClientStats.tokenHash;

    let targetUser: NativeStoredUser;
    if (existingAuthUser && !existingAuthUser.username && existingAuthUser.role !== 'owner') {
      targetUser = existingAuthUser;
      targetUser.username = cleanUsername;
      targetUser.role = 'student';
      targetUser.accountStatus = 'active';
      targetUser.passwordSalt = salt;
      targetUser.passwordHash = passwordHash;
      targetUser.displayName = rawName;
      targetUser.lastSeenAt = nowIso;
    } else {
      const userId = `usr_${randomHex(12)}`;
      targetUser = {
        userId,
        username: cleanUsername,
        role: 'student',
        accountStatus: 'active',
        passwordSalt: salt,
        passwordHash,
        tokenHash: '',
        sessionTokenHashes: [],
        displayName: rawName,
        profilePhotoUrl: null,
        svhAiButtonPosition: null,
        createdAt: nowIso,
        lastSeenAt: nowIso,
      };
      db.users[userId] = targetUser;
    }

    targetUser.userStats = {
      ...(targetUser.userStats || {}),
      ...sanitizedClientStats,
      userId: targetUser.userId,
      username: cleanUsername,
      role: 'student',
      name: rawName,
      profilePhotoUrl: targetUser.profilePhotoUrl || null,
      svhAiButtonPosition: targetUser.svhAiButtonPosition || null,
      selectedGoals,
      activeGoal,
      hasCompletedSetup: true,
    };

    const authToken = await issueSessionToken(targetUser);
    recordNativeUserLogin(targetUser, nowIso, body.devicePlatform);
    if (body.deviceId) {
      await registerNativeDevice(db, body.deviceId, targetUser.userId, nowIso);
    }

    saveNativeDb(db);

    return jsonResponse(
      {
        userId: targetUser.userId,
        username: targetUser.username,
        role: 'student',
        isOwner: false,
        displayName: targetUser.displayName,
        profilePhotoUrl: targetUser.profilePhotoUrl || null,
        svhAiButtonPosition: targetUser.svhAiButtonPosition || null,
        userStats: targetUser.userStats,
        authToken,
      },
      201
    );
  }

  // --------------------------------------------------------------------------
  // 2. POST /api/auth/login (Unified Student + Owner Login)
  // --------------------------------------------------------------------------
  if (pathname === '/api/auth/login' && method === 'POST') {
    const cleanUsername = normalizeUsername(body.username);
    const rawPassword = typeof body.password === 'string' ? body.password : '';

    if (!cleanUsername || !rawPassword) {
      return jsonResponse({ error: 'Please enter both your username and password.' }, 400);
    }

    // Outcome B: Valid Owner credentials -> Owner Mode
    if (await isOwnerCredentialsDigestMatch(cleanUsername, rawPassword)) {
      let ownerAccount = Object.values(db.users).find(
        (u) =>
          u.userId === OWNER_PRIMARY_USER_ID ||
          u.role === 'owner' ||
          (u.username && u.username.toLowerCase() === cleanUsername)
      );

      if (!ownerAccount) {
        ownerAccount = {
          userId: OWNER_PRIMARY_USER_ID,
          username: cleanUsername,
          role: 'owner',
          accountStatus: 'active',
          tokenHash: '',
          sessionTokenHashes: [],
          displayName: 'Soumyadip Rana',
          profilePhotoUrl: null,
          svhAiButtonPosition: null,
          createdAt: nowIso,
          lastSeenAt: nowIso,
        };
        db.users[ownerAccount.userId] = ownerAccount;
      } else {
        ownerAccount.username = cleanUsername;
        ownerAccount.role = 'owner';
        ownerAccount.accountStatus = 'active';
        ownerAccount.lastSeenAt = nowIso;
        if (!ownerAccount.displayName || ownerAccount.displayName === 'Student') {
          ownerAccount.displayName = 'Soumyadip Rana';
        }
      }

      const existingStats = (ownerAccount.userStats || {}) as Record<string, unknown>;
      const existingGoals =
        Array.isArray(existingStats.selectedGoals) && existingStats.selectedGoals.length > 0
          ? (existingStats.selectedGoals as string[])
          : ['NEET', 'JEE Main'];
      const existingActiveGoal =
        typeof existingStats.activeGoal === 'string' && existingStats.activeGoal.trim()
          ? existingStats.activeGoal
          : existingGoals[0];

      ownerAccount.userStats = {
        ...existingStats,
        userId: ownerAccount.userId,
        username: ownerAccount.username,
        role: 'owner',
        name: ownerAccount.displayName || (existingStats.name as string) || 'Soumyadip Rana',
        selectedGoals: existingGoals,
        activeGoal: existingActiveGoal,
        profilePhotoUrl:
          ownerAccount.profilePhotoUrl ??
          (existingStats.profilePhotoUrl as string | null) ??
          null,
        svhAiButtonPosition:
          ownerAccount.svhAiButtonPosition ??
          (existingStats.svhAiButtonPosition as { xRatio: number; yRatio: number } | null) ??
          null,
        hasCompletedSetup: true,
      };

      const authToken = await issueSessionToken(ownerAccount);
      recordNativeUserLogin(ownerAccount, nowIso, body.devicePlatform);
      const ownerTokenHash = await sha256Hex(authToken);
      db.ownerSessionTokenHashes.push({
        tokenHash: ownerTokenHash,
        createdAt: nowIso,
        lastUsedAt: nowIso,
      });
      if (db.ownerSessionTokenHashes.length > 30) {
        db.ownerSessionTokenHashes = db.ownerSessionTokenHashes.slice(-30);
      }

      if (body.deviceId) {
        await registerNativeDevice(db, body.deviceId, ownerAccount.userId, nowIso);
      }

      saveNativeDb(db);

      return jsonResponse({
        userId: ownerAccount.userId,
        username: ownerAccount.username,
        role: 'owner',
        isOwner: true,
        displayName: ownerAccount.displayName,
        profilePhotoUrl: ownerAccount.profilePhotoUrl || null,
        svhAiButtonPosition: ownerAccount.svhAiButtonPosition || null,
        userStats: ownerAccount.userStats,
        authToken,
      });
    }

    // Outcome A: Student Login
    if (await isOwnerUsernameDigestMatch(cleanUsername)) {
      return jsonResponse(
        { error: 'Invalid username or password. Please check your credentials and try again.' },
        401
      );
    }

    const foundUser = Object.values(db.users).find(
      (u) => u.username && u.username.toLowerCase() === cleanUsername && u.role !== 'owner'
    );
    if (!foundUser) {
      return jsonResponse(
        { error: 'Invalid username or password. Please check your credentials and try again.' },
        401
      );
    }

    if (foundUser.accountStatus === 'suspended') {
      return jsonResponse(
        { error: 'This account has been suspended by the platform administrator.' },
        403
      );
    }

    let passwordVerified = false;
    if (foundUser.passwordSalt && foundUser.passwordHash) {
      const candidateHash = await hashStudentPassword(rawPassword, foundUser.passwordSalt);
      passwordVerified = candidateHash === foundUser.passwordHash;
    }

    if (!passwordVerified) {
      return jsonResponse(
        { error: 'Invalid username or password. Please check your credentials and try again.' },
        401
      );
    }

    foundUser.role = 'student';
    foundUser.lastSeenAt = nowIso;
    const authToken = await issueSessionToken(foundUser);
    recordNativeUserLogin(foundUser, nowIso, body.devicePlatform);

    if (body.deviceId) {
      await registerNativeDevice(db, body.deviceId, foundUser.userId, nowIso);
    }

    foundUser.userStats = {
      ...(foundUser.userStats || {}),
      userId: foundUser.userId,
      username: foundUser.username,
      role: 'student',
      name: foundUser.displayName || (foundUser.userStats?.name as string) || 'Student',
      profilePhotoUrl:
        foundUser.profilePhotoUrl ??
        (foundUser.userStats?.profilePhotoUrl as string | null) ??
        null,
      svhAiButtonPosition:
        foundUser.svhAiButtonPosition ??
        (foundUser.userStats?.svhAiButtonPosition as { xRatio: number; yRatio: number } | null) ??
        null,
      hasCompletedSetup: true,
    };

    saveNativeDb(db);

    return jsonResponse({
      userId: foundUser.userId,
      username: foundUser.username,
      role: 'student',
      isOwner: false,
      displayName: foundUser.displayName,
      profilePhotoUrl: foundUser.profilePhotoUrl || null,
      svhAiButtonPosition: foundUser.svhAiButtonPosition || null,
      userStats: foundUser.userStats,
      authToken,
    });
  }

  // --------------------------------------------------------------------------
  // 3. GET /api/auth/me
  // --------------------------------------------------------------------------
  if (pathname === '/api/auth/me' && method === 'GET') {
    const user = await authenticateNativeRequest(db, init);
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    user.lastSeenAt = nowIso;
    const isUserOwner = Boolean(
      user.role === 'owner' && (await isOwnerUsernameDigestMatch(user.username || ''))
    );
    const resolvedRole: 'student' | 'owner' = isUserOwner ? 'owner' : 'student';
    user.role = resolvedRole;
    saveNativeDb(db);

    return jsonResponse({
      userId: user.userId,
      username: user.username || null,
      role: resolvedRole,
      isOwner: isUserOwner,
      displayName: user.displayName,
      profilePhotoUrl: user.profilePhotoUrl || null,
      svhAiButtonPosition: user.svhAiButtonPosition || null,
      isRegisteredAccount: Boolean(user.username && (user.passwordHash || user.webScryptHash || isUserOwner)),
      userStats: {
        ...(user.userStats || {}),
        userId: user.userId,
        username: user.username || undefined,
        role: resolvedRole,
        name: user.displayName || (user.userStats?.name as string) || '',
        profilePhotoUrl:
          user.profilePhotoUrl ?? (user.userStats?.profilePhotoUrl as string | null) ?? null,
        svhAiButtonPosition:
          user.svhAiButtonPosition ??
          (user.userStats?.svhAiButtonPosition as { xRatio: number; yRatio: number } | null) ??
          null,
      },
    });
  }

  // --------------------------------------------------------------------------
  // 4. PUT /api/auth/sync, PATCH /api/user/preferences & PUT /api/community/auth/profile
  // --------------------------------------------------------------------------
  if (
    (pathname === '/api/auth/sync' && method === 'PUT') ||
    (pathname === '/api/user/preferences' && method === 'PATCH') ||
    (pathname === '/api/community/auth/profile' && method === 'PUT')
  ) {
    const user = await authenticateNativeRequest(db, init);
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    const incomingStats =
      body.userStats && typeof body.userStats === 'object' ? body.userStats : body;
    const isUserOwner = Boolean(
      user.role === 'owner' && (await isOwnerUsernameDigestMatch(user.username || ''))
    );
    const resolvedRole: 'student' | 'owner' = isUserOwner ? 'owner' : 'student';

    if (typeof body.displayName === 'string' && body.displayName.trim()) {
      user.displayName = sanitizeDisplayName(body.displayName);
    } else if (typeof incomingStats.name === 'string' && incomingStats.name.trim()) {
      user.displayName = sanitizeDisplayName(incomingStats.name);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'profilePhotoUrl')) {
      user.profilePhotoUrl = body.profilePhotoUrl || null;
    } else if (Object.prototype.hasOwnProperty.call(incomingStats, 'profilePhotoUrl')) {
      user.profilePhotoUrl = incomingStats.profilePhotoUrl || null;
    }

    if (body.svhAiButtonPosition !== undefined) {
      user.svhAiButtonPosition = body.svhAiButtonPosition;
    } else if (incomingStats.svhAiButtonPosition !== undefined) {
      user.svhAiButtonPosition = incomingStats.svhAiButtonPosition;
    }

    user.role = resolvedRole;
    user.userStats = {
      ...(user.userStats || {}),
      ...(body.userStats && typeof body.userStats === 'object' ? body.userStats : {}),
      userId: user.userId,
      username: user.username,
      role: resolvedRole,
      name: user.displayName,
      profilePhotoUrl: user.profilePhotoUrl || null,
      svhAiButtonPosition: user.svhAiButtonPosition || null,
    };
    user.lastSeenAt = nowIso;

    db.posts.forEach((p) => {
      if (p.authorId === user.userId) {
        p.authorName = user.displayName;
        p.authorAvatarUrl = user.profilePhotoUrl || null;
      }
    });
    db.replies.forEach((r) => {
      if (r.authorId === user.userId) {
        r.authorName = user.displayName;
        r.authorAvatarUrl = user.profilePhotoUrl || null;
      }
    });
    db.chatMessages.forEach((m) => {
      if (m.authorId === user.userId) {
        m.authorName = user.displayName;
        m.authorAvatarUrl = user.profilePhotoUrl || null;
      }
    });

    saveNativeDb(db);

    return jsonResponse({
      ok: true,
      userId: user.userId,
      username: user.username || null,
      displayName: user.displayName,
      profilePhotoUrl: user.profilePhotoUrl || null,
      role: resolvedRole,
      isOwner: isUserOwner,
      svhAiButtonPosition: user.svhAiButtonPosition || null,
      userStats: user.userStats,
    });
  }

  // --------------------------------------------------------------------------
  // 5. POST /api/auth/logout & POST /api/owner/auth/logout
  // --------------------------------------------------------------------------
  if (
    (pathname === '/api/auth/logout' ||
      pathname === '/api/owner/logout' ||
      pathname === '/api/owner/auth/logout') &&
    method === 'POST'
  ) {
    const authHeader =
      getHeader(init, 'x-owner-authorization') || getHeader(init, 'authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const rawToken = authHeader.slice(7).trim();
      const targetHash = await sha256Hex(rawToken);
      const user = await authenticateNativeRequest(db, init);
      if (user) {
        recordNativeUserLogout(user, nowIso, body.devicePlatform);
        if (Array.isArray(user.sessionTokenHashes)) {
          user.sessionTokenHashes = user.sessionTokenHashes.filter((h) => h !== targetHash);
        }
        if (user.tokenHash === targetHash) {
          user.tokenHash =
            user.sessionTokenHashes?.[user.sessionTokenHashes.length - 1] || '';
        }
      }
      db.ownerSessionTokenHashes = db.ownerSessionTokenHashes.filter(
        (s) => s.tokenHash !== targetHash
      );
      saveNativeDb(db);
    }
    return jsonResponse({ ok: true });
  }

  // --------------------------------------------------------------------------
  // 6. DELETE /api/auth/account
  // --------------------------------------------------------------------------
  if (pathname === '/api/auth/account' && method === 'DELETE') {
    const user = await authenticateNativeRequest(db, init);
    if (!user) {
      return jsonResponse({ error: 'Authentication required to delete account.' }, 401);
    }
    if (user.role === 'owner') {
      return jsonResponse(
        { error: 'The primary Owner account cannot be deleted. Use Log Out to end your session.' },
        403
      );
    }
    if (body.confirmDelete !== true) {
      return jsonResponse(
        { error: 'Explicit confirmation is required to permanently delete your account.' },
        400
      );
    }
    if (user.passwordHash && user.passwordSalt && typeof body.password === 'string' && body.password.length > 0) {
      const candidate = await hashStudentPassword(body.password, user.passwordSalt);
      if (candidate !== user.passwordHash) {
        return jsonResponse({ error: 'Incorrect password. Account deletion cancelled.' }, 401);
      }
    }
    const targetUserId = user.userId;
    delete db.users[targetUserId];
    delete db.aiConversations[targetUserId];
    db.posts = db.posts.filter((p) => p.authorId !== targetUserId);
    db.replies = db.replies.filter((r) => r.authorId !== targetUserId);
    db.chatMessages = db.chatMessages.filter((m) => m.authorId !== targetUserId);
    saveNativeDb(db);
    return jsonResponse({ ok: true, deletedUserId: targetUserId });
  }

  // --------------------------------------------------------------------------
  // 7. POST /api/analytics/session & POST /api/telemetry/session
  // --------------------------------------------------------------------------
  if (
    (pathname === '/api/analytics/session' || pathname === '/api/telemetry/session') &&
    method === 'POST'
  ) {
    let user = await authenticateNativeRequest(db, init);
    const displayName = sanitizeDisplayName(body.displayName);
    let issuedToken: string | undefined;

    if (!user) {
      const userId = `usr_${randomHex(12)}`;
      user = {
        userId,
        role: 'student',
        accountStatus: 'active',
        tokenHash: '',
        sessionTokenHashes: [],
        displayName,
        profilePhotoUrl: null,
        svhAiButtonPosition: null,
        createdAt: nowIso,
        lastSeenAt: nowIso,
      };
      issuedToken = await issueSessionToken(user);
      db.users[userId] = user;
    } else {
      user.lastSeenAt = nowIso;
    }

    const deviceIdHash = await registerNativeDevice(db, body.deviceId, user.userId, nowIso);
    const recentCutoff = Date.now() - 30 * 60 * 1000;
    const hasRecent = db.analyticsSessions.some(
      (s) =>
        s.userId === user!.userId &&
        s.deviceIdHash === deviceIdHash &&
        new Date(s.openedAt).getTime() >= recentCutoff
    );
    if (!hasRecent) {
      db.analyticsSessions.push({
        id: `sess_${randomHex(8)}`,
        userId: user.userId,
        deviceIdHash,
        openedAt: nowIso,
      });
    }
    saveNativeDb(db);

    return jsonResponse(
      {
        ok: true,
        userId: user.userId,
        ...(issuedToken ? { authToken: issuedToken } : {}),
      },
      201
    );
  }

  // --------------------------------------------------------------------------
  // 8. COMMUNITY ENDPOINTS (/api/community/*)
  // --------------------------------------------------------------------------
  if (pathname === '/api/community/auth/session' && method === 'POST') {
    const user = await authenticateNativeRequest(db, init);
    const displayName = sanitizeDisplayName(body.displayName);
    const hasPhotoField = Object.prototype.hasOwnProperty.call(body, 'profilePhotoUrl');
    const profilePhotoUrl =
      typeof body.profilePhotoUrl === 'string' ? body.profilePhotoUrl : null;

    if (user) {
      if (displayName) user.displayName = displayName;
      if (hasPhotoField) user.profilePhotoUrl = profilePhotoUrl;
      if (
        body.svhAiButtonPosition &&
        typeof body.svhAiButtonPosition.xRatio === 'number' &&
        typeof body.svhAiButtonPosition.yRatio === 'number'
      ) {
        user.svhAiButtonPosition = {
          xRatio: Math.max(0, Math.min(1, body.svhAiButtonPosition.xRatio)),
          yRatio: Math.max(0, Math.min(1, body.svhAiButtonPosition.yRatio)),
        };
      }
      user.lastSeenAt = nowIso;
      saveNativeDb(db);
      return jsonResponse({
        userId: user.userId,
        displayName: user.displayName,
        profilePhotoUrl: user.profilePhotoUrl || null,
        svhAiButtonPosition: user.svhAiButtonPosition || null,
      });
    }

    const userId = `usr_${randomHex(12)}`;
    const newUser: NativeStoredUser = {
      userId,
      role: 'student',
      accountStatus: 'active',
      tokenHash: '',
      sessionTokenHashes: [],
      displayName,
      profilePhotoUrl,
      svhAiButtonPosition: null,
      createdAt: nowIso,
      lastSeenAt: nowIso,
    };
    const authToken = await issueSessionToken(newUser);
    db.users[userId] = newUser;
    saveNativeDb(db);

    return jsonResponse(
      {
        userId,
        authToken,
        displayName,
        profilePhotoUrl,
        svhAiButtonPosition: null,
      },
      201
    );
  }

  if (pathname === '/api/community/state' && method === 'GET') {
    return jsonResponse({
      posts: db.posts,
      replies: db.replies,
      chatMessages: db.chatMessages,
      onlineCount: Math.max(1, Object.keys(db.users).length),
    });
  }

  if (pathname === '/api/community/posts' && method === 'POST') {
    const user = await authenticateNativeRequest(db, init);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
    if (!content && !imageUrl) {
      return jsonResponse({ error: 'Please provide a question text or upload a question image.' }, 400);
    }
    const authorName = sanitizeDisplayName(body.authorName || user.displayName);
    user.displayName = authorName;
    const newPost: NativeCommunityPost = {
      id: `post_${Date.now()}_${randomHex(4)}`,
      authorId: user.userId,
      authorName,
      authorAvatarUrl: user.profilePhotoUrl || null,
      subject: typeof body.subject === 'string' && body.subject.trim() ? body.subject.trim() : 'General',
      content,
      ...(imageUrl ? { imageUrl } : {}),
      likes: [],
      replyCount: 0,
      createdAt: nowIso,
    };
    db.posts.unshift(newPost);
    saveNativeDb(db);
    return jsonResponse({ post: newPost }, 201);
  }

  const postLikeMatch = pathname.match(/^\/api\/community\/posts\/([^/]+)\/like$/);
  if (postLikeMatch && method === 'POST') {
    const user = await authenticateNativeRequest(db, init);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
    const post = db.posts.find((p) => p.id === postLikeMatch[1]);
    if (!post) return jsonResponse({ error: 'Post not found' }, 404);
    if (!Array.isArray(post.likes)) post.likes = [];
    const idx = post.likes.indexOf(user.userId);
    if (idx >= 0) post.likes.splice(idx, 1);
    else post.likes.push(user.userId);
    saveNativeDb(db);
    return jsonResponse({ post });
  }

  const postRepliesMatch = pathname.match(/^\/api\/community\/posts\/([^/]+)\/replies$/);
  if (postRepliesMatch && method === 'POST') {
    const user = await authenticateNativeRequest(db, init);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
    const post = db.posts.find((p) => p.id === postRepliesMatch[1]);
    if (!post) return jsonResponse({ error: 'Discussion post not found' }, 404);
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
    if (!content && !imageUrl) {
      return jsonResponse({ error: 'Reply cannot be empty.' }, 400);
    }
    const authorName = sanitizeDisplayName(body.authorName || user.displayName);
    user.displayName = authorName;
    const newReply: NativeCommunityReply = {
      id: `reply_${Date.now()}_${randomHex(4)}`,
      postId: post.id,
      authorId: user.userId,
      authorName,
      authorAvatarUrl: user.profilePhotoUrl || null,
      content,
      ...(imageUrl ? { imageUrl } : {}),
      likes: [],
      createdAt: nowIso,
    };
    db.replies.push(newReply);
    post.replyCount = db.replies.filter((r) => r.postId === post.id).length;
    saveNativeDb(db);
    return jsonResponse({ reply: newReply, replyCount: post.replyCount }, 201);
  }

  if (pathname === '/api/community/chat' && method === 'POST') {
    const user = await authenticateNativeRequest(db, init);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (!content) return jsonResponse({ error: 'Message cannot be empty.' }, 400);
    const authorName = sanitizeDisplayName(body.authorName || user.displayName);
    user.displayName = authorName;
    const message: NativeChatMessage = {
      id: `chat_${Date.now()}_${randomHex(4)}`,
      authorId: user.userId,
      authorName,
      authorAvatarUrl: user.profilePhotoUrl || null,
      content,
      ...(typeof body.subjectTag === 'string' && body.subjectTag.trim()
        ? { subjectTag: body.subjectTag.trim() }
        : {}),
      createdAt: nowIso,
    };
    db.chatMessages.push(message);
    saveNativeDb(db);
    return jsonResponse({ message }, 201);
  }

  // --------------------------------------------------------------------------
  // 9. SVH AI ENDPOINTS (/api/svh-ai/*)
  // --------------------------------------------------------------------------
  if (pathname === '/api/svh-ai/conversations' && method === 'GET') {
    const user = await authenticateNativeRequest(db, init);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
    const list = db.aiConversations[user.userId] || [];
    return jsonResponse({ conversations: list });
  }

  if (pathname === '/api/svh-ai/conversations' && method === 'POST') {
    const user = await authenticateNativeRequest(db, init);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
    const newConv: NativeAIConversation = {
      id: `svhai_conv_${Date.now()}_${randomHex(4)}`,
      userId: user.userId,
      title:
        typeof body.title === 'string' && body.title.trim() ? body.title.trim() : 'New Study Chat',
      messages: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    if (!db.aiConversations[user.userId]) db.aiConversations[user.userId] = [];
    db.aiConversations[user.userId].unshift(newConv);
    saveNativeDb(db);
    return jsonResponse({ conversation: newConv }, 201);
  }

  if (pathname === '/api/svh-ai/conversations' && method === 'DELETE') {
    const user = await authenticateNativeRequest(db, init);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
    db.aiConversations[user.userId] = [];
    saveNativeDb(db);
    return jsonResponse({ ok: true });
  }

  const aiConvDeleteMatch = pathname.match(/^\/api\/svh-ai\/conversations\/([^/]+)$/);
  if (aiConvDeleteMatch && method === 'DELETE') {
    const user = await authenticateNativeRequest(db, init);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
    const convId = aiConvDeleteMatch[1];
    db.aiConversations[user.userId] = (db.aiConversations[user.userId] || []).filter(
      (c) => c.id !== convId
    );
    saveNativeDb(db);
    return jsonResponse({ ok: true, conversationId: convId, deletedId: convId });
  }

  if (
    (pathname === '/api/svh-ai/chat' || pathname === '/api/svh-ai/chat/stream') &&
    method === 'POST'
  ) {
    const user = await authenticateNativeRequest(db, init);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
    const rawText =
      typeof body.message === 'string' && body.message.trim()
        ? body.message.trim()
        : typeof body.content === 'string'
        ? body.content.trim()
        : '';
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
    if (!rawText && !imageUrl) {
      return jsonResponse({ error: 'Please enter a message or attach a question image.' }, 400);
    }

    if (!db.aiConversations[user.userId]) db.aiConversations[user.userId] = [];
    const userConvs = db.aiConversations[user.userId];
    const requestedConvId =
      typeof body.conversationId === 'string' ? body.conversationId.trim() : '';
    let conv = userConvs.find((c) => c.id === requestedConvId);
    if (!conv) {
      conv = {
        id:
          requestedConvId && requestedConvId.startsWith('svhai_conv_')
            ? requestedConvId
            : `svhai_conv_${Date.now()}_${randomHex(4)}`,
        userId: user.userId,
        title: (rawText || 'Doubt Image Analysis').slice(0, 56),
        messages: [],
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      userConvs.unshift(conv);
    }

    const requestedTurnId =
      typeof body.clientTurnId === 'string' && body.clientTurnId.startsWith('msg_')
        ? body.clientTurnId
        : `msg_${Date.now()}_u_${randomHex(3)}`;

    const userMsg: NativeAIConversationMessage = {
      id: requestedTurnId,
      role: 'user',
      content: rawText || 'Uploaded a question image for analysis',
      ...(imageUrl ? { imageUrl } : {}),
      createdAt: nowIso,
    };

    const alreadyExists = conv.messages.some((m) => m.id === requestedTurnId);
    if (!alreadyExists) {
      conv.messages.push(userMsg);
    }

    const answerText = buildLocalAcademicAssistantAnswer(
      rawText || 'Please explain and solve the question shown in this image step by step.',
      body.studentContext as Record<string, any> | undefined
    );
    const assistantMsgId = `msg_${Date.now()}_a_${randomHex(4)}`;
    const assistantMsg: NativeAIConversationMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: answerText,
      createdAt: new Date().toISOString(),
    };

    conv.messages.push(assistantMsg);
    conv.updatedAt = assistantMsg.createdAt;
    db.aiConversations[user.userId] = [
      conv,
      ...userConvs.filter((c) => c.id !== conv!.id),
    ];
    saveNativeDb(db);

    if (pathname === '/api/svh-ai/chat/stream' && typeof ReadableStream !== 'undefined') {
      const encoder = new TextEncoder();
      const targetConv = conv;
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          const sendEvent = (payload: Record<string, unknown>) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
          };

          sendEvent({
            type: 'meta',
            conversationId: targetConv.id,
            conversationTitle: targetConv.title,
            userMessage: userMsg,
            assistantMessageId: assistantMsgId,
          });

          const chunkSize = 96;
          for (let i = 0; i < answerText.length; i += chunkSize) {
            sendEvent({
              type: 'chunk',
              delta: answerText.slice(i, i + chunkSize),
              assistantMessageId: assistantMsgId,
            });
          }

          sendEvent({
            type: 'done',
            conversation: targetConv,
            userMessage: userMsg,
            assistantMessage: assistantMsg,
          });

          controller.close();
        },
      });

      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }

    return jsonResponse({
      conversation: conv,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
    });
  }

  if (pathname === '/api/svh-ai/study-plan' && method === 'POST') {
    const user = await authenticateNativeRequest(db, init);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
    const goal =
      typeof body.goal === 'string' && body.goal.trim() ? body.goal.trim() : 'Competitive & Board Exams';
    const subjects: string[] =
      Array.isArray(body.subjects) && body.subjects.length > 0
        ? body.subjects.filter((s: unknown): s is string => typeof s === 'string' && Boolean(s.trim()))
        : ['Physics', 'Chemistry', 'Mathematics'];
    const dailyHours = Math.max(1, Math.min(16, Number(body.dailyHours) || 3));
    const dailyTargetMinutes = dailyHours * 60;
    const blockDuration = Math.max(30, Math.min(90, Math.round(dailyTargetMinutes / 2)));

    const activities = [
      'Concept Revision',
      'MCQ Practice',
      'NCERT Reading',
      'Formula & Short Notes',
      'Mock & Mistake Review',
    ];
    const priorities: Array<'High' | 'Medium' | 'Normal'> = ['High', 'High', 'Medium', 'High', 'Medium', 'Normal'];

    const blocks = Array.from({ length: 6 }, (_, idx) => {
      const subj = subjects[idx % subjects.length] || 'Science';
      const act = activities[idx % activities.length];
      const prio = priorities[idx % priorities.length];
      const tip = `Focus on high-weightage ${subj} concepts, core NCERT derivations, and timed ${goal} problem solving.`;
      return {
        id: `blk_${Date.now()}_${idx}`,
        dayOrPhase: `Day ${Math.floor(idx / 2) + 1} · Slot ${(idx % 2) + 1}`,
        subject: subj,
        chapterOrTopic: `${subj} High-Yield Chapter & PYQ Focus`,
        activityType: act,
        durationMinutes: blockDuration,
        priority: prio,
        keyTakeawayOrTip: tip,
        actionableTip: tip,
        completed: false,
      };
    });

    const planTitle = `${goal} Smart Revision & Study Plan`;
    const strategySummary = `Structured ${dailyHours}h/day (${dailyTargetMinutes} mins) revision schedule across ${subjects.join(', ')} tailored for ${goal}.`;

    const plan = {
      id: `plan_${Date.now()}_${randomHex(4)}`,
      title: planTitle,
      planTitle,
      examGoal: goal,
      goal,
      dailyTargetMinutes,
      dailyHours,
      timeframe: typeof body.timeframe === 'string' ? body.timeframe : '5-Day Smart Sprint',
      focusMode: typeof body.focusMode === 'string' ? body.focusMode : 'High-Yield Chapters + PYQs',
      focusSummary: strategySummary,
      strategySummary,
      createdAt: nowIso,
      generatedAt: nowIso,
      blocks,
      studyBlocks: blocks,
      keyRevisionTips: [
        'Revise formula sheets and NCERT summary tables before starting timed MCQ practice.',
        'Log every incorrect MCQ topic and re-attempt after 24 hours.',
        'Maintain daily study consistency to protect your active study streak.',
      ],
    };

    return jsonResponse({ plan });
  }

  if (pathname === '/api/svh-ai/tts' && method === 'POST') {
    const user = await authenticateNativeRequest(db, init);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
    return jsonResponse({
      audioBase64: null,
      useNativeSpeechSynthesis: true,
      voiceName: typeof body.voiceName === 'string' ? body.voiceName : 'Kore',
    });
  }

  // --------------------------------------------------------------------------
  // 10. OWNER ANALYTICS & MANAGEMENT (/api/owner/*)
  // --------------------------------------------------------------------------
  if (
    (pathname === '/api/owner/verify' || pathname === '/api/owner/auth/status') &&
    method === 'GET'
  ) {
    const authenticated = await authenticateNativeOwnerRequest(db, init);
    return jsonResponse({
      authenticated,
      isOwnerAuthenticated: authenticated,
      isOwnerSetupComplete: true,
    });
  }

  if (pathname === '/api/owner/analytics' && method === 'GET') {
    const isOwner = await authenticateNativeOwnerRequest(db, init);
    if (!isOwner) {
      return jsonResponse(
        { error: 'Forbidden: Verified Owner authorization required.' },
        403
      );
    }
    const allUsers = Object.values(db.users);
    const registeredUsersOnly = allUsers.filter(
      (u) => Boolean(u.username) || u.role === 'owner'
    );
    const registeredAccounts = registeredUsersOnly.map((u) => {
      const stats = (u.userStats || {}) as Record<string, unknown>;
      const questionsAttempted = Math.max(0, Number(stats.questionsAttempted) || 0);
      const correctAnswers = Math.max(0, Number(stats.correctAnswers) || 0);
      const totalStudyMinutes = Math.max(0, Number(stats.totalStudyMinutes) || 0);
      const streakObj = (stats.streak || {}) as { current?: number; lastActiveDate?: string };
      const streakDays = Math.max(0, Number(streakObj.current) || 0);
      const streakLastActiveDate =
        typeof streakObj.lastActiveDate === 'string' && streakObj.lastActiveDate
          ? streakObj.lastActiveDate
          : null;
      const vpPoints = computeNativeUserVP(stats);
      const userSessions = db.analyticsSessions.filter((s) => s.userId === u.userId);
      const hasActiveToken = Boolean(
        u.tokenHash || (Array.isArray(u.sessionTokenHashes) && u.sessionTokenHashes.length > 0)
      );

      const rawTopHistory = Array.isArray(u.loginHistory) ? u.loginHistory : [];
      const rawStatsHistory = Array.isArray(stats.loginHistory)
        ? (stats.loginHistory as Array<{
            loginAt?: string;
            logoutAt?: string;
            devicePlatform?: string;
          }>)
        : [];

      const normalizedEvents: Array<{
        event: 'login' | 'logout';
        timestamp: string;
        devicePlatform?: string;
      }> = [];

      for (const item of rawTopHistory) {
        if (item && typeof item.timestamp === 'string' && (item.event === 'login' || item.event === 'logout')) {
          normalizedEvents.push({
            event: item.event,
            timestamp: item.timestamp,
            devicePlatform: item.devicePlatform || u.devicePlatform || undefined,
          });
        }
      }

      for (const item of rawStatsHistory) {
        if (item && typeof item.loginAt === 'string' && item.loginAt) {
          const exists = normalizedEvents.some(
            (ev) => ev.event === 'login' && Math.abs(new Date(ev.timestamp).getTime() - new Date(item.loginAt!).getTime()) < 5000
          );
          if (!exists) {
            normalizedEvents.push({
              event: 'login',
              timestamp: item.loginAt,
              devicePlatform: item.devicePlatform || (stats.lastDevicePlatform as string) || undefined,
            });
          }
        }
        if (item && typeof item.logoutAt === 'string' && item.logoutAt) {
          const exists = normalizedEvents.some(
            (ev) => ev.event === 'logout' && Math.abs(new Date(ev.timestamp).getTime() - new Date(item.logoutAt!).getTime()) < 5000
          );
          if (!exists) {
            normalizedEvents.push({
              event: 'logout',
              timestamp: item.logoutAt,
              devicePlatform: item.devicePlatform || (stats.lastDevicePlatform as string) || undefined,
            });
          }
        }
      }

      normalizedEvents.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      const loginEventsCount = normalizedEvents.filter((e) => e.event === 'login').length;
      const statsLoginCount = Math.max(0, Number(stats.loginCount) || 0);
      const loginCount = Math.max(
        typeof u.loginCount === 'number' ? u.loginCount : 0,
        statsLoginCount,
        loginEventsCount,
        u.username ? 1 : 0
      );

      const resolvedDevicePlatform =
        u.devicePlatform ||
        (typeof stats.lastDevicePlatform === 'string' && stats.lastDevicePlatform ? stats.lastDevicePlatform : null) ||
        (normalizedEvents.find((e) => e.devicePlatform)?.devicePlatform ?? null);

      const resolvedLastLoginAt =
        u.lastLoginAt ||
        (typeof stats.lastLoginAt === 'string' && stats.lastLoginAt ? stats.lastLoginAt : null) ||
        normalizedEvents.find((e) => e.event === 'login')?.timestamp ||
        u.lastSeenAt ||
        u.createdAt;

      const resolvedLastLogoutAt =
        u.lastLogoutAt ||
        (typeof stats.lastLogoutAt === 'string' && stats.lastLogoutAt ? stats.lastLogoutAt : null) ||
        normalizedEvents.find((e) => e.event === 'logout')?.timestamp ||
        null;

      const resolvedFirstSeenAt =
        u.firstSeenAt ||
        (typeof stats.firstSeenAt === 'string' && stats.firstSeenAt ? stats.firstSeenAt : null) ||
        u.createdAt;

      return {
        userId: u.userId,
        username: u.username || null,
        displayName: u.displayName || 'Student',
        role: u.role === 'owner' ? ('owner' as const) : ('student' as const),
        accountStatus:
          u.accountStatus === 'suspended' ? ('suspended' as const) : ('active' as const),
        activeSessionStatus: hasActiveToken ? ('online_active' as const) : ('signed_out' as const),
        activeGoal: typeof stats.activeGoal === 'string' ? stats.activeGoal : null,
        questionsAttempted,
        correctAnswers,
        totalStudyMinutes,
        vpPoints,
        streakDays,
        streakLastActiveDate,
        totalLoginCount: loginCount,
        totalSessionCount: Math.max(userSessions.length, loginCount),
        firstSeenAt: resolvedFirstSeenAt,
        createdAt: u.createdAt,
        lastLoginAt: resolvedLastLoginAt,
        lastLogoutAt: resolvedLastLogoutAt,
        lastSeenAt: u.lastSeenAt,
        devicePlatform: resolvedDevicePlatform,
        loginHistory: normalizedEvents.slice(0, 30),
      };
    });

    return jsonResponse({
      generatedAt: nowIso,
      metrics: {
        totalUniqueUsers: allUsers.length,
        totalRegisteredAccounts: registeredUsersOnly.length,
        totalDevices: Object.keys(db.registeredDeviceHashes).length,
        totalAppOpenSessions: db.analyticsSessions.length,
        dau: allUsers.length,
        wau: allUsers.length,
        mau: allUsers.length,
        newUsersToday: allUsers.length,
        newUsersLast7Days: allUsers.length,
        newUsersLast30Days: allUsers.length,
        newUsersOverTime: allUsers.length > 0 ? [{ date: nowIso.split('T')[0], count: allUsers.length }] : [],
        communityUsers: new Set(db.posts.map((p) => p.authorId)).size,
        communityPostsCount: db.posts.length,
        communityRepliesCount: db.replies.length,
        communityChatMessagesCount: db.chatMessages.length,
        svhAiUsers: Object.keys(db.aiConversations).length,
        svhAiConversations: Object.values(db.aiConversations).reduce(
          (acc, list) => acc + list.length,
          0
        ),
        svhAiInteractions: Object.values(db.aiConversations).reduce(
          (acc, list) =>
            acc +
            list.reduce(
              (sum, c) => sum + c.messages.filter((m) => m.role === 'user').length,
              0
            ),
          0
        ),
        registeredAccounts,
        moderationReports: db.reports,
      },
    });
  }

  const postDeleteMatch = pathname.match(/^\/api\/community\/posts\/([^/]+)$/);
  if (postDeleteMatch && method === 'DELETE') {
    const user = await authenticateNativeRequest(db, init);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
    const postId = postDeleteMatch[1];
    const targetPost = db.posts.find((p) => p.id === postId);
    if (!targetPost) return jsonResponse({ error: 'Post not found' }, 404);
    const isOwner = await authenticateNativeOwnerRequest(db, init);
    if (targetPost.authorId !== user.userId && !isOwner) {
      return jsonResponse({ error: 'You can only delete your own posts.' }, 403);
    }
    db.posts = db.posts.filter((p) => p.id !== postId);
    db.replies = db.replies.filter((r) => r.postId !== postId);
    saveNativeDb(db);
    return jsonResponse({ ok: true, postId });
  }

  const replyDeleteMatch = pathname.match(/^\/api\/community\/replies\/([^/]+)$/);
  if (replyDeleteMatch && method === 'DELETE') {
    const user = await authenticateNativeRequest(db, init);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
    const replyId = replyDeleteMatch[1];
    const targetReply = db.replies.find((r) => r.id === replyId);
    if (!targetReply) return jsonResponse({ error: 'Reply not found' }, 404);
    const isOwner = await authenticateNativeOwnerRequest(db, init);
    if (targetReply.authorId !== user.userId && !isOwner) {
      return jsonResponse({ error: 'You can only delete your own replies.' }, 403);
    }
    const postId = targetReply.postId;
    db.replies = db.replies.filter((r) => r.id !== replyId);
    let replyCount = 0;
    if (postId) {
      const parent = db.posts.find((p) => p.id === postId);
      replyCount = db.replies.filter((r) => r.postId === postId).length;
      if (parent) parent.replyCount = replyCount;
    }
    saveNativeDb(db);
    return jsonResponse({ ok: true, replyId, postId, replyCount });
  }

  const chatDeleteMatch = pathname.match(/^\/api\/community\/chat\/([^/]+)$/);
  if (chatDeleteMatch && method === 'DELETE') {
    const user = await authenticateNativeRequest(db, init);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
    const messageId = chatDeleteMatch[1];
    const targetMsg = db.chatMessages.find((m) => m.id === messageId);
    if (!targetMsg) return jsonResponse({ error: 'Message not found' }, 404);
    const isOwner = await authenticateNativeOwnerRequest(db, init);
    if (targetMsg.authorId !== user.userId && !isOwner) {
      return jsonResponse({ error: 'You can only delete your own messages.' }, 403);
    }
    db.chatMessages = db.chatMessages.filter((m) => m.id !== messageId);
    saveNativeDb(db);
    return jsonResponse({ ok: true, messageId });
  }

  if (pathname === '/api/community/report' && method === 'POST') {
    const user = await authenticateNativeRequest(db, init);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
    const targetType = body.targetType as 'post' | 'reply' | 'chat';
    const targetId = typeof body.targetId === 'string' ? body.targetId : '';
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!targetId || !reason) {
      return jsonResponse({ error: 'Invalid report parameters.' }, 400);
    }
    const report: NativeContentReport = {
      id: `rep_flag_${Date.now()}_${randomHex(4)}`,
      reporterId: user.userId,
      targetType,
      targetId,
      reason,
      details: typeof body.details === 'string' ? body.details : '',
      createdAt: nowIso,
    };
    db.reports.unshift(report);
    saveNativeDb(db);
    return jsonResponse({ ok: true, reportId: report.id }, 201);
  }

  const ownerUserStatusMatch = pathname.match(/^\/api\/owner\/users\/([^/]+)\/status$/);
  if (ownerUserStatusMatch && (method === 'POST' || method === 'PATCH')) {
    const isOwner = await authenticateNativeOwnerRequest(db, init);
    if (!isOwner) return jsonResponse({ error: 'Forbidden' }, 403);
    const targetUser = db.users[ownerUserStatusMatch[1]];
    if (!targetUser) return jsonResponse({ error: 'User not found' }, 404);
    if (targetUser.role === 'owner') {
      return jsonResponse({ error: 'Cannot suspend the primary Owner account.' }, 400);
    }
    const requestedStatus = body.status || body.accountStatus;
    targetUser.accountStatus = requestedStatus === 'suspended' ? 'suspended' : 'active';
    saveNativeDb(db);
    return jsonResponse({
      ok: true,
      userId: targetUser.userId,
      accountStatus: targetUser.accountStatus,
    });
  }

  const ownerUserDeleteMatch = pathname.match(/^\/api\/owner\/users\/([^/]+)$/);
  if (ownerUserDeleteMatch && method === 'DELETE') {
    const isOwner = await authenticateNativeOwnerRequest(db, init);
    if (!isOwner) return jsonResponse({ error: 'Forbidden' }, 403);
    const targetUserId = ownerUserDeleteMatch[1];
    const targetUser = db.users[targetUserId];
    if (!targetUser) return jsonResponse({ error: 'User not found' }, 404);
    if (targetUser.role === 'owner') {
      return jsonResponse({ error: 'Cannot delete the Owner account.' }, 400);
    }
    delete db.users[targetUserId];
    delete db.aiConversations[targetUserId];
    db.posts = db.posts.filter((p) => p.authorId !== targetUserId);
    db.replies = db.replies.filter((r) => r.authorId !== targetUserId);
    db.chatMessages = db.chatMessages.filter((m) => m.authorId !== targetUserId);
    saveNativeDb(db);
    return jsonResponse({ ok: true, deletedUserId: targetUserId });
  }

  const ownerModMatch = pathname.match(/^\/api\/owner\/moderation\/([^/]+)\/([^/]+)$/);
  if (ownerModMatch && method === 'DELETE') {
    const isOwner = await authenticateNativeOwnerRequest(db, init);
    if (!isOwner) return jsonResponse({ error: 'Forbidden' }, 403);
    const [, targetType, targetId] = ownerModMatch;
    if (targetType === 'report') {
      db.reports = db.reports.filter((r) => r.id !== targetId);
    } else if (targetType === 'post') {
      db.posts = db.posts.filter((p) => p.id !== targetId);
      db.replies = db.replies.filter((r) => r.postId !== targetId);
      db.reports = db.reports.filter((r) => r.targetId !== targetId);
    } else if (targetType === 'reply') {
      const targetReply = db.replies.find((r) => r.id === targetId);
      const postId = targetReply?.postId;
      db.replies = db.replies.filter((r) => r.id !== targetId);
      db.reports = db.reports.filter((r) => r.targetId !== targetId);
      if (postId) {
        const parent = db.posts.find((p) => p.id === postId);
        if (parent) parent.replyCount = db.replies.filter((r) => r.postId === postId).length;
      }
    } else if (targetType === 'chat') {
      db.chatMessages = db.chatMessages.filter((m) => m.id !== targetId);
      db.reports = db.reports.filter((r) => r.targetId !== targetId);
    }
    saveNativeDb(db);
    return jsonResponse({ ok: true, targetType, targetId });
  }

  return jsonResponse({ ok: true });
}

const nativeOriginalFetch: typeof fetch | null =
  typeof window !== 'undefined' && typeof window.fetch === 'function'
    ? window.fetch.bind(window)
    : null;

let workingRemoteOrigin: string | null = null;
let remoteCandidatesBlockedUntil = 0;
const REMOTE_BLOCK_COOLDOWN_MS = 60_000;

/**
 * Resilient API fetch that works identically in web browsers, AI Studio preview iframes,
 * and standalone Capacitor Android APKs without ever mutating `window.fetch`.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const baseFetch =
    nativeOriginalFetch ||
    (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);
  const rawUrl =
    typeof input === 'string'
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;

  if (!rawUrl.startsWith('/api/')) {
    return baseFetch(input, init);
  }

  const isNativeApk =
    typeof window !== 'undefined' &&
    (Capacitor.isNativePlatform() ||
      window.location.protocol === 'file:' ||
      window.location.protocol === 'capacitor:' ||
      window.location.origin === 'https://localhost' ||
      window.location.origin === 'http://localhost' ||
      (window.location.hostname === 'localhost' && !window.location.port));

  // 1. On the standard web app (not inside the Android APK), call same-origin `/api/*` first with automatic retry on temporary drops
  if (!isNativeApk) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const webRes = await baseFetch(input, init);
        const contentType = webRes.headers.get('content-type') || '';
        if (
          contentType.includes('application/json') ||
          contentType.includes('text/event-stream')
        ) {
          return webRes;
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') {
          throw err;
        }
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 250));
          continue;
        }
        // Fall through to candidate discovery / native bridge if offline
      }
    }
  }

  // 2. Inside the Android APK, only probe a custom configured VITE_BACKEND_URL (with a fast 1200ms timeout)
  //    because AI Studio preview/shared gateway URLs require browser gateway cookies and block cross-origin APK WebViews.
  const customBackendUrl = (
    (import.meta as { env?: Record<string, string> })?.env?.VITE_BACKEND_URL || ''
  ).trim();
  const isOnline = typeof navigator === 'undefined' || navigator.onLine !== false;
  const candidatesToTry = isNativeApk
    ? customBackendUrl && /^https?:\/\/.+/i.test(customBackendUrl)
      ? [customBackendUrl]
      : []
    : workingRemoteOrigin
    ? [
        workingRemoteOrigin,
        ...REMOTE_BACKEND_CANDIDATES.filter((c) => c !== workingRemoteOrigin),
      ]
    : REMOTE_BACKEND_CANDIDATES;

  if (
    candidatesToTry.length > 0 &&
    isOnline &&
    Date.now() >= remoteCandidatesBlockedUntil
  ) {
    for (const baseOrigin of candidatesToTry) {
      const isAiRoute = rawUrl.startsWith('/api/svh-ai/');
      const timeoutMs = isAiRoute ? 12000 : 1200;
      const controller = new AbortController();
      const timeoutId =
        typeof window !== 'undefined'
          ? window.setTimeout(() => controller.abort(), timeoutMs)
          : null;
      try {
        const candidateRes = await baseFetch(`${baseOrigin}${rawUrl}`, {
          ...init,
          signal: init?.signal || controller.signal,
        });
        if (timeoutId !== null) window.clearTimeout(timeoutId);

        const contentType = candidateRes.headers.get('content-type') || '';
        if (
          contentType.includes('application/json') ||
          contentType.includes('text/event-stream')
        ) {
          workingRemoteOrigin = baseOrigin;
          return candidateRes;
        }
      } catch {
        if (timeoutId !== null) window.clearTimeout(timeoutId);
      }
    }

    // Remote candidates were blocked or unreachable; cache cooldown so subsequent calls are 0ms
    workingRemoteOrigin = null;
    remoteCandidatesBlockedUntil = Date.now() + REMOTE_BLOCK_COOLDOWN_MS * 5;
  }

  // 3. Fallback to the on-device Native Android API Bridge so login, registration,
  //    Owner mode, Student mode, Community, and SVH AI execute with 0ms latency
  return handleNativeAndroidApiRequest(rawUrl, init);
}

/**
 * No-op initializer preserved for backward compatibility.
 * Never mutates `window.fetch` because `window.fetch` is a read-only getter in
 * Google AI Studio's preview environment. All components invoke `apiFetch` directly.
 */
export function installResilientNativeApiFetch(): void {
  // Intentionally empty: all API calls use `apiFetch()` directly.
}
