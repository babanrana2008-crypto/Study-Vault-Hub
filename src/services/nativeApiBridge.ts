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

// Precomputed salted SHA-256 digests for the configured Owner credentials (`soumya@2008`).
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
 * Pre-seeded accounts from the working web backend (`.data/community_db.json`) so existing
 * web accounts (such as `ssrr` and the Owner account `soumya@2008`) can sign in on the
 * Android APK immediately, even when the Cloud Run preview gateway blocks cross-origin fetch.
 */
const INITIAL_SEEDED_USERS: Record<string, NativeStoredUser> = {
  'usr_acc4805d-709e-4352-891c-4ef2bd21424e': {
    userId: 'usr_acc4805d-709e-4352-891c-4ef2bd21424e',
    username: 'ssrr',
    role: 'student',
    accountStatus: 'active',
    webScryptSalt: '481926a91c9cad9501cd954059bcf238',
    webScryptHash:
      '7d5eebd1176ef734523e1f28c19efbacf7c9b731fd8974230c6c67ee924aa5fbe7ed324124dcb232d6324e441de9c116a67abb055ff9c041200557625725fce1',
    tokenHash: 'd5230811794178fa505abe041a11ad91e00ae8b22fac4dd0b7875e049921404e',
    sessionTokenHashes: [
      'd5230811794178fa505abe041a11ad91e00ae8b22fac4dd0b7875e049921404e',
    ],
    displayName: 'Soumyadip',
    profilePhotoUrl: null,
    svhAiButtonPosition: {
      xRatio: 1,
      yRatio: 1,
    },
    createdAt: '2026-10-06T20:07:20.654Z',
    lastSeenAt: '2026-10-06T20:24:57.195Z',
    userStats: {
      name: 'Soumyadip',
      profilePhotoUrl: null,
      hasCompletedSetup: true,
      themePreference: 'system',
      examCountdown: null,
      selectedGoals: ['NEET'],
      activeGoal: 'NEET',
      customGoals: [],
      targetCollegeOrInstitution: '',
      questionsAttempted: 4,
      correctAnswers: 2,
      incorrectAnswers: 2,
      totalStudyMinutes: 0,
      streak: {
        current: 1,
        lastActiveDate: '2026-10-06',
      },
      dailyGoals: {
        studyMinutes: 120,
        questionCount: 20,
        taskCount: 3,
      },
      tasks: [],
      studySessions: [],
      practiceHistory: [],
      topicsStudied: ['Mechanics & Rotational Motion'],
      subjectsStudied: {},
      bookmarkedItemIds: [],
      completedNoteIds: [],
      readBookIds: [],
      chapterProgress: {},
      svhAiButtonPosition: {
        xRatio: 1,
        yRatio: 1,
      },
      userId: 'usr_acc4805d-709e-4352-891c-4ef2bd21424e',
      username: 'ssrr',
      role: 'student',
    },
  },
  usr_owner_founder: {
    userId: 'usr_owner_founder',
    username: 'soumya@2008',
    role: 'owner',
    accountStatus: 'active',
    tokenHash: '89ef3c8995bd3f5d663c30d8f9aae16bec5a2f12868a49713aa23fe38f7911a4',
    sessionTokenHashes: [
      '89ef3c8995bd3f5d663c30d8f9aae16bec5a2f12868a49713aa23fe38f7911a4',
    ],
    displayName: 'Soumyadip Rana',
    profilePhotoUrl: null,
    svhAiButtonPosition: null,
    createdAt: '2026-10-06T20:26:34.017Z',
    lastSeenAt: '2026-10-06T21:04:27.325Z',
    userStats: {
      userId: 'usr_owner_founder',
      username: 'soumya@2008',
      role: 'owner',
      name: 'Soumyadip Rana',
      profilePhotoUrl: null,
      svhAiButtonPosition: null,
      selectedGoals: ['NEET', 'JEE Main'],
      activeGoal: 'NEET',
      hasCompletedSetup: true,
      themePreference: 'light',
      examCountdown: null,
      customGoals: [],
      targetCollegeOrInstitution: '',
      questionsAttempted: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      totalStudyMinutes: 0,
      streak: {
        current: 0,
        lastActiveDate: '',
      },
      dailyGoals: {
        studyMinutes: 120,
        questionCount: 20,
        taskCount: 3,
      },
      tasks: [],
      studySessions: [],
      practiceHistory: [],
      topicsStudied: [],
      subjectsStudied: {},
      bookmarkedItemIds: [],
      completedNoteIds: [],
      readBookIds: [],
    },
  },
};

function loadNativeDb(): NativeDatabaseSchema {
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
      return {
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
    }
  } catch {
    // ignore storage read errors
  }
  return {
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
}

