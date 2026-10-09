import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, auth } from '../firebase.ts';
import type {
  UserStats,
  VPTransaction,
  LoginSessionRecord,
  ActiveDeviceRecord,
  CommunityPost,
  CommunityReply,
  CommunityChatMessage,
  LeaderboardEntry,
} from '../types/index.ts';
import {
  hashDeterministicAccountPassword,
  verifyPortablePassword,
  VP_PER_QUESTION,
  calculateFocusSessionVp,
  reconcileUserVpState,
  detectClientDevicePlatform,
  mergeUserStatsSafely,
} from '../utils/securityAndVp.ts';

const RESERVED_OWNER_USERNAMES = ['soumyadip_owner', 'owner_soumyadip', 'svh_owner'];
const ANON_DEVICE_STORAGE_KEY = 'study_vault_anon_device_id_v1';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleUserTrackingFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function getClientDeviceId(): string {
  if (typeof window === 'undefined') return 'dev_default';
  try {
    let devId = localStorage.getItem(ANON_DEVICE_STORAGE_KEY);
    if (!devId) {
      devId = `dev_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
      localStorage.setItem(ANON_DEVICE_STORAGE_KEY, devId);
    }
    return devId;
  } catch {
    return 'dev_default';
  }
}

export function getClientPlatformAndDeviceInfo(): {
  platformType: 'Web' | 'APK';
  deviceInfo: string;
} {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { platformType: 'Web', deviceInfo: 'Web Browser' };
  }
  const ua = navigator.userAgent || '';
  const isCapacitor = Boolean(
    (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() ||
      ua.includes('Capacitor') ||
      window.location.protocol === 'file:' ||
      window.location.protocol === 'capacitor:'
  );
  const platformType: 'Web' | 'APK' = isCapacitor ? 'APK' : 'Web';
  const deviceInfo = detectClientDevicePlatform() || (isCapacitor ? 'Android APK (Capacitor)' : 'Web Browser');
  return { platformType, deviceInfo };
}

/**
 * Automatically creates or updates a user's profile document at `users/{uid}`
 * with: displayName, email, role, createdAt, lastLogin, vpPoints, and activeDevices.
 * NEVER stores or displays passwords in Firestore.
 */
export async function upsertUserProfileInFirestore(params: {
  uid: string;
  displayName?: string;
  email?: string | null;
  username?: string | null;
  role?: 'student' | 'owner';
  createdAt?: string;
  lastLogin?: string;
  vpPoints?: number;
  deviceId?: string;
  deviceInfo?: string;
  platformType?: 'Web' | 'APK';
  userStats?: Partial<UserStats>;
  accountStatus?: 'active' | 'suspended';
}) {
  const uid = (params.uid || auth?.currentUser?.uid || '').trim();
  if (!uid) return null;

  const now = new Date().toISOString();
  const userDocRef = doc(db, 'users', uid);

  let existingData: Record<string, any> = {};
  try {
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      existingData = snap.data() || {};
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('Missing or insufficient permissions'.toLowerCase())) {
      handleUserTrackingFirestoreError(err, OperationType.GET, `users/${uid}`);
    }
  }

  const { platformType: detectedPlatform, deviceInfo: detectedDeviceInfo } =
    getClientPlatformAndDeviceInfo();
  const resolvedPlatformType: 'Web' | 'APK' = params.platformType || detectedPlatform;
  const resolvedDeviceInfo = (params.deviceInfo || detectedDeviceInfo).slice(0, 120);
  const resolvedDeviceId = (params.deviceId || getClientDeviceId()).slice(0, 100);

  const existingDevices: ActiveDeviceRecord[] = Array.isArray(existingData.activeDevices)
    ? existingData.activeDevices.filter(
        (d: any) => d && typeof d === 'object' && (d.deviceId || d.deviceInfo)
      )
    : [];

  const updatedDeviceEntry: ActiveDeviceRecord = {
    deviceId: resolvedDeviceId,
    platformType: resolvedPlatformType,
    deviceInfo: resolvedDeviceInfo,
    lastActive: now,
  };

  const mergedActiveDevices: ActiveDeviceRecord[] = [
    updatedDeviceEntry,
    ...existingDevices.filter(
      (d) =>
        d.deviceId !== resolvedDeviceId &&
        !(d.platformType === resolvedPlatformType && d.deviceInfo === resolvedDeviceInfo)
    ),
  ].slice(0, 15);

  const cleanUsername = (
    params.username ||
    existingData.username ||
    params.userStats?.username ||
    ''
  )
    .trim()
    .toLowerCase();

  const rawEmail = (
    params.email ||
    auth?.currentUser?.email ||
    existingData.email ||
    (cleanUsername
      ? cleanUsername.includes('@')
        ? cleanUsername
        : `${cleanUsername}@svh.student`
      : `${uid}@svh.student`)
  )
    .trim()
    .slice(0, 180);

  const resolvedDisplayName = (
    params.displayName ||
    auth?.currentUser?.displayName ||
    params.userStats?.name ||
    existingData.displayName ||
    cleanUsername ||
    'Student'
  )
    .trim()
    .slice(0, 100);

  const resolvedRole: 'student' | 'owner' =
    params.role === 'owner' || existingData.role === 'owner' ? 'owner' : 'student';

  const resolvedCreatedAt =
    existingData.createdAt || params.createdAt || now;
  const resolvedLastLogin =
    params.lastLogin || now;

  const resolvedVpPoints = Math.max(
    0,
    Number(params.vpPoints) || 0,
    Number(params.userStats?.vpPoints) || 0,
    Number(params.userStats?.vaultPoints) || 0,
    Number(existingData.vpPoints) || 0,
    Number(existingData.vaultPoints) || 0
  );

  // Sanitize userStats so passwords/hashes/tokens are NEVER stored
  const sanitizedStats: Record<string, unknown> = {
    ...(existingData.userStats || {}),
    ...(params.userStats || {}),
  };
  delete sanitizedStats.password;
  delete sanitizedStats.confirmPassword;
  delete sanitizedStats.passwordHash;
  delete sanitizedStats.passwordSalt;
  delete sanitizedStats.portableHash;
  delete sanitizedStats.authToken;
  delete sanitizedStats.tokenHash;

  const profileDoc = stripUndefined({
    uid,
    userId: uid,
    displayName: resolvedDisplayName,
    email: rawEmail,
    ...(cleanUsername ? { username: cleanUsername } : {}),
    role: resolvedRole,
    accountStatus: params.accountStatus || existingData.accountStatus || 'active',
    createdAt: resolvedCreatedAt,
    lastLogin: resolvedLastLogin,
    lastSeenAt: now,
    vpPoints: resolvedVpPoints,
    activeDevices: mergedActiveDevices,
    questionsAttempted: Math.max(
      0,
      Number(sanitizedStats.questionsAttempted) || Number(existingData.questionsAttempted) || 0
    ),
    correctAnswers: Math.max(
      0,
      Number(sanitizedStats.correctAnswers) || Number(existingData.correctAnswers) || 0
    ),
    totalStudyMinutes: Math.max(
      0,
      Number(sanitizedStats.totalStudyMinutes) || Number(sanitizedStats.focusMinutes) || Number(existingData.totalStudyMinutes) || Number(existingData.focusMinutes) || 0
    ),
    focusMinutes: Math.max(
      0,
      Number(sanitizedStats.totalStudyMinutes) || Number(sanitizedStats.focusMinutes) || Number(existingData.totalStudyMinutes) || Number(existingData.focusMinutes) || 0
    ),
    streakDays: Math.max(
      0,
      Number((sanitizedStats.streak as any)?.current) || Number(sanitizedStats.streakDays) || Number(existingData.streakDays) || 0
    ),
    activityHistory: Array.isArray(sanitizedStats.activityHistory)
      ? sanitizedStats.activityHistory
      : Array.isArray(existingData.activityHistory)
      ? existingData.activityHistory
      : [],
    activeGoal:
      (typeof sanitizedStats.activeGoal === 'string' && sanitizedStats.activeGoal) ||
      existingData.activeGoal ||
      null,
    userStats: sanitizedStats,
  });

  // Explicitly ensure no password field ever exists in users/{uid}
  delete (profileDoc as Record<string, unknown>).password;
  delete (profileDoc as Record<string, unknown>).passwordHash;
  delete (profileDoc as Record<string, unknown>).passwordSalt;
  delete (profileDoc as Record<string, unknown>).confirmPassword;

  try {
    await setDoc(userDocRef, profileDoc, { merge: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('Missing or insufficient permissions'.toLowerCase())) {
      handleUserTrackingFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }
    throw err;
  }

  return profileDoc;
}

/**
 * Removes the current device from `users/{uid}.activeDevices` when a user logs out.
 */
export async function removeActiveDeviceOnLogoutInFirestore(uid?: string, deviceId?: string) {
  const targetUid = (uid || auth?.currentUser?.uid || '').trim();
  if (!targetUid) return;
  const resolvedDeviceId = deviceId || getClientDeviceId();
  const userDocRef = doc(db, 'users', targetUid);
  try {
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) return;
    const data = snap.data() || {};
    const existingDevices: ActiveDeviceRecord[] = Array.isArray(data.activeDevices)
      ? data.activeDevices
      : [];
    const remainingDevices = existingDevices.filter(
      (d) => d && d.deviceId !== resolvedDeviceId
    );
    await setDoc(
      userDocRef,
      stripUndefined({
        activeDevices: remainingDevices,
        lastSeenAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch {
    // non-fatal
  }
}

export function stripUndefined<T>(value: T): T {
  if (value === undefined) return null as unknown as T;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v !== undefined) {
      result[k] = stripUndefined(v);
    }
  }
  return result as T;
}

export interface FirestoreAccountDoc {
  userId: string;
  username: string;
  usernameLower: string;
  displayName: string;
  passwordHash: string;
  portableHash?: string;
  authToken?: string;
  role: 'student' | 'owner';
  profilePhotoUrl?: string | null;
  svhAiButtonPosition?: { xRatio: number; yRatio: number } | null;
  userStats?: Partial<UserStats>;
  vaultPoints?: number;
  questionVp?: number;
  focusMinuteVp?: number;
  focusBonusVp?: number;
  sixtyMinBonusCount?: number;
  vpTransactions?: VPTransaction[];
  svhAiUsageCount?: number;
  loginCount?: number;
  logoutCount?: number;
  lastLoginAt?: string | null;
  lastLogoutAt?: string | null;
  loginHistory?: LoginSessionRecord[];
  lastDevicePlatform?: string;
  devicesUsed?: string[];
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
}

function generateToken(prefix = 'svh_tok'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}${Math.random().toString(36).slice(2, 14)}`;
}

/**
 * Registers a new student account in Firestore with strict case-insensitive username uniqueness.
 */
export async function registerAccountInFirestore(params: {
  name: string;
  username: string;
  password: string;
  selectedGoals?: string[];
  activeGoal?: string;
  targetExam?: string;
  deviceId?: string;
  devicePlatform?: string;
  userStats?: Partial<UserStats>;
  initialStats?: Partial<UserStats>;
  existingUserId?: string;
  existingAuthToken?: string;
  [key: string]: unknown;
}) {
  const cleanName = (params.name || '').trim().slice(0, 60);
  const cleanUsername = (params.username || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.@-]/g, '')
    .slice(0, 32);

  if (!cleanName) {
    throw new Error('Please enter your name.');
  }
  if (!cleanUsername || cleanUsername.length < 3) {
    throw new Error('Username must be at least 3 characters.');
  }
  if (RESERVED_OWNER_USERNAMES.includes(cleanUsername)) {
    throw new Error('This username is reserved. Please choose another username.');
  }
  if (!params.password || params.password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const accountRef = doc(db, 'svh_accounts', cleanUsername);
  const existingSnap = await getDoc(accountRef);
  if (existingSnap.exists()) {
    throw new Error('Username is already taken. Please choose another username or log in.');
  }

  const now = new Date().toISOString();
  const userId =
    params.existingUserId ||
    `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const authToken = params.existingAuthToken || generateToken();
  const portableHash = hashDeterministicAccountPassword(cleanUsername, params.password);
  const platform = detectClientDevicePlatform();

  const safeGoals = Array.isArray(params.selectedGoals)
    ? params.selectedGoals
    : params.targetExam
    ? [params.targetExam]
    : [];
  const mergedStats = mergeUserStatsSafely(params.userStats || params.initialStats, {
    userId,
    username: cleanUsername,
    role: 'student',
    name: cleanName,
    selectedGoals: safeGoals,
    activeGoal: params.activeGoal || params.targetExam || safeGoals[0] || '',
    hasCompletedSetup: true,
  });

  const vpState = reconcileUserVpState({
    userId,
    existingTransactions: mergedStats.vpTransactions || [],
    questionsAttempted: mergedStats.questionsAttempted || 0,
    studySessions: mergedStats.studySessions || [],
    createdAt: now,
  });

  const initialSession: LoginSessionRecord = {
    sessionId: `sess_${Date.now().toString(36)}`,
    loginAt: now,
    logoutAt: null,
    devicePlatform: platform,
    deviceId: params.deviceId,
  };

  const fullStats: Partial<UserStats> = {
    ...mergedStats,
    vaultPoints: vpState.vaultPoints,
    questionVp: vpState.questionVp,
    focusMinuteVp: vpState.focusMinuteVp,
    focusBonusVp: vpState.focusBonusVp,
    sixtyMinBonusCount: vpState.sixtyMinBonusCount,
    vpTransactions: vpState.vpTransactions,
    loginCount: 1,
    logoutCount: 0,
    lastLoginAt: now,
    lastLogoutAt: null,
    loginHistory: [initialSession],
    lastDevicePlatform: platform,
    devicesUsed: [platform],
    svhAiUsageCount: mergedStats.svhAiUsageCount || 0,
  };

  const accountDoc: FirestoreAccountDoc = stripUndefined({
    userId,
    username: cleanUsername,
    usernameLower: cleanUsername,
    displayName: cleanName,
    passwordHash: portableHash,
    portableHash,
    authToken,
    role: 'student',
    profilePhotoUrl: fullStats.profilePhotoUrl ?? null,
    svhAiButtonPosition: fullStats.svhAiButtonPosition ?? null,
    userStats: fullStats,
    vaultPoints: vpState.vaultPoints,
    questionVp: vpState.questionVp,
    focusMinuteVp: vpState.focusMinuteVp,
    focusBonusVp: vpState.focusBonusVp,
    sixtyMinBonusCount: vpState.sixtyMinBonusCount,
    vpTransactions: vpState.vpTransactions,
    svhAiUsageCount: fullStats.svhAiUsageCount || 0,
    loginCount: 1,
    logoutCount: 0,
    lastLoginAt: now,
    lastLogoutAt: null,
    loginHistory: [initialSession],
    lastDevicePlatform: platform,
    devicesUsed: [platform],
    createdAt: now,
    updatedAt: now,
    lastSeenAt: now,
  });

  await setDoc(accountRef, accountDoc);
  await setDoc(
    doc(db, 'svh_users', userId),
    stripUndefined({
      ...accountDoc,
      passwordHash: '[REDACTED]',
      portableHash: '[REDACTED]',
      authToken: '[REDACTED]',
    })
  );

  // Automatically create/update profile document at users/{uid} (never storing passwords)
  await upsertUserProfileInFirestore({
    uid: userId,
    displayName: cleanName,
    email: cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@svh.student`,
    username: cleanUsername,
    role: 'student',
    createdAt: now,
    lastLogin: now,
    vpPoints: vpState.vaultPoints,
    deviceId: params.deviceId,
    deviceInfo: platform,
    userStats: fullStats,
  }).catch(() => {});

  return {
    ok: true,
    userId,
    username: cleanUsername,
    displayName: cleanName,
    role: 'student' as const,
    isOwner: false,
    authToken,
    profilePhotoUrl: fullStats.profilePhotoUrl ?? null,
    svhAiButtonPosition: fullStats.svhAiButtonPosition ?? null,
    userStats: fullStats,
    vaultPoints: vpState.vaultPoints,
    createdAt: now,
  };
}

