import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

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

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'community_db.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
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
  const PORT = 3000;

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
        'https://github.com/babanrana2008-crypto/Study-Vault-Hub/releases/download/v3.0.0/SVH.apk'
      );
    }
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="SVH.apk"');
    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(apkPath);
  });

  app.use(express.json({ limit: '8mb' }));

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

  function detectRequestDevicePlatform(req: express.Request): string {
    const bodyPlatform =
      typeof req.body?.devicePlatform === 'string' && req.body.devicePlatform.trim()
        ? req.body.devicePlatform.trim().slice(0, 80)
        : '';
    if (bodyPlatform) return bodyPlatform;

    const ua = String(req.headers['user-agent'] || '');
    if (!ua) return 'Unknown Device';
    if (/Capacitor/i.test(ua)) return 'Android APK (Capacitor)';
    if (/Android/i.test(ua)) return 'Android Browser';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS Web';
    if (/Win/i.test(ua)) return 'Windows Desktop Web';
    if (/Mac/i.test(ua)) return 'macOS Desktop Web';
    if (/Linux/i.test(ua)) return 'Linux Desktop Web';
    return 'Web Browser';
  }

  function recordUserLoginEvent(user: StoredUser, nowIso: string, devicePlatform: string) {
    user.firstSeenAt = user.firstSeenAt || user.createdAt || nowIso;
    user.lastLoginAt = nowIso;
    user.lastSeenAt = nowIso;
    user.loginCount = (typeof user.loginCount === 'number' ? user.loginCount : 0) + 1;
    if (devicePlatform && devicePlatform !== 'Unknown Device') {
      user.devicePlatform = devicePlatform;
    }
    if (!Array.isArray(user.loginHistory)) {
      user.loginHistory = [];
    }
    user.loginHistory.unshift({
      event: 'login',
      timestamp: nowIso,
      devicePlatform: user.devicePlatform || devicePlatform,
    });
    if (user.loginHistory.length > 50) {
      user.loginHistory = user.loginHistory.slice(0, 50);
    }
  }

  function recordUserLogoutEvent(user: StoredUser, nowIso: string, devicePlatform: string) {
    user.lastLogoutAt = nowIso;
    user.lastSeenAt = nowIso;
    if (devicePlatform && devicePlatform !== 'Unknown Device') {
      user.devicePlatform = devicePlatform;
    }
    if (!Array.isArray(user.loginHistory)) {
      user.loginHistory = [];
    }
    user.loginHistory.unshift({
      event: 'logout',
      timestamp: nowIso,
      devicePlatform: user.devicePlatform || devicePlatform,
    });
    if (user.loginHistory.length > 50) {
      user.loginHistory = user.loginHistory.slice(0, 50);
    }
  }

  // Register a new Student account (or upgrade an existing anonymous session to a permanent Student account)
  app.post('/api/auth/register', (req, res) => {
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

    // Check username uniqueness across all accounts
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

    let targetUser: StoredUser;
    if (existingAuthUser && !existingAuthUser.username && existingAuthUser.role !== 'owner') {
      // Upgrade existing anonymous session user so any prior activity is preserved under the same User ID
      targetUser = existingAuthUser;
      targetUser.username = cleanUsername;
      targetUser.role = 'student';
      targetUser.accountStatus = 'active';
      targetUser.passwordSalt = salt;
      targetUser.passwordHash = passwordHash;
      targetUser.displayName = rawName;
      targetUser.lastSeenAt = nowIso;
    } else {
      const userId = `usr_${crypto.randomUUID()}`;
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
    };
    targetUser.userStats = mergedStats;

    const authToken = issueUserSessionToken(targetUser);
    recordUserLoginEvent(targetUser, nowIso, detectRequestDevicePlatform(req));
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
  app.post('/api/auth/login', (req, res) => {
    const cleanUsername = normalizeUsername(req.body?.username);
    const rawPassword = typeof req.body?.password === 'string' ? req.body.password : '';

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
          // Upgrade current anonymous device profile into the single canonical Owner account to preserve existing data
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
      };
      ownerUser.userStats = resolvedOwnerStats;

      const authToken = issueUserSessionToken(ownerUser);
      recordUserLoginEvent(ownerUser, nowIso, detectRequestDevicePlatform(req));
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
    const foundUser = Object.values(db.users).find(
      (u) => u.username && u.username.toLowerCase() === cleanUsername && u.role !== 'owner'
    );

    if (
      !foundUser ||
      !verifyUserPassword(rawPassword, foundUser.passwordSalt, foundUser.passwordHash)
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
    };
    foundUser.userStats = resolvedStats;

    const authToken = issueUserSessionToken(foundUser);
    recordUserLoginEvent(foundUser, nowIso, detectRequestDevicePlatform(req));
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

    user.userStats = {
      ...(user.userStats || {}),
      ...sanitizedIncoming,
      userId: user.userId,
      ...(user.username ? { username: user.username } : {}),
      role: resolvedRole,
      name: user.displayName,
      profilePhotoUrl: user.profilePhotoUrl || null,
      svhAiButtonPosition: user.svhAiButtonPosition || null,
    };
    user.lastSeenAt = new Date().toISOString();

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
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const rawToken = authHeader.slice(7).trim();
      if (rawToken) {
        const targetHash = hashToken(rawToken);
        const user = authenticateRequest(req);
        if (user) {
          recordUserLogoutEvent(user, new Date().toISOString(), detectRequestDevicePlatform(req));
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

  // Helper to compute real VP Points for any user record using the exact activity-based rules:
  // • 10 VP — every 5 minutes of genuine active study/focus time
  // • 2 VP — for every normal question successfully solved
  // • 5 VP — for every correctly answered question in Test Mode
  // • 20 VP — after maintaining a 5-day study streak
  function computeUserRealVPPoints(stats: Record<string, unknown>): {
    vpPoints: number;
    focusBlocksCount: number;
    normalSolvedCount: number;
    testModeCorrectCount: number;
    fiveDayMilestonesCount: number;
  } {
    const questionsAttempted = Math.max(0, Number(stats.questionsAttempted) || 0);
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

    const storedVP = Math.max(0, Number(stats.vpPoints) || 0);
    return {
      vpPoints: Math.max(computedVP, storedVP),
      focusBlocksCount,
      normalSolvedCount,
      testModeCorrectCount,
      fiveDayMilestonesCount,
    };
  }

  // Helper to compute real Community Leaderboard entries from real users & community activity (zero fake data)
  const buildRealCommunityLeaderboard = () => {
    const postCountByAuthor: Record<string, number> = {};
    const replyCountByAuthor: Record<string, number> = {};

    for (const p of db.posts || []) {
      if (p.authorId) {
        postCountByAuthor[p.authorId] = (postCountByAuthor[p.authorId] || 0) + 1;
      }
    }
    for (const r of db.replies || []) {
      if (r.authorId) {
        replyCountByAuthor[r.authorId] = (replyCountByAuthor[r.authorId] || 0) + 1;
      }
    }

    const entries = Object.values(db.users || {})
      .filter((u) => u && u.userId && u.accountStatus !== 'suspended')
      .map((u) => {
        const stats = (u.userStats || {}) as Record<string, unknown>;
        const questionsAttempted = Math.max(0, Number(stats.questionsAttempted) || 0);
        const correctAnswers = Math.max(0, Number(stats.correctAnswers) || 0);
        const totalStudyMinutes = Math.max(0, Number(stats.totalStudyMinutes) || 0);
        const streakObj = (stats.streak || {}) as { current?: number };
        const streakDays = Math.max(0, Number(streakObj.current) || 0);
        const tasksList = Array.isArray(stats.tasks) ? stats.tasks : [];
        const completedTasks = tasksList.filter(
          (t: unknown) => Boolean(t && typeof t === 'object' && (t as { completed?: boolean }).completed)
        ).length;
        const completedNotes = Array.isArray(stats.completedNoteIds) ? stats.completedNoteIds.length : 0;
        const postsCount = postCountByAuthor[u.userId] || 0;
        const repliesCount = replyCountByAuthor[u.userId] || 0;

        const accuracy =
          questionsAttempted > 0 ? Math.round((correctAnswers / questionsAttempted) * 100) : 0;

        const { vpPoints } = computeUserRealVPPoints(stats);

        let milestonesUnlocked = 0;
        if (questionsAttempted >= 1 || totalStudyMinutes >= 5) milestonesUnlocked += 1;
        if (questionsAttempted >= 10) milestonesUnlocked += 1;
        if (questionsAttempted >= 50) milestonesUnlocked += 1;
        if (questionsAttempted >= 100) milestonesUnlocked += 1;
        if (questionsAttempted >= 10 && accuracy >= 80) milestonesUnlocked += 1;
        if (totalStudyMinutes >= 60) milestonesUnlocked += 1;
        if (totalStudyMinutes >= 300) milestonesUnlocked += 1;
        if (streakDays >= 5) milestonesUnlocked += 1;
        if (streakDays >= 10) milestonesUnlocked += 1;
        if (completedTasks + completedNotes + postsCount + repliesCount >= 5) milestonesUnlocked += 1;

        let rankTitle = 'Novice Scholar';
        let rankBadgeColor = 'text-slate-300 border-slate-500/40 bg-slate-900/80';
        let nextMilestoneVp = 100;
        if (vpPoints >= 3000) {
          rankTitle = 'Grandmaster Legend';
          rankBadgeColor = 'text-emerald-300 border-emerald-400/60 bg-emerald-950/80';
          nextMilestoneVp = 3000;
        } else if (vpPoints >= 1500) {
          rankTitle = 'Diamond Topper';
          rankBadgeColor = 'text-indigo-200 border-indigo-400/60 bg-indigo-950/80';
          nextMilestoneVp = 3000;
        } else if (vpPoints >= 700) {
          rankTitle = 'Gold Vault Master';
          rankBadgeColor = 'text-[#fce09b] border-[#d4af37] bg-[#2a2008]';
          nextMilestoneVp = 1500;
        } else if (vpPoints >= 300) {
          rankTitle = 'Silver Strategist';
          rankBadgeColor = 'text-cyan-200 border-cyan-400/50 bg-cyan-950/80';
          nextMilestoneVp = 700;
        } else if (vpPoints >= 100) {
          rankTitle = 'Bronze Aspirant';
          rankBadgeColor = 'text-amber-200 border-amber-500/50 bg-amber-950/80';
          nextMilestoneVp = 300;
        }

        return {
          userId: u.userId,
          displayName: u.displayName || (stats.name as string) || 'Student',
          profilePhotoUrl: u.profilePhotoUrl || (stats.profilePhotoUrl as string | null) || null,
          activeGoal: typeof stats.activeGoal === 'string' && stats.activeGoal ? stats.activeGoal : null,
          vpPoints,
          rankTitle,
          rankBadgeColor,
          questionsAttempted,
          correctAnswers,
          totalStudyMinutes,
          streakDays,
          postsCount,
          repliesCount,
          milestonesUnlocked,
          totalMilestones: 10,
          nextMilestoneVp,
        };
      })
      .filter(
        (entry) =>
          entry.vpPoints > 0 ||
          entry.questionsAttempted > 0 ||
          entry.totalStudyMinutes > 0 ||
          entry.postsCount > 0 ||
          entry.repliesCount > 0 ||
          entry.displayName !== 'Student'
      )
      .sort((a, b) => {
        if (b.vpPoints !== a.vpPoints) return b.vpPoints - a.vpPoints;
        if (b.questionsAttempted !== a.questionsAttempted) return b.questionsAttempted - a.questionsAttempted;
        return b.totalStudyMinutes - a.totalStudyMinutes;
      })
      .slice(0, 100);

    return entries;
  };

  // 3. Get full Community state (posts, replies, chat messages, leaderboard, online count)
  app.get('/api/community/state', (_req, res) => {
    return res.json({
      posts: db.posts,
      replies: db.replies,
      chatMessages: db.chatMessages,
      leaderboard: buildRealCommunityLeaderboard(),
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
  const SVH_AI_MODELS = [
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
    'gemini-3-flash-preview',
    'gemini-2.5-flash',
  ];

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

    const systemInstruction = `You are SVH AI, an elite, highly accurate academic tutor specializing in NEET, JEE, and Science/Math curriculum. 
- Always verify formulas, calculation steps, and conceptual facts internally before generating a response.
- Break down complex doubts into structured sections: 1. Core Concept / Formula, 2. Step-by-Step Solution, 3. Key High-Yield Exam Takeaways.
- Format all mathematical equations, scientific units, and chemical reactions cleanly using standard LaTeX ($...$ for inline, $$...$$ for display).

QUESTION-SPECIFIC ACADEMIC RESPONSE RULES (HIGHEST PRIORITY):
1. Directly, accurately, and thoroughly answer the exact question, problem, concept, derivation, formula, MCQ request, or doubt the student just asked. Never give a generic or off-topic reply.
2. When solving numerical problems, physics/chemistry/math derivations, or mechanism questions:
   - 1. Core Concept / Formula: State the governing principle and list Given Data & Required Formula(s) in standard LaTeX.
   - 2. Step-by-Step Solution: Provide a clear, verified step-by-step calculation or derivation with SI/IUPAC units.
   - 3. Key High-Yield Exam Takeaways: Highlight the Final Answer and common exam traps to avoid.
3. When asked for practice MCQs or quizzes on a topic:
   - Generate high-yield, exam-accurate multiple-choice questions with options (A), (B), (C), (D), the Correct Answer key, and a concise conceptual explanation for each question.

STRICT PERSONALIZATION & HONESTY RULES:
4. Use ONLY the real student data provided below when referencing the student's personal progress. NEVER invent, guess, or fabricate statistics, weak topics, test scores, study hours, target exam dates, or past activity.
5. If the student specifically asks about their weak topics, mistake analysis, or performance AND their real questionsAttempted is 0 (or weakTopics list is empty), state honestly that they have not attempted enough practice questions yet to detect weak topics, and offer to start a quick diagnostic practice or revise a specific chapter.
6. If the student asks for a personalized study plan or timetable, tailor it directly to their activeGoal, subjects, and any timeframe/hours they mention.

REAL STUDENT APP DATA SNAPSHOT:
${JSON.stringify(studentContext, null, 2)}`;

    const generationConfig = {
      systemInstruction,
      temperature: 0.15,
      topP: 0.95,
      maxOutputTokens: 4096,
    };

    return {
      user,
      ai,
      conversation,
      userConversations,
      userMsgRecord,
      historyContents,
      systemInstruction,
      generationConfig,
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

    const { user, ai, conversation, userConversations, userMsgRecord, historyContents, generationConfig } = prep;

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
          config: generationConfig,
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
            config: generationConfig,
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

    const { user, ai, conversation, userConversations, userMsgRecord, historyContents, generationConfig } = prep;

    try {
      let replyText = '';
      let lastGenError: unknown = null;

      for (const modelName of SVH_AI_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: historyContents,
            config: generationConfig,
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

  // AI Voice Tutor Text-to-Speech Endpoint (uses Gemini TTS model gemini-3.8-flash-lite-tts)
  app.post('/api/svh-ai/tts', async (req, res) => {
    const user = authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const requestedVoice = typeof req.body?.voiceName === 'string' ? req.body.voiceName.trim() : 'Kore';
    const allowedVoices = ['Kore', 'Puck', 'Zephyr', 'Charon', 'Fenrir'];
    const voiceName = allowedVoices.includes(requestedVoice) ? requestedVoice : 'Kore';

    if (!rawText) {
      return res.status(400).json({ error: 'Text is required for speech synthesis.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key is not configured.' });
    }

    // Clean markdown symbols for natural spoken narration and cap length for low latency
    const cleanSpokenText = rawText
      .replace(/```[\s\S]*?```/g, ' See code or formula block on screen. ')
      .replace(/[#*_`~>-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1800);

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const ttsModels = ['gemini-2.5-flash-preview-tts', 'gemini-3.8-flash-lite-tts'];
      let inlineData: { data?: string; mimeType?: string } | undefined;

      for (const ttsModel of ttsModels) {
        try {
          const response = await ai.models.generateContent({
            model: ttsModel,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: cleanSpokenText,
                  },
                ],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName },
                },
              },
            },
          });
          const candidateAudio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
          if (candidateAudio?.data) {
            inlineData = candidateAudio;
            break;
          }
        } catch {
          // try next TTS model
        }
      }

      if (!inlineData?.data) {
        return res.status(502).json({ error: 'No audio returned from TTS model.' });
      }

      return res.json({
        audioBase64: inlineData.data,
        mimeType: inlineData.mimeType || 'audio/wav',
        voiceName,
      });
    } catch (err) {
      console.error('SVH AI TTS error:', err);
      return res.status(500).json({
        error: 'Voice synthesis fallback triggered.',
      });
    }
  });

  // AI Smart Revision Plan & AI Study Planner Generator Endpoint (uses real Google Gemini structured JSON)
  app.post('/api/svh-ai/study-plan', async (req, res) => {
    const user = authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Please refresh your session.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'SVH AI service key is not configured on the server.' });
    }

    const goal = typeof req.body?.goal === 'string' && req.body.goal.trim() ? req.body.goal.trim() : 'General Study';
    const subjects = Array.isArray(req.body?.subjects) && req.body.subjects.length > 0
      ? req.body.subjects.filter((s: unknown) => typeof s === 'string')
      : ['Physics', 'Chemistry', 'Biology'];
    const dailyHours = Math.max(1, Math.min(16, Number(req.body?.dailyHours) || 4));
    const timeframe = typeof req.body?.timeframe === 'string' && req.body.timeframe.trim()
      ? req.body.timeframe.trim()
      : '7-Day Smart Revision Sprint';
    const focusMode = typeof req.body?.focusMode === 'string' && req.body.focusMode.trim()
      ? req.body.focusMode.trim()
      : 'High-Weightage Chapters + MCQ Practice';
    const customTopics = typeof req.body?.customTopics === 'string' ? req.body.customTopics.trim() : '';
    const studentStatsSummary = req.body?.studentStats || {};

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `Create a structured, realistic, and high-yield AI Smart Revision Plan & Study Schedule for a student preparing for "${goal}".
Subjects to cover: ${subjects.join(', ')}.
Available study time per day: ${dailyHours} hours (${dailyHours * 60} minutes/day).
Plan Timeframe: ${timeframe}.
Primary Strategy / Focus Mode: ${focusMode}.
${customTopics ? `Specific Chapters/Topics requested by student: ${customTopics}` : ''}
Real Student Progress Context (do not invent fake stats): ${JSON.stringify(studentStatsSummary)}

Generate 6 to 8 concrete, actionable study blocks distributed logically across the subjects and timeframe, plus 4 high-impact exam revision tips.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        planTitle: {
          type: Type.STRING,
          description: 'Title of the personalized study & revision plan.',
        },
        strategySummary: {
          type: Type.STRING,
          description: '2-3 sentence executive summary of how this plan optimizes the student’s revision and practice.',
        },
        studyBlocks: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              dayOrPhase: {
                type: Type.STRING,
                description: 'e.g. Day 1 - Morning Slot, Day 2, Phase 1, etc.',
              },
              subject: {
                type: Type.STRING,
                description: 'Subject name (e.g., Physics, Chemistry, Biology, Mathematics).',
              },
              chapterOrTopic: {
                type: Type.STRING,
                description: 'Specific high-yield chapter or topic name.',
              },
              activityType: {
                type: Type.STRING,
                description: 'One of: Concept Revision, MCQ Practice, NCERT Reading, Formula & Short Notes, Mock & Mistake Review',
              },
              durationMinutes: {
                type: Type.INTEGER,
                description: 'Recommended duration in minutes (e.g. 45, 60, 90).',
              },
              priority: {
                type: Type.STRING,
                description: 'One of: High, Medium, Normal',
              },
              actionableTip: {
                type: Type.STRING,
                description: 'Specific study instructions or what to focus on during this block.',
              },
            },
            required: [
              'dayOrPhase',
              'subject',
              'chapterOrTopic',
              'activityType',
              'durationMinutes',
              'priority',
              'actionableTip',
            ],
          },
        },
        keyRevisionTips: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          },
          description: '3 to 5 high-yield revision and exam execution tips.',
        },
      },
      required: ['planTitle', 'strategySummary', 'studyBlocks', 'keyRevisionTips'],
    };

    let parsedPlan: Record<string, unknown> | null = null;
    let lastError: unknown = null;

    for (const modelName of SVH_AI_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema,
          },
        });
        const rawJson = response?.text?.trim();
        if (rawJson) {
          parsedPlan = JSON.parse(rawJson);
          if (parsedPlan && Array.isArray(parsedPlan.studyBlocks)) {
            break;
          }
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (!parsedPlan || !Array.isArray(parsedPlan.studyBlocks)) {
      console.error('Failed to generate AI study plan:', lastError);
      return res.status(500).json({
        error: 'SVH AI could not generate the study plan right now. Please try again in a moment.',
      });
    }

    const validActivities = [
      'Concept Revision',
      'MCQ Practice',
      'NCERT Reading',
      'Formula & Short Notes',
      'Mock & Mistake Review',
    ];
    const validPriorities = ['High', 'Medium', 'Normal'];

    const normalizedPlan = {
      id: `plan_${crypto.randomUUID()}`,
      generatedAt: new Date().toISOString(),
      goal,
      timeframe,
      dailyHours,
      focusMode,
      planTitle:
        typeof parsedPlan.planTitle === 'string' && parsedPlan.planTitle.trim()
          ? parsedPlan.planTitle.trim()
          : `${goal} Smart Revision & Study Plan`,
      strategySummary:
        typeof parsedPlan.strategySummary === 'string'
          ? parsedPlan.strategySummary.trim()
          : `Tailored ${dailyHours}h/day ${timeframe} plan for ${goal}.`,
      studyBlocks: (parsedPlan.studyBlocks as Array<Record<string, unknown>>).map((b, idx) => ({
        id: `blk_${Date.now()}_${idx}`,
        dayOrPhase: typeof b.dayOrPhase === 'string' ? b.dayOrPhase : `Block ${idx + 1}`,
        subject: typeof b.subject === 'string' ? b.subject : subjects[idx % subjects.length] || 'General',
        chapterOrTopic: typeof b.chapterOrTopic === 'string' ? b.chapterOrTopic : 'High-Yield Chapter Revision',
        activityType: validActivities.includes(String(b.activityType))
          ? String(b.activityType)
          : 'Concept Revision',
        durationMinutes: Math.max(15, Math.min(240, Number(b.durationMinutes) || 45)),
        priority: validPriorities.includes(String(b.priority)) ? String(b.priority) : 'High',
        actionableTip:
          typeof b.actionableTip === 'string'
            ? b.actionableTip
            : 'Focus on core concepts, formulas, and previous year questions.',
      })),
      keyRevisionTips: Array.isArray(parsedPlan.keyRevisionTips)
        ? parsedPlan.keyRevisionTips.filter((t): t is string => typeof t === 'string')
        : [],
    };

    return res.json({ plan: normalizedPlan });
  });

  // ============================================================================
  // AI CHAPTER QUESTION GENERATOR ENDPOINT (/api/mcq/generate)
  // Generates curriculum-accurate, non-duplicated MCQs for Exam + Class + Subject + Chapter + Topic
  // ============================================================================
  app.post('/api/mcq/generate', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'AI question synthesis unavailable; using verified curriculum question bank.',
      });
    }

    const exam = typeof req.body?.exam === 'string' && req.body.exam.trim() ? req.body.exam.trim().slice(0, 60) : 'NEET';
    const classLevel = typeof req.body?.classLevel === 'string' && req.body.classLevel.trim() ? req.body.classLevel.trim().slice(0, 40) : 'Class 12';
    const subject = typeof req.body?.subject === 'string' && req.body.subject.trim() ? req.body.subject.trim().slice(0, 60) : 'Physics';
    const chapterName = typeof req.body?.chapterName === 'string' && req.body.chapterName.trim() ? req.body.chapterName.trim().slice(0, 120) : subject;
    const topicName = typeof req.body?.topicName === 'string' && req.body.topicName.trim() && req.body.topicName !== 'All Topics'
      ? req.body.topicName.trim().slice(0, 120)
      : '';
    const difficultyRaw = req.body?.difficulty;
    const difficulty: 'Easy' | 'Moderate' | 'Hard' =
      difficultyRaw === 'Easy' || difficultyRaw === 'Moderate' || difficultyRaw === 'Hard'
        ? difficultyRaw
        : 'Moderate';
    const count = Math.max(1, Math.min(20, Number(req.body?.count) || 10));

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `Generate ${count} strictly accurate, exam-grade multiple-choice questions (MCQs) for:
- Target Exam / Board: ${exam}
- Class / Standard: ${classLevel}
- Subject: ${subject}
- Chapter: ${chapterName}
${topicName ? `- Specific Topic Focus: ${topicName}` : '- Coverage: High-yield concepts across this chapter'}
- Difficulty Level: ${difficulty}

STRICT QUALITY & ACCURACY RULES:
1. Every question must be 100% scientifically/academically accurate and aligned with NCERT and ${exam} syllabus standards.
2. Each question MUST have exactly 4 distinct, non-empty options.
3. Exactly ONE option must be unambiguously correct (correctIndex: 0, 1, 2, or 3). Distribute correctIndex across 0, 1, 2, 3.
4. Provide a clear, step-by-step academic explanation proving why the correct option is right.
5. Provide a concise conceptual hint without giving away the answer letter directly.
6. Do NOT repeat questions or create near-duplicates.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              correctIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
              hint: { type: Type.STRING },
              topic: { type: Type.STRING },
            },
            required: ['question', 'options', 'correctIndex', 'explanation', 'hint'],
          },
        },
      },
      required: ['questions'],
    };

    for (const modelName of SVH_AI_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema,
          },
        });
        const rawText = response?.text?.trim();
        if (!rawText) continue;
        const parsed = JSON.parse(rawText);
        if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          const ts = Date.now();
          const formatted = parsed.questions.map((q: Record<string, unknown>, idx: number) => ({
            id: `ai-mcq-${subject.toLowerCase().slice(0, 3)}-${ts}-${idx}`,
            subject,
            targetStreams: [exam],
            topic: typeof q.topic === 'string' && q.topic.trim() ? q.topic.trim() : (topicName || chapterName),
            difficulty,
            year: `${exam} ${classLevel} AI Verified`,
            question: typeof q.question === 'string' ? q.question.trim() : '',
            options: Array.isArray(q.options) ? q.options.map((o) => String(o).trim()).slice(0, 4) : [],
            correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
            explanation: typeof q.explanation === 'string' ? q.explanation.trim() : '',
            hint: typeof q.hint === 'string' ? q.hint.trim() : '',
          }));
          return res.json({ questions: formatted });
        }
      } catch {
        // try next model in fallback list
      }
    }

    return res.status(503).json({
      error: 'AI question synthesis temporarily busy; using verified curriculum question bank.',
    });
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
  app.get('/api/owner/analytics', (req, res) => {
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

    const allUsers = Object.values(db.users || {});
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
    const totalDevices = deviceSet.size;

    // Total App Open Sessions
    const totalAppOpenSessions = allSessions.length;

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
      recordActivityTimestamp(u.userId, u.lastSeenAt || u.createdAt);
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

    // Registered user accounts summary for authorized Admin/Owner only (strictly real registered users with a username; never includes password hashes/salts/tokens)
    const registeredUsersOnly = allUsers.filter(
      (u) => Boolean(u.username) || u.role === 'owner'
    );

    const registeredAccounts = registeredUsersOnly
      .map((u) => {
        const stats = (u.userStats || {}) as Record<string, unknown>;
        const isUserOwner = Boolean(
          u.role === 'owner' && isConfiguredOwnerUsername(u.username || '')
        );
        const questionsAttempted = Math.max(0, Number(stats.questionsAttempted) || 0);
        const correctAnswers = Math.max(0, Number(stats.correctAnswers) || 0);
        const totalStudyMinutes = Math.max(0, Number(stats.totalStudyMinutes) || 0);
        const streakObj = (stats.streak || {}) as { current?: number; lastActiveDate?: string };
        const streakDays = Math.max(0, Number(streakObj.current) || 0);
        const streakLastActiveDate =
          typeof streakObj.lastActiveDate === 'string' && streakObj.lastActiveDate
            ? streakObj.lastActiveDate
            : null;
        const { vpPoints } = computeUserRealVPPoints(stats);

        const userSessions = allSessions.filter((s) => s.userId === u.userId);
        const hasActiveToken = Boolean(
          u.tokenHash || (Array.isArray(u.sessionTokenHashes) && u.sessionTokenHashes.length > 0)
        );

        // Merge real login/logout history from both user.loginHistory and userStats.loginHistory
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
          role: isUserOwner ? ('owner' as const) : ('student' as const),
          accountStatus: u.accountStatus === 'suspended' ? ('suspended' as const) : ('active' as const),
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
      })
      .sort((a, b) => (b.lastSeenAt || '').localeCompare(a.lastSeenAt || ''))
      .slice(0, 200);

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
        communityPostsCount: (db.posts || []).length,
        communityRepliesCount: (db.replies || []).length,
        communityChatMessagesCount: (db.chatMessages || []).length,
        svhAiUsers: svhAiUserIds.size,
        svhAiConversations: svhAiTotalConversations,
        svhAiInteractions: svhAiTotalInteractions,
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
    'https://github.com/babanrana2008-crypto/Study-Vault-Hub/releases/download/v1.0.0/Final.app-debug.apk';

  app.get(['/api/download/apk', '/Final.app-debug.apk', '/download/apk'], (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res.redirect(302, OFFICIAL_EXTERNAL_APK_URL);
  });

  // ============================================================================
  // VITE MIDDLEWARE (DEV) OR STATIC ASSETS (PROD)
  // ============================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Study Vault Hub Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