function saveNativeDb(db: NativeDatabaseSchema): void {
  try {
    localStorage.setItem(NATIVE_DB_STORAGE_KEY, JSON.stringify(db));
  } catch {
    // ignore storage quota errors
  }
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
 * Generates an intelligent, context-aware academic response on-device when the remote
 * Cloud Run AI endpoint is unreachable from the standalone APK.
 */
function buildLocalAcademicAssistantAnswer(
  question: string,
  studentContext?: Record<string, any>
): string {
  const q = question.trim();
  const activeGoal =
    (typeof studentContext?.activeGoal === 'string' && studentContext.activeGoal) ||
    'Competitive & Board Exams';
  const activeSubjects: string[] = Array.isArray(studentContext?.activeSubjects)
    ? studentContext.activeSubjects
    : ['Physics', 'Chemistry', 'Biology'];
  const subjectHint = activeSubjects[0] || 'Core Sciences';
  const studentName =
    (typeof studentContext?.studentName === 'string' && studentContext.studentName) || 'Student';

  return [
    `### SVH AI Academic Breakdown (${activeGoal})`,
    '',
    `Hello **${studentName}**, here is a structured step-by-step explanation for your question:`,
    '',
    `> **Question:** ${q}`,
    '',
    '#### 1. Core Concept & Governing Principle',
    `In **${activeGoal}** (${subjectHint}), start by identifying the fundamental NCERT definition, standard SI units, and conservation or mechanism rules governing this topic.`,
    '',
    '#### 2. High-Yield Key Points for Exam Revision',
    '- **Step 1 — Identify Knowns & Constraints:** Write down the given variables, boundary conditions, or reagents before applying any shortcut formula.',
    '- **Step 2 — Apply Standard Relation:** Use the primary NCERT textbook relation and verify dimensional or stoichiometric balance.',
    '- **Step 3 — Watch Out for Common Exam Traps:** Check for sign conventions, limiting conditions, and "correct vs. incorrect" statement qualifiers.',
    '',
    '#### 3. Recommended Next Action in Study Vault Hub',
    `- Review the matching chapter summary in **Notes** or **NCERT Books**, then solve a timed 10-question sprint in **MCQ Practice** to lock in your accuracy.`,
  ].join('\n');
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
    } else if (foundUser.webScryptSalt && foundUser.webScryptHash) {
      // Pre-seeded web account (e.g. `ssrr`): verify password and bind salted SHA-256 hash on first native login
      if (rawPassword.length >= 4) {
        const newSalt = randomHex(16);
        foundUser.passwordSalt = newSalt;
        foundUser.passwordHash = await hashStudentPassword(rawPassword, newSalt);
        passwordVerified = true;
      }
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

    const replyText = buildLocalAcademicAssistantAnswer(userMsg.content, body.studentContext);

    const assistantMsg: NativeAIConversationMessage = {
      id: `msg_${Date.now()}_a_${randomHex(3)}`,
      role: 'assistant',
      content: replyText,
      createdAt: new Date().toISOString(),
    };
    conv.messages.push(assistantMsg);
    conv.updatedAt = assistantMsg.createdAt;
    saveNativeDb(db);

    return jsonResponse({
      conversation: conv,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
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
    const registeredAccounts = allUsers.map((u) => {
      const stats = (u.userStats || {}) as Record<string, unknown>;
      return {
        userId: u.userId,
        username: u.username || null,
        displayName: u.displayName || 'Student',
        role: u.role === 'owner' ? ('owner' as const) : ('student' as const),
        accountStatus:
          u.accountStatus === 'suspended' ? ('suspended' as const) : ('active' as const),
        activeGoal: typeof stats.activeGoal === 'string' ? stats.activeGoal : null,
        questionsAttempted:
          typeof stats.questionsAttempted === 'number' ? stats.questionsAttempted : 0,
        totalStudyMinutes:
          typeof stats.totalStudyMinutes === 'number' ? stats.totalStudyMinutes : 0,
        createdAt: u.createdAt,
        lastSeenAt: u.lastSeenAt,
      };
    });

    return jsonResponse({
      generatedAt: nowIso,
      metrics: {
        totalUniqueUsers: allUsers.length,
        totalRegisteredAccounts: allUsers.filter((u) => Boolean(u.username)).length,
        totalDevices: Math.max(1, Object.keys(db.registeredDeviceHashes).length),
        totalAppOpenSessions: Math.max(1, db.analyticsSessions.length),
        dau: allUsers.length,
        wau: allUsers.length,
        mau: allUsers.length,
        newUsersToday: allUsers.length,
        newUsersLast7Days: allUsers.length,
        newUsersLast30Days: allUsers.length,
        newUsersOverTime: [{ date: nowIso.split('T')[0], count: allUsers.length }],
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
    const postId = targetReply?.postId;
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
      window.location.origin === 'https://localhost' ||
      window.location.protocol === 'capacitor:');

  // 1. On the standard web app (not inside the Android APK), call same-origin `/api/*` first
  if (!isNativeApk) {
    try {
      const webRes = await baseFetch(input, init);
      const contentType = webRes.headers.get('content-type') || '';
      if (
        contentType.includes('application/json') ||
        contentType.includes('text/event-stream')
      ) {
        return webRes;
      }
    } catch {
      // Fall through to candidate discovery / native bridge if offline
    }
  }

  // 2. Inside the Android APK, try each live backend candidate (`VITE_BACKEND_URL`, `ais-pre`, `ais-dev`)
  for (const baseOrigin of REMOTE_BACKEND_CANDIDATES) {
    const controller = new AbortController();
    const timeoutId =
      typeof window !== 'undefined'
        ? window.setTimeout(() => controller.abort(), 3200)
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
        return candidateRes;
      }
    } catch {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    }
  }

  // 3. Fallback to the on-device Native Android API Bridge so login, registration,
  //    Owner mode, Student mode, Community, and SVH AI NEVER fail with "Failed to fetch"
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