/**
 * Logs in an existing student or owner account via Firestore, preserving all real stats & VP.
 */
export async function loginAccountInFirestore(params: {
  username: string;
  password: string;
  deviceId?: string;
  devicePlatform?: string;
}) {
  const cleanUsername = (params.username || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.@-]/g, '');

  if (!cleanUsername || !params.password) {
    throw new Error('Please enter both your username and password.');
  }

  const accountRef = doc(db, 'svh_accounts', cleanUsername);
  const snap = await getDoc(accountRef);

  if (!snap.exists()) {
    throw new Error('Invalid username or password.');
  }

  const account = snap.data() as FirestoreAccountDoc;
  const expectedDeterministic = hashDeterministicAccountPassword(cleanUsername, params.password);

  const isPasswordValid =
    account.portableHash === expectedDeterministic ||
    account.passwordHash === expectedDeterministic ||
    verifyPortablePassword(params.password, account.portableHash || '') ||
    verifyPortablePassword(params.password, account.passwordHash || '');

  if (!isPasswordValid) {
    throw new Error('Invalid username or password.');
  }

  const now = new Date().toISOString();
  const platform = detectClientDevicePlatform();
  const newLoginCount = (Number(account.loginCount) || 0) + 1;
  const prevHistory = Array.isArray(account.loginHistory) ? account.loginHistory : [];
  const newSessionRecord: LoginSessionRecord = {
    sessionId: `sess_${Date.now().toString(36)}`,
    loginAt: now,
    logoutAt: null,
    devicePlatform: platform,
    deviceId: params.deviceId,
  };
  const updatedHistory = [newSessionRecord, ...prevHistory].slice(0, 40);
  const updatedDevices = Array.from(
    new Set([...(account.devicesUsed || []), platform])
  );

  // Also check svh_users/{userId} to ensure we merge any stats saved there
  let userDocStats: Partial<UserStats> | undefined;
  try {
    const userSnap = await getDoc(doc(db, 'svh_users', account.userId));
    if (userSnap.exists()) {
      userDocStats = userSnap.data()?.userStats;
    }
  } catch {
    // ignore
  }

  const mergedStats = mergeUserStatsSafely(account.userStats, userDocStats);
  const vpState = reconcileUserVpState({
    userId: account.userId,
    existingTransactions:
      account.vpTransactions || mergedStats.vpTransactions || [],
    questionsAttempted: mergedStats.questionsAttempted || 0,
    studySessions: mergedStats.studySessions || [],
    createdAt: account.createdAt || now,
  });

  const resolvedRole: 'student' | 'owner' =
    account.role === 'owner' ? 'owner' : 'student';

  const fullStats: Partial<UserStats> = {
    ...mergedStats,
    userId: account.userId,
    username: account.usernameLower,
    role: resolvedRole,
    name: account.displayName || mergedStats.name || 'Student',
    profilePhotoUrl:
      account.profilePhotoUrl !== undefined
        ? account.profilePhotoUrl
        : mergedStats.profilePhotoUrl ?? null,
    svhAiButtonPosition:
      account.svhAiButtonPosition !== undefined
        ? account.svhAiButtonPosition
        : mergedStats.svhAiButtonPosition ?? null,
    hasCompletedSetup: true,
    vaultPoints: vpState.vaultPoints,
    questionVp: vpState.questionVp,
    focusMinuteVp: vpState.focusMinuteVp,
    focusBonusVp: vpState.focusBonusVp,
    sixtyMinBonusCount: vpState.sixtyMinBonusCount,
    vpTransactions: vpState.vpTransactions,
    loginCount: newLoginCount,
    logoutCount: Number(account.logoutCount) || 0,
    lastLoginAt: now,
    lastLogoutAt: account.lastLogoutAt || null,
    loginHistory: updatedHistory,
    lastDevicePlatform: platform,
    devicesUsed: updatedDevices,
    svhAiUsageCount:
      Math.max(Number(account.svhAiUsageCount) || 0, Number(mergedStats.svhAiUsageCount) || 0),
  };

  const authToken = account.authToken || generateToken();

  const updatedAccount: FirestoreAccountDoc = stripUndefined({
    ...account,
    authToken,
    portableHash: account.portableHash || expectedDeterministic,
    userStats: fullStats,
    vaultPoints: vpState.vaultPoints,
    questionVp: vpState.questionVp,
    focusMinuteVp: vpState.focusMinuteVp,
    focusBonusVp: vpState.focusBonusVp,
    sixtyMinBonusCount: vpState.sixtyMinBonusCount,
    vpTransactions: vpState.vpTransactions,
    loginCount: newLoginCount,
    lastLoginAt: now,
    loginHistory: updatedHistory,
    lastDevicePlatform: platform,
    devicesUsed: updatedDevices,
    updatedAt: now,
    lastSeenAt: now,
  });

  await setDoc(accountRef, updatedAccount, { merge: true });
  await setDoc(
    doc(db, 'svh_users', account.userId),
    stripUndefined({
      ...updatedAccount,
      passwordHash: '[REDACTED]',
      portableHash: '[REDACTED]',
      authToken: '[REDACTED]',
    }),
    { merge: true }
  );

  // Automatically update/create profile document at users/{uid} (never storing passwords)
  await upsertUserProfileInFirestore({
    uid: account.userId,
    displayName: account.displayName,
    email: account.usernameLower.includes('@')
      ? account.usernameLower
      : `${account.usernameLower}@svh.student`,
    username: account.usernameLower,
    role: resolvedRole,
    createdAt: account.createdAt || now,
    lastLogin: now,
    vpPoints: vpState.vaultPoints,
    deviceId: params.deviceId,
    deviceInfo: platform,
    userStats: fullStats,
  }).catch(() => {});

  return {
    ok: true,
    userId: account.userId,
    username: account.usernameLower,
    displayName: account.displayName,
    role: resolvedRole,
    isOwner: resolvedRole === 'owner',
    authToken,
    profilePhotoUrl: fullStats.profilePhotoUrl ?? null,
    svhAiButtonPosition: fullStats.svhAiButtonPosition ?? null,
    userStats: fullStats,
    vaultPoints: vpState.vaultPoints,
    createdAt: account.createdAt,
  };
}

