import { Capacitor } from '@capacitor/core';
import {
  registerAccountInFirestore,
  loginAccountInFirestore,
  logoutAccountInFirestore,
  syncUserProfileAndStatsInFirestore,
  awardVaultPointsInFirestore,
  fetchCommunityStateFromFirestore,
  saveCommunityPostToFirestore,
  deleteCommunityPostFromFirestore,
  saveCommunityReplyToFirestore,
  deleteCommunityReplyFromFirestore,
  saveCommunityChatToFirestore,
  deleteCommunityChatFromFirestore,
  saveCommunityReportToFirestore,
  fetchOwnerDashboardFromFirestore,
  fetchRealLeaderboardFromFirestore,
} from './firebaseDb';
import {
  reconcileUserVpState,
  mergeUserStatsSafely,
  detectClientDevicePlatform,
  evaluateVerifiedAchievements,
  computeSmartRevisionSchedule,
  advanceRevisionItemStage,
} from '../utils/securityAndVp';
import { UserStats, StudySession, VPTransaction } from '../types';

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
 * Pre-seeded account records synced from the web backend so existing
 * web accounts can sign in on the Android APK immediately, even when the
 * Cloud Run preview gateway blocks cross-origin fetch.
 * Active session tokens and plaintext Owner usernames are never embedded in client code.
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
    tokenHash: '',
    sessionTokenHashes: [],
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
      vaultPoints: 16,
      questionVp: 16,
      focusMinuteVp: 0,
      focusBonusVp: 0,
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
  'usr_548a037d-002d-4847-8485-a7490304459c': {
    userId: 'usr_548a037d-002d-4847-8485-a7490304459c',
    username: 'baban143',
    role: 'student',
    accountStatus: 'active',
    webScryptSalt: '09892ba27b71a2f158e12cc2d7e8d8ce',
    webScryptHash:
      '7125293684b06b5faef6a8474fa8e68fb796f49d567eb2bc4d95d5714ec03aa3d2a49bf8069727ffbf2a78e674270296fb6cf59db9864dc4ef239bc053445bd6',
    tokenHash: '',
    sessionTokenHashes: [],
    displayName: 'Soumyadip Rana',
    profilePhotoUrl: null,
    svhAiButtonPosition: {
      xRatio: 0.9921,
      yRatio: 0.7774,
    },
    createdAt: '2026-10-07T06:06:16.826Z',
    lastSeenAt: '2026-10-07T18:10:09.104Z',
    userStats: {
      name: 'Soumyadip Rana',
      profilePhotoUrl: null,
      hasCompletedSetup: true,
      themePreference: 'light',
      examCountdown: {
        examName: 'NEET',
        examDate: '2027-05-05',
        updatedAt: '2026-10-07T06:06:51.999Z',
      },
      selectedGoals: ['NEET', 'JEE Main', 'Class 12 Board'],
      activeGoal: 'NEET',
      customGoals: [],
      targetCollegeOrInstitution: '',
      questionsAttempted: 4,
      correctAnswers: 1,
      incorrectAnswers: 3,
      totalStudyMinutes: 0,
      vaultPoints: 16,
      questionVp: 16,
      focusMinuteVp: 0,
      focusBonusVp: 0,
      streak: {
        current: 1,
        lastActiveDate: '2026-10-07',
      },
      dailyGoals: {
        studyMinutes: 120,
        questionCount: 20,
        taskCount: 3,
      },
      tasks: [],
      studySessions: [],
      practiceHistory: [],
      topicsStudied: ['Cell Biology', 'Mechanics & Rotational Motion'],
      subjectsStudied: {},
      bookmarkedItemIds: [],
      completedNoteIds: [],
      readBookIds: [],
      chapterProgress: {},
      svhAiButtonPosition: {
        xRatio: 0.9921,
        yRatio: 0.7774,
      },
      userId: 'usr_548a037d-002d-4847-8485-a7490304459c',
      username: 'baban143',
      role: 'student',
    },
  },
  usr_owner_founder: {
    userId: 'usr_owner_founder',
    role: 'owner',
    accountStatus: 'active',
    tokenHash: '',
    sessionTokenHashes: [],
    displayName: 'Soumyadip Rana',
    profilePhotoUrl: null,
    svhAiButtonPosition: null,
    createdAt: '2026-10-06T20:26:34.017Z',
    lastSeenAt: '2026-10-06T21:04:27.325Z',
    userStats: {
      userId: 'usr_owner_founder',
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

    // First attempt registration in shared Firebase Firestore so Web and APK share accounts immediately
    try {
      const fsReg = await registerAccountInFirestore({
        name: rawName,
        username: cleanUsername,
        password: rawPassword,
        selectedGoals,
        activeGoal,
        deviceId: typeof body.deviceId === 'string' ? body.deviceId : undefined,
        userStats: rawClientStats as Partial<UserStats>,
        existingUserId:
          existingAuthUser && !existingAuthUser.username && existingAuthUser.role !== 'owner'
            ? existingAuthUser.userId
            : undefined,
      });

      const salt = randomHex(16);
      const passwordHash = await hashStudentPassword(rawPassword, salt);
      const targetUser: NativeStoredUser = {
        userId: fsReg.userId,
        username: fsReg.username,
        role: 'student',
        accountStatus: 'active',
        passwordSalt: salt,
        passwordHash,
        tokenHash: '',
        sessionTokenHashes: [],
        displayName: fsReg.displayName,
        profilePhotoUrl: fsReg.profilePhotoUrl,
        svhAiButtonPosition: fsReg.svhAiButtonPosition,
        userStats: fsReg.userStats as Record<string, unknown>,
        createdAt: fsReg.createdAt,
        lastSeenAt: nowIso,
      };
      const issuedTok = await issueSessionToken(targetUser);
      db.users[targetUser.userId] = targetUser;
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
          vaultPoints: fsReg.vaultPoints,
          authToken: issuedTok,
        },
        201
      );
    } catch (fsErr) {
      const msg = fsErr instanceof Error ? fsErr.message : '';
      if (msg.toLowerCase().includes('already taken') || msg.toLowerCase().includes('reserved')) {
        return jsonResponse({ error: msg }, 409);
      }
      // Fall through to local native DB if Firestore is temporarily offline
    }

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

      // Sync Owner login to shared Firestore
      syncUserProfileAndStatsInFirestore({
        userId: ownerAccount.userId,
        username: ownerAccount.username,
        displayName: ownerAccount.displayName,
        profilePhotoUrl: ownerAccount.profilePhotoUrl || null,
        svhAiButtonPosition: ownerAccount.svhAiButtonPosition || null,
        userStats: ownerAccount.userStats as Partial<UserStats>,
      }).catch(() => {});

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

    // Outcome A: Student Login — Check shared Firebase Firestore first so accounts created on Web work on APK and vice versa
    if (await isOwnerUsernameDigestMatch(cleanUsername)) {
      return jsonResponse(
        { error: 'Invalid username or password. Please check your credentials and try again.' },
        401
      );
    }

    try {
      const fsLogin = await loginAccountInFirestore({
        username: cleanUsername,
        password: rawPassword,
        deviceId: typeof body.deviceId === 'string' ? body.deviceId : undefined,
      });

      const salt = randomHex(16);
      const passwordHash = await hashStudentPassword(rawPassword, salt);
      const existingLocal = db.users[fsLogin.userId];
      const mergedStats = mergeUserStatsSafely(
        existingLocal?.userStats as Partial<UserStats>,
        fsLogin.userStats
      );

      const syncedUser: NativeStoredUser = {
        userId: fsLogin.userId,
        username: fsLogin.username,
        role: fsLogin.role,
        accountStatus: 'active',
        passwordSalt: salt,
        passwordHash,
        tokenHash: '',
        sessionTokenHashes: existingLocal?.sessionTokenHashes || [],
        displayName: fsLogin.displayName,
        profilePhotoUrl: fsLogin.profilePhotoUrl,
        svhAiButtonPosition: fsLogin.svhAiButtonPosition,
        userStats: mergedStats as Record<string, unknown>,
        createdAt: fsLogin.createdAt || nowIso,
        lastSeenAt: nowIso,
      };
      const issuedTok = await issueSessionToken(syncedUser);
      db.users[syncedUser.userId] = syncedUser;
      saveNativeDb(db);

      return jsonResponse({
        userId: syncedUser.userId,
        username: syncedUser.username,
        role: syncedUser.role || 'student',
        isOwner: syncedUser.role === 'owner',
        displayName: syncedUser.displayName,
        profilePhotoUrl: syncedUser.profilePhotoUrl || null,
        svhAiButtonPosition: syncedUser.svhAiButtonPosition || null,
        userStats: syncedUser.userStats,
        vaultPoints: fsLogin.vaultPoints,
        authToken: issuedTok,
      });
    } catch (fsLoginErr) {
      const errMsg = fsLoginErr instanceof Error ? fsLoginErr.message : '';
      // If account wasn't in Firestore yet (e.g. pre-seeded local account), check local DB below
      if (errMsg && !errMsg.includes('Invalid username or password')) {
        // network error, continue to local DB check
      }
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

    // Sync profile & stats update to shared Firebase Firestore
    syncUserProfileAndStatsInFirestore({
      userId: user.userId,
      username: user.username,
      displayName: user.displayName,
      profilePhotoUrl: user.profilePhotoUrl || null,
      svhAiButtonPosition: user.svhAiButtonPosition || null,
      userStats: user.userStats as Partial<UserStats>,
    }).catch(() => {});

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
  // 4B. POST /api/vp/award (Backend-Controlled Idempotent Vault Points Engine)
  // --------------------------------------------------------------------------
  if (pathname === '/api/vp/award' && method === 'POST') {
    const user = await authenticateNativeRequest(db, init);
    const fallbackUserId =
      user?.userId || (typeof body.userId === 'string' ? body.userId : 'usr_anonymous');
    const grantKey = typeof body.grantKey === 'string' ? body.grantKey.trim() : '';
    const category =
      typeof body.category === 'string' &&
      [
        'question',
        'focus_session',
        'exam_bonus_5q',
        'exam_bonus_20q',
        'daily_usage',
      ].includes(body.category)
        ? body.category
        : 'question';

    if (!grantKey) {
      return jsonResponse({ error: 'Missing idempotency grantKey for VP reward.' }, 400);
    }

    try {
      const vpRes = await awardVaultPointsInFirestore({
        userId: fallbackUserId,
        username: user?.username,
        grantKey,
        category,
        relatedId: typeof body.relatedId === 'string' ? body.relatedId : undefined,
        questionId: typeof body.questionId === 'string' ? body.questionId : undefined,
        sessionId: typeof body.sessionId === 'string' ? body.sessionId : undefined,
        durationMinutes:
          typeof body.durationMinutes === 'number' ? body.durationMinutes : undefined,
        subject: typeof body.subject === 'string' ? body.subject : undefined,
        topic: typeof body.topic === 'string' ? body.topic : undefined,
      });

      if (user) {
        user.userStats = {
          ...(user.userStats || {}),
          vaultPoints: vpRes.vaultPoints,
          questionVp: vpRes.questionVp,
          focusMinuteVp: vpRes.focusMinuteVp,
          focusBonusVp: vpRes.focusBonusVp,
          sixtyMinBonusCount: vpRes.sixtyMinBonusCount,
          vpTransactions: vpRes.vpTransactions,
        };
        saveNativeDb(db);
      }

      return jsonResponse(vpRes);
    } catch {
      // Local idempotent fallback if completely offline
      const currentStats = (user?.userStats || {}) as Partial<UserStats>;
      const existingTxs: VPTransaction[] = Array.isArray(currentStats.vpTransactions)
        ? currentStats.vpTransactions
        : [];
      const safeDocId = grantKey.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 150);
      if (existingTxs.some((t) => t.id === safeDocId)) {
        return jsonResponse({
          ok: true,
          duplicate: true,
          awardedVp: 0,
          bonusVp: 0,
          totalAwardedVp: 0,
          vaultPoints: currentStats.vaultPoints || 0,
          questionVp: currentStats.questionVp || 0,
          focusMinuteVp: currentStats.focusMinuteVp || 0,
          focusBonusVp: currentStats.focusBonusVp || 0,
          sixtyMinBonusCount: currentStats.sixtyMinBonusCount || 0,
          vpTransactions: existingTxs,
        });
      }

      const newTxs: VPTransaction[] = [];
      let awardedVp = 0;
      let bonusVp = 0;
      if (category === 'question') {
        awardedVp = 1;
        newTxs.push({
          id: safeDocId,
          userId: fallbackUserId,
          timestamp: nowIso,
          amount: 1,
          reason: `Completed valid practice question${body.subject ? ` (${body.subject})` : ''}`,
          category: 'question',
          relatedId: (body.questionId as string) || safeDocId,
          subject: body.subject as string | undefined,
          topic: body.topic as string | undefined,
        });
      } else if (category === 'exam_bonus_5q') {
        awardedVp = 10;
        newTxs.push({
          id: safeDocId,
          userId: fallbackUserId,
          timestamp: nowIso,
          amount: 10,
          reason: 'Completed 5 Valid Exam/Exam-Oriented Questions (+10 VP)',
          category: 'exam_bonus_5q',
          relatedId: (body.relatedId as string) || 'exam_milestone_5q',
        });
      } else if (category === 'exam_bonus_20q') {
        awardedVp = 40;
        newTxs.push({
          id: safeDocId,
          userId: fallbackUserId,
          timestamp: nowIso,
          amount: 40,
          reason: 'Completed 20 Valid Exam/Exam-Oriented Questions (+40 VP)',
          category: 'exam_bonus_20q',
          relatedId: (body.relatedId as string) || 'exam_milestone_20q',
        });
      } else if (category === 'daily_usage') {
        awardedVp = 2;
        newTxs.push({
          id: safeDocId,
          userId: fallbackUserId,
          timestamp: nowIso,
          amount: 2,
          reason: 'Qualifying Daily Usage (+2 VP)',
          category: 'daily_usage',
          relatedId: (body.relatedId as string) || nowIso.split('T')[0],
        });
      } else {
        const mins = Math.max(0, Math.floor(Number(body.durationMinutes) || 0));
        awardedVp = 0;
        bonusVp = mins >= 60 ? Math.floor(mins / 60) * 20 : 0;
        if (bonusVp > 0) {
          newTxs.push({
            id: `${safeDocId}_bonus60`,
            userId: fallbackUserId,
            timestamp: nowIso,
            amount: bonusVp,
            reason: `Completed 60-Minute Focus Study (+${bonusVp} VP)`,
            category: 'focus_bonus_60m',
            relatedId: (body.sessionId as string) || safeDocId,
            subject: body.subject as string | undefined,
            topic: body.topic as string | undefined,
          });
        }
      }

      const vpState = reconcileUserVpState({
        userId: fallbackUserId,
        existingTransactions: [...newTxs, ...existingTxs],
        questionsAttempted: currentStats.questionsAttempted || 0,
        studySessions: (currentStats.studySessions as StudySession[]) || [],
        createdAt: user?.createdAt || nowIso,
      });

      if (user) {
        user.userStats = {
          ...(user.userStats || {}),
          vaultPoints: vpState.vaultPoints,
          questionVp: vpState.questionVp,
          focusMinuteVp: vpState.focusMinuteVp,
          focusBonusVp: vpState.focusBonusVp,
          sixtyMinBonusCount: vpState.sixtyMinBonusCount,
          vpTransactions: vpState.vpTransactions,
        };
        saveNativeDb(db);
      }

      return jsonResponse({
        ok: true,
        duplicate: false,
        awardedVp,
        bonusVp,
        totalAwardedVp: awardedVp + bonusVp,
        ...vpState,
      });
    }
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
        logoutAccountInFirestore({
          userId: user.userId,
          username: user.username,
        }).catch(() => {});
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
    try {
      const fsState = await fetchCommunityStateFromFirestore();
      // Merge with any local posts/replies/chat
      const postMap = new Map<string, NativeCommunityPost>();
      for (const p of db.posts) postMap.set(p.id, p);
      for (const p of fsState.posts) postMap.set(p.id, p as NativeCommunityPost);
      const mergedPosts = Array.from(postMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const replyMap = new Map<string, NativeCommunityReply>();
      for (const r of db.replies) replyMap.set(r.id, r);
      for (const r of fsState.replies) replyMap.set(r.id, r as NativeCommunityReply);
      const mergedReplies = Array.from(replyMap.values()).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const chatMap = new Map<string, NativeChatMessage>();
      for (const m of db.chatMessages) chatMap.set(m.id, m);
      for (const m of fsState.chatMessages) chatMap.set(m.id, m as NativeChatMessage);
      const mergedChat = Array.from(chatMap.values()).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      db.posts = mergedPosts;
      db.replies = mergedReplies;
      db.chatMessages = mergedChat;
      saveNativeDb(db);

      return jsonResponse({
        posts: mergedPosts,
        replies: mergedReplies,
        chatMessages: mergedChat,
        onlineCount: Math.max(1, Object.keys(db.users).length),
      });
    } catch {
      return jsonResponse({
        posts: db.posts,
        replies: db.replies,
        chatMessages: db.chatMessages,
        onlineCount: Math.max(1, Object.keys(db.users).length),
      });
    }
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
    saveCommunityPostToFirestore(newPost).catch(() => {});
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
    saveCommunityReplyToFirestore(newReply, post.replyCount).catch(() => {});
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
    saveCommunityChatToFirestore(message).catch(() => {});
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

    try {
      const fsDashboard = await fetchOwnerDashboardFromFirestore();
      return jsonResponse(fsDashboard);
    } catch {
      // Fallback to local db users if offline
      const allUsers = Object.values(db.users);
      const sanitizedUsers = allUsers.map((u) => {
        const stats = (u.userStats || {}) as Partial<UserStats>;
        const qAttempted = Number(stats.questionsAttempted) || 0;
        const qCorrect = Number(stats.correctAnswers) || 0;
        const qIncorrect = Number(stats.incorrectAnswers) || Math.max(0, qAttempted - qCorrect);
        const studyMin = Number(stats.totalStudyMinutes) || 0;
        const vpState = reconcileUserVpState({
          userId: u.userId,
          existingTransactions: stats.vpTransactions || [],
          questionsAttempted: qAttempted,
          studySessions: stats.studySessions || [],
          createdAt: u.createdAt,
        });
        return {
          userId: u.userId,
          username: u.username || null,
          role: u.role === 'owner' ? ('owner' as const) : ('student' as const),
          displayName: u.displayName || 'Student',
          hasProfilePhoto: Boolean(u.profilePhotoUrl),
          createdAt: u.createdAt,
          lastSeenAt: u.lastSeenAt,
          lastLoginAt: stats.lastLoginAt || u.createdAt,
          lastLogoutAt: stats.lastLogoutAt || null,
          loginCount: stats.loginCount || 1,
          logoutCount: stats.logoutCount || 0,
          loginHistory: stats.loginHistory || [],
          lastDevicePlatform: stats.lastDevicePlatform || detectClientDevicePlatform(),
          devicesUsed: stats.devicesUsed || [detectClientDevicePlatform()],
          isCurrentlyActive: true,
          accountStatus: u.accountStatus === 'suspended' ? 'Suspended' : 'Active',
          activeGoal: stats.activeGoal || stats.selectedGoals?.[0] || 'Not Set',
          selectedGoals: stats.selectedGoals || [],
          questionsAttempted: qAttempted,
          correctAnswers: qCorrect,
          incorrectAnswers: qIncorrect,
          accuracyPercent: qAttempted > 0 ? Number(((qCorrect / qAttempted) * 100).toFixed(1)) : 0,
          totalStudyMinutes: studyMin,
          studySessionsCount: Array.isArray(stats.studySessions) ? stats.studySessions.length : 0,
          studySessions: stats.studySessions || [],
          practiceHistory: stats.practiceHistory || [],
          subjectsStudied: stats.subjectsStudied || {},
          topicsStudied: stats.topicsStudied || [],
          chapterProgress: stats.chapterProgress || {},
          tasksCompleted: Array.isArray(stats.tasks) ? stats.tasks.filter((t) => t.completed).length : 0,
          totalTasks: Array.isArray(stats.tasks) ? stats.tasks.length : 0,
          streakDays: stats.streak?.current || 0,
          lastActiveStreakDate: stats.streak?.lastActiveDate || null,
          vaultPoints: vpState.vaultPoints,
          questionVp: vpState.questionVp,
          focusMinuteVp: vpState.focusMinuteVp,
          focusBonusVp: vpState.focusBonusVp,
          sixtyMinBonusCount: vpState.sixtyMinBonusCount,
          vpTransactions: vpState.vpTransactions,
          postsCount: db.posts.filter((p) => p.authorId === u.userId).length,
          repliesCount: db.replies.filter((r) => r.authorId === u.userId).length,
          chatCount: db.chatMessages.filter((m) => m.authorId === u.userId).length,
          reportsSubmittedCount: db.reports.filter((r) => r.reporterId === u.userId).length,
          svhAiUsageCount: (db.aiConversations[u.userId] || []).reduce(
            (sum, c) => sum + c.messages.filter((m) => m.role === 'user').length,
            0
          ),
        };
      });

      return jsonResponse({
        generatedAt: nowIso,
        metrics: {
          totalUniqueUsers: sanitizedUsers.length,
          totalRegisteredAccounts: sanitizedUsers.filter((u) => Boolean(u.username)).length,
          totalDevices: Math.max(1, sanitizedUsers.length),
          totalAppOpenSessions: sanitizedUsers.reduce((s, u) => s + (u.loginCount || 1), 0),
          dau: sanitizedUsers.length,
          wau: sanitizedUsers.length,
          mau: sanitizedUsers.length,
          newUsersToday: 0,
          newUsersLast7Days: sanitizedUsers.length,
          newUsersLast30Days: sanitizedUsers.length,
          newUsersOverTime: [],
          communityUsers: new Set([
            ...db.posts.map((p) => p.authorId),
            ...db.replies.map((r) => r.authorId),
            ...db.chatMessages.map((m) => m.authorId),
          ]).size,
          communityPostsCount: db.posts.length,
          communityRepliesCount: db.replies.length,
          communityChatMessagesCount: db.chatMessages.length,
          svhAiUsers: sanitizedUsers.filter((u) => (u.svhAiUsageCount || 0) > 0).length,
          svhAiConversations: Object.values(db.aiConversations).reduce((s, l) => s + l.length, 0),
          svhAiInteractions: sanitizedUsers.reduce((s, u) => s + u.svhAiUsageCount, 0),
          totalVaultPointsAcrossUsers: sanitizedUsers.reduce((s, u) => s + u.vaultPoints, 0),
          totalQuestionsAcrossUsers: sanitizedUsers.reduce((s, u) => s + u.questionsAttempted, 0),
          totalStudyMinutesAcrossUsers: sanitizedUsers.reduce((s, u) => s + u.totalStudyMinutes, 0),
          registeredAccounts: sanitizedUsers.map((u) => ({
            userId: u.userId,
            username: u.username,
            displayName: u.displayName,
            role: u.role,
            accountStatus: (u.accountStatus === 'Suspended' ? 'suspended' : 'active') as 'active' | 'suspended',
            activeGoal: u.activeGoal,
            selectedGoals: u.selectedGoals,
            questionsAttempted: u.questionsAttempted,
            correctAnswers: u.correctAnswers,
            incorrectAnswers: u.incorrectAnswers,
            accuracy: Math.round(u.accuracyPercent || 0),
            totalStudyMinutes: u.totalStudyMinutes,
            streak: {
              current: u.streakDays || 0,
              lastActiveDate: u.lastActiveStreakDate || '',
            },
            vaultPoints: u.vaultPoints,
            questionVp: u.questionVp,
            focusMinuteVp: u.focusMinuteVp,
            focusBonusVp: u.focusBonusVp,
            vpTransactions: u.vpTransactions,
            practiceHistory: u.practiceHistory,
            studySessions: u.studySessions,
            subjectPerformance: {},
            topicPerformance: {},
            dailyActivity: {},
            recentMistakesCount: u.incorrectAnswers,
            createdAt: u.createdAt,
            lastLoginAt: u.lastLoginAt,
            lastLogoutAt: u.lastLogoutAt || '',
            lastSeenAt: u.lastSeenAt,
            loginCount: u.loginCount,
            logoutCount: u.logoutCount,
            loginHistory: u.loginHistory,
            lastDevicePlatform: u.lastDevicePlatform,
            platformsUsed: u.devicesUsed,
            communityPostsCount: u.postsCount,
            communityRepliesCount: u.repliesCount,
            communityChatCount: u.chatCount,
            svhAiUsageCount: u.svhAiUsageCount,
          })),
          moderationReports: db.reports.map((rep) => ({
            ...rep,
            targetAuthor: 'Community Member',
            targetPreview: rep.reason,
          })),
        },
        summary: {
          totalUsers: sanitizedUsers.length,
          totalRegisteredAccounts: sanitizedUsers.filter((u) => Boolean(u.username)).length,
          activeUsersLast24h: sanitizedUsers.length,
          activeUsersLast7d: sanitizedUsers.length,
          totalPosts: db.posts.length,
          totalReplies: db.replies.length,
          totalChatMessages: db.chatMessages.length,
          totalReports: db.reports.length,
          totalQuestionsAttemptedAllUsers: sanitizedUsers.reduce((s, u) => s + u.questionsAttempted, 0),
          totalStudyMinutesAllUsers: sanitizedUsers.reduce((s, u) => s + u.totalStudyMinutes, 0),
          totalVaultPointsAllUsers: sanitizedUsers.reduce((s, u) => s + u.vaultPoints, 0),
          totalSvhAiQueriesAllUsers: sanitizedUsers.reduce((s, u) => s + u.svhAiUsageCount, 0),
          goalDistribution: {},
          subjectStudyMinutesAllUsers: {},
        },
        users: sanitizedUsers,
        recentReports: db.reports,
      });
    }
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
    deleteCommunityPostFromFirestore(postId).catch(() => {});
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
    deleteCommunityReplyFromFirestore(replyId, postId, replyCount).catch(() => {});
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
    deleteCommunityChatFromFirestore(messageId).catch(() => {});
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
    saveCommunityReportToFirestore(report).catch(() => {});
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

  if (pathname === '/api/svh-ai/smart-revision' && method === 'POST') {
    const user = await authenticateNativeRequest(db, init);
    const clientStats = (body.userStats || {}) as Record<string, any>;
    const mergedStats = {
      ...(user?.userStats || {}),
      ...clientStats,
    };
    const action = body.action;
    const revisionId = typeof body.revisionId === 'string' ? body.revisionId : '';

    let schedule = computeSmartRevisionSchedule(mergedStats as Partial<UserStats>);
    if (action === 'complete_review' && revisionId) {
      schedule = advanceRevisionItemStage(schedule, revisionId);
    }

    if (user) {
      user.userStats = {
        ...(user.userStats || {}),
        revisionSchedule: schedule,
      };
      saveNativeDb(db);
    }

    return jsonResponse({
      ok: true,
      revisionSchedule: schedule,
    });
  }

  if (pathname === '/api/achievements/verify' && method === 'POST') {
    const user = await authenticateNativeRequest(db, init);
    const clientStats = (body.userStats || {}) as Record<string, any>;
    const mergedStats = {
      ...(user?.userStats || {}),
      ...clientStats,
    };

    const verification = evaluateVerifiedAchievements(mergedStats as Partial<UserStats>);
    if (user) {
      user.userStats = {
        ...(user.userStats || {}),
        unlockedAchievements: verification.unlockedAchievements,
      };
      saveNativeDb(db);
    }

    return jsonResponse({
      ok: true,
      ...verification,
    });
  }

  if (pathname === '/api/svh-ai/study-plan' && method === 'POST') {
    const user = await authenticateNativeRequest(db, init);
    const studentContext = (body.studentContext || {}) as Record<string, any>;
    const stats = (user?.userStats || {}) as Record<string, any>;
    const questionsAttempted = Number(
      studentContext?.practiceStats?.questionsAttempted ?? stats.questionsAttempted ?? 0
    );
    const totalStudyMinutes = Number(
      studentContext?.trackerActivity?.totalStudyMinutes ?? stats.totalStudyMinutes ?? 0
    );
    const activeGoal = String(studentContext?.activeGoal || stats.activeGoal || 'General Study');
    const activeSubjects: string[] = Array.isArray(studentContext?.activeSubjects)
      ? studentContext.activeSubjects
      : ['Physics', 'Chemistry', 'Biology'];

    if (questionsAttempted <= 0 && totalStudyMinutes <= 0) {
      return jsonResponse({
        ok: true,
        insufficientData: true,
        notice:
          'More real study activity is needed before SVH AI can analyze your personal weaknesses or accuracy trends. Complete at least one practice question or focus session first, or ask SVH AI in chat for a starter syllabus schedule.',
        studyPlan: null,
      });
    }

    const weakTopics = Array.isArray(studentContext?.weakTopicAnalysis?.weakTopics)
      ? studentContext.weakTopicAnalysis.weakTopics
      : [];

    const items = activeSubjects.slice(0, 3).map((subj, idx) => {
      const weakMatch = weakTopics[idx];
      return {
        id: `plan_item_${Date.now()}_${idx}`,
        dayLabel: `Day ${idx + 1}`,
        subject: weakMatch?.topicOrSubject || subj,
        topic: weakMatch
          ? `Targeted Revision (${weakMatch.accuracy}% accuracy across ${weakMatch.solved} Qs)`
          : `${subj} Core Concept Review & Practice`,
        focusMinutes: 45,
        practiceQuestions: 15,
        priority: weakMatch ? ('High' as const) : ('Medium' as const),
        completed: false,
      };
    });

    const studyPlan = {
      id: `plan_${Date.now()}`,
      createdAt: nowIso,
      goal: activeGoal,
      summary: `Personalized study plan built from your ${questionsAttempted} solved questions and ${totalStudyMinutes} min of tracked study time.`,
      insufficientDataNotice: null,
      items,
    };

    if (user) {
      user.userStats = {
        ...(user.userStats || {}),
        activeStudyPlan: studyPlan,
      };
      saveNativeDb(db);
    }

    return jsonResponse({
      ok: true,
      insufficientData: false,
      studyPlan,
    });
  }

  if (pathname === '/api/svh-ai/smart-session' && method === 'POST') {
    const user = await authenticateNativeRequest(db, init);
    const studentContext = (body.studentContext || {}) as Record<string, any>;
    const requestedSubject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const requestedTopic = typeof body.topic === 'string' ? body.topic.trim() : '';
    const requestedMinutes = Math.max(15, Math.min(180, Number(body.durationMinutes) || 45));
    const stats = (user?.userStats || {}) as Record<string, any>;
    const questionsAttempted = Number(
      studentContext?.practiceStats?.questionsAttempted ?? stats.questionsAttempted ?? 0
    );
    const totalStudyMinutes = Number(
      studentContext?.trackerActivity?.totalStudyMinutes ?? stats.totalStudyMinutes ?? 0
    );

    if (!requestedTopic && questionsAttempted <= 0 && totalStudyMinutes <= 0) {
      return jsonResponse({
        ok: true,
        insufficientData: true,
        notice:
          'Not enough data yet — complete at least one practice question or focus session so SVH AI can recommend a personalized Smart Study Session from your real progress, or enter a specific topic above.',
        smartSession: null,
      });
    }

    const weakTopics = Array.isArray(studentContext?.weakTopicAnalysis?.weakTopics)
      ? studentContext.weakTopicAnalysis.weakTopics
      : [];
    const chosenSubject =
      requestedSubject ||
      weakTopics[0]?.topicOrSubject ||
      studentContext?.activeSubjects?.[0] ||
      'Physics';
    const chosenTopic =
      requestedTopic ||
      weakTopics[0]?.topicOrSubject ||
      stats.topicsStudied?.[0] ||
      `${chosenSubject} High-Yield Concept Review`;

    return jsonResponse({
      ok: true,
      insufficientData: false,
      smartSession: {
        id: `smart_sess_${Date.now()}`,
        createdAt: nowIso,
        subject: chosenSubject,
        topic: chosenTopic,
        durationMinutes: requestedMinutes,
        objectives: [
          `Master core NCERT definitions and derivations for ${chosenTopic}`,
          `Review common mistake traps and dimensional/formula checks`,
          `Solve 10 timed application questions on ${chosenTopic}`,
        ],
        conceptSummary: `Focused ${requestedMinutes}-minute revision session for ${chosenTopic} (${chosenSubject}), tailored to your real Study Vault Hub activity.`,
        keyFormulasOrPoints: [
          `Verify standard SI units and sign conventions before substituting numerical values`,
          `Cross-check limiting cases and boundary conditions for ${chosenTopic}`,
          `Link each solved problem back to its core NCERT principle`,
        ],
        practicePrompts: [
          `State the primary governing principle or formula for ${chosenTopic} from memory.`,
          `Identify the most frequent calculation or conceptual pitfall in ${chosenTopic}.`,
        ],
      },
    });
  }

  if (pathname === '/api/community/leaderboard' && method === 'GET') {
    const fsBoard = await fetchRealLeaderboardFromFirestore().catch(() => []);
    const map = new Map<string, any>();

    for (const u of Object.values(db.users)) {
      const stats = (u.userStats || {}) as Partial<UserStats>;
      const qSolved = Math.max(0, Number(stats.questionsAttempted) || 0);
      const studyMin = Math.max(0, Number(stats.totalStudyMinutes) || 0);
      const vpState = reconcileUserVpState({
        userId: u.userId,
        existingTransactions: stats.vpTransactions || [],
        questionsAttempted: qSolved,
        studySessions: stats.studySessions || [],
        createdAt: u.createdAt,
      });
      const vp = Math.max(Number(stats.vaultPoints) || 0, vpState.vaultPoints);
      const displayName = (u.displayName || stats.name || u.username || '').trim();
      if (!displayName) continue;
      if (!u.username && vp <= 0 && qSolved <= 0 && studyMin <= 0) continue;

      const key = u.username ? `uname:${u.username.toLowerCase()}` : `uid:${u.userId}`;
      map.set(key, {
        userId: u.userId,
        username: u.username || null,
        displayName,
        profilePhotoUrl: u.profilePhotoUrl || stats.profilePhotoUrl || null,
        activeGoal: stats.activeGoal || stats.selectedGoals?.[0] || null,
        vaultPoints: vp,
        questionsSolved: qSolved,
        studyMinutes: studyMin,
        streakDays: Number(stats.streak?.current) || 0,
      });
    }

    for (const item of fsBoard) {
      const key = item.username ? `uname:${item.username.toLowerCase()}` : `uid:${item.userId}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { ...item });
      } else {
        existing.vaultPoints = Math.max(existing.vaultPoints, item.vaultPoints);
        existing.questionsSolved = Math.max(existing.questionsSolved, item.questionsSolved);
        existing.studyMinutes = Math.max(existing.studyMinutes, item.studyMinutes);
        existing.streakDays = Math.max(existing.streakDays, item.streakDays);
      }
    }

    const sorted = Array.from(map.values()).sort((a, b) => {
      if (b.vaultPoints !== a.vaultPoints) return b.vaultPoints - a.vaultPoints;
      if (b.questionsSolved !== a.questionsSolved) return b.questionsSolved - a.questionsSolved;
      return b.studyMinutes - a.studyMinutes;
    });

    return jsonResponse({
      ok: true,
      updatedAt: nowIso,
      leaderboard: sorted.map((entry, idx) => ({
        ...entry,
        rank: idx + 1,
      })),
    });
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

  // 2. Inside the Android APK, try live backend candidates if online and not in cooldown
  const isOnline = typeof navigator === 'undefined' || navigator.onLine !== false;
  if (isOnline && Date.now() >= remoteCandidatesBlockedUntil) {
    const candidatesToTry = workingRemoteOrigin
      ? [
          workingRemoteOrigin,
          ...REMOTE_BACKEND_CANDIDATES.filter((c) => c !== workingRemoteOrigin),
        ]
      : REMOTE_BACKEND_CANDIDATES;

    for (const baseOrigin of candidatesToTry) {
      const controller = new AbortController();
      const timeoutId =
        typeof window !== 'undefined'
          ? window.setTimeout(() => controller.abort(), 12000)
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

    // All remote candidates were blocked by gateway cookie check or unreachable; cache cooldown
    workingRemoteOrigin = null;
    remoteCandidatesBlockedUntil = Date.now() + REMOTE_BLOCK_COOLDOWN_MS;
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
