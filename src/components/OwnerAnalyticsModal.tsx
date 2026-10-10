import React, { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import { ActiveDeviceRecord } from '../types';
import {
  ShieldCheck,
  Users,
  Smartphone,
  Activity,
  TrendingUp,
  MessagesSquare,
  Sparkles,
  RefreshCw,
  X,
  AlertTriangle,
  Calendar,
  BarChart3,
  Trash2,
  Ban,
  CheckCircle2,
  Flag,
  Search,
  ArrowUpDown,
} from 'lucide-react';
import { apiFetch } from '../services/nativeApiBridge';

const IDENTITY_STORAGE_KEY = 'study_vault_community_identity_v1';
const OWNER_TOKEN_STORAGE_KEY = 'study_vault_owner_session_token_v1';

interface RegisteredAccountItem {
  userId: string;
  username: string | null;
  email?: string | null;
  displayName: string;
  role?: 'owner' | 'student';
  accountStatus?: 'active' | 'suspended';
  activeSessionStatus?: 'online_active' | 'signed_out';
  activeGoal: string | null;
  questionsAttempted: number;
  correctAnswers?: number;
  totalStudyMinutes: number;
  vpPoints?: number;
  streakDays?: number;
  streakLastActiveDate?: string | null;
  totalLoginCount?: number;
  totalSessionCount?: number;
  firstSeenAt?: string;
  createdAt: string;
  lastLogin?: string | null;
  lastLoginAt?: string | null;
  lastLogoutAt?: string | null;
  lastSeenAt: string;
  devicePlatform?: string | null;
  activeDevices?: ActiveDeviceRecord[];
  activeDeviceCount?: number;
  loginHistory?: Array<{
    event: 'login' | 'logout';
    timestamp: string;
    devicePlatform?: string | null;
  }>;
}

interface ModerationReportItem {
  id: string;
  targetType: 'post' | 'reply' | 'chat';
  targetId: string;
  reason: string;
  details?: string;
  reporterId: string;
  createdAt: string;
  targetAuthor?: string;
  targetPreview?: string;
}

interface OwnerAnalyticsMetrics {
  totalUniqueUsers: number;
  totalRegisteredAccounts?: number;
  totalDevices: number;
  totalAppOpenSessions: number;
  dau: number;
  wau: number;
  mau: number;
  newUsersToday: number;
  newUsersLast7Days: number;
  newUsersLast30Days: number;
  newUsersOverTime: Array<{ date: string; count: number }>;
  communityUsers: number;
  communityPostsCount: number;
  communityRepliesCount: number;
  communityChatMessagesCount: number;
  svhAiUsers: number;
  svhAiConversations: number;
  svhAiInteractions: number;
  registeredAccounts?: RegisteredAccountItem[];
  moderationReports?: ModerationReportItem[];
}

interface OwnerAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOwnerAuthStatusChange?: (isAuthenticated: boolean) => void;
}