/**
 * Records a user logout event in Firestore without deleting their account or progress.
 */
export async function logoutAccountInFirestore(params: {
  userId?: string;
  username?: string;
  devicePlatform?: string;
}) {
  const now = new Date().toISOString();
  const cleanUsername = (params.username || '').trim().toLowerCase();

  try {
    if (params.userId) {
      await removeActiveDeviceOnLogoutInFirestore(params.userId);
    }
    if (cleanUsername) {
      const accRef = doc(db, 'svh_accounts', cleanUsername);
      const snap = await getDoc(accRef);
      if (snap.exists()) {
        const data = snap.data() as FirestoreAccountDoc;
        const logoutCount = (Number(data.logoutCount) || 0) + 1;
        const history = Array.isArray(data.loginHistory) ? [...data.loginHistory] : [];
        if (history.length > 0 && !history[0].logoutAt) {
          history[0] = { ...history[0], logoutAt: now };
        }
        await setDoc(
          accRef,
          stripUndefined({
            logoutCount,
            lastLogoutAt: now,
            loginHistory: history,
            lastSeenAt: now,
            updatedAt: now,
          }),
          { merge: true }
        );
        if (data.userId) {
          await removeActiveDeviceOnLogoutInFirestore(data.userId);
          await setDoc(
            doc(db, 'svh_users', data.userId),
            stripUndefined({
              logoutCount,
              lastLogoutAt: now,
              loginHistory: history,
              lastSeenAt: now,
              updatedAt: now,
            }),
            { merge: true }
          );
        }
        return;
      }
    }

    if (params.userId) {
      const userRef = doc(db, 'svh_users', params.userId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        const logoutCount = (Number(data.logoutCount) || 0) + 1;
        const history = Array.isArray(data.loginHistory) ? [...data.loginHistory] : [];
        if (history.length > 0 && !history[0].logoutAt) {
          history[0] = { ...history[0], logoutAt: now };
        }
        await setDoc(
          userRef,
          stripUndefined({
            logoutCount,
            lastLogoutAt: now,
            loginHistory: history,
            lastSeenAt: now,
            updatedAt: now,
          }),
          { merge: true }
        );
      }
    }
  } catch {
    // non-fatal
  }
}

