import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI } from '@google/genai';
import {
  registerAccountInFirestore,
  loginAccountInFirestore,
  logoutAccountInFirestore,
  syncUserProfileAndStatsInFirestore,
  awardVaultPointsInFirestore,
  saveCommunityPostToFirestore,
  deleteCommunityPostFromFirestore,
  saveCommunityReplyToFirestore,
  deleteCommunityReplyFromFirestore,
  saveCommunityChatToFirestore,
  deleteCommunityChatFromFirestore,
  saveCommunityReportToFirestore,
  fetchOwnerDashboardFromFirestore,
  fetchCommunityStateFromFirestore,
} from './src/services/firebaseDb.ts';
import {
  calculateVaultPointsBreakdown,
  VP_REWARD_PER_QUESTION,
  VP_REWARD_PER_FOCUS_MINUTE,
  VP_REWARD_60_MIN_BONUS,
  evaluateVerifiedAchievements,
  computeSmartRevisionSchedule,
  advanceRevisionItemStage,
} from './src/utils/securityAndVp.ts';

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection in server process:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception in server process:', err);
});

interface StoredUser {
  userId: string;
  username?: string;
  role?: 'student' | 'owner';
  accountStatus?: 'active' | 'suspended';
  passwordSalt?: string;
  passwordHash?: string;
  tokenHash: string;
  sessionTokenHashes?: Array<{
    tokenHash: string;
    createdAt: string;
    lastUsedAt: string;
  }>;
  displayName: string;
  profilePhotoUrl?: string | null;
  svhAiButtonPosition?: { xRatio: number; yRatio: number } | null;
  userStats?: Record<string, unknown>;
  createdAt: string;
  lastSeenAt: string;
  lastLoginAt?: string;
  lastLogoutAt?: string;
  loginCount?: number;
  logoutCount?: number;
  loginHistory?: Array<{
    sessionId: string;
    loginAt: string;
    logoutAt?: string;
    lastActiveAt: string;
    devicePlatform: string;
    authMethod?: string;
    durationMinutes?: number;
  }>;
  lastDevicePlatform?: string;
  platformsUsed?: string[];
  vaultPoints?: number;
  questionVp?: number;
  focusMinuteVp?: number;
  focusBonusVp?: number;
  grantedVpKeys?: string[];
  vpTransactions?: Array<{
    id: string;
    userId: string;
    username?: string;
    amount: number;
    reason: string;
    category:
      | 'question'
      | 'focus_minute'
      | 'focus_minutes'
      | 'focus_bonus_60m'
      | 'exam_bonus_5q'
      | 'exam_bonus_20q'
      | 'daily_usage';
    relatedId: string;
    grantKey: string;
    timestamp: string;
  }>;
}

export interface CommunityPostRecord {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  subject: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  replyCount: number;
}

export interface CommunityReplyRecord {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  content: string;
  imageUrl?: string;
  createdAt: string;
}

export interface CommunityChatMessageRecord {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  content: string;
  subjectTag?: string;
  createdAt: string;
}

export interface CommunityReportRecord {
  id: string;
  targetType: 'post' | 'reply' | 'chat';
  targetId: string;
  reason: string;
  details?: string;
  reporterId: string;
  createdAt: string;
}

export interface SVHAIMessageRecord {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  createdAt: string;
}

export interface SVHAIConversationRecord {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: SVHAIMessageRecord[];
}

export interface AnalyticsSessionRecord {
  sessionId: string;
  userId: string;
  deviceIdHash: string;
  openedAt: string;
}

export interface OwnerAuthState {
  passphraseSalt?: string;
  passphraseHash?: string;
  setupCompletedAt?: string;
  activeSessionTokenHashes: Array<{
    tokenHash: string;
    createdAt: string;
    lastUsedAt: string;
  }>;
}

interface CommunityDatabaseSchema {
  users: Record<string, StoredUser>;
  posts: CommunityPostRecord[];
  replies: CommunityReplyRecord[];
  chatMessages: CommunityChatMessageRecord[];
  reports: CommunityReportRecord[];
  aiConversations: Record<string, SVHAIConversationRecord[]>;
  analyticsSessions?: AnalyticsSessionRecord[];
  registeredDeviceHashes?: Record<string, { firstSeenAt: string; lastSeenAt: string; userIds: string[] }>;
  ownerAuth?: OwnerAuthState;
}

let DATA_DIR = path.join(process.cwd(), '.data');
let DB_FILE = path.join(DATA_DIR, 'community_db.json');

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    DATA_DIR = path.join('/tmp', 'svh-data');
    DB_FILE = path.join(DATA_DIR, 'community_db.json');
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch {
      // ignore if fallback directory creation fails
    }
  }
}

function loadDatabase(): CommunityDatabaseSchema {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    const emptyDb: CommunityDatabaseSchema = {
      users: {},
      posts: [],
      replies: [],
      chatMessages: [],
      reports: [],
      aiConversations: {},
      analyticsSessions: [],
      registeredDeviceHashes: {},
      ownerAuth: {
        activeSessionTokenHashes: [],
      },
    };
    saveDatabase(emptyDb);
    return emptyDb;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      users: parsed.users || {},
      posts: Array.isArray(parsed.posts) ? parsed.posts : [],
      replies: Array.isArray(parsed.replies) ? parsed.replies : [],
      chatMessages: Array.isArray(parsed.chatMessages) ? parsed.chatMessages : [],
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
      aiConversations: parsed.aiConversations && typeof parsed.aiConversations === 'object' ? parsed.aiConversations : {},
      analyticsSessions: Array.isArray(parsed.analyticsSessions) ? parsed.analyticsSessions : [],
      registeredDeviceHashes:
        parsed.registeredDeviceHashes && typeof parsed.registeredDeviceHashes === 'object'
          ? parsed.registeredDeviceHashes
          : {},
      ownerAuth:
        parsed.ownerAuth && typeof parsed.ownerAuth === 'object'
          ? {
              passphraseSalt: parsed.ownerAuth.passphraseSalt,
              passphraseHash: parsed.ownerAuth.passphraseHash,
              setupCompletedAt: parsed.ownerAuth.setupCompletedAt,
              activeSessionTokenHashes: Array.isArray(parsed.ownerAuth.activeSessionTokenHashes)
                ? parsed.ownerAuth.activeSessionTokenHashes
                : [],
            }
          : { activeSessionTokenHashes: [] },
    };
  } catch (err) {
    console.error('Failed to read community DB, initializing empty state:', err);
    return {
      users: {},
      posts: [],
      replies: [],
      chatMessages: [],
      reports: [],
      aiConversations: {},
      analyticsSessions: [],
      registeredDeviceHashes: {},
      ownerAuth: {
        activeSessionTokenHashes: [],
      },
    };
  }
}