export const OwnerAnalyticsModal: React.FC<OwnerAnalyticsModalProps> = React.memo(({
  isOpen,
  onClose,
  onOwnerAuthStatusChange,
}) => {
  const [metrics, setMetrics] = useState<OwnerAnalyticsMetrics | null>(null);
  const [liveFirestoreUsers, setLiveFirestoreUsers] = useState<RegisteredAccountItem[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState<boolean>(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [selectedDetailUserId, setSelectedDetailUserId] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [userStatusFilter, setUserStatusFilter] = useState<
    'all' | 'online_active' | 'signed_out' | 'suspended'
  >('all');
  const [userSortBy, setUserSortBy] = useState<
    'lastActive' | 'latestLogin' | 'loginCount' | 'vpPoints' | 'streak' | 'questions' | 'minutes'
  >('lastActive');

  // Real-time Firestore listener on `users` collection via onSnapshot
  useEffect(() => {
    if (!isOpen || !db) return;
    const usersColRef = collection(db, 'users');
    const unsubscribe = onSnapshot(
      usersColRef,
      (snapshot) => {
        const nowIso = new Date().toISOString();
        const items: RegisteredAccountItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() || {};
          const uid = String(data.uid || data.userId || docSnap.id);
          const stats = (data.userStats || {}) as Record<string, any>;
          const rawDevices: ActiveDeviceRecord[] = Array.isArray(data.activeDevices)
            ? data.activeDevices.filter(
                (d: any) => d && typeof d === 'object' && (d.deviceInfo || d.platformType)
              )
            : [];
          const latestDevice = rawDevices[0];
          const resolvedEmail =
            typeof data.email === 'string' && data.email.trim()
              ? data.email.trim()
              : typeof data.username === 'string' && data.username.trim()
              ? data.username.includes('@')
                ? data.username
                : `${data.username}@svh.student`
              : `${uid}@svh.student`;

          const vpVal = Math.max(
            0,
            Number(data.vpPoints) || 0,
            Number(data.vaultPoints) || 0,
            Number(stats.vpPoints) || 0,
            Number(stats.vaultPoints) || 0
          );

          const createdAtStr =
            typeof data.createdAt === 'string' && data.createdAt
              ? data.createdAt
              : nowIso;
          const lastLoginStr =
            typeof data.lastLogin === 'string' && data.lastLogin
              ? data.lastLogin
              : typeof data.lastLoginAt === 'string' && data.lastLoginAt
              ? data.lastLoginAt
              : createdAtStr;
          const lastSeenStr =
            typeof data.lastSeenAt === 'string' && data.lastSeenAt
              ? data.lastSeenAt
              : lastLoginStr;

          items.push({
            userId: uid,
            username: data.username || stats.username || resolvedEmail.split('@')[0] || null,
            email: resolvedEmail,
            displayName: data.displayName || stats.name || 'Student',
            role: data.role === 'owner' ? 'owner' : 'student',
            accountStatus: data.accountStatus === 'suspended' ? 'suspended' : 'active',
            activeSessionStatus: rawDevices.length > 0 ? 'online_active' : 'signed_out',
            activeGoal: data.activeGoal || stats.activeGoal || null,
            questionsAttempted: Math.max(
              0,
              Number(data.questionsAttempted) || Number(stats.questionsAttempted) || 0
            ),
            correctAnswers: Math.max(
              0,
              Number(data.correctAnswers) || Number(stats.correctAnswers) || 0
            ),
            totalStudyMinutes: Math.max(
              0,
              Number(data.totalStudyMinutes) || Number(stats.totalStudyMinutes) || 0
            ),
            vpPoints: vpVal,
            streakDays: Math.max(
              0,
              Number(data.streakDays) || Number(stats.streak?.current) || 0
            ),
            streakLastActiveDate: stats.streak?.lastActiveDate || null,
            totalLoginCount: Math.max(
              1,
              Number(data.loginCount) || Number(stats.loginCount) || rawDevices.length || 1
            ),
            totalSessionCount: Math.max(1, rawDevices.length || 1),
            firstSeenAt: createdAtStr,
            createdAt: createdAtStr,
            lastLogin: lastLoginStr,
            lastLoginAt: lastLoginStr,
            lastLogoutAt: data.lastLogoutAt || stats.lastLogoutAt || null,
            lastSeenAt: lastSeenStr,
            devicePlatform: latestDevice
              ? `${latestDevice.platformType}: ${latestDevice.deviceInfo}`
              : data.lastDevicePlatform || stats.lastDevicePlatform || 'Web Browser',
            activeDevices: rawDevices,
            activeDeviceCount: rawDevices.length,
            loginHistory: Array.isArray(data.loginHistory) ? data.loginHistory : [],
          });
        });
        setLiveFirestoreUsers(items);
        setGeneratedAt(nowIso);
      },
      (err) => {
        console.error('Owner Dashboard users onSnapshot error:', err);
      }
    );
    return () => unsubscribe();
  }, [isOpen]);

  // Combined real-time user directory (merges live Firestore `users` onSnapshot feed with backend accounts)
  const combinedRegisteredAccounts = React.useMemo(() => {
    const map = new Map<string, RegisteredAccountItem>();
    const serverAccounts = metrics?.registeredAccounts || [];

    for (const acc of serverAccounts) {
      const fallbackDevices: ActiveDeviceRecord[] =
        Array.isArray(acc.activeDevices) && acc.activeDevices.length > 0
          ? acc.activeDevices
          : acc.activeSessionStatus === 'online_active'
          ? [
              {
                deviceId: `dev_${acc.userId}`,
                platformType: (acc.devicePlatform || '').toLowerCase().includes('apk')
                  ? 'APK'
                  : 'Web',
                deviceInfo: acc.devicePlatform || 'Web Browser',
                lastActive: acc.lastSeenAt || acc.createdAt,
              },
            ]
          : [];
      const resolvedEmail =
        acc.email ||
        (acc.username
          ? acc.username.includes('@')
            ? acc.username
            : `${acc.username}@svh.student`
          : `${acc.userId}@svh.student`);

      map.set(acc.userId, {
        ...acc,
        email: resolvedEmail,
        lastLogin: acc.lastLogin || acc.lastLoginAt || acc.lastSeenAt,
        activeDevices: fallbackDevices,
        activeDeviceCount: fallbackDevices.length,
      });
    }

    for (const liveUser of liveFirestoreUsers) {
      const existing = map.get(liveUser.userId);
      if (!existing) {
        map.set(liveUser.userId, liveUser);
      } else {
        const mergedDevices =
          Array.isArray(liveUser.activeDevices) && liveUser.activeDevices.length > 0
            ? liveUser.activeDevices
            : existing.activeDevices || [];
        map.set(liveUser.userId, {
          ...existing,
          ...liveUser,
          displayName: liveUser.displayName || existing.displayName,
          email: liveUser.email || existing.email,
          username: liveUser.username || existing.username,
          createdAt: liveUser.createdAt || existing.createdAt,
          lastLogin: liveUser.lastLogin || existing.lastLogin || existing.lastLoginAt,
          lastLoginAt: liveUser.lastLoginAt || existing.lastLoginAt,
          vpPoints: Math.max(Number(liveUser.vpPoints) || 0, Number(existing.vpPoints) || 0),
          questionsAttempted: Math.max(
            Number(liveUser.questionsAttempted) || 0,
            Number(existing.questionsAttempted) || 0
          ),
          totalStudyMinutes: Math.max(
            Number(liveUser.totalStudyMinutes) || 0,
            Number(existing.totalStudyMinutes) || 0
          ),
          activeDevices: mergedDevices,
          activeDeviceCount: mergedDevices.length,
          loginHistory:
            Array.isArray(liveUser.loginHistory) && liveUser.loginHistory.length > 0
              ? liveUser.loginHistory
              : existing.loginHistory || [],
        });
      }
    }

    return Array.from(map.values());
  }, [metrics?.registeredAccounts, liveFirestoreUsers]);

  const filteredAndSortedAccounts = React.useMemo(() => {
    const rawList = combinedRegisteredAccounts;
    const q = userSearchQuery.trim().toLowerCase();
    const filtered = rawList.filter((acct) => {
      if (userStatusFilter === 'online_active' && acct.activeSessionStatus !== 'online_active') {
        return false;
      }
      if (userStatusFilter === 'signed_out' && acct.activeSessionStatus === 'online_active') {
        return false;
      }
      if (userStatusFilter === 'suspended' && acct.accountStatus !== 'suspended') {
        return false;
      }
      if (!q) return true;
      return (
        (acct.displayName || '').toLowerCase().includes(q) ||
        (acct.email || '').toLowerCase().includes(q) ||
        (acct.username || '').toLowerCase().includes(q) ||
        (acct.userId || '').toLowerCase().includes(q) ||
        (acct.activeGoal || '').toLowerCase().includes(q) ||
        (acct.devicePlatform || '').toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      if (userSortBy === 'vpPoints') return (b.vpPoints || 0) - (a.vpPoints || 0);
      if (userSortBy === 'streak') return (b.streakDays || 0) - (a.streakDays || 0);
      if (userSortBy === 'loginCount') return (b.totalLoginCount || 0) - (a.totalLoginCount || 0);
      if (userSortBy === 'questions') return (b.questionsAttempted || 0) - (a.questionsAttempted || 0);
      if (userSortBy === 'minutes') return (b.totalStudyMinutes || 0) - (a.totalStudyMinutes || 0);
      if (userSortBy === 'latestLogin') {
        return (b.lastLogin || b.lastLoginAt || b.lastSeenAt || '').localeCompare(
          a.lastLogin || a.lastLoginAt || a.lastSeenAt || ''
        );
      }
      return (b.lastSeenAt || '').localeCompare(a.lastSeenAt || '');
    });
  }, [combinedRegisteredAccounts, userSearchQuery, userStatusFilter, userSortBy]);

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return 'Not recorded yet';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Not recorded yet';
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActiveBearerToken = useCallback((): string => {
    try {
      const rawIdentity = localStorage.getItem(IDENTITY_STORAGE_KEY);
      if (rawIdentity) {
        const parsed = JSON.parse(rawIdentity);
        if (parsed?.authToken) {
          return parsed.authToken;
        }
      }
      const savedOwnerToken = localStorage.getItem(OWNER_TOKEN_STORAGE_KEY);
      if (savedOwnerToken) {
        return savedOwnerToken;
      }
    } catch {
      // ignore
    }
    return '';
  }, []);

  const fetchOwnerAnalytics = useCallback(async () => {
    const token = getActiveBearerToken();
    if (!token) {
      onOwnerAuthStatusChange?.(false);
      onClose();
      return;
    }

    setIsLoadingAnalytics(true);
    setAnalyticsError(null);
    try {
      const res = await apiFetch('/api/owner/analytics', {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Owner-Authorization': `Bearer ${token}`,
        },
      });
      if (res.status === 401 || res.status === 403) {
        setMetrics(null);
        onOwnerAuthStatusChange?.(false);
        onClose();
        return;
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Could not load Owner Management & Analytics.');
      }
      const data = await res.json();
      if (data?.metrics) {
        setMetrics(data.metrics);
        setGeneratedAt(data.generatedAt || null);
        onOwnerAuthStatusChange?.(true);
      }
    } catch (err) {
      setAnalyticsError(
        err instanceof Error ? err.message : 'Unable to load analytics from server.'
      );
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [getActiveBearerToken, onOwnerAuthStatusChange, onClose]);

  useEffect(() => {
    if (isOpen) {
      fetchOwnerAnalytics();
    }
  }, [isOpen, fetchOwnerAnalytics]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleToggleUserStatus = async (
    targetUserId: string,
    currentStatus: 'active' | 'suspended' = 'active'
  ) => {
    const token = getActiveBearerToken();
    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    setActionBusyId(targetUserId);
    setAnalyticsError(null);
    try {
      if (db) {
        await setDoc(
          doc(db, 'users', targetUserId),
          { accountStatus: nextStatus },
          { merge: true }
        ).catch(() => {});
      }
      if (token) {
        const res = await apiFetch(`/api/owner/users/${encodeURIComponent(targetUserId)}/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'X-Owner-Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ status: nextStatus }),
        });
        if (res.ok) {
          await fetchOwnerAnalytics();
        }
      }
    } catch (err) {
      setAnalyticsError(err instanceof Error ? err.message : 'Could not update user status.');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleRemoveUserAccount = async (targetUserId: string) => {
    const token = getActiveBearerToken();
    setActionBusyId(targetUserId);
    setAnalyticsError(null);
    try {
      if (db) {
        await deleteDoc(doc(db, 'users', targetUserId)).catch(() => {});
        await deleteDoc(doc(db, 'svh_users', targetUserId)).catch(() => {});
      }
      if (token) {
        await apiFetch(`/api/owner/users/${encodeURIComponent(targetUserId)}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Owner-Authorization': `Bearer ${token}`,
          },
        }).catch(() => {});
      }
      setConfirmDeleteUserId(null);
      await fetchOwnerAnalytics();
    } catch (err) {
      setAnalyticsError(err instanceof Error ? err.message : 'Could not remove user account.');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleModerationAction = async (
    targetType: 'post' | 'reply' | 'chat' | 'report',
    targetId: string
  ) => {
    const token = getActiveBearerToken();
    if (!token) return;
    setActionBusyId(targetId);
    setAnalyticsError(null);
    try {
      const res = await apiFetch(
        `/api/owner/moderation/${encodeURIComponent(targetType)}/${encodeURIComponent(targetId)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Owner-Authorization': `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to execute moderation action.');
      }
      await fetchOwnerAnalytics();
    } catch (err) {
      setAnalyticsError(err instanceof Error ? err.message : 'Moderation action failed.');
    } finally {
      setActionBusyId(null);
    }
  };

  if (!isOpen) return null;

  const maxDailyNewUsers =
    metrics?.newUsersOverTime && metrics.newUsersOverTime.length > 0
      ? Math.max(...metrics.newUsersOverTime.map((d) => d.count), 1)
      : 1;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="svh-spring-modal-card w-full max-w-5xl rounded-2xl sm:rounded-3xl bg-[#0b1324] border border-[#d4af37]/40 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Bar */}
        <div className="px-4 sm:px-6 py-4 bg-[#0f1930] border-b border-[#d4af37]/25 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#131b2e] border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-sm sm:text-lg font-bold text-[#fbf9f4] truncate">
                Study Vault Hub — Owner &amp; Admin Management
              </h2>
              <p className="text-[11px] text-[#cbd5e1] truncate">
                Developed by Soumyadip Rana · Verified Owner Session
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchOwnerAnalytics}
              disabled={isLoadingAnalytics}
              title="Refresh Real-Time Metrics"
              className="px-3 py-1.5 rounded-xl bg-[#131b2e] border border-[#d4af37]/30 text-xs font-semibold text-[#fbf9f4] hover:border-[#d4af37] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#d4af37] ${
                  isLoadingAnalytics ? 'animate-spin' : ''
                }`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-xl bg-[#131b2e] border border-[#d4af37]/25 text-[#cbd5e1] hover:text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="space-y-6">
            {analyticsError && (
              <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{analyticsError}</span>
                </div>
                <button
                  type="button"
                  onClick={fetchOwnerAnalytics}
                  className="underline font-semibold"
                >
                  Retry
                </button>
              </div>
            )}

            {!metrics && isLoadingAnalytics ? (
              <div className="py-12 text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-[#d4af37] animate-spin mx-auto" />
                <p className="text-xs sm:text-sm text-[#cbd5e1] font-mono">
                  Loading real backend metrics &amp; user directory...
                </p>
              </div>
            ) : metrics ? (
              <>
                {/* 1. Core Platform Reach: Users, Devices, App Open Sessions */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-xs sm:text-sm font-bold text-[#d4af37] uppercase tracking-wider flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      <span>Application &amp; User Statistics (100% Real Backend Records)</span>
                    </h3>
                    {generatedAt && (
                      <span className="text-[11px] font-mono text-[#9ca3af]">
                        Updated {new Date(generatedAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/30 space-y-1">
                      <div className="flex items-center justify-between text-xs text-[#9ca3af]">
                        <span>Total Registered Users</span>
                        <Users className="w-4 h-4 text-[#d4af37]" />
                      </div>
                      <div className="font-display text-2xl sm:text-3xl font-bold text-[#fbf9f4] tabular-nums">
                        {Math.max(metrics.totalUniqueUsers, combinedRegisteredAccounts.length)}
                      </div>
                      <p className="text-[11px] text-[#cbd5e1]">
                        {combinedRegisteredAccounts.length} live synced in Firestore users collection
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/30 space-y-1">
                      <div className="flex items-center justify-between text-xs text-[#9ca3af]">
                        <span>Total Active Devices</span>
                        <Smartphone className="w-4 h-4 text-[#d4af37]" />
                      </div>
                      <div className="font-display text-2xl sm:text-3xl font-bold text-[#fbf9f4] tabular-nums">
                        {Math.max(
                          metrics.totalDevices,
                          combinedRegisteredAccounts.reduce(
                            (sum, u) => sum + (u.activeDeviceCount || u.activeDevices?.length || 0),
                            0
                          )
                        )}
                      </div>
                      <p className="text-[11px] text-[#cbd5e1]">
                        Tracked across Web &amp; Android APK
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/30 space-y-1">
                      <div className="flex items-center justify-between text-xs text-[#9ca3af]">
                        <span>Total App Open Sessions</span>
                        <Activity className="w-4 h-4 text-[#d4af37]" />
                      </div>
                      <div className="font-display text-2xl sm:text-3xl font-bold text-[#fbf9f4] tabular-nums">
                        {Math.max(metrics.totalAppOpenSessions, combinedRegisteredAccounts.length)}
                      </div>
                      <p className="text-[11px] text-[#cbd5e1]">
                        Recorded application launch sessions
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Active Users: DAU, WAU, MAU & New Users */}
                <div className="space-y-2.5">
                  <h3 className="font-display text-xs sm:text-sm font-bold text-[#d4af37] uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>Active Retention (DAU / WAU / MAU) &amp; New Users</span>
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                    <div className="p-3.5 rounded-xl bg-[#0f172a] border border-[#d4af37]/25">
                      <span className="text-[11px] text-[#9ca3af] block">DAU (24h)</span>
                      <span className="font-display text-xl font-bold text-[#fbf9f4] tabular-nums mt-0.5 block">
                        {metrics.dau}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#0f172a] border border-[#d4af37]/25">
                      <span className="text-[11px] text-[#9ca3af] block">WAU (7d)</span>
                      <span className="font-display text-xl font-bold text-[#fbf9f4] tabular-nums mt-0.5 block">
                        {metrics.wau}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#0f172a] border border-[#d4af37]/25">
                      <span className="text-[11px] text-[#9ca3af] block">MAU (30d)</span>
                      <span className="font-display text-xl font-bold text-[#fbf9f4] tabular-nums mt-0.5 block">
                        {metrics.mau}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#0f172a] border border-[#d4af37]/25">
                      <span className="text-[11px] text-[#9ca3af] block">New (Today)</span>
                      <span className="font-display text-xl font-bold text-[#d4af37] tabular-nums mt-0.5 block">
                        {metrics.newUsersToday}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#0f172a] border border-[#d4af37]/25">
                      <span className="text-[11px] text-[#9ca3af] block">New (7d)</span>
                      <span className="font-display text-xl font-bold text-[#d4af37] tabular-nums mt-0.5 block">
                        {metrics.newUsersLast7Days}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#0f172a] border border-[#d4af37]/25">
                      <span className="text-[11px] text-[#9ca3af] block">New (30d)</span>
                      <span className="font-display text-xl font-bold text-[#d4af37] tabular-nums mt-0.5 block">
                        {metrics.newUsersLast30Days}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Community & SVH AI Engagement */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#0f172a] border border-[#d4af37]/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessagesSquare className="w-4 h-4 text-[#d4af37]" />
                        <h4 className="font-display text-sm font-bold text-[#fbf9f4]">
                          Community Engagement
                        </h4>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#d4af37]">
                        {metrics.communityUsers} Active Users
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div className="p-2.5 rounded-xl bg-[#131b2e] border border-[#d4af37]/20 text-center">
                        <span className="font-display text-lg font-bold text-[#fbf9f4] tabular-nums block">
                          {metrics.communityPostsCount}
                        </span>
                        <span className="text-[10px] text-[#9ca3af]">Doubts</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#131b2e] border border-[#d4af37]/20 text-center">
                        <span className="font-display text-lg font-bold text-[#fbf9f4] tabular-nums block">
                          {metrics.communityRepliesCount}
                        </span>
                        <span className="text-[10px] text-[#9ca3af]">Replies</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#131b2e] border border-[#d4af37]/20 text-center">
                        <span className="font-display text-lg font-bold text-[#fbf9f4] tabular-nums block">
                          {metrics.communityChatMessagesCount}
                        </span>
                        <span className="text-[10px] text-[#9ca3af]">Chat Msgs</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-[#0f172a] border border-[#d4af37]/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#d4af37]" />
                        <h4 className="font-display text-sm font-bold text-[#fbf9f4]">
                          SVH AI Usage
                        </h4>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#d4af37]">
                        {metrics.svhAiUsers} AI Users
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2.5 rounded-xl bg-[#131b2e] border border-[#d4af37]/20 text-center">
                        <span className="font-display text-lg font-bold text-[#fbf9f4] tabular-nums block">
                          {metrics.svhAiConversations}
                        </span>
                        <span className="text-[10px] text-[#9ca3af]">AI Sessions</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#131b2e] border border-[#d4af37]/20 text-center">
                        <span className="font-display text-lg font-bold text-[#fbf9f4] tabular-nums block">
                          {metrics.svhAiInteractions}
                        </span>
                        <span className="text-[10px] text-[#9ca3af]">Total Prompts</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Registered Users Directory & Access Management (Owner-Only Live Firestore Feed) */}
                {Array.isArray(combinedRegisteredAccounts) && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#0f172a] border border-[#d4af37]/30 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#d4af37]" />
                        <h4 className="font-display text-sm font-bold text-[#fbf9f4]">
                          Real User Analytics, Directory &amp; Account Management (Live Firestore Feed)
                        </h4>
                      </div>
                      <span className="text-[11px] font-mono text-[#9ca3af]">
                        {filteredAndSortedAccounts.length} of {combinedRegisteredAccounts.length} Registered User(s) · Tap any user for full detail view
                      </span>
                    </div>

                    {/* Search, Status Filter & Sorting Toolbar */}
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 pt-1">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-[#9ca3af] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          placeholder="Search by name, email, @username, User ID, goal, or device..."
                          className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-[#090e1c] border border-[#1e293b] focus:border-[#d4af37] text-xs text-[#fbf9f4] placeholder:text-[#6b7280] outline-none transition-colors"
                        />
                        {userSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setUserSearchQuery('')}
                            aria-label="Clear search"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-white cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex items-center rounded-xl bg-[#090e1c] border border-[#1e293b] p-0.5 text-[11px]">
                          {(
                            [
                              { id: 'all', label: 'All' },
                              { id: 'online_active', label: 'Active' },
                              { id: 'signed_out', label: 'Signed Out' },
                              { id: 'suspended', label: 'Suspended' },
                            ] as const
                          ).map((tab) => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setUserStatusFilter(tab.id)}
                              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                                userStatusFilter === tab.id
                                  ? 'bg-[#172544] text-[#d4af37] font-semibold'
                                  : 'text-[#9ca3af] hover:text-[#fbf9f4]'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-1.5 bg-[#090e1c] border border-[#1e293b] rounded-xl px-2.5 py-1">
                          <ArrowUpDown className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
                          <select
                            value={userSortBy}
                            onChange={(e) =>
                              setUserSortBy(
                                e.target.value as
                                  | 'lastActive'
                                  | 'latestLogin'
                                  | 'loginCount'
                                  | 'vpPoints'
                                  | 'streak'
                                  | 'questions'
                                  | 'minutes'
                              )
                            }
                            aria-label="Sort registered users"
                            className="bg-transparent text-xs text-[#fbf9f4] outline-none cursor-pointer"
                          >
                            <option value="lastActive" className="bg-[#0b1324]">
                              Sort: Last Active
                            </option>
                            <option value="latestLogin" className="bg-[#0b1324]">
                              Sort: Latest Login
                            </option>
                            <option value="loginCount" className="bg-[#0b1324]">
                              Sort: Login Count
                            </option>
                            <option value="vpPoints" className="bg-[#0b1324]">
                              Sort: VP Points
                            </option>
                            <option value="streak" className="bg-[#0b1324]">
                              Sort: Streak Days
                            </option>
                            <option value="questions" className="bg-[#0b1324]">
                              Sort: Questions Solved
                            </option>
                            <option value="minutes" className="bg-[#0b1324]">
                              Sort: Study Minutes
                            </option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {combinedRegisteredAccounts.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#9ca3af]">
                        No user activity yet
                      </div>
                    ) : filteredAndSortedAccounts.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#9ca3af]">
                        No registered users match your current search or filter.
                      </div>
                    ) : (
                      <>
                        <div className="overflow-x-auto max-h-80 overflow-y-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-[#1e293b] text-[10px] uppercase tracking-wider text-[#9ca3af]">
                                <th className="py-2 pr-3 font-semibold">Name / Role</th>
                                <th className="py-2 px-3 font-semibold">Email &amp; Username</th>
                                <th className="py-2 px-3 font-semibold">Registration Date</th>
                                <th className="py-2 px-3 font-semibold text-right">VP Points</th>
                                <th className="py-2 px-3 font-semibold">Active Devices</th>
                                <th className="py-2 px-3 font-semibold text-right">Last Login</th>
                                <th className="py-2 px-3 font-semibold">Session / Status</th>
                                <th className="py-2 pl-3 font-semibold text-right">Details &amp; Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1e293b]/60">
                              {filteredAndSortedAccounts.map((acc) => {
                                const isAccOwner = acc.role === 'owner';
                                const isSuspended = acc.accountStatus === 'suspended';
                                const isBusy = actionBusyId === acc.userId;
                                const isSelected = selectedDetailUserId === acc.userId;
                                const deviceCount =
                                  typeof acc.activeDeviceCount === 'number'
                                    ? acc.activeDeviceCount
                                    : Array.isArray(acc.activeDevices)
                                    ? acc.activeDevices.length
                                    : 0;

                                return (
                                  <tr
                                    key={acc.userId}
                                    onClick={() =>
                                      setSelectedDetailUserId((prev) =>
                                        prev === acc.userId ? null : acc.userId
                                      )
                                    }
                                    className={`cursor-pointer transition-colors ${
                                      isSelected
                                        ? 'bg-[#172544] border-l-2 border-l-[#d4af37]'
                                        : 'hover:bg-[#131b2e]/50'
                                    }`}
                                  >
                                    <td className="py-2.5 pr-3">
                                      <div className="flex flex-col">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-semibold text-[#fbf9f4] truncate max-w-[130px]">
                                            {acc.displayName}
                                          </span>
                                          {isAccOwner && (
                                            <span className="px-1.5 py-0.5 rounded bg-[#d4af37]/20 border border-[#d4af37]/40 text-[9px] font-mono font-bold text-[#d4af37] uppercase">
                                              Owner
                                            </span>
                                          )}
                                        </div>
                                        <span className="font-mono text-[10px] text-[#9ca3af] truncate max-w-[140px]">
                                          {acc.userId}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3 font-mono text-[11px]">
                                      <span className="text-[#fbf9f4] block truncate max-w-[160px]">
                                        {acc.email || (acc.username ? `${acc.username}@svh.student` : 'Not provided')}
                                      </span>
                                      <span className="text-[10px] text-[#d4af37] block">
                                        {acc.username ? `@${acc.username}` : 'Registered'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#cbd5e1]">
                                      <span className="block">
                                        {formatDateTime(acc.createdAt)}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#d4af37] font-bold">
                                      {acc.vpPoints || 0} VP
                                      <span className="text-[10px] text-[#9ca3af] block font-normal">
                                        {acc.streakDays || 0}d streak · {acc.questionsAttempted}Q
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#cbd5e1]">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#131b2e] border border-[#d4af37]/30 text-[#d4af37] font-bold text-[10px]">
                                        <Smartphone className="w-3 h-3" />
                                        <span>{deviceCount} Active Device{deviceCount === 1 ? '' : 's'}</span>
                                      </span>
                                      <span className="text-[10px] text-[#9ca3af] block truncate max-w-[140px] mt-0.5">
                                        {acc.devicePlatform || 'Web Browser'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#cbd5e1]">
                                      <span className="font-bold text-[#fbf9f4] block">
                                        {formatDateTime(acc.lastLogin || acc.lastLoginAt || acc.lastSeenAt)}
                                      </span>
                                      <span className="text-[10px] text-[#9ca3af] block">
                                        {acc.totalLoginCount || 1} login(s)
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {isSuspended ? (
                                          <span className="px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/40 text-[10px] font-semibold text-rose-300">
                                            Suspended
                                          </span>
                                        ) : acc.activeSessionStatus === 'online_active' ? (
                                          <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-semibold text-emerald-300">
                                            Active Session
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-600/40 text-[10px] font-semibold text-slate-300">
                                            Signed Out
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td
                                      className="py-2.5 pl-3 text-right"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="inline-flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setSelectedDetailUserId((prev) =>
                                              prev === acc.userId ? null : acc.userId
                                            )
                                          }
                                          className="px-2 py-1 rounded border border-[#d4af37]/35 bg-[#131b2e] hover:bg-[#192540] text-[#d4af37] text-[10px] font-semibold cursor-pointer"
                                        >
                                          {isSelected ? 'Hide Details' : 'Inspect'}
                                        </button>
                                        {isAccOwner ? (
                                          <span className="text-[10px] font-mono text-[#9ca3af] px-1">
                                            Protected
                                          </span>
                                        ) : confirmDeleteUserId === acc.userId ? (
                                          <div className="inline-flex items-center gap-1.5">
                                            <button
                                              type="button"
                                              disabled={isBusy}
                                              onClick={() => handleRemoveUserAccount(acc.userId)}
                                              className="px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-bold hover:bg-rose-500 cursor-pointer"
                                            >
                                              Confirm Delete
                                            </button>
                                            <button
                                              type="button"
                                              disabled={isBusy}
                                              onClick={() => setConfirmDeleteUserId(null)}
                                              className="px-2 py-1 rounded bg-[#131b2e] text-[#cbd5e1] text-[10px] cursor-pointer"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        ) : (
                                          <>
                                            <button
                                              type="button"
                                              disabled={isBusy}
                                              onClick={() =>
                                                handleToggleUserStatus(acc.userId, acc.accountStatus)
                                              }
                                              className={`px-2 py-1 rounded border text-[10px] font-semibold flex items-center gap-1 cursor-pointer ${
                                                isSuspended
                                                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200 hover:bg-emerald-900/70'
                                                  : 'bg-amber-950/60 border-amber-500/40 text-amber-200 hover:bg-amber-900/70'
                                              }`}
                                            >
                                              {isSuspended ? (
                                                <>
                                                  <CheckCircle2 className="w-3 h-3" />
                                                  <span>Activate</span>
                                                </>
                                              ) : (
                                                <>
                                                  <Ban className="w-3 h-3" />
                                                  <span>Suspend</span>
                                                </>
                                              )}
                                            </button>
                                            <button
                                              type="button"
                                              disabled={isBusy}
                                              onClick={() => setConfirmDeleteUserId(acc.userId)}
                                              title="Remove User Account"
                                              className="p-1 rounded bg-rose-950/60 border border-rose-500/40 text-rose-200 hover:bg-rose-900/70 cursor-pointer"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Detailed User Inspection View */}
                        {selectedDetailUserId && (() => {
                          const detailUser = combinedRegisteredAccounts.find(
                            (u) => u.userId === selectedDetailUserId
                          );
                          if (!detailUser) return null;
                          const accuracyPct =
                            detailUser.questionsAttempted > 0
                              ? Math.round(
                                  ((detailUser.correctAnswers || 0) / detailUser.questionsAttempted) *
                                    100
                                )
                              : 0;
                          const activeDevicesList: ActiveDeviceRecord[] = Array.isArray(
                            detailUser.activeDevices
                          )
                            ? detailUser.activeDevices
                            : [];

                          return (
                            <div className="p-4 sm:p-5 rounded-2xl bg-[#131d33] border border-[#d4af37]/45 space-y-4">
                              <div className="flex items-center justify-between gap-2 border-b border-[#1e293b] pb-3">
                                <div>
                                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4af37] font-bold block">
                                    Real User-Detail Record (Firestore users/{detailUser.userId})
                                  </span>
                                  <h5 className="font-display text-base font-bold text-[#fbf9f4]">
                                    {detailUser.displayName}{' '}
                                    <span className="text-xs font-mono text-[#d4af37]">
                                      ({detailUser.email || (detailUser.username ? `@${detailUser.username}` : 'Student')})
                                    </span>
                                  </h5>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setSelectedDetailUserId(null)}
                                  className="px-2.5 py-1 rounded-lg bg-[#0b1324] border border-[#d4af37]/30 text-xs text-[#cbd5e1] hover:text-white cursor-pointer"
                                >
                                  Close Detail
                                </button>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                                <div className="p-3 rounded-xl bg-[#0b1324] border border-[#1e293b]">
                                  <span className="text-[10px] text-[#9ca3af] block">Email / Username</span>
                                  <span className="font-mono font-bold text-[#d4af37] mt-0.5 block truncate">
                                    {detailUser.email || (detailUser.username ? `@${detailUser.username}` : 'Student')}
                                  </span>
                                </div>
                                <div className="p-3 rounded-xl bg-[#0b1324] border border-[#1e293b]">
                                  <span className="text-[10px] text-[#9ca3af] block">User ID (UID)</span>
                                  <span className="font-mono text-[11px] text-[#fbf9f4] mt-0.5 block break-all">
                                    {detailUser.userId}
                                  </span>
                                </div>
                                <div className="p-3 rounded-xl bg-[#0b1324] border border-[#1e293b]">
                                  <span className="text-[10px] text-[#9ca3af] block">Registration Date (createdAt)</span>
                                  <span className="font-mono text-[11px] text-[#fbf9f4] mt-0.5 block">
                                    {formatDateTime(detailUser.createdAt)}
                                  </span>
                                </div>
                                <div className="p-3 rounded-xl bg-[#0b1324] border border-[#1e293b]">
                                  <span className="text-[10px] text-[#9ca3af] block">Role</span>
                                  <span className="font-mono text-[11px] text-[#fbf9f4] uppercase mt-0.5 block">
                                    {detailUser.role || 'student'}
                                  </span>
                                </div>

                                <div className="p-3 rounded-xl bg-[#0b1324] border border-[#1e293b]">
                                  <span className="text-[10px] text-[#9ca3af] block">Total Active Devices</span>
                                  <span className="font-display text-base font-bold text-[#d4af37] mt-0.5 block tabular-nums">
                                    {activeDevicesList.length} Active Device(s)
                                  </span>
                                </div>
                                <div className="p-3 rounded-xl bg-[#0b1324] border border-[#1e293b]">
                                  <span className="text-[10px] text-[#9ca3af] block">Total Session Count</span>
                                  <span className="font-display text-base font-bold text-[#fbf9f4] mt-0.5 block tabular-nums">
                                    {detailUser.totalSessionCount ?? 0}
                                  </span>
                                </div>
                                <div className="p-3 rounded-xl bg-[#0b1324] border border-[#1e293b]">
                                  <span className="text-[10px] text-[#9ca3af] block">Last Login (lastLogin)</span>
                                  <span className="font-mono text-[11px] text-[#fbf9f4] mt-0.5 block">
                                    {formatDateTime(detailUser.lastLogin || detailUser.lastLoginAt || detailUser.lastSeenAt)}
                                  </span>
                                </div>
                                <div className="p-3 rounded-xl bg-[#0b1324] border border-[#1e293b]">
                                  <span className="text-[10px] text-[#9ca3af] block">Latest Logout Date/Time</span>
                                  <span className="font-mono text-[11px] text-[#fbf9f4] mt-0.5 block">
                                    {detailUser.lastLogoutAt
                                      ? formatDateTime(detailUser.lastLogoutAt)
                                      : 'No logout recorded yet'}
                                  </span>
                                </div>

                                <div className="p-3 rounded-xl bg-[#0b1324] border border-[#1e293b]">
                                  <span className="text-[10px] text-[#9ca3af] block">Current Session Status</span>
                                  <span className="font-semibold text-[#fbf9f4] mt-0.5 block">
                                    {detailUser.accountStatus === 'suspended'
                                      ? 'Suspended'
                                      : detailUser.activeSessionStatus === 'online_active'
                                      ? 'Active Session'
                                      : 'Signed Out'}
                                  </span>
                                </div>
                                <div className="p-3 rounded-xl bg-[#0b1324] border border-[#1e293b]">
                                  <span className="text-[10px] text-[#9ca3af] block">Last Active Date/Time</span>
                                  <span className="font-mono text-[11px] text-[#fbf9f4] mt-0.5 block">
                                    {formatDateTime(detailUser.lastSeenAt)}
                                  </span>
                                </div>
                                <div className="p-3 rounded-xl bg-[#0b1324] border border-[#1e293b]">
                                  <span className="text-[10px] text-[#9ca3af] block">Device / Platform</span>
                                  <span className="font-mono text-[11px] text-[#fbf9f4] mt-0.5 block">
                                    {detailUser.devicePlatform || 'Web / Standard Client'}
                                  </span>
                                </div>
                                <div className="p-3 rounded-xl bg-[#0b1324] border border-[#d4af37]/35">
                                  <span className="text-[10px] text-[#d4af37] block">Real VP Points Balance</span>
                                  <span className="font-display text-base font-bold text-[#d4af37] mt-0.5 block tabular-nums">
                                    {detailUser.vpPoints ?? 0} VP
                                  </span>
                                </div>

                                <div className="p-3 rounded-xl bg-[#0b1324] border border-[#1e293b] col-span-2">
                                  <span className="text-[10px] text-[#9ca3af] block">Real Study Activity</span>
                                  <span className="font-mono text-[11px] text-[#fbf9f4] mt-0.5 block">
                                    {detailUser.questionsAttempted} Questions Attempted ({detailUser.correctAnswers ?? 0} Correct · {accuracyPct}% Accuracy) · {detailUser.totalStudyMinutes} Focus Minutes
                                  </span>
                                </div>
                                <div className="p-3 rounded-xl bg-[#0b1324] border border-[#1e293b] col-span-2">
                                  <span className="text-[10px] text-[#9ca3af] block">Real Streak Information</span>
                                  <span className="font-mono text-[11px] text-[#fbf9f4] mt-0.5 block">
                                    {detailUser.streakDays ?? 0} Day(s) Active Streak
                                    {detailUser.streakLastActiveDate
                                      ? ` (Last streak date: ${detailUser.streakLastActiveDate})`
                                      : ''}
                                  </span>
                                </div>
                              </div>

                              {/* Tracked Active Devices List (users/{uid}.activeDevices) */}
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-[#d4af37] font-bold block">
                                  Active Devices ({activeDevicesList.length} Tracked in users/{detailUser.userId})
                                </span>
                                {activeDevicesList.length > 0 ? (
                                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                                    {activeDevicesList.map((dev, idx) => (
                                      <div
                                        key={`${dev.deviceId || idx}_${dev.lastActive}`}
                                        className="px-3 py-1.5 rounded-lg bg-[#0b1324] border border-[#1e293b] flex items-center justify-between gap-2 text-[11px]"
                                      >
                                        <span className="px-1.5 py-0.5 rounded bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#d4af37] font-mono font-bold text-[10px] uppercase shrink-0">
                                          {dev.platformType || 'Web'}
                                        </span>
                                        <span className="text-[#fbf9f4] truncate flex-1">
                                          {dev.deviceInfo || 'Standard Device'}
                                        </span>
                                        <span className="font-mono text-[#9ca3af] shrink-0">
                                          Last active: {formatDateTime(dev.lastActive)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="p-3 rounded-xl bg-[#0b1324] border border-[#1e293b] text-[11px] text-[#9ca3af]">
                                    No active devices currently signed in.
                                  </div>
                                )}
                              </div>

                              {/* Recent Real Login / Logout Activity Log */}
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-[#d4af37] font-bold block">
                                  Real Login / Logout Event Log
                                </span>
                                {Array.isArray(detailUser.loginHistory) &&
                                detailUser.loginHistory.length > 0 ? (
                                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                                    {detailUser.loginHistory.map((ev, i) => (
                                      <div
                                        key={`${ev.timestamp}_${i}`}
                                        className="px-3 py-1.5 rounded-lg bg-[#0b1324] border border-[#1e293b] flex items-center justify-between gap-2 text-[11px]"
                                      >
                                        <span
                                          className={
                                            ev.event === 'login'
                                              ? 'text-emerald-400 font-semibold uppercase font-mono'
                                              : 'text-amber-300 font-semibold uppercase font-mono'
                                          }
                                        >
                                          {ev.event === 'login' ? 'LOGIN' : 'LOGOUT'}
                                        </span>
                                        <span className="text-[#cbd5e1] truncate">
                                          {ev.devicePlatform || 'Web / Client'}
                                        </span>
                                        <span className="font-mono text-[#9ca3af] shrink-0">
                                          {formatDateTime(ev.timestamp)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="p-3 rounded-xl bg-[#0b1324] border border-[#1e293b] text-[11px] text-[#9ca3af]">
                                    No user activity yet
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                )}

                {/* 5. Community Moderation Reports (Owner-Only) */}
                {Array.isArray(metrics.moderationReports) && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#0f172a] border border-[#d4af37]/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4 text-[#d4af37]" />
                        <h4 className="font-display text-sm font-bold text-[#fbf9f4]">
                          Community Moderation Queue
                        </h4>
                      </div>
                      <span className="text-[11px] font-mono text-[#9ca3af]">
                        {metrics.moderationReports.length} Pending Report(s)
                      </span>
                    </div>

                    {metrics.moderationReports.length === 0 ? (
                      <div className="py-5 text-center text-xs text-[#9ca3af]">
                        No community reports pending moderation.
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-60 overflow-y-auto">
                        {metrics.moderationReports.map((rep) => (
                          <div
                            key={rep.id}
                            className="p-3 rounded-xl bg-[#131b2e] border border-[#d4af37]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-[10px] font-mono uppercase text-rose-200">
                                  {rep.targetType}
                                </span>
                                <span className="font-semibold text-[#fbf9f4]">
                                  {rep.reason}
                                </span>
                                <span className="text-[11px] text-[#9ca3af]">
                                  by {rep.targetAuthor || 'User'}
                                </span>
                              </div>
                              <p className="text-[#cbd5e1] truncate">
                                {rep.targetPreview || 'Reported item'}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                disabled={actionBusyId === rep.targetId}
                                onClick={() =>
                                  handleModerationAction(rep.targetType, rep.targetId)
                                }
                                className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold hover:bg-rose-500 cursor-pointer"
                              >
                                Delete Content
                              </button>
                              <button
                                type="button"
                                disabled={actionBusyId === rep.id}
                                onClick={() => handleModerationAction('report', rep.id)}
                                className="px-2.5 py-1 rounded-lg bg-[#0b1324] border border-[#d4af37]/30 text-[#cbd5e1] hover:text-white text-[11px] cursor-pointer"
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 6. New Users Over Time Chart */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#0f172a] border border-[#d4af37]/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#d4af37]" />
                      <h4 className="font-display text-sm font-bold text-[#fbf9f4]">
                        New Users Over Time
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono text-[#9ca3af]">
                      {metrics.newUsersOverTime.length} Active Date(s)
                    </span>
                  </div>

                  {metrics.newUsersOverTime.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[#9ca3af]">
                      No user registration timestamps recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1 max-h-52 overflow-y-auto pr-1">
                      {metrics.newUsersOverTime.map((entry) => {
                        const widthPercent = Math.max(
                          6,
                          Math.round((entry.count / maxDailyNewUsers) * 100)
                        );
                        return (
                          <div
                            key={entry.date}
                            className="flex items-center gap-3 text-xs"
                          >
                            <span className="font-mono text-[11px] text-[#cbd5e1] w-24 shrink-0">
                              {entry.date}
                            </span>
                            <div className="flex-1 h-5 rounded-lg bg-[#090e1c] border border-[#1e293b] overflow-hidden p-0.5">
                              <div
                                style={{ width: `${widthPercent}%` }}
                                className="h-full rounded-md bg-gradient-to-r from-[#d4af37] to-[#aa7c11]"
                              />
                            </div>
                            <span className="font-mono font-bold text-[#fbf9f4] w-8 text-right tabular-nums">
                              {entry.count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
});