/**
 * Synchronizes user profile and study statistics to Firestore without losing existing progress.
 */
export async function syncUserProfileAndStatsInFirestore(params: {
  userId: string;
  username?: string;
  name?: string;
  displayName?: string;
  targetExam?: string;
  devicePlatform?: string;
  profilePhotoUrl?: string | null;
  svhAiButtonPosition?: { xRatio: number; yRatio: number } | null;
  userStats?: Partial<UserStats>;
  stats?: Partial<UserStats>;
  [key: string]: unknown;
}) {
  if (!params.userId) return null;
  const now = new Date().toISOString();
  const platform = params.devicePlatform || detectClientDevicePlatform();

  const userRef = doc(db, 'svh_users', params.userId);
  const existingSnap = await getDoc(userRef);
  const existingData = existingSnap.exists() ? (existingSnap.data() as Partial<FirestoreAccountDoc>) : {};

  const mergedStats = mergeUserStatsSafely(
    existingData.userStats,
    params.userStats || params.stats
  );
  const resolvedName =
    (params.displayName || params.name || mergedStats.name || existingData.displayName || 'Student')
      .trim()
      .slice(0, 60) || 'Student';
  const resolvedUsername =
    (params.username || mergedStats.username || existingData.usernameLower || '')
      .trim()
      .toLowerCase();

  const vpState = reconcileUserVpState({
    userId: params.userId,
    existingTransactions:
      mergedStats.vpTransactions || existingData.vpTransactions || [],
    questionsAttempted: mergedStats.questionsAttempted || 0,
    studySessions: mergedStats.studySessions || [],
    createdAt: existingData.createdAt || now,
  });

  const fullStats: Partial<UserStats> = {
    ...mergedStats,
    userId: params.userId,
    ...(resolvedUsername ? { username: resolvedUsername } : {}),
    name: resolvedName,
    ...(params.profilePhotoUrl !== undefined
      ? { profilePhotoUrl: params.profilePhotoUrl }
      : {}),
    ...(params.svhAiButtonPosition !== undefined
      ? { svhAiButtonPosition: params.svhAiButtonPosition }
      : {}),
    vaultPoints: vpState.vaultPoints,
    questionVp: vpState.questionVp,
    focusMinuteVp: vpState.focusMinuteVp,
    focusBonusVp: vpState.focusBonusVp,
    sixtyMinBonusCount: vpState.sixtyMinBonusCount,
    vpTransactions: vpState.vpTransactions,
  };

  const devicesUsed = Array.from(
    new Set([...(existingData.devicesUsed || []), platform])
  );

  const userDocPayload = stripUndefined({
    userId: params.userId,
    ...(resolvedUsername
      ? { username: resolvedUsername, usernameLower: resolvedUsername }
      : {}),
    displayName: resolvedName,
    role: existingData.role || fullStats.role || 'student',
    profilePhotoUrl:
      params.profilePhotoUrl !== undefined
        ? params.profilePhotoUrl
        : existingData.profilePhotoUrl ?? fullStats.profilePhotoUrl ?? null,
    svhAiButtonPosition:
      params.svhAiButtonPosition !== undefined
        ? params.svhAiButtonPosition
        : existingData.svhAiButtonPosition ?? fullStats.svhAiButtonPosition ?? null,
    userStats: fullStats,
    vaultPoints: vpState.vaultPoints,
    questionVp: vpState.questionVp,
    focusMinuteVp: vpState.focusMinuteVp,
    focusBonusVp: vpState.focusBonusVp,
    sixtyMinBonusCount: vpState.sixtyMinBonusCount,
    vpTransactions: vpState.vpTransactions,
    svhAiUsageCount:
      Math.max(Number(existingData.svhAiUsageCount) || 0, Number(fullStats.svhAiUsageCount) || 0),
    lastDevicePlatform: platform,
    devicesUsed,
    createdAt: existingData.createdAt || now,
    updatedAt: now,
    lastSeenAt: now,
  });

  await setDoc(userRef, userDocPayload, { merge: true });

  // Also keep users/{uid} synced in real-time (never storing passwords)
  await upsertUserProfileInFirestore({
    uid: params.userId,
    displayName: resolvedName,
    email: resolvedUsername
      ? resolvedUsername.includes('@')
        ? resolvedUsername
        : `${resolvedUsername}@svh.student`
      : undefined,
    username: resolvedUsername || undefined,
    role: (existingData.role || fullStats.role || 'student') as 'student' | 'owner',
    createdAt: existingData.createdAt || now,
    lastLogin: existingData.lastLoginAt || now,
    vpPoints: Math.max(
      Number(fullStats.vpPoints) || 0,
      Number(vpState.vaultPoints) || 0
    ),
    deviceInfo: platform,
    userStats: fullStats,
  }).catch(() => {});

  if (resolvedUsername) {
    const accRef = doc(db, 'svh_accounts', resolvedUsername);
    const accSnap = await getDoc(accRef);
    if (accSnap.exists()) {
      await setDoc(accRef, userDocPayload, { merge: true });
    }
  }

  return {
    userId: params.userId,
    username: resolvedUsername || undefined,
    displayName: resolvedName,
    profilePhotoUrl: userDocPayload.profilePhotoUrl,
    svhAiButtonPosition: userDocPayload.svhAiButtonPosition,
    userStats: fullStats,
    vaultPoints: vpState.vaultPoints,
    questionVp: vpState.questionVp,
    focusMinuteVp: vpState.focusMinuteVp,
    focusBonusVp: vpState.focusBonusVp,
    sixtyMinBonusCount: vpState.sixtyMinBonusCount,
    vpTransactions: vpState.vpTransactions,
  };
}