function saveDatabase(dbState: CommunityDatabaseSchema) {
  ensureDataDir();
  const tmpFile = `${DB_FILE}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tmpFile, JSON.stringify(dbState, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
  } catch (err) {
    console.error('Error saving community DB:', err);
    if (fs.existsSync(tmpFile)) {
      try {
        fs.unlinkSync(tmpFile);
      } catch {
        // ignore cleanup error
      }
    }
  }
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function sanitizeDisplayName(name: unknown): string {
  if (typeof name !== 'string') return 'Student';
  const cleaned = name.trim().replace(/\s+/g, ' ').slice(0, 50);
  return cleaned || 'Student';
}

function normalizeUsername(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().toLowerCase().replace(/[^a-z0-9_.@-]/g, '').slice(0, 48);
}

// Cryptographic hashes for the configured Owner credentials (never stored as plaintext)
const DEFAULT_OWNER_USERNAME_HASH =
  '6b1cb41810a94a9334ee35a4696df3e389b8a11d2452ef746ab3fe807002b5b8';
const DEFAULT_OWNER_PASSWORD_SALT = '7f9c2e4a8b1d6f3e5a0c9b8e7d6c5b4a';
const DEFAULT_OWNER_PASSWORD_HASH =
  '18f72cadf399a956b8fa037e8307b7e0049357ae69cbcaf73ce74653bed1ba88491e02350e9680dbc8c82ba175e7a8f9c3c53e209a929ca546440f3a44d18c60';

function safeTimingEqualHex(hexA: string, hexB: string): boolean {
  try {
    const a = Buffer.from(hexA, 'hex');
    const b = Buffer.from(hexB, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function isConfiguredOwnerUsername(usernameRaw: unknown): boolean {
  const cleaned = normalizeUsername(usernameRaw);
  if (!cleaned) return false;
  const envOwnerUser = process.env.OWNER_USERNAME?.trim();
  if (envOwnerUser && envOwnerUser !== 'YOUR_OWNER_USERNAME') {
    if (cleaned === normalizeUsername(envOwnerUser)) {
      return true;
    }
  }
  const inputHash = hashToken(cleaned);
  return safeTimingEqualHex(inputHash, DEFAULT_OWNER_USERNAME_HASH);
}

function verifyOwnerPassword(passwordRaw: unknown): boolean {
  if (typeof passwordRaw !== 'string' || !passwordRaw) return false;
  const envOwnerPass = process.env.OWNER_PASSWORD?.trim();
  if (envOwnerPass && envOwnerPass !== 'YOUR_OWNER_PASSWORD') {
    const a = Buffer.from(hashToken(passwordRaw), 'hex');
    const b = Buffer.from(hashToken(envOwnerPass), 'hex');
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return true;
    }
  }
  try {
    const computedHex = crypto
      .scryptSync(passwordRaw, DEFAULT_OWNER_PASSWORD_SALT, 64)
      .toString('hex');
    return safeTimingEqualHex(computedHex, DEFAULT_OWNER_PASSWORD_HASH);
  } catch {
    return false;
  }
}

function hashUserPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyUserPassword(password: string, salt?: string, storedHash?: string): boolean {
  if (!salt || !storedHash) return false;
  try {
    const computedHex = hashUserPassword(password, salt);
    const a = Buffer.from(computedHex, 'hex');
    const b = Buffer.from(storedHash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

const db = loadDatabase();

function issueUserSessionToken(user: StoredUser): string {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const nowIso = new Date().toISOString();
  user.tokenHash = tokenHash;
  if (!Array.isArray(user.sessionTokenHashes)) {
    user.sessionTokenHashes = [];
  }
  user.sessionTokenHashes.push({
    tokenHash,
    createdAt: nowIso,
    lastUsedAt: nowIso,
  });
  // Keep up to 30 active cross-device tokens per account
  if (user.sessionTokenHashes.length > 30) {
    user.sessionTokenHashes = user.sessionTokenHashes.slice(-30);
  }
  return rawToken;
}

function authenticateRequest(req: express.Request): StoredUser | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  const targetHash = hashToken(token);
  const foundUser = Object.values(db.users).find((u) => {
    if (u.tokenHash === targetHash) return true;
    if (Array.isArray(u.sessionTokenHashes)) {
      const matched = u.sessionTokenHashes.find((s) => s.tokenHash === targetHash);
      if (matched) {
        matched.lastUsedAt = new Date().toISOString();
        return true;
      }
    }
    return false;
  });
  if (!foundUser) return null;
  if (foundUser.accountStatus === 'suspended' && foundUser.role !== 'owner') {
    return null;
  }
  return foundUser;
}

function hashOwnerPassphrase(passphrase: string, salt: string): string {
  return crypto.scryptSync(passphrase, salt, 64).toString('hex');
}

function verifyOwnerPassphrase(passphrase: string): boolean {
  if (verifyOwnerPassword(passphrase)) {
    return true;
  }
  const envSecret = process.env.SVH_OWNER_PASSPHRASE?.trim();
  if (envSecret && passphrase === envSecret) {
    return true;
  }
  const ownerAuth = db.ownerAuth;
  if (!ownerAuth?.passphraseSalt || !ownerAuth?.passphraseHash) {
    return false;
  }
  try {
    const computedHex = hashOwnerPassphrase(passphrase, ownerAuth.passphraseSalt);
    const a = Buffer.from(computedHex, 'hex');
    const b = Buffer.from(ownerAuth.passphraseHash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function authenticateOwnerRequest(req: express.Request): boolean {
  // 1. Check unified Bearer session token belonging to the authenticated Owner account
  const authedUser = authenticateRequest(req);
  if (
    authedUser &&
    authedUser.role === 'owner' &&
    isConfiguredOwnerUsername(authedUser.username || '')
  ) {
    return true;
  }

  // 2. Also check explicit Owner session token hashes in db.ownerAuth
  const ownerHeader = req.headers['x-owner-authorization'] || req.headers.authorization;
  if (typeof ownerHeader !== 'string' || !ownerHeader.startsWith('Bearer ')) {
    return false;
  }
  const rawToken = ownerHeader.slice(7).trim();
  if (!rawToken) return false;
  const targetHash = hashToken(rawToken);
  const sessions = db.ownerAuth?.activeSessionTokenHashes || [];
  const found = sessions.find((s) => s.tokenHash === targetHash);
  if (!found) return false;
  found.lastUsedAt = new Date().toISOString();
  return true;
}

function registerAnonymousDevice(deviceIdRaw: unknown, userId: string, nowIso: string): string {
  if (!db.registeredDeviceHashes) {
    db.registeredDeviceHashes = {};
  }
  const cleanDevice =
    typeof deviceIdRaw === 'string' && deviceIdRaw.trim().length >= 8
      ? deviceIdRaw.trim().slice(0, 128)
      : `usr_dev_${userId}`;
  const deviceHash = hashToken(`svh_device_${cleanDevice}`).slice(0, 32);
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

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = '0.0.0.0';

  // Cloud Run / container readiness & health check endpoint
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'study-vault-hub', port: PORT });
  });

  // Standard security headers (iframe-compatible for AI Studio preview)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Enable CORS for native Android APK (https://localhost / capacitor://localhost)
  app.use('/api', (req, res, next) => {
    const reqOrigin = req.headers.origin;
    res.setHeader('Access-Control-Allow-Origin', reqOrigin || '*');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Owner-Authorization, Accept'
    );
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Serve the real signed Android APK file with proper Android package headers once placed in public/StudyVaultHub.apk,
  // or redirect directly to the official external GitHub Release APK asset.
  app.get(['/StudyVaultHub.apk', '/api/apk/download'], (_req, res) => {
    const apkPath = path.join(process.cwd(), 'public', 'StudyVaultHub.apk');
    if (!fs.existsSync(apkPath)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      return res.redirect(
        302,
        'https://github.com/babanrana2008-crypto/Study-Vault-Hub/releases/download/v1.1.0/Best.app-debug.apk'
      );
    }
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="StudyVaultHub.apk"');
    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(apkPath);
  });

  app.use(express.json({ limit: '8mb' }));

  // Background startup sync of local registered accounts & community posts into shared Firebase Firestore
  setTimeout(async () => {
    try {
      for (const u of Object.values(db.users)) {
        if (u.username) {
          await syncUserProfileAndStatsInFirestore({
            userId: u.userId,
            username: u.username,
            name: u.displayName,
            targetExam: (u.userStats?.activeGoal as string) || 'NEET',
            stats: u.userStats as any,
            devicePlatform: u.lastDevicePlatform || 'Web Server',
          }).catch(() => {});
        }
      }
      for (const p of db.posts) {
        await saveCommunityPostToFirestore(p).catch(() => {});
      }
      for (const r of db.replies) {
        await saveCommunityReplyToFirestore(r).catch(() => {});
      }
      for (const m of db.chatMessages) {
        await saveCommunityChatToFirestore(m).catch(() => {});
      }
    } catch {
      // ignore startup sync errors
    }
  }, 1500);

  // WebSocket setup on /ws/community
  const wss = new WebSocketServer({ noServer: true });
  const connectedClients = new Set<WebSocket>();

  function broadcastEvent(payload: Record<string, unknown>) {
    const serialized = JSON.stringify(payload);
    for (const client of connectedClients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(serialized);
        } catch {
          // ignore broken socket send
        }
      }
    }
  }

  function broadcastPresence() {
    broadcastEvent({
      type: 'presence:count',
      onlineCount: connectedClients.size,
    });
  }

  wss.on('connection', (ws: WebSocket) => {
    connectedClients.add(ws);
    broadcastPresence();

    // Send initial state snapshot on connect
    try {
      ws.send(
        JSON.stringify({
          type: 'init',
          posts: db.posts,
          replies: db.replies,
          chatMessages: db.chatMessages,
          onlineCount: connectedClients.size,
        })
      );
    } catch {
      // ignore error
    }

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(String(raw));
        if (data?.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', onlineCount: connectedClients.size }));
        }
      } catch {
        // ignore malformed client ws frame
      }
    });

    ws.on('close', () => {
      connectedClients.delete(ws);
      broadcastPresence();
    });

    ws.on('error', () => {
      connectedClients.delete(ws);
      broadcastPresence();
    });
  });

  server.on('upgrade', (request, socket, head) => {
    try {
      const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      if (url.pathname === '/ws/community') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    } catch {
      // Allow other upgrade handlers (like Vite HMR) to handle non-community paths
    }
  });

  // ============================================================================
  // API ROUTES FOR REAL ACCOUNT SYSTEM, AUTHENTICATION & CROSS-DEVICE SYNC
  // ============================================================================

  // Register a new Student account (or upgrade an existing anonymous session to a permanent Student account)
  app.post('/api/auth/register', async (req, res) => {
    const rawName = sanitizeDisplayName(req.body?.name);
    const cleanUsername = normalizeUsername(req.body?.username);
    const rawPassword = typeof req.body?.password === 'string' ? req.body.password : '';
    const rawConfirmPassword =
      typeof req.body?.confirmPassword === 'string' ? req.body.confirmPassword : rawPassword;
    const selectedGoals = Array.isArray(req.body?.selectedGoals)
      ? req.body.selectedGoals.filter((g: unknown) => typeof g === 'string' && g.trim().length > 0)
      : [];
    const activeGoal =
      typeof req.body?.activeGoal === 'string' && req.body.activeGoal.trim()
        ? req.body.activeGoal.trim()
        : selectedGoals[0] || '';
    const rawClientStats =
      req.body?.userStats && typeof req.body.userStats === 'object' ? req.body.userStats : {};
    const devicePlatform =
      typeof req.body?.devicePlatform === 'string' && req.body.devicePlatform.trim()
        ? req.body.devicePlatform.trim()
        : 'Desktop Web';

    if (!rawName || rawName.length < 1) {
      return res.status(400).json({ error: 'Please enter your name.' });
    }
    if (!cleanUsername || cleanUsername.length < 3) {
      return res.status(400).json({
        error: 'Username must be at least 3 characters (letters, numbers, underscores, dots, or hyphens).',
      });
    }
    if (isConfiguredOwnerUsername(cleanUsername)) {
      return res.status(409).json({
        error: 'That username is reserved. Please log in to your existing account or choose a different username.',
      });
    }
    if (rawPassword.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long.',
      });
    }
    if (rawPassword !== rawConfirmPassword) {
      return res.status(400).json({
        error: 'Password and confirm password do not match.',
      });
    }
    if (selectedGoals.length === 0) {
      return res.status(400).json({
        error: 'Please select at least one study goal or exam.',
      });
    }

    const existingAuthUser = authenticateRequest(req);

    // Check username uniqueness across all local accounts
    const usernameTakenByOther = Object.values(db.users).find(
      (u) =>
        u.username &&
        u.username.toLowerCase() === cleanUsername &&
        (!existingAuthUser || u.userId !== existingAuthUser.userId)
    );
    if (usernameTakenByOther) {
      return res.status(409).json({
        error: 'That username is already taken. Please choose a different username or log in to your existing account.',
      });
    }

    // Also register in shared Firebase Firestore so Web and Android APK share the same account namespace
    let firestoreRegistered: any = null;
    try {
      firestoreRegistered = await registerAccountInFirestore({
        name: rawName,
        username: cleanUsername,
        password: rawPassword,
        targetExam: activeGoal || 'NEET',
        initialStats: rawClientStats as any,
        devicePlatform,
      });
    } catch (fsErr: any) {
      if (fsErr?.message?.includes('already taken')) {
        return res.status(409).json({ error: fsErr.message });
      }
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashUserPassword(rawPassword, salt);
    const nowIso = new Date().toISOString();

    // Strip any privilege-sensitive keys from client-supplied stats
    const sanitizedClientStats: Record<string, unknown> = { ...(rawClientStats as Record<string, unknown>) };
    delete sanitizedClientStats.role;
    delete sanitizedClientStats.isOwner;
    delete sanitizedClientStats.accountStatus;
    delete sanitizedClientStats.passwordHash;
    delete sanitizedClientStats.passwordSalt;
    delete sanitizedClientStats.tokenHash;

    const vpBreakdown = calculateVaultPointsBreakdown(sanitizedClientStats as any);
    const initialSessionEntry = {
      sessionId: `sess_${crypto.randomUUID()}`,
      loginAt: nowIso,
      lastActiveAt: nowIso,
      devicePlatform,
      authMethod: 'register',
    };

    let targetUser: StoredUser;
    if (existingAuthUser && !existingAuthUser.username && existingAuthUser.role !== 'owner') {
      targetUser = existingAuthUser;
      targetUser.username = cleanUsername;
      targetUser.role = 'student';
      targetUser.accountStatus = 'active';
      targetUser.passwordSalt = salt;
      targetUser.passwordHash = passwordHash;
      targetUser.displayName = rawName;
      targetUser.lastSeenAt = nowIso;
      targetUser.lastLoginAt = nowIso;
      targetUser.loginCount = 1;
      targetUser.logoutCount = 0;
      targetUser.loginHistory = [initialSessionEntry];
      targetUser.lastDevicePlatform = devicePlatform;
      targetUser.platformsUsed = [devicePlatform];
      targetUser.vaultPoints = vpBreakdown.vaultPoints;
      targetUser.questionVp = vpBreakdown.questionVp;
      targetUser.focusMinuteVp = vpBreakdown.focusMinuteVp;
      targetUser.focusBonusVp = vpBreakdown.focusBonusVp;
      targetUser.grantedVpKeys = [];
      targetUser.vpTransactions = firestoreRegistered?.vpTransactions || [];
    } else {
      const userId = firestoreRegistered?.id || `usr_${crypto.randomUUID()}`;
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
        lastLoginAt: nowIso,
        loginCount: 1,
        logoutCount: 0,
        loginHistory: [initialSessionEntry],
        lastDevicePlatform: devicePlatform,
        platformsUsed: [devicePlatform],
        vaultPoints: vpBreakdown.vaultPoints,
        questionVp: vpBreakdown.questionVp,
        focusMinuteVp: vpBreakdown.focusMinuteVp,
        focusBonusVp: vpBreakdown.focusBonusVp,
        grantedVpKeys: [],
        vpTransactions: firestoreRegistered?.vpTransactions || [],
      };
      db.users[userId] = targetUser;
    }

    const mergedStats: Record<string, unknown> = {
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
      vaultPoints: targetUser.vaultPoints || 0,
      questionVp: targetUser.questionVp || 0,
      focusMinuteVp: targetUser.focusMinuteVp || 0,
      focusBonusVp: targetUser.focusBonusVp || 0,
      vpTransactions: targetUser.vpTransactions || [],
      loginCount: 1,
      logoutCount: 0,
      loginHistory: targetUser.loginHistory || [],
      lastDevicePlatform: devicePlatform,
      platformsUsed: targetUser.platformsUsed || [devicePlatform],
    };
    targetUser.userStats = mergedStats;

    const authToken = issueUserSessionToken(targetUser);
    if (req.body?.deviceId) {
      registerAnonymousDevice(req.body.deviceId, targetUser.userId, nowIso);
    }

    saveDatabase(db);

    return res.status(201).json({
      userId: targetUser.userId,
      username: targetUser.username,
      role: 'student',
      isOwner: false,
      displayName: targetUser.displayName,
      profilePhotoUrl: targetUser.profilePhotoUrl || null,
      svhAiButtonPosition: targetUser.svhAiButtonPosition || null,
      userStats: targetUser.userStats,
      authToken,
    });
  });

  // UNIFIED LOGIN ENDPOINT: Authenticates either the Owner or a registered Student from the SAME Login screen
  app.post('/api/auth/login', async (req, res) => {
    const cleanUsername = normalizeUsername(req.body?.username);
    const rawPassword = typeof req.body?.password === 'string' ? req.body.password : '';
    const devicePlatform =
      typeof req.body?.devicePlatform === 'string' && req.body.devicePlatform.trim()
        ? req.body.devicePlatform.trim()
        : 'Desktop Web';

    if (!cleanUsername || !rawPassword) {
      return res.status(400).json({ error: 'Please enter both your username and password.' });
    }

    const nowIso = new Date().toISOString();

    // =========================================================================
    // OUTCOME B: OWNER CREDENTIALS SUBMITTED -> SECURE OWNER MODE
    // =========================================================================
    if (isConfiguredOwnerUsername(cleanUsername)) {
      if (!verifyOwnerPassword(rawPassword)) {
        return res.status(401).json({
          error: 'Invalid username or password. Please check your credentials and try again.',
        });
      }

      // Find existing canonical Owner user record (never create duplicate Owner accounts)
      let ownerUser = Object.values(db.users).find(
        (u) => u.role === 'owner' || isConfiguredOwnerUsername(u.username || '')
      );

      const existingAnonUser = authenticateRequest(req);

      if (!ownerUser) {
        if (existingAnonUser && !existingAnonUser.username) {
          ownerUser = existingAnonUser;
          ownerUser.username = cleanUsername;
          ownerUser.role = 'owner';
          ownerUser.accountStatus = 'active';
          ownerUser.displayName =
            ownerUser.displayName && ownerUser.displayName !== 'Student'
              ? ownerUser.displayName
              : 'Soumyadip Rana';
          ownerUser.lastSeenAt = nowIso;
        } else {
          const ownerUserId = 'usr_owner_founder';
          ownerUser = {
            userId: ownerUserId,
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
          db.users[ownerUserId] = ownerUser;
        }
      } else {
        ownerUser.username = cleanUsername;
        ownerUser.role = 'owner';
        ownerUser.accountStatus = 'active';
        ownerUser.lastSeenAt = nowIso;
        if (!ownerUser.displayName || ownerUser.displayName === 'Student') {
          ownerUser.displayName = 'Soumyadip Rana';
        }
      }

      ownerUser.lastLoginAt = nowIso;
      ownerUser.loginCount = (Number(ownerUser.loginCount) || 0) + 1;
      ownerUser.lastDevicePlatform = devicePlatform;
      ownerUser.platformsUsed = Array.from(new Set([...(ownerUser.platformsUsed || []), devicePlatform]));
      const ownerSessionEntry = {
        sessionId: `sess_${crypto.randomUUID()}`,
        loginAt: nowIso,
        lastActiveAt: nowIso,
        devicePlatform,
        authMethod: 'owner_login',
      };
      ownerUser.loginHistory = [ownerSessionEntry, ...(ownerUser.loginHistory || [])].slice(0, 50);

      // Never store the Owner password or hash inside the normal user record
      delete ownerUser.passwordHash;
      delete ownerUser.passwordSalt;

      const existingStats = (ownerUser.userStats || {}) as Record<string, unknown>;
      const existingGoals = Array.isArray(existingStats.selectedGoals)
        ? (existingStats.selectedGoals as string[]).filter((g) => typeof g === 'string' && g.trim())
        : [];
      const resolvedGoals = existingGoals.length > 0 ? existingGoals : ['NEET', 'JEE Main'];
      const resolvedActiveGoal =
        typeof existingStats.activeGoal === 'string' && existingStats.activeGoal.trim()
          ? existingStats.activeGoal
          : resolvedGoals[0];

      const vpBreakdown = calculateVaultPointsBreakdown(existingStats as any, ownerUser.vpTransactions || []);
      ownerUser.vaultPoints = Math.max(Number(ownerUser.vaultPoints || 0), vpBreakdown.vaultPoints);
      ownerUser.questionVp = Math.max(Number(ownerUser.questionVp || 0), vpBreakdown.questionVp);
      ownerUser.focusMinuteVp = Math.max(Number(ownerUser.focusMinuteVp || 0), vpBreakdown.focusMinuteVp);
      ownerUser.focusBonusVp = Math.max(Number(ownerUser.focusBonusVp || 0), vpBreakdown.focusBonusVp);

      const resolvedOwnerStats: Record<string, unknown> = {
        ...existingStats,
        userId: ownerUser.userId,
        username: ownerUser.username,
        role: 'owner',
        name: ownerUser.displayName || 'Soumyadip Rana',
        profilePhotoUrl:
          ownerUser.profilePhotoUrl !== undefined
            ? ownerUser.profilePhotoUrl
            : (existingStats.profilePhotoUrl as string | null) || null,
        svhAiButtonPosition:
          ownerUser.svhAiButtonPosition !== undefined
            ? ownerUser.svhAiButtonPosition
            : (existingStats.svhAiButtonPosition as { xRatio: number; yRatio: number } | null) ||
              null,
        selectedGoals: resolvedGoals,
        activeGoal: resolvedActiveGoal,
        hasCompletedSetup: true,
        vaultPoints: ownerUser.vaultPoints,
        questionVp: ownerUser.questionVp,
        focusMinuteVp: ownerUser.focusMinuteVp,
        focusBonusVp: ownerUser.focusBonusVp,
        vpTransactions: ownerUser.vpTransactions || [],
        loginCount: ownerUser.loginCount,
        logoutCount: ownerUser.logoutCount || 0,
        lastLogoutAt: ownerUser.lastLogoutAt || '',
        loginHistory: ownerUser.loginHistory,
        lastDevicePlatform: devicePlatform,
        platformsUsed: ownerUser.platformsUsed,
      };
      ownerUser.userStats = resolvedOwnerStats;

      // Sync Owner login to shared Firestore
      loginAccountInFirestore({
        username: cleanUsername,
        password: rawPassword,
        devicePlatform,
      }).catch(() => {});

      const authToken = issueUserSessionToken(ownerUser);
      const tokenHash = hashToken(authToken);

      if (!db.ownerAuth) {
        db.ownerAuth = { activeSessionTokenHashes: [] };
      }
      if (!Array.isArray(db.ownerAuth.activeSessionTokenHashes)) {
        db.ownerAuth.activeSessionTokenHashes = [];
      }
      db.ownerAuth.activeSessionTokenHashes.push({
        tokenHash,
        createdAt: nowIso,
        lastUsedAt: nowIso,
      });
      if (db.ownerAuth.activeSessionTokenHashes.length > 30) {
        db.ownerAuth.activeSessionTokenHashes = db.ownerAuth.activeSessionTokenHashes.slice(-30);
      }

      if (req.body?.deviceId) {
        registerAnonymousDevice(req.body.deviceId, ownerUser.userId, nowIso);
      }

      saveDatabase(db);

      return res.json({
        userId: ownerUser.userId,
        username: ownerUser.username,
        role: 'owner',
        isOwner: true,
        displayName: ownerUser.displayName,
        profilePhotoUrl: ownerUser.profilePhotoUrl || null,
        svhAiButtonPosition: ownerUser.svhAiButtonPosition || null,
        userStats: ownerUser.userStats,
        authToken,
      });
    }

    // =========================================================================
    // OUTCOME A: NORMAL STUDENT CREDENTIALS SUBMITTED -> SECURE STUDENT MODE
    // =========================================================================
    let foundUser = Object.values(db.users).find(
      (u) => u.username && u.username.toLowerCase() === cleanUsername && u.role !== 'owner'
    );

    // Check shared Firebase Firestore so accounts registered on the Android APK can sign in on Web and vice versa
    let firestoreUser: any = null;
    try {
      firestoreUser = await loginAccountInFirestore({
        username: cleanUsername,
        password: rawPassword,
        devicePlatform,
      });
    } catch (fsErr: any) {
      if (!foundUser) {
        return res.status(401).json({
          error: fsErr?.message || 'Invalid username or password. Please check your credentials and try again.',
        });
      }
    }

    if (!foundUser && firestoreUser) {
      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashUserPassword(rawPassword, salt);
      const hydratedId = firestoreUser.id || `usr_${crypto.randomUUID()}`;
      foundUser = {
        userId: hydratedId,
        username: firestoreUser.username || cleanUsername,
        role: 'student',
        accountStatus: 'active',
        passwordSalt: salt,
        passwordHash,
        tokenHash: '',
        sessionTokenHashes: [],
        displayName: firestoreUser.name || cleanUsername,
        profilePhotoUrl: firestoreUser.stats?.profilePhotoUrl || null,
        svhAiButtonPosition: firestoreUser.stats?.svhAiButtonPosition || null,
        userStats: firestoreUser.stats || {},
        createdAt: firestoreUser.createdAt || nowIso,
        lastSeenAt: nowIso,
        lastLoginAt: nowIso,
        loginCount: firestoreUser.loginCount || 1,
        logoutCount: firestoreUser.logoutCount || 0,
        loginHistory: firestoreUser.loginHistory || [],
        lastDevicePlatform: devicePlatform,
        platformsUsed: firestoreUser.platformsUsed || [devicePlatform],
        vaultPoints: firestoreUser.vaultPoints || 0,
        questionVp: firestoreUser.questionVp || 0,
        focusMinuteVp: firestoreUser.focusMinuteVp || 0,
        focusBonusVp: firestoreUser.focusBonusVp || 0,
        vpTransactions: firestoreUser.vpTransactions || [],
      };
      db.users[hydratedId] = foundUser;
    }

    if (
      !foundUser ||
      (!firestoreUser && !verifyUserPassword(rawPassword, foundUser.passwordSalt, foundUser.passwordHash))
    ) {
      return res.status(401).json({
        error: 'Invalid username or password. Please check your credentials and try again.',
      });
    }

    if (foundUser.accountStatus === 'suspended') {
      return res.status(403).json({
        error: 'This account has been suspended by the administrator. Access denied.',
      });
    }

    foundUser.role = 'student';
    foundUser.accountStatus = foundUser.accountStatus || 'active';
    foundUser.lastSeenAt = nowIso;
    foundUser.lastLoginAt = nowIso;
    foundUser.loginCount = (Number(foundUser.loginCount) || 0) + 1;
    foundUser.lastDevicePlatform = devicePlatform;
    foundUser.platformsUsed = Array.from(new Set([...(foundUser.platformsUsed || []), devicePlatform]));

    const loginSessionEntry = {
      sessionId: `sess_${crypto.randomUUID()}`,
      loginAt: nowIso,
      lastActiveAt: nowIso,
      devicePlatform,
      authMethod: 'login',
    };
    foundUser.loginHistory = [loginSessionEntry, ...(foundUser.loginHistory || [])].slice(0, 50);

    // Merge Firestore stats if Firestore has newer progress or VP
    if (firestoreUser?.stats) {
      const fsAttempted = Number(firestoreUser.stats.questionsAttempted || 0);
      const localAttempted = Number((foundUser.userStats as any)?.questionsAttempted || 0);
      if (fsAttempted > localAttempted || Number(firestoreUser.vaultPoints || 0) > Number(foundUser.vaultPoints || 0)) {
        foundUser.userStats = { ...(foundUser.userStats || {}), ...firestoreUser.stats };
        foundUser.vaultPoints = Math.max(Number(foundUser.vaultPoints || 0), Number(firestoreUser.vaultPoints || 0));
        foundUser.questionVp = Math.max(Number(foundUser.questionVp || 0), Number(firestoreUser.questionVp || 0));
        foundUser.focusMinuteVp = Math.max(Number(foundUser.focusMinuteVp || 0), Number(firestoreUser.focusMinuteVp || 0));
        foundUser.focusBonusVp = Math.max(Number(foundUser.focusBonusVp || 0), Number(firestoreUser.focusBonusVp || 0));
        foundUser.vpTransactions = firestoreUser.vpTransactions || foundUser.vpTransactions || [];
      }
    }

    const vpBreakdown = calculateVaultPointsBreakdown(foundUser.userStats as any, foundUser.vpTransactions || []);
    foundUser.vaultPoints = Math.max(Number(foundUser.vaultPoints || 0), vpBreakdown.vaultPoints);
    foundUser.questionVp = Math.max(Number(foundUser.questionVp || 0), vpBreakdown.questionVp);
    foundUser.focusMinuteVp = Math.max(Number(foundUser.focusMinuteVp || 0), vpBreakdown.focusMinuteVp);
    foundUser.focusBonusVp = Math.max(Number(foundUser.focusBonusVp || 0), vpBreakdown.focusBonusVp);

    // Ensure userStats object is populated and linked to permanent userId
    const resolvedStats: Record<string, unknown> = {
      ...(foundUser.userStats || {}),
      userId: foundUser.userId,
      username: foundUser.username,
      role: 'student',
      name: foundUser.displayName || (foundUser.userStats?.name as string) || 'Student',
      profilePhotoUrl:
        foundUser.profilePhotoUrl !== undefined
          ? foundUser.profilePhotoUrl
          : (foundUser.userStats?.profilePhotoUrl as string | null) || null,
      svhAiButtonPosition:
        foundUser.svhAiButtonPosition !== undefined
          ? foundUser.svhAiButtonPosition
          : (foundUser.userStats?.svhAiButtonPosition as { xRatio: number; yRatio: number } | null) ||
            null,
      hasCompletedSetup: true,
      vaultPoints: foundUser.vaultPoints,
      questionVp: foundUser.questionVp,
      focusMinuteVp: foundUser.focusMinuteVp,
      focusBonusVp: foundUser.focusBonusVp,
      vpTransactions: foundUser.vpTransactions || [],
      loginCount: foundUser.loginCount,
      logoutCount: foundUser.logoutCount || 0,
      lastLogoutAt: foundUser.lastLogoutAt || '',
      loginHistory: foundUser.loginHistory,
      lastDevicePlatform: devicePlatform,
      platformsUsed: foundUser.platformsUsed,
    };
    foundUser.userStats = resolvedStats;

    if (!firestoreUser) {
      syncUserProfileAndStatsInFirestore({
        userId: foundUser.userId,
        username: foundUser.username,
        name: foundUser.displayName,
        targetExam: (resolvedStats.activeGoal as string) || 'NEET',
        stats: resolvedStats as any,
        devicePlatform,
      }).catch(() => {});
    }

    const authToken = issueUserSessionToken(foundUser);
    if (req.body?.deviceId) {
      registerAnonymousDevice(req.body.deviceId, foundUser.userId, nowIso);
    }

    saveDatabase(db);

    return res.json({
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
  });

  // Get current authenticated account, authoritative role, & full persisted userStats
  app.get('/api/auth/me', (req, res) => {
    const user = authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const isOwner = Boolean(
      user.role === 'owner' && isConfiguredOwnerUsername(user.username || '')
    );
    const resolvedRole: 'owner' | 'student' = isOwner ? 'owner' : 'student';
    user.role = resolvedRole;
    user.lastSeenAt = new Date().toISOString();

    const resolvedStats: Record<string, unknown> = {
      ...(user.userStats || {}),
      userId: user.userId,
      ...(user.username ? { username: user.username } : {}),
      role: resolvedRole,
      name: user.displayName || (user.userStats?.name as string) || 'Student',
      profilePhotoUrl:
        user.profilePhotoUrl !== undefined
          ? user.profilePhotoUrl
          : (user.userStats?.profilePhotoUrl as string | null) || null,
      svhAiButtonPosition:
        user.svhAiButtonPosition !== undefined
          ? user.svhAiButtonPosition
          : (user.userStats?.svhAiButtonPosition as { xRatio: number; yRatio: number } | null) || null,
    };
    user.userStats = resolvedStats;
    saveDatabase(db);

    return res.json({
      userId: user.userId,
      username: user.username || null,
      role: resolvedRole,
      isOwner,
      displayName: user.displayName,
      profilePhotoUrl: user.profilePhotoUrl || null,
      svhAiButtonPosition: user.svhAiButtonPosition || null,
      userStats: resolvedStats,
      isRegisteredAccount: Boolean(user.username && (user.passwordHash || isOwner)),
    });
  });

  // Sync full userStats (study tracker, goals, progress, practice history, accuracy, bookmarks, theme, profile) to permanent User ID
  app.put('/api/auth/sync', (req, res) => {
    const user = authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const incomingStats =
      req.body?.userStats && typeof req.body.userStats === 'object' ? req.body.userStats : null;
    if (!incomingStats) {
      return res.status(400).json({ error: 'Invalid userStats payload' });
    }

    // Never trust client-supplied role, username, userId, or security fields
    const sanitizedIncoming: Record<string, unknown> = { ...(incomingStats as Record<string, unknown>) };
    delete sanitizedIncoming.role;
    delete sanitizedIncoming.isOwner;
    delete sanitizedIncoming.accountStatus;
    delete sanitizedIncoming.username;
    delete sanitizedIncoming.userId;
    delete sanitizedIncoming.passwordHash;
    delete sanitizedIncoming.passwordSalt;
    delete sanitizedIncoming.tokenHash;

    let profileChanged = false;
    if (typeof sanitizedIncoming.name === 'string' && sanitizedIncoming.name.trim()) {
      const cleanName = sanitizeDisplayName(sanitizedIncoming.name);
      if (cleanName !== user.displayName) {
        user.displayName = cleanName;
        profileChanged = true;
      }
    }

    if (Object.prototype.hasOwnProperty.call(sanitizedIncoming, 'profilePhotoUrl')) {
      const rawPhoto = sanitizedIncoming.profilePhotoUrl;
      if (rawPhoto === null || rawPhoto === '') {
        if (user.profilePhotoUrl) {
          user.profilePhotoUrl = null;
          profileChanged = true;
        }
      } else if (
        typeof rawPhoto === 'string' &&
        rawPhoto.startsWith('data:image/') &&
        rawPhoto.length <= 2_500_000
      ) {
        if (user.profilePhotoUrl !== rawPhoto) {
          user.profilePhotoUrl = rawPhoto;
          profileChanged = true;
        }
      }
    }

    const posObj = sanitizedIncoming.svhAiButtonPosition as { xRatio?: number; yRatio?: number } | undefined;
    if (
      posObj &&
      typeof posObj.xRatio === 'number' &&
      typeof posObj.yRatio === 'number'
    ) {
      user.svhAiButtonPosition = {
        xRatio: Math.max(0, Math.min(1, posObj.xRatio)),
        yRatio: Math.max(0, Math.min(1, posObj.yRatio)),
      };
    }

    const isOwner = Boolean(
      user.role === 'owner' && isConfiguredOwnerUsername(user.username || '')
    );
    const resolvedRole: 'owner' | 'student' = isOwner ? 'owner' : 'student';
    user.role = resolvedRole;

    const vpBreakdown = calculateVaultPointsBreakdown(sanitizedIncoming as any, user.vpTransactions || []);
    user.vaultPoints = Math.max(Number(user.vaultPoints || 0), Number(sanitizedIncoming.vaultPoints || 0), vpBreakdown.vaultPoints);
    user.questionVp = Math.max(Number(user.questionVp || 0), Number(sanitizedIncoming.questionVp || 0), vpBreakdown.questionVp);
    user.focusMinuteVp = Math.max(Number(user.focusMinuteVp || 0), Number(sanitizedIncoming.focusMinuteVp || 0), vpBreakdown.focusMinuteVp);
    user.focusBonusVp = Math.max(Number(user.focusBonusVp || 0), Number(sanitizedIncoming.focusBonusVp || 0), vpBreakdown.focusBonusVp);
    if (Array.isArray(sanitizedIncoming.vpTransactions) && sanitizedIncoming.vpTransactions.length > (user.vpTransactions?.length || 0)) {
      user.vpTransactions = sanitizedIncoming.vpTransactions as any;
    }

    user.userStats = {
      ...(user.userStats || {}),
      ...sanitizedIncoming,
      userId: user.userId,
      ...(user.username ? { username: user.username } : {}),
      role: resolvedRole,
      name: user.displayName,
      profilePhotoUrl: user.profilePhotoUrl || null,
      svhAiButtonPosition: user.svhAiButtonPosition || null,
      vaultPoints: user.vaultPoints,
      questionVp: user.questionVp,
      focusMinuteVp: user.focusMinuteVp,
      focusBonusVp: user.focusBonusVp,
      vpTransactions: user.vpTransactions || [],
      loginCount: user.loginCount || 1,
      logoutCount: user.logoutCount || 0,
      lastLogoutAt: user.lastLogoutAt || '',
      loginHistory: user.loginHistory || [],
      lastDevicePlatform: user.lastDevicePlatform || 'Desktop Web',
      platformsUsed: user.platformsUsed || ['Desktop Web'],
    };
    user.lastSeenAt = new Date().toISOString();

    // Sync to shared Firebase Firestore as well
    syncUserProfileAndStatsInFirestore({
      userId: user.userId,
      username: user.username,
      name: user.displayName,
      targetExam: (user.userStats?.activeGoal as string) || 'NEET',
      stats: user.userStats as any,
      devicePlatform: user.lastDevicePlatform || 'Desktop Web',
    }).catch(() => {});

    if (profileChanged) {
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
    }

    saveDatabase(db);

    if (profileChanged) {
      broadcastEvent({
        type: 'user:updated',
        userId: user.userId,
        displayName: user.displayName,
        profilePhotoUrl: user.profilePhotoUrl || null,
      });
    }

    return res.json({
      ok: true,
      userId: user.userId,
      username: user.username || null,
      role: resolvedRole,
      isOwner,
      userStats: user.userStats,
    });
  });

  // Log out current device session WITHOUT deleting account or data (terminates Student or Owner session)
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    const nowIso = new Date().toISOString();
    const user = authenticateRequest(req);
    if (user) {
      user.lastLogoutAt = nowIso;
      user.lastSeenAt = nowIso;
      user.logoutCount = (Number(user.logoutCount) || 0) + 1;
      if (Array.isArray(user.loginHistory) && user.loginHistory.length > 0 && !user.loginHistory[0].logoutAt) {
        const loginMs = new Date(user.loginHistory[0].loginAt).getTime();
        const durMin = !isNaN(loginMs) ? Math.max(1, Math.round((Date.now() - loginMs) / 60000)) : 1;
        user.loginHistory[0] = {
          ...user.loginHistory[0],
          logoutAt: nowIso,
          lastActiveAt: nowIso,
          durationMinutes: durMin,
        };
      }
      logoutAccountInFirestore({
        userId: user.userId,
        username: user.username,
        devicePlatform: req.body?.devicePlatform,
      }).catch(() => {});
    }
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const rawToken = authHeader.slice(7).trim();
      if (rawToken) {
        const targetHash = hashToken(rawToken);
        if (user) {
          if (Array.isArray(user.sessionTokenHashes)) {
            user.sessionTokenHashes = user.sessionTokenHashes.filter(
              (s) => s.tokenHash !== targetHash
            );
          }
          if (user.tokenHash === targetHash) {
            user.tokenHash =
              user.sessionTokenHashes && user.sessionTokenHashes.length > 0
                ? user.sessionTokenHashes[user.sessionTokenHashes.length - 1].tokenHash
                : '';
          }
        }
        if (db.ownerAuth?.activeSessionTokenHashes) {
          db.ownerAuth.activeSessionTokenHashes = db.ownerAuth.activeSessionTokenHashes.filter(
            (s) => s.tokenHash !== targetHash
          );
        }
        saveDatabase(db);
      }
    }
    return res.json({ ok: true, loggedOutAt: nowIso });
  });

  // Backend-controlled Idempotent Vault Points (VP) Reward Endpoint
  // Grants +4 VP per valid completed question, +1 VP per verified focused study minute,
  // and +20 VP bonus per completed 60-minute Focus Session (= 80 VP total for 60 focused minutes).
  app.post('/api/vp/award', async (req, res) => {
    try {
      const user = authenticateRequest(req);
      const { userId, username, grantKey, category, durationMinutes, reason, relatedId, devicePlatform } = req.body || {};
      const cleanGrantKey = String(grantKey || '').trim();
      if (!cleanGrantKey) {
        return res.status(400).json({ error: 'Missing grantKey for idempotent VP reward.' });
      }

      const targetUser =
        user ||
        (userId && db.users[userId]) ||
        (username
          ? Object.values(db.users).find((u) => u.username && u.username.toLowerCase() === String(username).toLowerCase())
          : null);

      // 1. Grant in shared Firebase Firestore (prevents duplicate grants across Web & Android APK)
      const fsResult = await awardVaultPointsInFirestore({
        userId: targetUser?.userId || userId || 'usr_guest',
        username: targetUser?.username || username,
        grantKey: cleanGrantKey,
        category: category || 'question',
        durationMinutes: Number(durationMinutes) || 0,
        reason: reason || '',
        relatedId: relatedId || cleanGrantKey,
        devicePlatform: devicePlatform || 'Desktop Web',
      }).catch(() => null);

      // 2. Also update local server user record idempotently
      if (targetUser) {
        const grantedKeys = Array.isArray(targetUser.grantedVpKeys) ? targetUser.grantedVpKeys : [];
        if (grantedKeys.includes(cleanGrantKey)) {
          return res.json({
            awarded: false,
            duplicate: true,
            amountEarned: 0,
            bonusEarned: 0,
            awardedVp: 0,
            bonusVp: 0,
            totalAwardedVp: 0,
            vaultPoints: targetUser.vaultPoints || 0,
            questionVp: targetUser.questionVp || 0,
            focusMinuteVp: targetUser.focusMinuteVp || 0,
            focusBonusVp: targetUser.focusBonusVp || 0,
            vpTransactions: (targetUser.vpTransactions || []).slice(0, 100),
            transactions: (targetUser.vpTransactions || []).slice(0, 100),
          });
        }

        let amountEarned = 0;
        let bonusEarned = 0;
        const nowIso = new Date().toISOString();
        const newTxs: NonNullable<StoredUser['vpTransactions']> = [];

        if (category === 'question') {
          amountEarned = VP_REWARD_PER_QUESTION;
          newTxs.push({
            id: `vptx_${crypto.randomUUID()}`,
            userId: targetUser.userId,
            username: targetUser.username,
            amount: VP_REWARD_PER_QUESTION,
            reason: reason || 'Completed valid question (+1 VP)',
            category: 'question',
            relatedId: relatedId || cleanGrantKey,
            grantKey: cleanGrantKey,
            timestamp: nowIso,
          });
        } else if (category === 'exam_bonus_5q') {
          amountEarned = 10;
          newTxs.push({
            id: `vptx_${crypto.randomUUID()}`,
            userId: targetUser.userId,
            username: targetUser.username,
            amount: 10,
            reason: reason || 'Completed 5 Valid Exam/Exam-Oriented Questions (+10 VP)',
            category: 'exam_bonus_5q',
            relatedId: relatedId || 'exam_milestone_5q',
            grantKey: cleanGrantKey,
            timestamp: nowIso,
          });
        } else if (category === 'exam_bonus_20q') {
          amountEarned = 40;
          newTxs.push({
            id: `vptx_${crypto.randomUUID()}`,
            userId: targetUser.userId,
            username: targetUser.username,
            amount: 40,
            reason: reason || 'Completed 20 Valid Exam/Exam-Oriented Questions (+40 VP)',
            category: 'exam_bonus_20q',
            relatedId: relatedId || 'exam_milestone_20q',
            grantKey: cleanGrantKey,
            timestamp: nowIso,
          });
        } else if (category === 'daily_usage') {
          amountEarned = 2;
          newTxs.push({
            id: `vptx_${crypto.randomUUID()}`,
            userId: targetUser.userId,
            username: targetUser.username,
            amount: 2,
            reason: reason || 'Qualifying Daily Usage (+2 VP)',
            category: 'daily_usage',
            relatedId: relatedId || nowIso.split('T')[0],
            grantKey: cleanGrantKey,
            timestamp: nowIso,
          });
        } else if (category === 'focus_session') {
          const mins = Math.max(0, Math.floor(Number(durationMinutes) || 0));
          if (mins > 0) {
            amountEarned = mins * VP_REWARD_PER_FOCUS_MINUTE;
            if (amountEarned > 0) {
              newTxs.push({
                id: `vptx_${crypto.randomUUID()}`,
                userId: targetUser.userId,
                username: targetUser.username,
                amount: amountEarned,
                reason: reason || `Verified focused study (${mins} min)`,
                category: 'focus_minute',
                relatedId: relatedId || cleanGrantKey,
                grantKey: `${cleanGrantKey}:minutes`,
                timestamp: nowIso,
              });
            }
            if (mins >= 60) {
              const blocks = Math.floor(mins / 60);
              bonusEarned = blocks * VP_REWARD_60_MIN_BONUS;
              newTxs.push({
                id: `vptx_${crypto.randomUUID()}`,
                userId: targetUser.userId,
                username: targetUser.username,
                amount: bonusEarned,
                reason: `Completed 60-Minute Focus Study (+${bonusEarned} VP)`,
                category: 'focus_bonus_60m',
                relatedId: relatedId || cleanGrantKey,
                grantKey: `${cleanGrantKey}:bonus60`,
                timestamp: nowIso,
              });
            }
          }
        }

        const totalDelta = amountEarned + bonusEarned;
        targetUser.grantedVpKeys = [cleanGrantKey, ...grantedKeys].slice(0, 2000);
        targetUser.vaultPoints = Math.max(Number(targetUser.vaultPoints || 0) + totalDelta, Number(fsResult?.vaultPoints || 0));
        targetUser.questionVp = Math.max(
          Number(targetUser.questionVp || 0) + (category === 'question' ? amountEarned : 0),
          Number(fsResult?.questionVp || 0)
        );
        targetUser.focusMinuteVp = Math.max(
          Number(targetUser.focusMinuteVp || 0) + (category === 'focus_session' ? amountEarned : 0),
          Number(fsResult?.focusMinuteVp || 0)
        );
        targetUser.focusBonusVp = Math.max(
          Number(targetUser.focusBonusVp || 0) + bonusEarned,
          Number(fsResult?.focusBonusVp || 0)
        );
        targetUser.vpTransactions = [...newTxs, ...(targetUser.vpTransactions || [])].slice(0, 200);
        targetUser.lastSeenAt = nowIso;

        if (targetUser.userStats && typeof targetUser.userStats === 'object') {
          targetUser.userStats = {
            ...targetUser.userStats,
            vaultPoints: targetUser.vaultPoints,
            questionVp: targetUser.questionVp,
            focusMinuteVp: targetUser.focusMinuteVp,
            focusBonusVp: targetUser.focusBonusVp,
            vpTransactions: targetUser.vpTransactions,
          };
        }
        saveDatabase(db);

        return res.json({
          awarded: totalDelta > 0,
          duplicate: false,
          amountEarned,
          bonusEarned,
          awardedVp: amountEarned,
          bonusVp: bonusEarned,
          totalGranted: totalDelta,
          totalAwardedVp: totalDelta,
          vaultPoints: targetUser.vaultPoints,
          questionVp: targetUser.questionVp,
          focusMinuteVp: targetUser.focusMinuteVp,
          focusBonusVp: targetUser.focusBonusVp,
          vpTransactions: targetUser.vpTransactions.slice(0, 100),
          transactions: targetUser.vpTransactions.slice(0, 100),
        });
      }

      if (fsResult) {
        return res.json(fsResult);
      }

      return res.status(404).json({ error: 'User account not found for VP grant.' });
    } catch (err) {
      console.error('VP Award Error:', err);
      return res.status(500).json({ error: 'Failed to award Vault Points.' });
    }
  });

  // Permanently delete account and associated personal/private data (ONLY on explicit confirmation)
  app.delete('/api/auth/account', (req, res) => {
    const user = authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required to delete account.' });
    }
    if (user.role === 'owner') {
      return res.status(403).json({
        error: 'The primary Owner account cannot be deleted. Use Log Out to end your session.',
      });
    }

    if (req.body?.confirmDelete !== true) {
      return res.status(400).json({
        error: 'Explicit confirmation is required to permanently delete your account.',
      });
    }

    // If account has a password, verify password if provided or allow authenticated owner of the account
    if (user.passwordHash && typeof req.body?.password === 'string' && req.body.password.length > 0) {
      const valid = verifyUserPassword(req.body.password, user.passwordSalt, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: 'Incorrect password. Account deletion cancelled.' });
      }
    }

    const deletedUserId = user.userId;

    // 1. Delete user account record & private userStats
    delete db.users[deletedUserId];

    // 2. Delete private SVH AI conversations belonging to this user
    if (db.aiConversations && db.aiConversations[deletedUserId]) {
      delete db.aiConversations[deletedUserId];
    }

    // 3. Remove user's posts, replies, and chat messages if requested, or clean up user's personal content
    const userPostIds = new Set(
      db.posts.filter((p) => p.authorId === deletedUserId).map((p) => p.id)
    );
    db.posts = db.posts.filter((p) => p.authorId !== deletedUserId);
    db.replies = db.replies.filter(
      (r) => r.authorId !== deletedUserId && !userPostIds.has(r.postId)
    );
    // Recompute replyCounts on remaining posts
    db.posts.forEach((p) => {
      p.replyCount = db.replies.filter((r) => r.postId === p.id).length;
    });
    db.chatMessages = db.chatMessages.filter((m) => m.authorId !== deletedUserId);

    // 4. Clean up device association
    if (db.registeredDeviceHashes) {
      for (const dev of Object.values(db.registeredDeviceHashes)) {
        dev.userIds = dev.userIds.filter((id) => id !== deletedUserId);
      }
    }

    saveDatabase(db);

    return res.json({
      ok: true,
      deletedUserId,
    });
  });

  // ============================================================================
  // API ROUTES FOR REAL MULTI-USER COMMUNITY
  // ============================================================================

  // 1. Initialize or verify cryptographic user session identity
  app.post('/api/community/auth/session', (req, res) => {
    const requestedName = sanitizeDisplayName(req.body?.displayName);
    const hasPhotoField = Object.prototype.hasOwnProperty.call(req.body || {}, 'profilePhotoUrl');
    const rawPhoto = req.body?.profilePhotoUrl;
    const existingUser = authenticateRequest(req);

    if (existingUser) {
      let changed = false;
      if (requestedName && existingUser.displayName !== requestedName) {
        existingUser.displayName = requestedName;
        changed = true;
      }

      if (hasPhotoField) {
        if (rawPhoto === null || rawPhoto === '') {
          if (existingUser.profilePhotoUrl) {
            existingUser.profilePhotoUrl = null;
            changed = true;
          }
        } else if (
          typeof rawPhoto === 'string' &&
          rawPhoto.startsWith('data:image/') &&
          rawPhoto.length <= 2_500_000
        ) {
          if (existingUser.profilePhotoUrl !== rawPhoto) {
            existingUser.profilePhotoUrl = rawPhoto;
            changed = true;
          }
        }
      }

      if (changed) {
        db.posts.forEach((p) => {
          if (p.authorId === existingUser.userId) {
            p.authorName = existingUser.displayName;
            p.authorAvatarUrl = existingUser.profilePhotoUrl || null;
          }
        });
        db.replies.forEach((r) => {
          if (r.authorId === existingUser.userId) {
            r.authorName = existingUser.displayName;
            r.authorAvatarUrl = existingUser.profilePhotoUrl || null;
          }
        });
        db.chatMessages.forEach((m) => {
          if (m.authorId === existingUser.userId) {
            m.authorName = existingUser.displayName;
            m.authorAvatarUrl = existingUser.profilePhotoUrl || null;
          }
        });
      }

      existingUser.lastSeenAt = new Date().toISOString();
      if (req.body?.deviceId) {
        registerAnonymousDevice(req.body.deviceId, existingUser.userId, existingUser.lastSeenAt);
      }
      if (
        req.body?.svhAiButtonPosition &&
        typeof req.body.svhAiButtonPosition.xRatio === 'number' &&
        typeof req.body.svhAiButtonPosition.yRatio === 'number'
      ) {
        existingUser.svhAiButtonPosition = {
          xRatio: Math.max(0, Math.min(1, req.body.svhAiButtonPosition.xRatio)),
          yRatio: Math.max(0, Math.min(1, req.body.svhAiButtonPosition.yRatio)),
        };
      }
      saveDatabase(db);
      if (changed) {
        broadcastEvent({
          type: 'user:updated',
          userId: existingUser.userId,
          displayName: existingUser.displayName,
          profilePhotoUrl: existingUser.profilePhotoUrl || null,
        });
      }
      return res.json({
        userId: existingUser.userId,
        displayName: existingUser.displayName,
        profilePhotoUrl: existingUser.profilePhotoUrl || null,
        svhAiButtonPosition: existingUser.svhAiButtonPosition || null,
      });
    }

    // Create a new cryptographically verified identity
    const userId = `usr_${crypto.randomUUID()}`;
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const now = new Date().toISOString();

    let initialPhoto: string | null = null;
    if (
      typeof rawPhoto === 'string' &&
      rawPhoto.startsWith('data:image/') &&
      rawPhoto.length <= 2_500_000
    ) {
      initialPhoto = rawPhoto;
    }

    let initialPos: { xRatio: number; yRatio: number } | null = null;
    if (
      req.body?.svhAiButtonPosition &&
      typeof req.body.svhAiButtonPosition.xRatio === 'number' &&
      typeof req.body.svhAiButtonPosition.yRatio === 'number'
    ) {
      initialPos = {
        xRatio: Math.max(0, Math.min(1, req.body.svhAiButtonPosition.xRatio)),
        yRatio: Math.max(0, Math.min(1, req.body.svhAiButtonPosition.yRatio)),
      };
    }

    const newUser: StoredUser = {
      userId,
      tokenHash,
      displayName: requestedName,
      profilePhotoUrl: initialPhoto,
      svhAiButtonPosition: initialPos,
      createdAt: now,
      lastSeenAt: now,
    };

    db.users[userId] = newUser;
    if (req.body?.deviceId) {
      registerAnonymousDevice(req.body.deviceId, userId, now);
    }
    saveDatabase(db);

    return res.status(201).json({
      userId,
      displayName: newUser.displayName,
      profilePhotoUrl: newUser.profilePhotoUrl || null,
      svhAiButtonPosition: newUser.svhAiButtonPosition || null,
      authToken: rawToken,
    });
  });

  // 2. Update display name and/or profile photo for authenticated user ONLY
  app.put('/api/community/auth/profile', (req, res) => {
    const user = authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.body?.displayName !== undefined) {
      user.displayName = sanitizeDisplayName(req.body.displayName);
    }

    if (
      req.body?.svhAiButtonPosition &&
      typeof req.body.svhAiButtonPosition.xRatio === 'number' &&
      typeof req.body.svhAiButtonPosition.yRatio === 'number'
    ) {
      user.svhAiButtonPosition = {
        xRatio: Math.max(0, Math.min(1, req.body.svhAiButtonPosition.xRatio)),
        yRatio: Math.max(0, Math.min(1, req.body.svhAiButtonPosition.yRatio)),
      };
    }

    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'profilePhotoUrl')) {
      const rawPhoto = req.body.profilePhotoUrl;
      if (rawPhoto === null || rawPhoto === '') {
        user.profilePhotoUrl = null;
      } else if (typeof rawPhoto === 'string') {
        if (!rawPhoto.startsWith('data:image/')) {
          return res.status(400).json({ error: 'Invalid profile image format.' });
        }
        if (rawPhoto.length > 2_500_000) {
          return res.status(400).json({ error: 'Profile image is too large. Please upload a smaller image.' });
        }
        user.profilePhotoUrl = rawPhoto;
      } else {
        return res.status(400).json({ error: 'Invalid profile photo payload.' });
      }
    }

    user.lastSeenAt = new Date().toISOString();
    if (user.userStats && typeof user.userStats === 'object') {
      user.userStats = {
        ...user.userStats,
        name: user.displayName,
        profilePhotoUrl: user.profilePhotoUrl || null,
        svhAiButtonPosition: user.svhAiButtonPosition || null,
      };
    }

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

    saveDatabase(db);
    broadcastEvent({
      type: 'user:updated',
      userId: user.userId,
      displayName: user.displayName,
      profilePhotoUrl: user.profilePhotoUrl || null,
    });

    return res.json({
      userId: user.userId,
      displayName: user.displayName,
      profilePhotoUrl: user.profilePhotoUrl || null,
      svhAiButtonPosition: user.svhAiButtonPosition || null,
    });
  });

  // 3. Get full Community state (posts, replies, chat messages, online count) merged with shared Firebase Firestore
  app.get('/api/community/state', async (_req, res) => {
    const fsState = await fetchCommunityStateFromFirestore().catch(() => null);
    const postMap = new Map<string, CommunityPostRecord>();
    for (const p of db.posts) postMap.set(p.id, p);
    if (fsState?.posts) {
      for (const p of fsState.posts) postMap.set(p.id, p);
    }

    const replyMap = new Map<string, CommunityReplyRecord>();
    for (const r of db.replies) replyMap.set(r.id, r);
    if (fsState?.replies) {
      for (const r of fsState.replies) replyMap.set(r.id, r);
    }

    const chatMap = new Map<string, CommunityChatMessageRecord>();
    for (const m of db.chatMessages) chatMap.set(m.id, m);
    if (fsState?.chatMessages) {
      for (const m of fsState.chatMessages) chatMap.set(m.id, m);
    }

    const mergedPosts = Array.from(postMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const mergedReplies = Array.from(replyMap.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const mergedChat = Array.from(chatMap.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return res.json({
      posts: mergedPosts,
      replies: mergedReplies,
      chatMessages: mergedChat,
      onlineCount: Math.max(1, connectedClients.size),
    });
  });

  // 4. Create a new Doubt / Community Post
  app.post('/api/community/posts', (req, res) => {
    const user = authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Valid session identity required.' });
    }

    const rawContent = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    const rawSubject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : 'General';
    const rawImage = typeof req.body?.imageUrl === 'string' ? req.body.imageUrl.trim() : '';
    const latestName = sanitizeDisplayName(req.body?.authorName || user.displayName);

    if (latestName && latestName !== user.displayName) {
      user.displayName = latestName;
    }

    if (!rawContent && !rawImage) {
      return res.status(400).json({ error: 'Please provide a question text or upload a question image.' });
    }

    if (rawContent.length > 5000) {
      return res.status(400).json({ error: 'Post text cannot exceed 5,000 characters.' });
    }

    if (rawImage && (!rawImage.startsWith('data:image/') || rawImage.length > 6_000_000)) {
      return res.status(400).json({ error: 'Invalid or oversized image attachment.' });
    }

    const newPost: CommunityPostRecord = {
      id: `post_${crypto.randomUUID()}`,
      authorId: user.userId,
      authorName: user.displayName,
      authorAvatarUrl: user.profilePhotoUrl || null,
      subject: rawSubject.slice(0, 60) || 'General',
      content: rawContent,
      ...(rawImage ? { imageUrl: rawImage } : {}),
      createdAt: new Date().toISOString(),
      replyCount: 0,
    };

    db.posts.unshift(newPost);
    saveDatabase(db);
    saveCommunityPostToFirestore(newPost).catch(() => {});

    broadcastEvent({
      type: 'post:created',
      post: newPost,
    });

    return res.status(201).json({ post: newPost });
  });

  // 5. Delete own Post (or Owner moderation)
  app.delete('/api/community/posts/:postId', (req, res) => {
    const user = authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { postId } = req.params;
    const postIndex = db.posts.findIndex((p) => p.id === postId);
    if (postIndex === -1) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const targetPost = db.posts[postIndex];
    const isOwner = user.role === 'owner' && isConfiguredOwnerUsername(user.username || '');
    if (targetPost.authorId !== user.userId && !isOwner) {
      return res.status(403).json({ error: 'You can only delete your own posts.' });
    }

    db.posts.splice(postIndex, 1);
    db.replies = db.replies.filter((r) => r.postId !== postId);
    db.reports = (db.reports || []).filter((rep) => rep.targetId !== postId);
    saveDatabase(db);
    deleteCommunityPostFromFirestore(postId).catch(() => {});

    broadcastEvent({
      type: 'post:deleted',
      postId,
    });

    return res.json({ ok: true, postId });
  });

  // 6. Add a Reply / Solution to a Post
  app.post('/api/community/posts/:postId/replies', (req, res) => {
    const user = authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { postId } = req.params;
    const parentPost = db.posts.find((p) => p.id === postId);
    if (!parentPost) {
      return res.status(404).json({ error: 'Discussion post not found' });
    }

    const rawContent = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    const rawImage = typeof req.body?.imageUrl === 'string' ? req.body.imageUrl.trim() : '';
    const latestName = sanitizeDisplayName(req.body?.authorName || user.displayName);

    if (latestName && latestName !== user.displayName) {
      user.displayName = latestName;
    }

    if (!rawContent && !rawImage) {
      return res.status(400).json({ error: 'Reply cannot be empty.' });
    }

    if (rawContent.length > 4000) {
      return res.status(400).json({ error: 'Reply cannot exceed 4,000 characters.' });
    }

    if (rawImage && (!rawImage.startsWith('data:image/') || rawImage.length > 6_000_000)) {
      return res.status(400).json({ error: 'Invalid or oversized image attachment.' });
    }

    const newReply: CommunityReplyRecord = {
      id: `reply_${crypto.randomUUID()}`,
      postId,
      authorId: user.userId,
      authorName: user.displayName,
      authorAvatarUrl: user.profilePhotoUrl || null,
      content: rawContent,
      ...(rawImage ? { imageUrl: rawImage } : {}),
      createdAt: new Date().toISOString(),
    };

    db.replies.push(newReply);
    parentPost.replyCount = db.replies.filter((r) => r.postId === postId).length;
    saveDatabase(db);
    saveCommunityReplyToFirestore(newReply, parentPost).catch(() => {});

    broadcastEvent({
      type: 'reply:created',
      reply: newReply,
      postId,
      replyCount: parentPost.replyCount,
    });

    return res.status(201).json({
      reply: newReply,
      replyCount: parentPost.replyCount,
    });
  });

  // 7. Delete own Reply (or Owner moderation)
  app.delete('/api/community/replies/:replyId', (req, res) => {
    const user = authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { replyId } = req.params;
    const replyIndex = db.replies.findIndex((r) => r.id === replyId);
    if (replyIndex === -1) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    const targetReply = db.replies[replyIndex];
    const isOwner = user.role === 'owner' && isConfiguredOwnerUsername(user.username || '');
    if (targetReply.authorId !== user.userId && !isOwner) {
      return res.status(403).json({ error: 'You can only delete your own replies.' });
    }

    const postId = targetReply.postId;
    db.replies.splice(replyIndex, 1);
    db.reports = (db.reports || []).filter((rep) => rep.targetId !== replyId);

    const parentPost = db.posts.find((p) => p.id === postId);
    const updatedCount = db.replies.filter((r) => r.postId === postId).length;
    if (parentPost) {
      parentPost.replyCount = updatedCount;
    }

    saveDatabase(db);
    deleteCommunityReplyFromFirestore(replyId).catch(() => {});

    broadcastEvent({
      type: 'reply:deleted',
      replyId,
      postId,
      replyCount: updatedCount,
    });

    return res.json({ ok: true, replyId, postId, replyCount: updatedCount });
  });

  // 8. Send a Community Chat Message
  app.post('/api/community/chat', (req, res) => {
    const user = authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const rawContent = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    const rawSubjectTag = typeof req.body?.subjectTag === 'string' ? req.body.subjectTag.trim() : '';
    const latestName = sanitizeDisplayName(req.body?.authorName || user.displayName);

    if (latestName && latestName !== user.displayName) {
      user.displayName = latestName;
    }

    if (!rawContent) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    if (rawContent.length > 2000) {
      return res.status(400).json({ error: 'Chat message cannot exceed 2,000 characters.' });
    }

    const newMessage: CommunityChatMessageRecord = {
      id: `chat_${crypto.randomUUID()}`,
      authorId: user.userId,
      authorName: user.displayName,
      authorAvatarUrl: user.profilePhotoUrl || null,
      content: rawContent,
      ...(rawSubjectTag ? { subjectTag: rawSubjectTag.slice(0, 40) } : {}),
      createdAt: new Date().toISOString(),
    };

    db.chatMessages.push(newMessage);
    saveDatabase(db);
    saveCommunityChatToFirestore(newMessage).catch(() => {});

    broadcastEvent({
      type: 'chat:created',
      message: newMessage,
    });

    return res.status(201).json({ message: newMessage });
  });

  // 9. Delete own Community Chat Message (or Owner moderation)
  app.delete('/api/community/chat/:messageId', (req, res) => {
    const user = authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { messageId } = req.params;
    const msgIndex = db.chatMessages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const targetMsg = db.chatMessages[msgIndex];
    const isOwner = user.role === 'owner' && isConfiguredOwnerUsername(user.username || '');
    if (targetMsg.authorId !== user.userId && !isOwner) {
      return res.status(403).json({ error: 'You can only delete your own chat messages.' });
    }

    db.chatMessages.splice(msgIndex, 1);
    db.reports = (db.reports || []).filter((rep) => rep.targetId !== messageId);
    saveDatabase(db);
    deleteCommunityChatFromFirestore(messageId).catch(() => {});

    broadcastEvent({
      type: 'chat:deleted',
      messageId,
    });

    return res.json({ ok: true, messageId });
  });

  // 10. Report a Post, Reply, or Chat Message
  app.post('/api/community/report', (req, res) => {
    const user = authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const targetType = req.body?.targetType;
    const targetId = typeof req.body?.targetId === 'string' ? req.body.targetId.trim() : '';
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    const details = typeof req.body?.details === 'string' ? req.body.details.trim() : '';

    if (!['post', 'reply', 'chat'].includes(targetType) || !targetId || !reason) {
      return res.status(400).json({ error: 'Invalid report submission.' });
    }

    const newReport: CommunityReportRecord = {
      id: `rep_${crypto.randomUUID()}`,
      targetType,
      targetId,
      reason: reason.slice(0, 120),
      ...(details ? { details: details.slice(0, 500) } : {}),
      reporterId: user.userId,
      createdAt: new Date().toISOString(),
    };

    db.reports.push(newReport);
    saveDatabase(db);
    saveCommunityReportToFirestore(newReport).catch(() => {});

    return res.status(201).json({ ok: true, reportId: newReport.id });
  });

  // ============================================================================
  // SVH AI — REAL PERSONAL AI STUDY ASSISTANT ROUTES
  // ============================================================================

  // Get authenticated user's SVH AI conversation history
  app.get('/api/svh-ai/conversations', (req, res) => {
    const user = authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const list = db.aiConversations[user.userId] || [];
    return res.json({ conversations: list });
  });

  // Delete a specific SVH AI conversation belonging to the authenticated user
  app.delete('/api/svh-ai/conversations/:conversationId', (req, res) => {
    const user = authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { conversationId } = req.params;
    const list = db.aiConversations[user.userId] || [];
    db.aiConversations[user.userId] = list.filter((c) => c.id !== conversationId);
    saveDatabase(db);
    return res.json({ ok: true, conversationId });
  });

  // Clear all SVH AI conversations belonging to the authenticated user
  app.delete('/api/svh-ai/conversations', (req, res) => {
    const user = authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    db.aiConversations[user.userId] = [];
    saveDatabase(db);
    return res.json({ ok: true });
  });

  // Send a message to SVH AI and receive a real personalized Gemini response (supports both unary and SSE streaming)
  const SVH_AI_MODELS = ['gemini-3-flash-preview', 'gemini-3.1-flash-lite-preview', 'gemini-2.5-flash'];

  const prepareSVHAIConversationTurn = (req: express.Request) => {
    const user = authenticateRequest(req);
    if (!user) {
      return { errorStatus: 401, errorMessage: 'Unauthorized: Please refresh your session.' };
    }

    const rawMessage = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const rawImage = typeof req.body?.imageUrl === 'string' ? req.body.imageUrl.trim() : '';
    const requestedConversationId =
      typeof req.body?.conversationId === 'string' ? req.body.conversationId.trim() : '';
    const requestedClientTurnId =
      typeof req.body?.clientTurnId === 'string' ? req.body.clientTurnId.trim() : '';
    const isRetry = Boolean(req.body?.isRetry);
    const studentContext = req.body?.studentContext || {};

    if (!rawMessage && !rawImage) {
      return {
        errorStatus: 400,
        errorMessage: 'Please enter a message or attach a question image.',
      };
    }

    if (rawMessage.length > 8000) {
      return {
        errorStatus: 400,
        errorMessage: 'Message is too long (max 8,000 characters).',
      };
    }

    if (rawImage && (!rawImage.startsWith('data:image/') || rawImage.length > 6_000_000)) {
      return {
        errorStatus: 400,
        errorMessage: 'Invalid or oversized image attachment.',
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        errorStatus: 500,
        errorMessage: 'SVH AI service key is not configured on the server.',
      };
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    if (!db.aiConversations[user.userId]) {
      db.aiConversations[user.userId] = [];
    }
    const userConversations = db.aiConversations[user.userId];
    let conversation = userConversations.find((c) => c.id === requestedConversationId);

    const nowIso = new Date().toISOString();
    if (!conversation) {
      const titleSnippet = rawMessage.slice(0, 56) || 'Doubt Image Analysis';
      conversation = {
        id:
          requestedConversationId && requestedConversationId.startsWith('svhai_conv_')
            ? requestedConversationId
            : `svhai_conv_${crypto.randomUUID()}`,
        userId: user.userId,
        title: titleSnippet,
        createdAt: nowIso,
        updatedAt: nowIso,
        messages: [],
      };
      userConversations.unshift(conversation);
    }

    // Build multi-turn contents array from real prior messages in this conversation
    const historyContents: Array<{
      role: 'user' | 'model';
      parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
    }> = [];

    // If retrying a failed turn where the user message was already appended at the end, avoid duplicating it
    const existingMessages = conversation.messages;
    const lastExistingMsg =
      existingMessages.length > 0 ? existingMessages[existingMessages.length - 1] : null;
    const isRetryingLastUserTurn = Boolean(
      isRetry &&
        lastExistingMsg &&
        lastExistingMsg.role === 'user' &&
        lastExistingMsg.content === (rawMessage || 'Uploaded a question image for analysis')
    );

    const priorMessages = isRetryingLastUserTurn
      ? existingMessages.slice(0, -1)
      : existingMessages;

    const recentHistory = priorMessages.slice(-16);
    for (const msg of recentHistory) {
      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
      if (msg.imageUrl && msg.imageUrl.startsWith('data:image/')) {
        const commaIdx = msg.imageUrl.indexOf(',');
        const meta = msg.imageUrl.slice(5, commaIdx);
        const mimeType = meta.split(';')[0] || 'image/jpeg';
        const base64Data = msg.imageUrl.slice(commaIdx + 1);
        if (base64Data) {
          parts.push({ inlineData: { mimeType, data: base64Data } });
        }
      }
      if (msg.content) {
        parts.push({ text: msg.content });
      }
      if (parts.length > 0) {
        historyContents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts,
        });
      }
    }

    // Add current user turn to Gemini contents
    const currentParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
    if (rawImage && rawImage.startsWith('data:image/')) {
      const commaIdx = rawImage.indexOf(',');
      const meta = rawImage.slice(5, commaIdx);
      const mimeType = meta.split(';')[0] || 'image/jpeg';
      const base64Data = rawImage.slice(commaIdx + 1);
      if (base64Data) {
        currentParts.push({ inlineData: { mimeType, data: base64Data } });
      }
    }
    currentParts.push({
      text: rawMessage || 'Please explain and solve the question shown in this image step by step.',
    });

    historyContents.push({
      role: 'user',
      parts: currentParts,
    });

    // Persist the user's question immediately in the conversation so it is never lost
    let userMsgRecord: SVHAIMessageRecord;
    if (isRetryingLastUserTurn && lastExistingMsg) {
      userMsgRecord = lastExistingMsg;
    } else {
      userMsgRecord = {
        id:
          requestedClientTurnId && requestedClientTurnId.startsWith('msg_')
            ? requestedClientTurnId
            : `msg_${crypto.randomUUID()}`,
        role: 'user',
        content: rawMessage || 'Uploaded a question image for analysis',
        ...(rawImage ? { imageUrl: rawImage } : {}),
        createdAt: nowIso,
      };
      conversation.messages.push(userMsgRecord);
      conversation.updatedAt = nowIso;
      db.aiConversations[user.userId] = [
        conversation,
        ...userConversations.filter((c) => c.id !== conversation!.id),
      ];
      saveDatabase(db);
    }

    const systemInstruction = `You are SVH AI, the official personal AI study assistant inside Study Vault Hub (Developed by Soumyadip Rana).

STRICT PERSONALIZATION, ACADEMIC ACCURACY & HONESTY RULES:
1. Use ONLY the real student data provided below. NEVER invent, guess, or fabricate statistics, weak topics, test scores, study hours, target exam dates, or past activity.
2. If the student asks about their weak topics, mistake analysis, or performance AND their real questionsAttempted is 0 (or weakTopics list is empty), state honestly that they have not attempted enough practice questions yet to detect weak topics, and ask which subject or chapter they would like to practice or revise first.
3. If the student asks for a personalized study plan or timetable and required details (such as their exam date, daily available study hours, or current class/chapter progress) are missing from the real data below, ask the student for those specific details or offer a structured plan tailored to their known active goal and subjects while asking how many hours per day they can dedicate.
4. For academic questions in Physics, Chemistry, Biology, Mathematics, NEET, JEE, Board Exams, CUET, Commerce, and CA: provide rigorous, accurate, step-by-step explanations, verify mathematical/stoichiometric calculations carefully, and cite NCERT concepts or formulas where relevant. If any information is uncertain, clearly state the uncertainty instead of inventing facts.
5. Keep explanations clear, academically rigorous, encouraging, and structured with clean headings, bullet points, key formulas/mechanisms, and exam relevance.

REAL STUDENT APP DATA SNAPSHOT:
${JSON.stringify(studentContext, null, 2)}`;

    // Increment real SVH AI usage count for user
    user.userStats = {
      ...(user.userStats || {}),
      svhAiUsageCount: (Number(user.userStats?.svhAiUsageCount) || 0) + 1,
    };

    return {
      user,
      ai,
      conversation,
      userConversations,
      userMsgRecord,
      historyContents,
      systemInstruction,
    };
  };

  // Stream a real personalized Gemini response via Server-Sent Events (SSE)
  app.post('/api/svh-ai/chat/stream', async (req, res) => {
    const prep = prepareSVHAIConversationTurn(req);
    if ('errorStatus' in prep) {
      return res.status(prep.errorStatus || 500).json({
        error: prep.errorMessage || 'Failed to initialize SVH AI request.',
      });
    }

    const { user, ai, conversation, userConversations, userMsgRecord, historyContents, systemInstruction } = prep;

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const sendSseEvent = (payload: Record<string, unknown>) => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }
    };

    const assistantMsgId = `msg_${crypto.randomUUID()}`;

    // Immediately confirm user message & conversation ID to client
    sendSseEvent({
      type: 'meta',
      conversationId: conversation.id,
      conversationTitle: conversation.title,
      userMessage: userMsgRecord,
      assistantMessageId: assistantMsgId,
    });

    let accumulatedText = '';
    let lastGenError: unknown = null;
    let streamSucceeded = false;

    for (const modelName of SVH_AI_MODELS) {
      if (streamSucceeded) break;
      try {
        const responseStream = await ai.models.generateContentStream({
          model: modelName,
          contents: historyContents,
          config: {
            systemInstruction,
          },
        });

        for await (const chunk of responseStream) {
          const chunkText = chunk?.text;
          if (typeof chunkText === 'string' && chunkText.length > 0) {
            accumulatedText += chunkText;
            sendSseEvent({
              type: 'chunk',
              delta: chunkText,
              assistantMessageId: assistantMsgId,
            });
          }
        }

        if (accumulatedText.trim().length > 0) {
          streamSucceeded = true;
          break;
        }
      } catch (err) {
        lastGenError = err;
        // If no text was sent yet, automatically fall back to the next configured Gemini model
        if (accumulatedText.trim().length > 0) {
          streamSucceeded = true;
          break;
        }
      }
    }

    // Fallback to unary generation across models if stream returned empty without throwing
    if (!streamSucceeded && accumulatedText.trim().length === 0) {
      for (const modelName of SVH_AI_MODELS) {
        try {
          const unaryRes = await ai.models.generateContent({
            model: modelName,
            contents: historyContents,
            config: {
              systemInstruction,
            },
          });
          const text = unaryRes?.text?.trim();
          if (text) {
            accumulatedText = text;
            sendSseEvent({
              type: 'chunk',
              delta: text,
              assistantMessageId: assistantMsgId,
            });
            streamSucceeded = true;
            break;
          }
        } catch (err) {
          lastGenError = err;
        }
      }
    }

    if (!streamSucceeded || accumulatedText.trim().length === 0) {
      console.error('SVH AI stream generation error:', lastGenError);
      sendSseEvent({
        type: 'error',
        error:
          'SVH AI is temporarily busy or unreachable right now. Your question has been saved — please tap Retry.',
        conversation,
        userMessage: userMsgRecord,
      });
      res.end();
      return;
    }

    const assistantMsgRecord: SVHAIMessageRecord = {
      id: assistantMsgId,
      role: 'assistant',
      content: accumulatedText.trim(),
      createdAt: new Date().toISOString(),
    };

    conversation.messages.push(assistantMsgRecord);
    conversation.updatedAt = assistantMsgRecord.createdAt;

    db.aiConversations[user.userId] = [
      conversation,
      ...userConversations.filter((c) => c.id !== conversation.id),
    ];

    saveDatabase(db);

    sendSseEvent({
      type: 'done',
      conversation,
      userMessage: userMsgRecord,
      assistantMessage: assistantMsgRecord,
    });
    res.end();
  });

  // Unary endpoint for SVH AI (with automatic multi-model fallback and persisted user question)
  app.post('/api/svh-ai/chat', async (req, res) => {
    const prep = prepareSVHAIConversationTurn(req);
    if ('errorStatus' in prep) {
      return res.status(prep.errorStatus || 500).json({
        error: prep.errorMessage || 'Failed to initialize SVH AI request.',
      });
    }

    const { user, ai, conversation, userConversations, userMsgRecord, historyContents, systemInstruction } = prep;

    try {
      let replyText = '';
      let lastGenError: unknown = null;

      for (const modelName of SVH_AI_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: historyContents,
            config: {
              systemInstruction,
            },
          });
          const candidateText = response?.text?.trim();
          if (candidateText) {
            replyText = candidateText;
            break;
          }
        } catch (genErr) {
          lastGenError = genErr;
        }
      }

      if (!replyText) {
        throw (
          lastGenError ||
          new Error('SVH AI could not generate a response right now. Please tap Retry.')
        );
      }

      const assistantMsgRecord: SVHAIMessageRecord = {
        id: `msg_${crypto.randomUUID()}`,
        role: 'assistant',
        content: replyText,
        createdAt: new Date().toISOString(),
      };

      conversation.messages.push(assistantMsgRecord);
      conversation.updatedAt = assistantMsgRecord.createdAt;

      db.aiConversations[user.userId] = [
        conversation,
        ...userConversations.filter((c) => c.id !== conversation.id),
      ];

      saveDatabase(db);

      return res.json({
        conversation,
        userMessage: userMsgRecord,
        assistantMessage: assistantMsgRecord,
      });
    } catch (err) {
      console.error('SVH AI generation error:', err);
      return res.status(500).json({
        error:
          'SVH AI is temporarily busy or unreachable right now. Your question has been saved — please tap Retry.',
        conversation,
        userMessage: userMsgRecord,
      });
    }
  });

  // ============================================================================
  // AI PERSONAL STUDY PLANNER, SMART REVISION & VERIFIED ACHIEVEMENTS ENDPOINTS
  // ============================================================================

  // Generate a personalized AI Study Plan using REAL Google Gemini and real student data
  app.post('/api/svh-ai/study-plan', async (req, res) => {
    const user = authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Please refresh your session.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'SVH AI service key is not configured on the server.' });
    }

    const studentContext = req.body?.studentContext || {};
    const stats = (user.userStats || {}) as Record<string, any>;
    const questionsAttempted = Number(
      studentContext?.practiceStats?.questionsAttempted ?? stats.questionsAttempted ?? 0
    );
    const totalStudyMinutes = Number(
      studentContext?.trackerActivity?.totalStudyMinutes ?? stats.totalStudyMinutes ?? 0
    );
    const activeGoal = String(
      studentContext?.activeGoal || stats.activeGoal || 'General Study'
    );
    const activeSubjects: string[] = Array.isArray(studentContext?.activeSubjects)
      ? studentContext.activeSubjects
      : ['Physics', 'Chemistry', 'Biology'];

    const hasRealActivity = questionsAttempted > 0 || totalStudyMinutes > 0;

    // If user has zero real study/practice activity, do NOT fabricate weaknesses or stats
    if (!hasRealActivity) {
      return res.json({
        ok: true,
        insufficientData: true,
        notice:
          'More real study activity is needed before SVH AI can analyze your personal weaknesses or accuracy trends. Complete at least one practice question or focus session first, or ask SVH AI in chat for a starter syllabus schedule.',
        studyPlan: null,
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const plannerPrompt = `Based STRICTLY on this student's real Study Vault Hub data below, generate a concise, practical, personalized 3-day study plan.
Do NOT invent any fake past scores or imaginary weak topics. Only reference weak topics or studied chapters that actually appear in the student's real data, plus core high-yield topics for their active goal (${activeGoal}: ${activeSubjects.join(', ')}).

Return ONLY valid JSON matching this structure:
{
  "summary": "1-2 sentence personalized coaching summary referencing their real ${questionsAttempted} solved questions and ${totalStudyMinutes} study minutes",
  "items": [
    {
      "dayLabel": "Day 1",
      "subject": "Subject Name",
      "topic": "Specific Topic or Revision Target",
      "focusMinutes": 45,
      "practiceQuestions": 15,
      "priority": "High"
    }
  ]
}

REAL STUDENT DATA:
${JSON.stringify(studentContext, null, 2)}`;

    try {
      let parsedPlan: { summary?: string; items?: Array<any> } | null = null;
      for (const modelName of SVH_AI_MODELS) {
        try {
          const genRes = await ai.models.generateContent({
            model: modelName,
            contents: plannerPrompt,
            config: {
              responseMimeType: 'application/json',
            },
          });
          const rawText = genRes?.text?.trim() || '';
          if (rawText) {
            const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
            parsedPlan = JSON.parse(cleaned);
            if (parsedPlan && Array.isArray(parsedPlan.items) && parsedPlan.items.length > 0) {
              break;
            }
          }
        } catch {
          // try next model
        }
      }

      if (!parsedPlan || !Array.isArray(parsedPlan.items) || parsedPlan.items.length === 0) {
        return res.status(500).json({
          error: 'Could not generate AI study plan right now. Please try again.',
        });
      }

      const nowIso = new Date().toISOString();
      const studyPlan = {
        id: `plan_${crypto.randomUUID()}`,
        createdAt: nowIso,
        goal: activeGoal,
        summary:
          typeof parsedPlan.summary === 'string' && parsedPlan.summary.trim()
            ? parsedPlan.summary.trim()
            : `Personalized plan based on ${questionsAttempted} solved questions and ${totalStudyMinutes} min of tracked study.`,
        insufficientDataNotice: null,
        items: parsedPlan.items.slice(0, 6).map((it: any, idx: number) => ({
          id: `plan_item_${Date.now()}_${idx}`,
          dayLabel: String(it.dayLabel || `Session ${idx + 1}`).slice(0, 30),
          subject: String(it.subject || activeSubjects[0] || 'Core Subject').slice(0, 50),
          topic: String(it.topic || 'Concept Revision & Practice').slice(0, 120),
          focusMinutes: Math.max(15, Math.min(180, Number(it.focusMinutes) || 45)),
          practiceQuestions: Math.max(5, Math.min(100, Number(it.practiceQuestions) || 15)),
          priority:
            it.priority === 'High' || it.priority === 'Medium' ? it.priority : ('Normal' as const),
          completed: false,
        })),
      };

      user.userStats = {
        ...(user.userStats || {}),
        activeStudyPlan: studyPlan,
        svhAiUsageCount: (Number(user.userStats?.svhAiUsageCount) || 0) + 1,
      };
      saveDatabase(db);

      return res.json({
        ok: true,
        insufficientData: false,
        studyPlan,
      });
    } catch (err) {
      console.error('AI Study Plan generation error:', err);
      return res.status(500).json({
        error: 'Failed to generate AI Study Plan. Please try again.',
      });
    }
  });

  // Get & reconcile Smart Revision + Spaced Repetition schedule from real user activity
  app.post('/api/svh-ai/smart-revision', (req, res) => {
    const user = authenticateRequest(req);
    const clientStats = (req.body?.userStats || {}) as Record<string, any>;
    const mergedStats = {
      ...(user?.userStats || {}),
      ...clientStats,
    };

    const action = req.body?.action;
    const revisionId = typeof req.body?.revisionId === 'string' ? req.body.revisionId : '';

    let schedule = computeSmartRevisionSchedule(mergedStats as any);
    if (action === 'complete_review' && revisionId) {
      schedule = advanceRevisionItemStage(schedule, revisionId);
    }

    if (user) {
      user.userStats = {
        ...(user.userStats || {}),
        revisionSchedule: schedule,
      };
      saveDatabase(db);
    }

    return res.json({
      ok: true,
      revisionSchedule: schedule,
    });
  });

  // Backend-verified Achievements & Badges evaluation
  app.post('/api/achievements/verify', (req, res) => {
    const user = authenticateRequest(req);
    const clientStats = (req.body?.userStats || {}) as Record<string, any>;
    const mergedStats = {
      ...(user?.userStats || {}),
      ...clientStats,
    };

    const verification = evaluateVerifiedAchievements(mergedStats as any);
    if (user) {
      user.userStats = {
        ...(user.userStats || {}),
        unlockedAchievements: verification.unlockedAchievements,
      };
      saveDatabase(db);
    }

    return res.json({
      ok: true,
      ...verification,
    });
  });

  // ============================================================================
  // SVH AI VOICE TUTOR — REAL AUDIO TRANSCRIPTION (STT) & MALE VOICE TTS
  // ============================================================================

  // Transcribe recorded microphone audio via Google Gemini multimodal audio input
  app.post('/api/svh-ai/voice/transcribe', async (req, res) => {
    const user = authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Please refresh your session.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'SVH AI service key is not configured on the server.' });
    }

    const audioBase64 = typeof req.body?.audioBase64 === 'string' ? req.body.audioBase64.trim() : '';
    const mimeType = typeof req.body?.mimeType === 'string' && req.body.mimeType.trim()
      ? req.body.mimeType.trim()
      : 'audio/webm';

    if (!audioBase64) {
      return res.status(400).json({ error: 'No audio data recorded.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    try {
      let transcript = '';
      for (const modelName of SVH_AI_MODELS) {
        try {
          const genRes = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data: audioBase64,
                    },
                  },
                  {
                    text: 'Transcribe the spoken question or statement in this audio accurately into plain text (English / Indian English academic terms for Physics, Chemistry, Biology, Mathematics, NEET, JEE). Return ONLY the exact transcribed text with no extra commentary or quotes. If the audio is completely silent or unintelligible, return an empty string.',
                  },
                ],
              },
            ],
          });
          const candidate = (genRes?.text || '').trim();
          if (candidate) {
            transcript = candidate;
            break;
          }
        } catch {
          // try next model
        }
      }

      return res.json({
        ok: true,
        transcript,
      });
    } catch (err) {
      console.error('Voice transcription error:', err);
      return res.status(500).json({
        error: 'Could not transcribe audio right now. Please try speaking again or type your question.',
      });
    }
  });

  // Synthesize natural-sounding MALE voice audio via Google Gemini TTS (gemini-2.5-flash-preview-tts)
  app.post('/api/svh-ai/voice/tts', async (req, res) => {
    const user = authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Please refresh your session.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'SVH AI service key is not configured on the server.' });
    }

    const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!rawText) {
      return res.status(400).json({ error: 'Missing text for speech synthesis.' });
    }

    // Clean markdown formatting for clear natural speech
    const cleanSpeechText = rawText
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/[#*`_~]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1800);

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: cleanSpeechText }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              // 'Puck' or 'Charon' or 'Fenrir' or 'Orus' are natural male voices in Gemini TTS
              prebuiltVoiceConfig: { voiceName: 'Puck' },
            },
          },
        },
      });

      const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      const base64Audio = inlineData?.data || '';
      const audioMimeType = inlineData?.mimeType || 'audio/pcm;rate=24000';

      if (!base64Audio) {
        return res.status(500).json({ error: 'TTS model did not return audio data.' });
      }

      // If Gemini TTS returns raw 16-bit 24kHz mono PCM, wrap it in a standard WAV header so HTML5 <audio> plays it directly on Web and Android
      const pcmBuffer = Buffer.from(base64Audio, 'base64');
      let wavBase64 = base64Audio;
      let finalMime = audioMimeType;

      if (audioMimeType.includes('pcm') || audioMimeType.includes('L16') || !audioMimeType.includes('wav')) {
        const sampleRate = 24000;
        const numChannels = 1;
        const bitsPerSample = 16;
        const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
        const blockAlign = (numChannels * bitsPerSample) / 8;
        const dataSize = pcmBuffer.length;
        const wavHeader = Buffer.alloc(44);

        wavHeader.write('RIFF', 0);
        wavHeader.writeUInt32LE(36 + dataSize, 4);
        wavHeader.write('WAVE', 8);
        wavHeader.write('fmt ', 12);
        wavHeader.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
        wavHeader.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
        wavHeader.writeUInt16LE(numChannels, 22);
        wavHeader.writeUInt32LE(sampleRate, 24);
        wavHeader.writeUInt32LE(byteRate, 28);
        wavHeader.writeUInt16LE(blockAlign, 32);
        wavHeader.writeUInt16LE(bitsPerSample, 34);
        wavHeader.write('data', 36);
        wavHeader.writeUInt32LE(dataSize, 40);

        const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);
        wavBase64 = wavBuffer.toString('base64');
        finalMime = 'audio/wav';
      }

      return res.json({
        ok: true,
        audioDataUrl: `data:${finalMime};base64,${wavBase64}`,
        voiceGender: 'male',
        voiceName: 'Puck',
      });
    } catch (err) {
      console.error('Gemini Male Voice TTS error:', err);
      return res.status(500).json({
        error: 'Gemini TTS audio synthesis unavailable; falling back to device male voice.',
      });
    }
  });

  // ============================================================================
  // SMART STUDY SESSION GENERATOR (REAL GEMINI + REAL USER DATA)
  // ============================================================================
  app.post('/api/svh-ai/smart-session', async (req, res) => {
    const user = authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Please refresh your session.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'SVH AI service key is not configured on the server.' });
    }

    const studentContext = req.body?.studentContext || {};
    const requestedSubject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : '';
    const requestedTopic = typeof req.body?.topic === 'string' ? req.body.topic.trim() : '';
    const requestedMinutes = Math.max(15, Math.min(180, Number(req.body?.durationMinutes) || 45));

    const stats = (user.userStats || {}) as Record<string, any>;
    const questionsAttempted = Number(
      studentContext?.practiceStats?.questionsAttempted ?? stats.questionsAttempted ?? 0
    );
    const totalStudyMinutes = Number(
      studentContext?.trackerActivity?.totalStudyMinutes ?? stats.totalStudyMinutes ?? 0
    );

    if (!requestedTopic && questionsAttempted <= 0 && totalStudyMinutes <= 0) {
      return res.json({
        ok: true,
        insufficientData: true,
        notice:
          'Not enough data yet — complete at least one practice question or focus session so SVH AI can recommend a personalized Smart Study Session from your real progress, or enter a specific topic above.',
        smartSession: null,
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `You are SVH AI inside Study Vault Hub. Generate a structured, high-yield Smart Study Session guide based strictly on the student's real data or their requested topic.
Requested Subject: ${requestedSubject || 'Auto-select from student weak/active subjects'}
Requested Topic: ${requestedTopic || 'Auto-select from student real studied/weak topics'}
Session Duration: ${requestedMinutes} minutes

Return ONLY valid JSON with this exact structure:
{
  "subject": "Subject Name",
  "topic": "Specific Chapter / Topic Name",
  "durationMinutes": ${requestedMinutes},
  "objectives": ["Objective 1", "Objective 2", "Objective 3"],
  "conceptSummary": "Concise, rigorous explanation of the core concept",
  "keyFormulasOrPoints": ["Key formula/mechanism 1", "Key formula/mechanism 2", "Key formula/mechanism 3"],
  "practicePrompts": ["Self-check question 1 with brief answer", "Self-check question 2 with brief answer"]
}

REAL STUDENT DATA:
${JSON.stringify(studentContext, null, 2)}`;

    try {
      let parsed: any = null;
      for (const modelName of SVH_AI_MODELS) {
        try {
          const genRes = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
            },
          });
          const raw = (genRes?.text || '').trim();
          if (raw) {
            const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
            parsed = JSON.parse(cleaned);
            if (parsed && parsed.topic) break;
          }
        } catch {
          // try next model
        }
      }

      if (!parsed || !parsed.topic) {
        return res.status(500).json({ error: 'Could not generate Smart Study Session. Please try again.' });
      }

      const smartSession = {
        id: `smart_sess_${crypto.randomUUID()}`,
        createdAt: new Date().toISOString(),
        subject: String(parsed.subject || requestedSubject || 'Science'),
        topic: String(parsed.topic || requestedTopic || 'Core Revision'),
        durationMinutes: requestedMinutes,
        objectives: Array.isArray(parsed.objectives) ? parsed.objectives.map(String).slice(0, 5) : [],
        conceptSummary: String(parsed.conceptSummary || ''),
        keyFormulasOrPoints: Array.isArray(parsed.keyFormulasOrPoints)
          ? parsed.keyFormulasOrPoints.map(String).slice(0, 6)
          : [],
        practicePrompts: Array.isArray(parsed.practicePrompts)
          ? parsed.practicePrompts.map(String).slice(0, 4)
          : [],
      };

      return res.json({
        ok: true,
        insufficientData: false,
        smartSession,
      });
    } catch (err) {
      console.error('Smart Study Session error:', err);
      return res.status(500).json({ error: 'Failed to generate Smart Study Session.' });
    }
  });

  // ============================================================================
  // REAL COMMUNITY LEADERBOARD ENDPOINT (100% REAL AUTHENTICATED USERS ONLY)
  // ============================================================================
  app.get('/api/community/leaderboard', async (_req, res) => {
    try {
      const fsDashboard = await fetchOwnerDashboardFromFirestore().catch(() => null);
      const unifiedMap = new Map<
        string,
        {
          userId: string;
          username: string | null;
          displayName: string;
          profilePhotoUrl: string | null;
          activeGoal: string | null;
          vaultPoints: number;
          questionsSolved: number;
          studyMinutes: number;
          streakDays: number;
        }
      >();

      for (const u of Object.values(db.users)) {
        const stats = (u.userStats || {}) as Record<string, any>;
        const qSolved = Math.max(0, Number(stats.questionsAttempted) || 0);
        const studyMin = Math.max(0, Number(stats.totalStudyMinutes) || 0);
        const vpBreakdown = calculateVaultPointsBreakdown(
          stats as any,
          u.vpTransactions || stats.vpTransactions || []
        );
        const vp = Math.max(
          Number(u.vaultPoints) || 0,
          Number(stats.vaultPoints) || 0,
          vpBreakdown.vaultPoints
        );
        const displayName = (u.displayName || stats.name || u.username || '').trim();
        if (!displayName) continue;
        // Exclude unauthenticated anonymous session placeholders that have 0 activity
        if (!u.username && vp <= 0 && qSolved <= 0 && studyMin <= 0) continue;

        const key = u.username ? `uname:${u.username.toLowerCase()}` : `uid:${u.userId}`;
        unifiedMap.set(key, {
          userId: u.userId,
          username: u.username || null,
          displayName,
          profilePhotoUrl: u.profilePhotoUrl || stats.profilePhotoUrl || null,
          activeGoal:
            typeof stats.activeGoal === 'string' && stats.activeGoal
              ? stats.activeGoal
              : Array.isArray(stats.selectedGoals) && stats.selectedGoals.length > 0
              ? stats.selectedGoals[0]
              : null,
          vaultPoints: vp,
          questionsSolved: qSolved,
          studyMinutes: studyMin,
          streakDays: Number(stats.streak?.current) || 0,
        });
      }

      if (fsDashboard && Array.isArray(fsDashboard.users)) {
        for (const fu of fsDashboard.users) {
          const displayName = (fu.displayName || fu.username || '').trim();
          if (!displayName) continue;
          const vp = Math.max(0, Number(fu.vaultPoints) || 0);
          const qSolved = Math.max(0, Number(fu.questionsAttempted) || 0);
          const studyMin = Math.max(0, Number(fu.totalStudyMinutes) || 0);
          if (!fu.username && vp <= 0 && qSolved <= 0 && studyMin <= 0) continue;

          const key = fu.username ? `uname:${fu.username.toLowerCase()}` : `uid:${fu.userId}`;
          const existing = unifiedMap.get(key);
          if (!existing) {
            unifiedMap.set(key, {
              userId: fu.userId,
              username: fu.username || null,
              displayName,
              profilePhotoUrl: null,
              activeGoal: fu.activeGoal && fu.activeGoal !== 'Not Set' ? fu.activeGoal : null,
              vaultPoints: vp,
              questionsSolved: qSolved,
              studyMinutes: studyMin,
              streakDays: Number(fu.streakDays) || 0,
            });
          } else {
            existing.vaultPoints = Math.max(existing.vaultPoints, vp);
            existing.questionsSolved = Math.max(existing.questionsSolved, qSolved);
            existing.studyMinutes = Math.max(existing.studyMinutes, studyMin);
            existing.streakDays = Math.max(existing.streakDays, Number(fu.streakDays) || 0);
          }
        }
      }

      const sorted = Array.from(unifiedMap.values()).sort((a, b) => {
        if (b.vaultPoints !== a.vaultPoints) return b.vaultPoints - a.vaultPoints;
        if (b.questionsSolved !== a.questionsSolved) return b.questionsSolved - a.questionsSolved;
        return b.studyMinutes - a.studyMinutes;
      });

      const leaderboard = sorted.map((item, idx) => ({
        ...item,
        rank: idx + 1,
      }));

      return res.json({
        ok: true,
        updatedAt: new Date().toISOString(),
        leaderboard,
      });
    } catch (err) {
      console.error('Leaderboard error:', err);
      return res.status(500).json({ error: 'Failed to load leaderboard.' });
    }
  });

  // ============================================================================
  // PRIVACY-SAFE APP SESSION TELEMETRY & SECURE OWNER ANALYTICS ROUTES
  // ============================================================================

  // Record a real app open session (anonymous userId + hashed deviceId, zero location/PII)
  app.post('/api/telemetry/session', (req, res) => {
    const nowIso = new Date().toISOString();
    let user = authenticateRequest(req);
    let issuedToken: string | undefined;

    if (!user) {
      const requestedName = sanitizeDisplayName(req.body?.displayName);
      const userId = `usr_${crypto.randomUUID()}`;
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(rawToken);
      user = {
        userId,
        tokenHash,
        displayName: requestedName,
        profilePhotoUrl: null,
        svhAiButtonPosition: null,
        createdAt: nowIso,
        lastSeenAt: nowIso,
      };
      db.users[userId] = user;
      issuedToken = rawToken;
    } else {
      user.lastSeenAt = nowIso;
    }

    const deviceHash = registerAnonymousDevice(req.body?.deviceId, user.userId, nowIso);

    if (!Array.isArray(db.analyticsSessions)) {
      db.analyticsSessions = [];
    }

    const sessionRecord: AnalyticsSessionRecord = {
      sessionId: `sess_${crypto.randomUUID()}`,
      userId: user.userId,
      deviceIdHash: deviceHash,
      openedAt: nowIso,
    };

    db.analyticsSessions.push(sessionRecord);
    saveDatabase(db);

    return res.status(201).json({
      ok: true,
      userId: user.userId,
      ...(issuedToken ? { authToken: issuedToken } : {}),
    });
  });

  // Check Owner authentication & setup status
  app.get('/api/owner/auth/status', (req, res) => {
    const isAuthenticated = authenticateOwnerRequest(req);
    return res.json({
      isOwnerAuthenticated: isAuthenticated,
      isOwnerSetupComplete: true,
    });
  });

  // Owner Sign-Out (revokes current Owner session token on backend)
  app.post('/api/owner/auth/logout', (req, res) => {
    const ownerHeader = req.headers['x-owner-authorization'] || req.headers.authorization;
    if (typeof ownerHeader === 'string' && ownerHeader.startsWith('Bearer ')) {
      const rawToken = ownerHeader.slice(7).trim();
      if (rawToken) {
        const targetHash = hashToken(rawToken);
        const user = authenticateRequest(req);
        if (user) {
          if (Array.isArray(user.sessionTokenHashes)) {
            user.sessionTokenHashes = user.sessionTokenHashes.filter(
              (s) => s.tokenHash !== targetHash
            );
          }
          if (user.tokenHash === targetHash) {
            user.tokenHash =
              user.sessionTokenHashes && user.sessionTokenHashes.length > 0
                ? user.sessionTokenHashes[user.sessionTokenHashes.length - 1].tokenHash
                : '';
          }
        }
        if (db.ownerAuth?.activeSessionTokenHashes) {
          db.ownerAuth.activeSessionTokenHashes = db.ownerAuth.activeSessionTokenHashes.filter(
            (s) => s.tokenHash !== targetHash
          );
        }
        saveDatabase(db);
      }
    }
    return res.json({ ok: true });
  });

  // Strict Owner-Only Account Status / Access Management (Suspend / Activate Student Account)
  app.post('/api/owner/users/:targetUserId/status', (req, res) => {
    const isOwner = authenticateOwnerRequest(req);
    if (!isOwner) {
      return res.status(403).json({
        error: 'Forbidden: Verified Owner authorization required.',
      });
    }

    const { targetUserId } = req.params;
    const requestedStatus = req.body?.status;
    if (requestedStatus !== 'active' && requestedStatus !== 'suspended') {
      return res.status(400).json({ error: 'Invalid account status. Must be active or suspended.' });
    }

    const targetUser = db.users[targetUserId];
    if (!targetUser) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    if (
      targetUser.role === 'owner' ||
      isConfiguredOwnerUsername(targetUser.username || '')
    ) {
      return res.status(400).json({ error: 'Cannot suspend the primary Owner account.' });
    }

    targetUser.accountStatus = requestedStatus;
    if (requestedStatus === 'suspended') {
      // Revoke active session tokens for suspended user
      targetUser.tokenHash = '';
      targetUser.sessionTokenHashes = [];
    }

    saveDatabase(db);

    return res.json({
      ok: true,
      userId: targetUser.userId,
      accountStatus: targetUser.accountStatus,
    });
  });

  // Strict Owner-Only Student Account Removal
  app.delete('/api/owner/users/:targetUserId', (req, res) => {
    const isOwner = authenticateOwnerRequest(req);
    if (!isOwner) {
      return res.status(403).json({
        error: 'Forbidden: Verified Owner authorization required.',
      });
    }

    const { targetUserId } = req.params;
    const targetUser = db.users[targetUserId];
    if (!targetUser) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    if (
      targetUser.role === 'owner' ||
      isConfiguredOwnerUsername(targetUser.username || '')
    ) {
      return res.status(400).json({ error: 'Cannot delete the primary Owner account.' });
    }

    delete db.users[targetUserId];
    if (db.aiConversations && db.aiConversations[targetUserId]) {
      delete db.aiConversations[targetUserId];
    }

    const userPostIds = new Set(
      db.posts.filter((p) => p.authorId === targetUserId).map((p) => p.id)
    );
    db.posts = db.posts.filter((p) => p.authorId !== targetUserId);
    db.replies = db.replies.filter(
      (r) => r.authorId !== targetUserId && !userPostIds.has(r.postId)
    );
    db.posts.forEach((p) => {
      p.replyCount = db.replies.filter((r) => r.postId === p.id).length;
    });
    db.chatMessages = db.chatMessages.filter((m) => m.authorId !== targetUserId);

    if (db.registeredDeviceHashes) {
      for (const dev of Object.values(db.registeredDeviceHashes)) {
        dev.userIds = dev.userIds.filter((id) => id !== targetUserId);
      }
    }

    saveDatabase(db);

    return res.json({
      ok: true,
      deletedUserId: targetUserId,
    });
  });

  // Strict Owner-Only Content Moderation (Delete Post, Reply, Chat Message, or Dismiss Report)
  app.delete('/api/owner/moderation/:targetType/:targetId', (req, res) => {
    const isOwner = authenticateOwnerRequest(req);
    if (!isOwner) {
      return res.status(403).json({
        error: 'Forbidden: Verified Owner authorization required.',
      });
    }

    const { targetType, targetId } = req.params;

    if (targetType === 'report') {
      db.reports = (db.reports || []).filter((r) => r.id !== targetId);
      saveDatabase(db);
      return res.json({ ok: true, targetType, targetId });
    }

    if (targetType === 'post') {
      db.posts = db.posts.filter((p) => p.id !== targetId);
      db.replies = db.replies.filter((r) => r.postId !== targetId);
      db.reports = (db.reports || []).filter((r) => r.targetId !== targetId);
      saveDatabase(db);
      broadcastEvent({ type: 'post:deleted', postId: targetId });
      return res.json({ ok: true, targetType, targetId });
    }

    if (targetType === 'reply') {
      const targetReply = db.replies.find((r) => r.id === targetId);
      const postId = targetReply?.postId;
      db.replies = db.replies.filter((r) => r.id !== targetId);
      db.reports = (db.reports || []).filter((r) => r.targetId !== targetId);
      if (postId) {
        const parentPost = db.posts.find((p) => p.id === postId);
        const updatedCount = db.replies.filter((r) => r.postId === postId).length;
        if (parentPost) parentPost.replyCount = updatedCount;
        broadcastEvent({ type: 'reply:deleted', replyId: targetId, postId, replyCount: updatedCount });
      }
      saveDatabase(db);
      return res.json({ ok: true, targetType, targetId });
    }

    if (targetType === 'chat') {
      db.chatMessages = db.chatMessages.filter((m) => m.id !== targetId);
      db.reports = (db.reports || []).filter((r) => r.targetId !== targetId);
      saveDatabase(db);
      broadcastEvent({ type: 'chat:deleted', messageId: targetId });
      return res.json({ ok: true, targetType, targetId });
    }

    return res.status(400).json({ error: 'Invalid moderation target type.' });
  });

  // Strict Owner-Only Analytics & Management Endpoint (Denies all unauthorized requests at API level)
  app.get('/api/owner/analytics', async (req, res) => {
    const isOwner = authenticateOwnerRequest(req);
    if (!isOwner) {
      return res.status(403).json({
        error: 'Forbidden: Verified Owner authorization required to access Analytics.',
      });
    }

    const nowMs = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const sevenDaysMs = 7 * dayMs;
    const thirtyDaysMs = 30 * dayMs;
    const todayDateStr = new Date(nowMs).toISOString().split('T')[0];

    // Fetch real users & activity from shared Firebase Firestore (includes Android APK + Web users)
    const fsDashboard = await fetchOwnerDashboardFromFirestore().catch(() => null);

    // Merge local server users and shared Firestore users into a unified user map
    const unifiedUsersMap = new Map<string, StoredUser>();
    for (const u of Object.values(db.users || {})) {
      const key = u.username ? `usrname_${u.username.toLowerCase()}` : u.userId;
      unifiedUsersMap.set(key, u);
    }

    if (fsDashboard && Array.isArray(fsDashboard.users)) {
      for (const fu of fsDashboard.users as Array<Record<string, any>>) {
        const fuId = String(fu.userId || fu.id || '');
        if (!fuId) continue;
        const key = fu.username ? `usrname_${String(fu.username).toLowerCase()}` : fuId;
        const existing = unifiedUsersMap.get(key);
        if (!existing) {
          unifiedUsersMap.set(key, {
            userId: fuId,
            username: fu.username || undefined,
            role: fu.role === 'owner' ? 'owner' : 'student',
            accountStatus: fu.accountStatus === 'Suspended' || fu.accountStatus === 'suspended' ? 'suspended' : 'active',
            tokenHash: '',
            displayName: fu.displayName || fu.name || fu.username || 'Student',
            createdAt: fu.createdAt || new Date(nowMs).toISOString(),
            lastSeenAt: fu.lastSeenAt || fu.lastActiveAt || fu.lastLoginAt || fu.createdAt || new Date(nowMs).toISOString(),
            lastLoginAt: fu.lastLoginAt || fu.createdAt,
            lastLogoutAt: fu.lastLogoutAt || null,
            loginCount: fu.loginCount || 1,
            logoutCount: fu.logoutCount || 0,
            loginHistory: fu.loginHistory || [],
            lastDevicePlatform: fu.lastDevicePlatform || 'Android APK / Web',
            platformsUsed: fu.devicesUsed || fu.platformsUsed || [],
            vaultPoints: fu.vaultPoints || 0,
            questionVp: fu.questionVp || 0,
            focusMinuteVp: fu.focusMinuteVp || 0,
            focusBonusVp: fu.focusBonusVp || 0,
            vpTransactions: fu.vpTransactions || [],
            userStats: {
              activeGoal: fu.activeGoal || fu.targetExam || 'NEET',
              selectedGoals: fu.selectedGoals || [],
              questionsAttempted: fu.questionsAttempted || 0,
              correctAnswers: fu.correctAnswers || 0,
              incorrectAnswers: fu.incorrectAnswers || 0,
              totalStudyMinutes: fu.totalStudyMinutes || 0,
              streak: fu.streak || {
                current: fu.streakDays || 0,
                lastActiveDate: fu.lastActiveStreakDate || '',
              },
              subjectPerformance: fu.subjectPerformance || {},
              topicPerformance: fu.topicPerformance || {},
              dailyActivity: fu.dailyActivity || {},
              practiceHistory: fu.practiceHistory || [],
              studySessions: fu.studySessions || [],
              vaultPoints: fu.vaultPoints || 0,
              questionVp: fu.questionVp || 0,
              focusMinuteVp: fu.focusMinuteVp || 0,
              focusBonusVp: fu.focusBonusVp || 0,
              vpTransactions: fu.vpTransactions || [],
              svhAiUsageCount: fu.svhAiUsageCount || 0,
            },
          });
        } else {
          // Merge higher counts from Firestore
          const exStats = (existing.userStats || {}) as Record<string, any>;
          if (Number(fu.questionsAttempted || 0) > Number(exStats.questionsAttempted || 0)) {
            exStats.questionsAttempted = fu.questionsAttempted;
            exStats.correctAnswers = fu.correctAnswers;
            exStats.incorrectAnswers = fu.incorrectAnswers;
            exStats.subjectPerformance = fu.subjectPerformance || exStats.subjectPerformance;
            exStats.topicPerformance = fu.topicPerformance || exStats.topicPerformance;
            exStats.practiceHistory = fu.practiceHistory || exStats.practiceHistory;
          }
          if (Number(fu.totalStudyMinutes || 0) > Number(exStats.totalStudyMinutes || 0)) {
            exStats.totalStudyMinutes = fu.totalStudyMinutes;
            exStats.studySessions = fu.studySessions || exStats.studySessions;
          }
          existing.vaultPoints = Math.max(Number(existing.vaultPoints || 0), Number(fu.vaultPoints || 0));
          existing.questionVp = Math.max(Number(existing.questionVp || 0), Number(fu.questionVp || 0));
          existing.focusMinuteVp = Math.max(Number(existing.focusMinuteVp || 0), Number(fu.focusMinuteVp || 0));
          existing.focusBonusVp = Math.max(Number(existing.focusBonusVp || 0), Number(fu.focusBonusVp || 0));
          if ((fu.vpTransactions?.length || 0) > (existing.vpTransactions?.length || 0)) {
            existing.vpTransactions = fu.vpTransactions;
          }
          if ((fu.loginHistory?.length || 0) > (existing.loginHistory?.length || 0)) {
            existing.loginHistory = fu.loginHistory;
          }
          existing.loginCount = Math.max(Number(existing.loginCount || 1), Number(fu.loginCount || 1));
          existing.logoutCount = Math.max(Number(existing.logoutCount || 0), Number(fu.logoutCount || 0));
          existing.lastLogoutAt = existing.lastLogoutAt || fu.lastLogoutAt || '';
          existing.lastDevicePlatform = fu.lastDevicePlatform || existing.lastDevicePlatform || 'Desktop Web';
          existing.platformsUsed = Array.from(
            new Set([...(existing.platformsUsed || []), ...(fu.devicesUsed || fu.platformsUsed || [])])
          );
          existing.userStats = exStats;
        }
      }
    }

    const allUsers = Array.from(unifiedUsersMap.values());
    const allSessions = Array.isArray(db.analyticsSessions) ? db.analyticsSessions : [];
    const allDeviceHashes = Object.keys(db.registeredDeviceHashes || {});

    // Total Unique Users (strictly real users)
    const totalUniqueUsers = allUsers.length;
    const totalRegisteredAccounts = allUsers.filter((u) => Boolean(u.username)).length;

    // Total Devices (unique anonymous device hashes recorded; falls back to unique user devices if sessions exist)
    const deviceSet = new Set<string>(allDeviceHashes);
    for (const s of allSessions) {
      if (s.deviceIdHash) deviceSet.add(s.deviceIdHash);
    }
    for (const u of allUsers) {
      if (u.username) deviceSet.add(`acct_dev_${u.userId}`);
    }
    const totalDevices = Math.max(deviceSet.size, totalRegisteredAccounts);

    // Total App Open Sessions
    const totalLoginSessions = allUsers.reduce((acc, u) => acc + (Number(u.loginCount) || 0), 0);
    const totalAppOpenSessions = Math.max(allSessions.length, totalLoginSessions);

    // Active user sets for DAU (24h), WAU (7d), MAU (30d) based on real sessions, user activity, community & AI usage
    const dauUserIds = new Set<string>();
    const wauUserIds = new Set<string>();
    const mauUserIds = new Set<string>();

    const recordActivityTimestamp = (userId: string, isoTimestamp?: string) => {
      if (!userId || !isoTimestamp) return;
      const ts = new Date(isoTimestamp).getTime();
      if (isNaN(ts)) return;
      const diff = nowMs - ts;
      if (diff <= dayMs) dauUserIds.add(userId);
      if (diff <= sevenDaysMs) wauUserIds.add(userId);
      if (diff <= thirtyDaysMs) mauUserIds.add(userId);
    };

    for (const u of allUsers) {
      recordActivityTimestamp(u.userId, u.lastSeenAt || u.lastLoginAt || u.createdAt);
    }
    for (const s of allSessions) {
      recordActivityTimestamp(s.userId, s.openedAt);
    }
    for (const p of db.posts || []) {
      recordActivityTimestamp(p.authorId, p.createdAt);
    }
    for (const r of db.replies || []) {
      recordActivityTimestamp(r.authorId, r.createdAt);
    }
    for (const m of db.chatMessages || []) {
      recordActivityTimestamp(m.authorId, m.createdAt);
    }

    // New Users (Today, Last 7 Days, Last 30 Days) & New Users Over Time series
    let newUsersToday = 0;
    let newUsersLast7Days = 0;
    let newUsersLast30Days = 0;
    const newUsersByDateMap: Record<string, number> = {};

    for (const u of allUsers) {
      if (!u.createdAt) continue;
      const createdDateStr = u.createdAt.split('T')[0];
      if (createdDateStr) {
        newUsersByDateMap[createdDateStr] = (newUsersByDateMap[createdDateStr] || 0) + 1;
      }
      if (createdDateStr === todayDateStr) {
        newUsersToday += 1;
      }
      const createdTs = new Date(u.createdAt).getTime();
      if (!isNaN(createdTs)) {
        const diff = nowMs - createdTs;
        if (diff <= sevenDaysMs) newUsersLast7Days += 1;
        if (diff <= thirtyDaysMs) newUsersLast30Days += 1;
      }
    }

    // Build sorted New Users Over Time timeline from real dates
    const newUsersOverTime = Object.entries(newUsersByDateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, count]) => ({ date, count }));

    // Registered user accounts full telemetry for authorized Admin/Owner only (never includes password hashes/salts/tokens)
    const registeredAccounts = allUsers
      .map((u) => {
        const stats = (u.userStats || {}) as Record<string, any>;
        const isUserOwner = Boolean(
          u.role === 'owner' || isConfiguredOwnerUsername(u.username || '')
        );
        const attempted = typeof stats.questionsAttempted === 'number' ? stats.questionsAttempted : 0;
        const correct = typeof stats.correctAnswers === 'number' ? stats.correctAnswers : 0;
        const incorrect = typeof stats.incorrectAnswers === 'number' ? stats.incorrectAnswers : Math.max(0, attempted - correct);
        const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
        const totalStudyMinutes = typeof stats.totalStudyMinutes === 'number' ? stats.totalStudyMinutes : 0;

        const vpBreakdown = calculateVaultPointsBreakdown(stats as any, u.vpTransactions || stats.vpTransactions || []);
        const vaultPoints = Math.max(Number(u.vaultPoints || 0), Number(stats.vaultPoints || 0), vpBreakdown.vaultPoints);
        const questionVp = Math.max(Number(u.questionVp || 0), Number(stats.questionVp || 0), vpBreakdown.questionVp);
        const focusMinuteVp = Math.max(Number(u.focusMinuteVp || 0), Number(stats.focusMinuteVp || 0), vpBreakdown.focusMinuteVp);
        const focusBonusVp = Math.max(Number(u.focusBonusVp || 0), Number(stats.focusBonusVp || 0), vpBreakdown.focusBonusVp);
        const vpTransactions = (u.vpTransactions && u.vpTransactions.length > 0)
          ? u.vpTransactions
          : (Array.isArray(stats.vpTransactions) ? stats.vpTransactions : []);

        const userPostsCount = (db.posts || []).filter((p) => p.authorId === u.userId || p.authorName === u.displayName).length;
        const userRepliesCount = (db.replies || []).filter((r) => r.authorId === u.userId || r.authorName === u.displayName).length;
        const userChatCount = (db.chatMessages || []).filter((m) => m.authorId === u.userId || m.authorName === u.displayName).length;
        const userAiConvs = db.aiConversations?.[u.userId] || [];
        const userAiQueries = userAiConvs.reduce(
          (acc, c) => acc + (Array.isArray(c.messages) ? c.messages.filter((m) => m.role === 'user').length : 0),
          0
        ) || Number(stats.svhAiUsageCount || 0);

        return {
          userId: u.userId,
          username: u.username || null,
          displayName: u.displayName || 'Student',
          role: isUserOwner ? ('owner' as const) : ('student' as const),
          accountStatus: u.accountStatus === 'suspended' ? ('suspended' as const) : ('active' as const),
          activeGoal: typeof stats.activeGoal === 'string' ? stats.activeGoal : (Array.isArray(stats.selectedGoals) ? stats.selectedGoals[0] : null),
          selectedGoals: Array.isArray(stats.selectedGoals) ? stats.selectedGoals : [],
          questionsAttempted: attempted,
          correctAnswers: correct,
          incorrectAnswers: incorrect,
          accuracy,
          totalStudyMinutes,
          streak: stats.streak || { current: 0, lastActiveDate: '' },
          vaultPoints,
          questionVp,
          focusMinuteVp,
          focusBonusVp,
          vpTransactions: vpTransactions.slice(0, 100),
          subjectPerformance: stats.subjectPerformance || {},
          topicPerformance: stats.topicPerformance || {},
          dailyActivity: stats.dailyActivity || {},
          practiceHistory: Array.isArray(stats.practiceHistory) ? stats.practiceHistory.slice(0, 40) : [],
          studySessions: Array.isArray(stats.studySessions) ? stats.studySessions.slice(0, 40) : [],
          recentMistakesCount: Array.isArray(stats.recentMistakes) ? stats.recentMistakes.length : 0,
          createdAt: u.createdAt,
          lastLoginAt: u.lastLoginAt || u.lastSeenAt || u.createdAt,
          lastLogoutAt: u.lastLogoutAt || stats.lastLogoutAt || '',
          lastSeenAt: u.lastSeenAt,
          loginCount: u.loginCount || stats.loginCount || (u.username ? 1 : 0),
          logoutCount: u.logoutCount || stats.logoutCount || 0,
          loginHistory: (u.loginHistory || stats.loginHistory || []).slice(0, 30),
          lastDevicePlatform: u.lastDevicePlatform || stats.lastDevicePlatform || 'Desktop Web',
          platformsUsed: u.platformsUsed || stats.platformsUsed || ['Desktop Web'],
          communityPostsCount: userPostsCount,
          communityRepliesCount: userRepliesCount,
          communityChatCount: userChatCount,
          svhAiUsageCount: userAiQueries,
        };
      })
      .sort((a, b) => (b.lastSeenAt || '').localeCompare(a.lastSeenAt || ''))
      .slice(0, 250);

    // Enrich moderation reports with target content preview
    const moderationReports = (db.reports || []).map((rep) => {
      let targetAuthor = 'Unknown';
      let targetPreview = 'Content already removed';
      if (rep.targetType === 'post') {
        const p = db.posts.find((item) => item.id === rep.targetId);
        if (p) {
          targetAuthor = p.authorName;
          targetPreview = p.content || 'Image Post';
        }
      } else if (rep.targetType === 'reply') {
        const r = db.replies.find((item) => item.id === rep.targetId);
        if (r) {
          targetAuthor = r.authorName;
          targetPreview = r.content || 'Image Reply';
        }
      } else if (rep.targetType === 'chat') {
        const m = db.chatMessages.find((item) => item.id === rep.targetId);
        if (m) {
          targetAuthor = m.authorName;
          targetPreview = m.content;
        }
      }
      return {
        ...rep,
        targetAuthor,
        targetPreview: targetPreview.slice(0, 180),
      };
    });

    // Community Users & real breakdown
    const communityParticipantIds = new Set<string>();
    for (const p of db.posts || []) {
      if (p.authorId) communityParticipantIds.add(p.authorId);
    }
    for (const r of db.replies || []) {
      if (r.authorId) communityParticipantIds.add(r.authorId);
    }
    for (const m of db.chatMessages || []) {
      if (m.authorId) communityParticipantIds.add(m.authorId);
    }

    // SVH AI Users & SVH AI Sessions / Interactions
    const svhAiUserIds = new Set<string>();
    let svhAiTotalConversations = 0;
    let svhAiTotalInteractions = 0;

    for (const [uid, convList] of Object.entries(db.aiConversations || {})) {
      if (Array.isArray(convList) && convList.length > 0) {
        svhAiUserIds.add(uid);
        svhAiTotalConversations += convList.length;
        for (const conv of convList) {
          if (Array.isArray(conv.messages)) {
            const userTurns = conv.messages.filter((msg) => msg.role === 'user').length;
            svhAiTotalInteractions += userTurns;
            for (const msg of conv.messages) {
              recordActivityTimestamp(uid, msg.createdAt);
            }
          }
        }
      }
    }

    const totalVaultPointsAcrossUsers = registeredAccounts.reduce((acc, u) => acc + (u.vaultPoints || 0), 0);
    const totalQuestionsAcrossUsers = registeredAccounts.reduce((acc, u) => acc + (u.questionsAttempted || 0), 0);
    const totalStudyMinutesAcrossUsers = registeredAccounts.reduce((acc, u) => acc + (u.totalStudyMinutes || 0), 0);

    return res.json({
      generatedAt: new Date(nowMs).toISOString(),
      metrics: {
        totalUniqueUsers,
        totalRegisteredAccounts,
        totalDevices,
        totalAppOpenSessions,
        dau: dauUserIds.size,
        wau: wauUserIds.size,
        mau: mauUserIds.size,
        newUsersToday,
        newUsersLast7Days,
        newUsersLast30Days,
        newUsersOverTime,
        communityUsers: communityParticipantIds.size,
        communityPostsCount: Math.max((db.posts || []).length, fsDashboard?.summary?.totalPosts || 0),
        communityRepliesCount: Math.max((db.replies || []).length, fsDashboard?.summary?.totalReplies || 0),
        communityChatMessagesCount: Math.max((db.chatMessages || []).length, fsDashboard?.summary?.totalChatMessages || 0),
        svhAiUsers: svhAiUserIds.size,
        svhAiConversations: svhAiTotalConversations,
        svhAiInteractions: Math.max(svhAiTotalInteractions, fsDashboard?.summary?.totalSvhAiQueriesAllUsers || 0),
        totalVaultPointsAcrossUsers,
        totalQuestionsAcrossUsers,
        totalStudyMinutesAcrossUsers,
        registeredAccounts,
        moderationReports,
      },
    });
  });

  // ============================================================================
  // APK DOWNLOAD EXTERNAL REDIRECT GUARD
  // Ensures any stale cached client or service-worker request to /api/download/apk
  // or /*.apk is immediately redirected (302) to the official external APK URL.
  // ============================================================================
  const OFFICIAL_EXTERNAL_APK_URL =
    'https://github.com/babanrana2008-crypto/Study-Vault-Hub/releases/download/v1.1.0/Best.app-debug.apk';

  app.get(['/api/download/apk', '/Final.app-debug.apk', '/download/apk'], (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res.redirect(302, OFFICIAL_EXTERNAL_APK_URL);
  });

  // ============================================================================
  // VITE MIDDLEWARE (DEV) OR STATIC ASSETS (PROD)
  // ============================================================================
  const distPath = path.join(process.cwd(), 'dist');
  const distIndexHtml = path.join(distPath, 'index.html');
  const isDevMode =
    process.env.NODE_ENV === 'development' ||
    process.env.npm_lifecycle_event === 'dev';
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.env.npm_lifecycle_event === 'start' ||
    (!isDevMode && fs.existsSync(distIndexHtml));

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      if (fs.existsSync(distIndexHtml)) {
        return res.sendFile(distIndexHtml);
      }
      return res.status(200).send('Study Vault Hub is running.');
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Study Vault Hub Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting Study Vault Hub server:', err);
  process.exit(1);
});