/**
 * Idempotent, backend-equivalent Vault Points (VP) reward grant in Firestore.
 * Prevents duplicate rewards across refresh, double taps, retries, or multiple devices.
 */
export async function awardVaultPointsInFirestore(params: {
  userId: string;
  username?: string;
  grantKey: string;
  category: 'question' | 'focus_session' | string;
  reason?: string;
  relatedId?: string;
  questionId?: string;
  sessionId?: string;
  durationMinutes?: number;
  subject?: string;
  topic?: string;
  [key: string]: unknown;
}) {
  const { userId, grantKey, category } = params;
  if (!userId || !grantKey) {
    throw new Error('Missing userId or grantKey for VP reward.');
  }

  const safeDocId = grantKey.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 150);
  const txRef = doc(db, 'svh_vp_transactions', safeDocId);
  const existingTxSnap = await getDoc(txRef);

  const userRef = doc(db, 'svh_users', userId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? (userSnap.data() as Partial<FirestoreAccountDoc>) : {};

  // Check if already granted
  const existingList: VPTransaction[] = Array.isArray(userData.vpTransactions)
    ? userData.vpTransactions
    : [];

  if (existingTxSnap.exists() || existingList.some((tx) => tx.id === safeDocId)) {
    return {
      ok: true,
      duplicate: true,
      awardedVp: 0,
      bonusVp: 0,
      totalAwardedVp: 0,
      vaultPoints: Number(userData.vaultPoints) || 0,
      questionVp: Number(userData.questionVp) || 0,
      focusMinuteVp: Number(userData.focusMinuteVp) || 0,
      focusBonusVp: Number(userData.focusBonusVp) || 0,
      sixtyMinBonusCount: Number(userData.sixtyMinBonusCount) || 0,
      vpTransactions: existingList,
    };
  }

  const now = new Date().toISOString();
  const newTransactions: VPTransaction[] = [];
  let awardedVp = 0;
  let bonusVp = 0;

  if (category === 'question') {
    awardedVp = VP_PER_QUESTION;
    const qTx: VPTransaction = stripUndefined({
      id: safeDocId,
      userId,
      timestamp: now,
      amount: VP_PER_QUESTION,
      reason: `Completed valid practice question${params.subject ? ` (${params.subject})` : ''}`,
      category: 'question',
      relatedId: params.questionId || safeDocId,
      subject: params.subject,
      topic: params.topic,
    });
    newTransactions.push(qTx);
    await setDoc(txRef, qTx);
  } else if (category === 'exam_bonus_5q') {
    awardedVp = 10;
    const e5Tx: VPTransaction = stripUndefined({
      id: safeDocId,
      userId,
      timestamp: now,
      amount: 10,
      reason: 'Completed 5 Valid Exam/Exam-Oriented Questions (+10 VP)',
      category: 'exam_bonus_5q',
      relatedId: params.relatedId || 'exam_milestone_5q',
    });
    newTransactions.push(e5Tx);
    await setDoc(txRef, e5Tx);
  } else if (category === 'exam_bonus_20q') {
    awardedVp = 40;
    const e20Tx: VPTransaction = stripUndefined({
      id: safeDocId,
      userId,
      timestamp: now,
      amount: 40,
      reason: 'Completed 20 Valid Exam/Exam-Oriented Questions (+40 VP)',
      category: 'exam_bonus_20q',
      relatedId: params.relatedId || 'exam_milestone_20q',
    });
    newTransactions.push(e20Tx);
    await setDoc(txRef, e20Tx);
  } else if (category === 'daily_usage') {
    awardedVp = 2;
    const dailyTx: VPTransaction = stripUndefined({
      id: safeDocId,
      userId,
      timestamp: now,
      amount: 2,
      reason: `Qualifying Daily Usage (+2 VP)`,
      category: 'daily_usage',
      relatedId: params.relatedId || now.split('T')[0],
    });
    newTransactions.push(dailyTx);
    await setDoc(txRef, dailyTx);
  } else if (category === 'focus_session') {
    const mins = Math.max(0, Math.floor(Number(params.durationMinutes) || 0));
    const calc = calculateFocusSessionVp(mins);
    awardedVp = calc.minuteVp;
    bonusVp = calc.bonusVp;

    if (awardedVp > 0) {
      const minTx: VPTransaction = stripUndefined({
        id: safeDocId,
        userId,
        timestamp: now,
        amount: awardedVp,
        reason: `Verified Focus Session (${mins} min${params.subject ? ` · ${params.subject}` : ''})`,
        category: 'focus_minutes',
        relatedId: params.sessionId || safeDocId,
        subject: params.subject,
        topic: params.topic,
      });
      newTransactions.push(minTx);
      await setDoc(txRef, minTx);
    }

    if (bonusVp > 0) {
      const bonusDocId = `${safeDocId}_bonus60`.slice(0, 150);
      const bonusTx: VPTransaction = stripUndefined({
        id: bonusDocId,
        userId,
        timestamp: now,
        amount: bonusVp,
        reason: `Completed 60-Minute Focus Study (+${bonusVp} VP)`,
        category: 'focus_bonus_60m',
        relatedId: params.sessionId || safeDocId,
        subject: params.subject,
        topic: params.topic,
      });
      newTransactions.push(bonusTx);
      await setDoc(doc(db, 'svh_vp_transactions', bonusDocId), bonusTx);
    }
  }

  const combinedTransactions = [...newTransactions, ...existingList];
  const vpState = reconcileUserVpState({
    userId,
    existingTransactions: combinedTransactions,
    questionsAttempted: userData.userStats?.questionsAttempted || 0,
    studySessions: userData.userStats?.studySessions || [],
    createdAt: userData.createdAt || now,
  });

  const updatedStats: Partial<UserStats> = {
    ...(userData.userStats || {}),
    vaultPoints: vpState.vaultPoints,
    questionVp: vpState.questionVp,
    focusMinuteVp: vpState.focusMinuteVp,
    focusBonusVp: vpState.focusBonusVp,
    sixtyMinBonusCount: vpState.sixtyMinBonusCount,
    vpTransactions: vpState.vpTransactions,
  };

  await setDoc(
    userRef,
    stripUndefined({
      userId,
      displayName: userData.displayName || updatedStats.name || 'Student',
      createdAt: userData.createdAt || now,
      updatedAt: now,
      lastSeenAt: now,
      vaultPoints: vpState.vaultPoints,
      questionVp: vpState.questionVp,
      focusMinuteVp: vpState.focusMinuteVp,
      focusBonusVp: vpState.focusBonusVp,
      sixtyMinBonusCount: vpState.sixtyMinBonusCount,
      vpTransactions: vpState.vpTransactions,
      userStats: updatedStats,
    }),
    { merge: true }
  );

  const resolvedUsername = (
    params.username ||
    userData.usernameLower ||
    updatedStats.username ||
    ''
  )
    .trim()
    .toLowerCase();

  if (resolvedUsername) {
    const accRef = doc(db, 'svh_accounts', resolvedUsername);
    const accSnap = await getDoc(accRef);
    if (accSnap.exists()) {
      await setDoc(
        accRef,
        stripUndefined({
          updatedAt: now,
          lastSeenAt: now,
          vaultPoints: vpState.vaultPoints,
          questionVp: vpState.questionVp,
          focusMinuteVp: vpState.focusMinuteVp,
          focusBonusVp: vpState.focusBonusVp,
          sixtyMinBonusCount: vpState.sixtyMinBonusCount,
          vpTransactions: vpState.vpTransactions,
          userStats: updatedStats,
        }),
        { merge: true }
      );
    }
  }

  return {
    ok: true,
    duplicate: false,
    awardedVp,
    bonusVp,
    totalAwardedVp: awardedVp + bonusVp,
    vaultPoints: vpState.vaultPoints,
    questionVp: vpState.questionVp,
    focusMinuteVp: vpState.focusMinuteVp,
    focusBonusVp: vpState.focusBonusVp,
    sixtyMinBonusCount: vpState.sixtyMinBonusCount,
    vpTransactions: vpState.vpTransactions,
    newTransactions,
  };
}

/**
 * Community Firestore Operations (Shared between Web and Android APK)
 */
export async function fetchCommunityStateFromFirestore(): Promise<{
  posts: CommunityPost[];
  replies: CommunityReply[];
  chatMessages: CommunityChatMessage[];
}> {
  const [postsSnap, repliesSnap, chatSnap] = await Promise.all([
    getDocs(query(collection(db, 'svh_posts'), orderBy('createdAt', 'desc'), limit(200))),
    getDocs(query(collection(db, 'svh_replies'), orderBy('createdAt', 'asc'), limit(500))),
    getDocs(query(collection(db, 'svh_chat'), orderBy('createdAt', 'asc'), limit(300))),
  ]);

  const posts: CommunityPost[] = [];
  postsSnap.forEach((d) => posts.push(d.data() as CommunityPost));

  const replies: CommunityReply[] = [];
  repliesSnap.forEach((d) => replies.push(d.data() as CommunityReply));

  const chatMessages: CommunityChatMessage[] = [];
  chatSnap.forEach((d) => chatMessages.push(d.data() as CommunityChatMessage));

  return { posts, replies, chatMessages };
}

export function subscribeToCommunityFirestore(callbacks: {
  onPosts?: (posts: CommunityPost[]) => void;
  onReplies?: (replies: CommunityReply[]) => void;
  onChat?: (messages: CommunityChatMessage[]) => void;
}): () => void {
  const unsubPosts = onSnapshot(
    query(collection(db, 'svh_posts'), orderBy('createdAt', 'desc'), limit(200)),
    (snap) => {
      const list: CommunityPost[] = [];
      snap.forEach((d) => list.push(d.data() as CommunityPost));
      callbacks.onPosts?.(list);
    },
    () => {}
  );

  const unsubReplies = onSnapshot(
    query(collection(db, 'svh_replies'), orderBy('createdAt', 'asc'), limit(500)),
    (snap) => {
      const list: CommunityReply[] = [];
      snap.forEach((d) => list.push(d.data() as CommunityReply));
      callbacks.onReplies?.(list);
    },
    () => {}
  );

  const unsubChat = onSnapshot(
    query(collection(db, 'svh_chat'), orderBy('createdAt', 'asc'), limit(300)),
    (snap) => {
      const list: CommunityChatMessage[] = [];
      snap.forEach((d) => list.push(d.data() as CommunityChatMessage));
      callbacks.onChat?.(list);
    },
    () => {}
  );

  return () => {
    unsubPosts();
    unsubReplies();
    unsubChat();
  };
}

export async function saveCommunityPostToFirestore(post: CommunityPost) {
  await setDoc(doc(db, 'svh_posts', post.id), stripUndefined(post));
}

export async function deleteCommunityPostFromFirestore(postId: string) {
  await deleteDoc(doc(db, 'svh_posts', postId));
}

export async function saveCommunityReplyToFirestore(
  reply: CommunityReply,
  updatedReplyCountOrPost?: number | CommunityPost
) {
  await setDoc(doc(db, 'svh_replies', reply.id), stripUndefined(reply));
  const count =
    typeof updatedReplyCountOrPost === 'number'
      ? updatedReplyCountOrPost
      : updatedReplyCountOrPost && typeof updatedReplyCountOrPost.replyCount === 'number'
      ? updatedReplyCountOrPost.replyCount
      : undefined;
  if (typeof count === 'number') {
    await setDoc(
      doc(db, 'svh_posts', reply.postId),
      { replyCount: count },
      { merge: true }
    );
  }
}

export async function deleteCommunityReplyFromFirestore(replyId: string, postId?: string, updatedReplyCount?: number) {
  await deleteDoc(doc(db, 'svh_replies', replyId));
  if (postId && typeof updatedReplyCount === 'number') {
    await setDoc(
      doc(db, 'svh_posts', postId),
      { replyCount: updatedReplyCount },
      { merge: true }
    );
  }
}

export async function saveCommunityChatToFirestore(message: CommunityChatMessage) {
  await setDoc(doc(db, 'svh_chat', message.id), stripUndefined(message));
}

export async function deleteCommunityChatFromFirestore(messageId: string) {
  await deleteDoc(doc(db, 'svh_chat', messageId));
}

export async function saveCommunityReportToFirestore(report: {
  id: string;
  reporterId: string;
  targetType: 'post' | 'reply' | 'chat';
  targetId: string;
  reason: string;
  details?: string;
  createdAt: string;
}) {
  await setDoc(doc(db, 'svh_reports', report.id), stripUndefined(report));
}

/**
 * Fetches complete, sanitized Owner Dashboard data directly from Firestore
 * (Never returns passwords, passwordHashes, tokens, or API keys).
 */
export async function fetchOwnerDashboardFromFirestore() {
  const [accountsSnap, usersSnap, postsSnap, repliesSnap, chatSnap, reportsSnap] =
    await Promise.all([
      getDocs(collection(db, 'svh_accounts')),
      getDocs(collection(db, 'svh_users')),
      getDocs(collection(db, 'svh_posts')),
      getDocs(collection(db, 'svh_replies')),
      getDocs(collection(db, 'svh_chat')),
      getDocs(collection(db, 'svh_reports')),
    ]);

  const posts: CommunityPost[] = [];
  postsSnap.forEach((d) => posts.push(d.data() as CommunityPost));

  const replies: CommunityReply[] = [];
  repliesSnap.forEach((d) => replies.push(d.data() as CommunityReply));

  const chatMessages: CommunityChatMessage[] = [];
  chatSnap.forEach((d) => chatMessages.push(d.data() as CommunityChatMessage));

  const reports: Array<Record<string, unknown>> = [];
  reportsSnap.forEach((d) => reports.push(d.data()));

  // Merge accounts and users by userId
  const userMap = new Map<string, Partial<FirestoreAccountDoc>>();
  usersSnap.forEach((d) => {
    const data = d.data() as Partial<FirestoreAccountDoc>;
    if (data.userId) {
      userMap.set(data.userId, data);
    }
  });

  accountsSnap.forEach((d) => {
    const acc = d.data() as FirestoreAccountDoc;
    if (acc.userId) {
      const existing = userMap.get(acc.userId) || {};
      userMap.set(acc.userId, {
        ...existing,
        ...acc,
        userStats: mergeUserStatsSafely(existing.userStats, acc.userStats),
      });
    }
  });

  const nowMs = Date.now();
  const active24hCutoff = nowMs - 24 * 60 * 60 * 1000;
  const active7dCutoff = nowMs - 7 * 24 * 60 * 60 * 1000;
  const onlineNowCutoff = nowMs - 15 * 60 * 1000;

  let activeUsersLast24h = 0;
  let activeUsersLast7d = 0;
  let totalRegisteredAccounts = 0;
  let totalQuestionsAttemptedAllUsers = 0;
  let totalStudyMinutesAllUsers = 0;
  let totalVaultPointsAllUsers = 0;
  let totalSvhAiQueriesAllUsers = 0;
  const goalCounts: Record<string, number> = {};
  const subjectStudyMinutesAllUsers: Record<string, number> = {};

  const sanitizedUsers = Array.from(userMap.values()).map((u) => {
    const uid = u.userId || 'unknown';
    const lastSeenTime = new Date(u.lastSeenAt || u.createdAt || 0).getTime();
    if (lastSeenTime >= active24hCutoff) activeUsersLast24h += 1;
    if (lastSeenTime >= active7dCutoff) activeUsersLast7d += 1;
    if (u.usernameLower || u.username) totalRegisteredAccounts += 1;

    const stats: Partial<UserStats> = u.userStats || {};
    const qAttempted = Number(stats.questionsAttempted) || 0;
    const qCorrect = Number(stats.correctAnswers) || 0;
    const qIncorrect = Number(stats.incorrectAnswers) || Math.max(0, qAttempted - qCorrect);
    const studyMin = Number(stats.totalStudyMinutes) || 0;
    const accuracy =
      qAttempted > 0 ? Number(((qCorrect / qAttempted) * 100).toFixed(1)) : 0;

    const vpState = reconcileUserVpState({
      userId: uid,
      existingTransactions: u.vpTransactions || stats.vpTransactions || [],
      questionsAttempted: qAttempted,
      studySessions: stats.studySessions || [],
      createdAt: u.createdAt,
    });

    totalQuestionsAttemptedAllUsers += qAttempted;
    totalStudyMinutesAllUsers += studyMin;
    totalVaultPointsAllUsers += vpState.vaultPoints;

    const aiUsage = Math.max(
      Number(u.svhAiUsageCount) || 0,
      Number(stats.svhAiUsageCount) || 0
    );
    totalSvhAiQueriesAllUsers += aiUsage;

    const activeGoal = stats.activeGoal || stats.selectedGoals?.[0] || 'Not Set';
    if (activeGoal && activeGoal !== 'Not Set') {
      goalCounts[activeGoal] = (goalCounts[activeGoal] || 0) + 1;
    }

    if (stats.subjectsStudied) {
      for (const [sub, mins] of Object.entries(stats.subjectsStudied)) {
        subjectStudyMinutesAllUsers[sub] =
          (subjectStudyMinutesAllUsers[sub] || 0) + (Number(mins) || 0);
      }
    }

    const userPostsCount = posts.filter((p) => p.authorId === uid).length;
    const userRepliesCount = replies.filter((r) => r.authorId === uid).length;
    const userChatCount = chatMessages.filter((m) => m.authorId === uid).length;
    const userReportsCount = reports.filter((rep) => rep.reporterId === uid).length;

    const isCurrentlyActive = lastSeenTime >= onlineNowCutoff;

    return {
      userId: uid,
      username: u.username || u.usernameLower || stats.username || null,
      role: u.role || stats.role || 'student',
      displayName: u.displayName || stats.name || 'Student',
      hasProfilePhoto: Boolean(u.profilePhotoUrl || stats.profilePhotoUrl),
      createdAt: u.createdAt || new Date().toISOString(),
      lastSeenAt: u.lastSeenAt || u.createdAt || new Date().toISOString(),
      lastLoginAt: u.lastLoginAt || stats.lastLoginAt || u.createdAt || null,
      lastLogoutAt: u.lastLogoutAt || stats.lastLogoutAt || null,
      loginCount: Number(u.loginCount) || Number(stats.loginCount) || 1,
      logoutCount: Number(u.logoutCount) || Number(stats.logoutCount) || 0,
      loginHistory: u.loginHistory || stats.loginHistory || [],
      lastDevicePlatform: u.lastDevicePlatform || stats.lastDevicePlatform || 'Web / App',
      devicesUsed: u.devicesUsed || stats.devicesUsed || ['Web / App'],
      isCurrentlyActive,
      accountStatus: lastSeenTime >= active7dCutoff ? 'Active' : 'Inactive',
      activeGoal,
      selectedGoals: Array.isArray(stats.selectedGoals) ? stats.selectedGoals : [],
      questionsAttempted: qAttempted,
      correctAnswers: qCorrect,
      incorrectAnswers: qIncorrect,
      accuracyPercent: accuracy,
      totalStudyMinutes: studyMin,
      studySessionsCount: Array.isArray(stats.studySessions) ? stats.studySessions.length : 0,
      studySessions: Array.isArray(stats.studySessions) ? stats.studySessions.slice(0, 30) : [],
      practiceHistory: Array.isArray(stats.practiceHistory) ? stats.practiceHistory.slice(0, 30) : [],
      subjectsStudied: stats.subjectsStudied || {},
      topicsStudied: Array.isArray(stats.topicsStudied) ? stats.topicsStudied : [],
      chapterProgress: stats.chapterProgress || {},
      tasksCompleted: Array.isArray(stats.tasks)
        ? stats.tasks.filter((t) => t.completed).length
        : 0,
      totalTasks: Array.isArray(stats.tasks) ? stats.tasks.length : 0,
      streakDays: Number(stats.streak?.current) || 0,
      lastActiveStreakDate: stats.streak?.lastActiveDate || null,
      vaultPoints: vpState.vaultPoints,
      questionVp: vpState.questionVp,
      focusMinuteVp: vpState.focusMinuteVp,
      focusBonusVp: vpState.focusBonusVp,
      sixtyMinBonusCount: vpState.sixtyMinBonusCount,
      vpTransactions: vpState.vpTransactions.slice(0, 50),
      postsCount: userPostsCount,
      repliesCount: userRepliesCount,
      chatCount: userChatCount,
      reportsSubmittedCount: userReportsCount,
      svhAiUsageCount: aiUsage,
    };
  });

  sanitizedUsers.sort(
    (a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()
  );

  return {
    generatedAt: new Date().toISOString(),
    metrics: {
      totalUniqueUsers: sanitizedUsers.length,
      totalRegisteredAccounts,
      totalDevices: Math.max(sanitizedUsers.length, totalRegisteredAccounts),
      totalAppOpenSessions: sanitizedUsers.reduce((acc, u) => acc + (u.loginCount || 1), 0),
      dau: activeUsersLast24h,
      wau: activeUsersLast7d,
      mau: sanitizedUsers.length,
      newUsersToday: sanitizedUsers.filter(
        (u) => (u.createdAt || '').split('T')[0] === new Date().toISOString().split('T')[0]
      ).length,
      newUsersLast7Days: sanitizedUsers.filter(
        (u) => new Date(u.createdAt || 0).getTime() >= active7dCutoff
      ).length,
      newUsersLast30Days: sanitizedUsers.length,
      newUsersOverTime: [],
      communityUsers: new Set([
        ...posts.map((p) => p.authorId),
        ...replies.map((r) => r.authorId),
        ...chatMessages.map((m) => m.authorId),
      ]).size,
      communityPostsCount: posts.length,
      communityRepliesCount: replies.length,
      communityChatMessagesCount: chatMessages.length,
      svhAiUsers: sanitizedUsers.filter((u) => (u.svhAiUsageCount || 0) > 0).length,
      svhAiConversations: sanitizedUsers.filter((u) => (u.svhAiUsageCount || 0) > 0).length,
      svhAiInteractions: totalSvhAiQueriesAllUsers,
      totalVaultPointsAcrossUsers: totalVaultPointsAllUsers,
      totalQuestionsAcrossUsers: totalQuestionsAttemptedAllUsers,
      totalStudyMinutesAcrossUsers: totalStudyMinutesAllUsers,
      registeredAccounts: sanitizedUsers.map((u) => ({
        userId: u.userId,
        username: u.username,
        displayName: u.displayName,
        role: (u.role === 'owner' ? 'owner' : 'student') as 'student' | 'owner',
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
        lastLoginAt: u.lastLoginAt || u.createdAt,
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
      moderationReports: reports.slice(-50).reverse().map((rep) => ({
        id: String(rep.id || ''),
        targetType: (rep.targetType as 'post' | 'reply' | 'chat') || 'post',
        targetId: String(rep.targetId || ''),
        reason: String(rep.reason || ''),
        details: rep.details ? String(rep.details) : undefined,
        reporterId: String(rep.reporterId || ''),
        createdAt: String(rep.createdAt || new Date().toISOString()),
        targetAuthor: String(rep.targetAuthor || 'Community Member'),
        targetPreview: String(rep.targetPreview || 'Reported item'),
      })),
    },
    summary: {
      totalUsers: sanitizedUsers.length,
      totalRegisteredAccounts,
      activeUsersLast24h,
      activeUsersLast7d,
      totalPosts: posts.length,
      totalReplies: replies.length,
      totalChatMessages: chatMessages.length,
      totalReports: reports.length,
      totalQuestionsAttemptedAllUsers,
      totalStudyMinutesAllUsers,
      totalVaultPointsAllUsers,
      totalSvhAiQueriesAllUsers,
      goalDistribution: goalCounts,
      subjectStudyMinutesAllUsers,
    },
    users: sanitizedUsers,
    recentReports: reports.slice(-50).reverse(),
  };
}

/**
 * Fetches the real, verified student leaderboard from Firestore (and merges with any backend users).
 * Never fabricates fake users or dummy scores.
 */
export async function fetchRealLeaderboardFromFirestore(): Promise<LeaderboardEntry[]> {
  try {
    const [accountsSnap, usersSnap] = await Promise.all([
      getDocs(collection(db, 'svh_accounts')).catch(() => null),
      getDocs(collection(db, 'svh_users')).catch(() => null),
    ]);

    const userMap = new Map<string, Record<string, any>>();

    if (usersSnap) {
      usersSnap.forEach((docSnap) => {
        const d = docSnap.data();
        if (d?.userId) {
          userMap.set(d.userId, d);
        }
      });
    }

    if (accountsSnap) {
      accountsSnap.forEach((docSnap) => {
        const d = docSnap.data();
        if (d?.userId) {
          const existing = userMap.get(d.userId) || {};
          const mergedStats = mergeUserStatsSafely(existing.userStats, d.userStats);
          userMap.set(d.userId, {
            ...existing,
            ...d,
            userStats: mergedStats,
          });
        }
      });
    }

    const entries: Omit<LeaderboardEntry, 'rank'>[] = [];
    for (const u of userMap.values()) {
      const stats = (u.userStats || {}) as Partial<UserStats>;
      const qAttempted = Math.max(0, Number(stats.questionsAttempted) || 0);
      const studyMin = Math.max(0, Number(stats.totalStudyMinutes) || 0);
      const vpState = reconcileUserVpState({
        userId: u.userId,
        existingTransactions: u.vpTransactions || stats.vpTransactions || [],
        questionsAttempted: qAttempted,
        studySessions: stats.studySessions || [],
        createdAt: u.createdAt,
      });
      const vaultPoints = Math.max(
        Number(u.vaultPoints) || 0,
        Number(stats.vaultPoints) || 0,
        vpState.vaultPoints
      );
      const displayName = (u.displayName || stats.name || u.username || '').trim();
      // Only include real registered or active students
      if (!displayName) continue;
      if (!u.username && vaultPoints <= 0 && qAttempted <= 0 && studyMin <= 0) continue;

      entries.push({
        userId: String(u.userId),
        username: u.username ? String(u.username) : null,
        displayName,
        profilePhotoUrl: u.profilePhotoUrl || stats.profilePhotoUrl || null,
        activeGoal: stats.activeGoal || stats.selectedGoals?.[0] || null,
        vaultPoints,
        questionsSolved: qAttempted,
        studyMinutes: studyMin,
        streakDays: Number(stats.streak?.current) || 0,
      });
    }

    entries.sort((a, b) => {
      if (b.vaultPoints !== a.vaultPoints) return b.vaultPoints - a.vaultPoints;
      if (b.questionsSolved !== a.questionsSolved) return b.questionsSolved - a.questionsSolved;
      return b.studyMinutes - a.studyMinutes;
    });

    return entries.map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
    }));
  } catch {
    return [];
  }
}

