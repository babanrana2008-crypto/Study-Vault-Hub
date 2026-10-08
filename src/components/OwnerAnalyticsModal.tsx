import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  ChevronLeft,
  Clock,
  Award,
  Target,
  Flame,
  Eye,
  Filter,
} from 'lucide-react';
import { apiFetch } from '../services/nativeApiBridge';

const IDENTITY_STORAGE_KEY = 'study_vault_community_identity_v1';
const OWNER_TOKEN_STORAGE_KEY = 'study_vault_owner_session_token_v1';

interface VPTransactionItem {
  id: string;
  userId?: string;
  amount: number;
  reason: string;
  sourceTitle?: string;
  relatedEntityId?: string;
  timestamp: string;
}

interface DetailedOwnerUser {
  id?: string;
  userId: string;
  username: string | null;
  displayName: string;
  profilePhotoUrl?: string | null;
  role?: 'owner' | 'student';
  accountStatus?: 'active' | 'suspended';
  createdAt: string;
  lastLoginAt?: string | null;
  lastLogoutAt?: string | null;
  lastSeenAt: string;
  loginCount?: number;
  loginHistory?: Array<{ timestamp: string; platform?: string; deviceLabel?: string }>;
  logoutHistory?: Array<{ timestamp: string; platform?: string; reason?: string }>;
  activeSessionsCount?: number;
  devicePlatform?: string;
  deviceHistory?: string[];
  activeGoal: string | null;
  selectedGoals?: string[];
  questionsAttempted: number;
  correctAnswers?: number;
  incorrectAnswers?: number;
  accuracy?: number;
  totalStudyMinutes: number;
  focusSessionsCompleted?: number;
  sixtyMinBonusSessionsCount?: number;
  currentStreak?: number;
  bestStreak?: number;
  lastActiveDate?: string;
  vaultPointsTotal?: number;
  vaultPointsFromQuestions?: number;
  vaultPointsFromFocusMinutes?: number;
  vaultPointsFromFocusBonuses?: number;
  vpTransactions?: VPTransactionItem[];
  subjectPerformance?: Record<
    string,
    { attempted: number; correct: number; incorrect: number; accuracy: number; studyMinutes: number }
  >;
  topicPerformance?: Record<
    string,
    { subject: string; attempted: number; correct: number; accuracy: number }
  >;
  practiceHistory?: Array<{
    id: string;
    date: string;
    subject: string;
    mode: string;
    totalQuestions: number;
    correctCount: number;
    wrongCount: number;
    score: number;
    accuracy: number;
  }>;
  studySessions?: Array<{
    id: string;
    subject: string;
    topic: string;
    durationMinutes: number;
    timestamp: string;
    date: string;
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

interface DeletionEventItem {
  id: string;
  userId: string;
  username?: string | null;
  deletedAt: string;
  deletedBy?: string;
}

interface OwnerAnalyticsSummary {
  totalUsers: number;
  totalRegisteredAccounts: number;
  activeUsersCount: number;
  suspendedUsersCount: number;
  inactiveUsersCount: number;
  activeUsersLast24h: number;
  activeUsersLast7d: number;
  activeUsersLast30d: number;
  newUsersToday: number;
  newUsersLast7d: number;
  newUsersLast30d: number;
  totalLogins: number;
  totalRecordedSessions: number;
  platformDistribution: Record<string, number>;
  totalQuestionsAttempted: number;
  totalCorrectAnswers: number;
  totalIncorrectAnswers: number;
  overallPlatformAccuracy: number;
  totalStudyMinutes: number;
  totalFocusSessions: number;
  totalVaultPoints: number;
  vpFromQuestions: number;
  vpFromFocusMinutes: number;
  vpFromBonuses: number;
  dailyVP: number;
  weeklyVP: number;
  monthlyVP: number;
  totalPosts: number;
  totalReplies: number;
  totalChatMessages: number;
  totalReports: number;
  totalDeletionEvents: number;
  topUsersByVP: Array<{
    userId: string;
    displayName: string;
    username: string | null;
    vaultPointsTotal: number;
    questionsAttempted: number;
    totalStudyMinutes: number;
    accuracy: number;
  }>;
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
  registeredAccounts?: DetailedOwnerUser[];
  moderationReports?: ModerationReportItem[];
}

interface OwnerAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOwnerAuthStatusChange?: (isAuthenticated: boolean) => void;
}

export const OwnerAnalyticsModal: React.FC<OwnerAnalyticsModalProps> = ({
  isOpen,
  onClose,
  onOwnerAuthStatusChange,
}) => {
  const [metrics, setMetrics] = useState<OwnerAnalyticsMetrics | null>(null);
  const [summary, setSummary] = useState<OwnerAnalyticsSummary | null>(null);
  const [usersList, setUsersList] = useState<DetailedOwnerUser[]>([]);
  const [deletionEvents, setDeletionEvents] = useState<DeletionEventItem[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState<boolean>(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);

  // Directory Search, Filter, Sort & Detailed User Drill-Down
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [sortBy, setSortBy] = useState<'lastSeen' | 'vp' | 'questions' | 'studyTime' | 'createdAt'>('lastSeen');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

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
        setSummary(null);
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
      }
      if (data?.summary) {
        setSummary(data.summary);
      }
      if (Array.isArray(data?.users)) {
        setUsersList(data.users);
      } else if (Array.isArray(data?.metrics?.registeredAccounts)) {
        setUsersList(data.metrics.registeredAccounts);
      }
      if (Array.isArray(data?.deletionEvents)) {
        setDeletionEvents(data.deletionEvents);
      }
      setGeneratedAt(data?.generatedAt || new Date().toISOString());
      onOwnerAuthStatusChange?.(true);
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
      if (e.key === 'Escape') {
        if (selectedUserId) {
          setSelectedUserId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, selectedUserId]);

  const handleToggleUserStatus = async (
    targetUserId: string,
    currentStatus: 'active' | 'suspended' = 'active'
  ) => {
    const token = getActiveBearerToken();
    if (!token) return;
    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    setActionBusyId(targetUserId);
    setAnalyticsError(null);
    try {
      const res = await apiFetch(`/api/owner/users/${encodeURIComponent(targetUserId)}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Owner-Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update account status.');
      }
      await fetchOwnerAnalytics();
    } catch (err) {
      setAnalyticsError(err instanceof Error ? err.message : 'Could not update user status.');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleRemoveUserAccount = async (targetUserId: string) => {
    const token = getActiveBearerToken();
    if (!token) return;
    setActionBusyId(targetUserId);
    setAnalyticsError(null);
    try {
      const res = await apiFetch(`/api/owner/users/${encodeURIComponent(targetUserId)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Owner-Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to remove user account.');
      }
      setConfirmDeleteUserId(null);
      if (selectedUserId === targetUserId) {
        setSelectedUserId(null);
      }
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

  // Filtered & sorted user directory
  const filteredAndSortedUsers = useMemo(() => {
    const source = usersList.length > 0 ? usersList : metrics?.registeredAccounts || [];
    const q = searchQuery.trim().toLowerCase();

    const filtered = source.filter((u) => {
      const uid = u.userId || u.id || '';
      const status = u.accountStatus || 'active';
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (!q) return true;
      return (
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        uid.toLowerCase().includes(q) ||
        (u.activeGoal || '').toLowerCase().includes(q) ||
        (u.devicePlatform || '').toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'vp') {
        return (b.vaultPointsTotal || 0) - (a.vaultPointsTotal || 0);
      }
      if (sortBy === 'questions') {
        return (b.questionsAttempted || 0) - (a.questionsAttempted || 0);
      }
      if (sortBy === 'studyTime') {
        return (b.totalStudyMinutes || 0) - (a.totalStudyMinutes || 0);
      }
      if (sortBy === 'createdAt') {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      return (b.lastSeenAt || '').localeCompare(a.lastSeenAt || '');
    });
  }, [usersList, metrics?.registeredAccounts, searchQuery, statusFilter, sortBy]);

  const selectedUserDetail = useMemo(() => {
    if (!selectedUserId) return null;
    const source = usersList.length > 0 ? usersList : metrics?.registeredAccounts || [];
    return source.find((u) => (u.userId || u.id) === selectedUserId) || null;
  }, [selectedUserId, usersList, metrics?.registeredAccounts]);

  if (!isOpen) return null;

  const maxDailyNewUsers =
    metrics?.newUsersOverTime && metrics.newUsersOverTime.length > 0
      ? Math.max(...metrics.newUsersOverTime.map((d) => d.count), 1)
      : 1;

  const formatDateShort = (iso?: string | null) => {
    if (!iso) return 'No data yet';
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-6xl rounded-2xl sm:rounded-3xl bg-[#0b1324] border border-[#d4af37]/40 shadow-2xl overflow-hidden flex flex-col max-h-[93vh]">
        {/* Top Bar */}
        <div className="px-4 sm:px-6 py-4 bg-[#0f1930] border-b border-[#d4af37]/25 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {selectedUserDetail ? (
              <button
                type="button"
                onClick={() => setSelectedUserId(null)}
                className="px-2.5 py-1.5 rounded-xl bg-[#131b2e] border border-[#d4af37]/40 text-[#d4af37] hover:bg-[#1a2540] flex items-center gap-1 text-xs font-bold shrink-0 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to All Users</span>
              </button>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-[#131b2e] border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="font-display text-sm sm:text-lg font-bold text-[#fbf9f4] truncate">
                {selectedUserDetail
                  ? `User Dossier: ${selectedUserDetail.displayName} (${selectedUserDetail.username ? `@${selectedUserDetail.username}` : selectedUserDetail.userId})`
                  : 'Study Vault Hub — Owner Dashboard & Real-Time Analytics'}
              </h2>
              <p className="text-[11px] text-[#cbd5e1] truncate">
                Founded &amp; Created by Soumyadip Rana · 100% Real Backend &amp; Firebase Data (Zero Credentials Exposed)
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
          ) : selectedUserDetail ? (
            /* ======================================================================= */
            /* DETAILED USER PROFILE & ANALYTICS DRILL-DOWN VIEW                       */
            /* ======================================================================= */
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Identity & Account Overview Header */}
              <div className="p-5 rounded-2xl bg-[#0f172a] border border-[#d4af37]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-xl font-bold text-[#fbf9f4]">
                      {selectedUserDetail.displayName}
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-[#131b2e] border border-[#d4af37]/30 font-mono text-xs text-[#d4af37]">
                      {selectedUserDetail.username ? `@${selectedUserDetail.username}` : 'Anonymous User'}
                    </span>
                    {selectedUserDetail.role === 'owner' && (
                      <span className="px-2 py-0.5 rounded bg-[#d4af37]/20 border border-[#d4af37]/50 text-[10px] font-mono font-bold text-[#d4af37] uppercase">
                        Owner
                      </span>
                    )}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        selectedUserDetail.accountStatus === 'suspended'
                          ? 'bg-rose-950/80 border-rose-500/40 text-rose-300'
                          : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                      }`}
                    >
                      {selectedUserDetail.accountStatus === 'suspended' ? 'Suspended' : 'Active'}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-[#9ca3af]">
                    Unique User ID: <span className="text-[#fbf9f4]">{selectedUserDetail.userId || selectedUserDetail.id}</span>
                  </p>
                  <p className="text-xs text-[#cbd5e1]">
                    Active Goal: <strong className="text-[#d4af37]">{selectedUserDetail.activeGoal || 'General Study'}</strong>
                    {selectedUserDetail.selectedGoals && selectedUserDetail.selectedGoals.length > 0 && (
                      <span> · Selected Goals: {selectedUserDetail.selectedGoals.join(', ')}</span>
                    )}
                  </p>
                </div>

                {selectedUserDetail.role !== 'owner' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={actionBusyId === selectedUserDetail.userId}
                      onClick={() =>
                        handleToggleUserStatus(
                          selectedUserDetail.userId,
                          selectedUserDetail.accountStatus
                        )
                      }
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                        selectedUserDetail.accountStatus === 'suspended'
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                          : 'bg-amber-950/60 border-amber-500/40 text-amber-200'
                      }`}
                    >
                      {selectedUserDetail.accountStatus === 'suspended' ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Activate Account</span>
                        </>
                      ) : (
                        <>
                          <Ban className="w-3.5 h-3.5" />
                          <span>Suspend Account</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Timestamps, Logins, Sessions & Device Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-[#0f172a] border border-[#d4af37]/25">
                  <span className="text-[11px] text-[#9ca3af] block">Account Created</span>
                  <span className="text-xs font-mono font-bold text-[#fbf9f4] mt-1 block">
                    {formatDateShort(selectedUserDetail.createdAt)}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#0f172a] border border-[#d4af37]/25">
                  <span className="text-[11px] text-[#9ca3af] block">Last Login / Last Active</span>
                  <span className="text-xs font-mono font-bold text-[#fbf9f4] mt-1 block">
                    {formatDateShort(selectedUserDetail.lastLoginAt || selectedUserDetail.lastSeenAt)}
                  </span>
                  <span className="text-[10px] text-[#9ca3af]">
                    Seen: {formatDateShort(selectedUserDetail.lastSeenAt)}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#0f172a] border border-[#d4af37]/25">
                  <span className="text-[11px] text-[#9ca3af] block">Logins &amp; Last Logout</span>
                  <span className="text-xs font-mono font-bold text-[#d4af37] mt-1 block">
                    {selectedUserDetail.loginCount ?? 0} Login(s) · {selectedUserDetail.activeSessionsCount ?? 0} Active Token(s)
                  </span>
                  <span className="text-[10px] text-[#9ca3af]">
                    Logout: {selectedUserDetail.lastLogoutAt ? formatDateShort(selectedUserDetail.lastLogoutAt) : 'None recorded'}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#0f172a] border border-[#d4af37]/25">
                  <span className="text-[11px] text-[#9ca3af] block">Device &amp; Platform</span>
                  <span className="text-xs font-mono font-bold text-[#fbf9f4] mt-1 block">
                    {selectedUserDetail.devicePlatform || 'Web'}
                  </span>
                  <span className="text-[10px] text-[#9ca3af] truncate block">
                    {selectedUserDetail.deviceHistory && selectedUserDetail.deviceHistory.length > 0
                      ? selectedUserDetail.deviceHistory.join(', ')
                      : 'Standard Browser/APK'}
                  </span>
                </div>
              </div>

              {/* Vault Points (VP) & Academic Performance Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#162038] to-[#0f172a] border border-[#d4af37]/40 space-y-1">
                  <div className="flex items-center justify-between text-xs text-[#d4af37] font-semibold">
                    <span>Total Vault Points (VP)</span>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="font-display text-2xl font-bold text-[#fbf9f4] tabular-nums">
                    {(selectedUserDetail.vaultPointsTotal ?? 0).toLocaleString()} VP
                  </div>
                  <p className="text-[10px] font-mono text-[#cbd5e1]">
                    Q: {selectedUserDetail.vaultPointsFromQuestions ?? 0} · Min: {selectedUserDetail.vaultPointsFromFocusMinutes ?? 0} · 60m Bonus: {selectedUserDetail.vaultPointsFromFocusBonuses ?? 0}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 space-y-1">
                  <div className="flex items-center justify-between text-xs text-[#9ca3af]">
                    <span>Questions &amp; Accuracy</span>
                    <Target className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="font-display text-2xl font-bold text-[#fbf9f4] tabular-nums">
                    {selectedUserDetail.questionsAttempted || 0} Solved ({selectedUserDetail.accuracy ?? 0}%)
                  </div>
                  <p className="text-[10px] font-mono text-[#cbd5e1]">
                    +{selectedUserDetail.correctAnswers ?? 0} Correct / -{selectedUserDetail.incorrectAnswers ?? 0} Incorrect
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 space-y-1">
                  <div className="flex items-center justify-between text-xs text-[#9ca3af]">
                    <span>Study Time &amp; Focus</span>
                    <Clock className="w-4 h-4 text-[#d4af37]" />
                  </div>
                  <div className="font-display text-2xl font-bold text-[#fbf9f4] tabular-nums">
                    {selectedUserDetail.totalStudyMinutes || 0} mins
                  </div>
                  <p className="text-[10px] font-mono text-[#cbd5e1]">
                    {selectedUserDetail.focusSessionsCompleted ?? 0} Sessions ({selectedUserDetail.sixtyMinBonusSessionsCount ?? 0} × 60m+)
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 space-y-1">
                  <div className="flex items-center justify-between text-xs text-[#9ca3af]">
                    <span>Study Streak</span>
                    <Flame className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="font-display text-2xl font-bold text-[#fbf9f4] tabular-nums">
                    {selectedUserDetail.currentStreak ?? 0} Days
                  </div>
                  <p className="text-[10px] font-mono text-[#cbd5e1]">
                    Best: {selectedUserDetail.bestStreak ?? 0}d · Last: {selectedUserDetail.lastActiveDate || 'No data yet'}
                  </p>
                </div>
              </div>

              {/* Subject & Topic Performance Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 space-y-3">
                  <h4 className="font-display text-xs sm:text-sm font-bold text-[#d4af37] uppercase tracking-wider">
                    Subject Performance
                  </h4>
                  {!selectedUserDetail.subjectPerformance ||
                  Object.keys(selectedUserDetail.subjectPerformance).length === 0 ? (
                    <p className="text-xs text-[#9ca3af] py-3">No subject data recorded yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {Object.entries(selectedUserDetail.subjectPerformance).map(([sub, stats]) => (
                        <div
                          key={sub}
                          className="p-2.5 rounded-xl bg-[#131b2e] border border-[#d4af37]/20 flex items-center justify-between text-xs"
                        >
                          <span className="font-semibold text-[#fbf9f4]">{sub}</span>
                          <span className="font-mono text-[#cbd5e1]">
                            {stats.attempted}Q (+{stats.correct}/-{stats.incorrect}) · {stats.accuracy}% · {stats.studyMinutes}m
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 space-y-3">
                  <h4 className="font-display text-xs sm:text-sm font-bold text-[#d4af37] uppercase tracking-wider">
                    Topic Performance
                  </h4>
                  {!selectedUserDetail.topicPerformance ||
                  Object.keys(selectedUserDetail.topicPerformance).length === 0 ? (
                    <p className="text-xs text-[#9ca3af] py-3">No topic data recorded yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {Object.entries(selectedUserDetail.topicPerformance).map(([topic, stats]) => (
                        <div
                          key={topic}
                          className="p-2.5 rounded-xl bg-[#131b2e] border border-[#d4af37]/20 flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-semibold text-[#fbf9f4] block truncate">{topic}</span>
                            <span className="text-[10px] text-[#9ca3af]">{stats.subject}</span>
                          </div>
                          <span className="font-mono text-[#d4af37] shrink-0">
                            {stats.correct}/{stats.attempted} ({stats.accuracy}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* VP Transaction History & Quiz/Focus Session History */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 space-y-3">
                  <h4 className="font-display text-xs sm:text-sm font-bold text-[#d4af37] uppercase tracking-wider">
                    Vault Points (VP) Transaction History ({selectedUserDetail.vpTransactions?.length || 0})
                  </h4>
                  {!selectedUserDetail.vpTransactions || selectedUserDetail.vpTransactions.length === 0 ? (
                    <p className="text-xs text-[#9ca3af] py-3">No VP transactions recorded yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {selectedUserDetail.vpTransactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="p-2.5 rounded-xl bg-[#131b2e] border border-[#d4af37]/20 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <span className="font-semibold text-[#fbf9f4] block truncate">
                              {tx.sourceTitle || tx.reason}
                            </span>
                            <span className="text-[10px] font-mono text-[#9ca3af]">
                              {formatDateShort(tx.timestamp)} · ID: {tx.relatedEntityId || tx.id}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-[#d4af37]/20 border border-[#d4af37]/40 font-mono font-bold text-[#d4af37] shrink-0">
                            +{tx.amount} VP
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 space-y-3">
                  <h4 className="font-display text-xs sm:text-sm font-bold text-[#d4af37] uppercase tracking-wider">
                    Quiz / Exam &amp; Focus Session History
                  </h4>
                  {(!selectedUserDetail.practiceHistory || selectedUserDetail.practiceHistory.length === 0) &&
                  (!selectedUserDetail.studySessions || selectedUserDetail.studySessions.length === 0) ? (
                    <p className="text-xs text-[#9ca3af] py-3">No quiz or focus sessions recorded yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {(selectedUserDetail.practiceHistory || []).map((ph) => (
                        <div
                          key={ph.id}
                          className="p-2.5 rounded-xl bg-[#131b2e] border border-[#d4af37]/20 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-[#fbf9f4] block">
                              {ph.mode}: {ph.subject}
                            </span>
                            <span className="text-[10px] text-[#9ca3af]">{ph.date}</span>
                          </div>
                          <span className="font-mono text-emerald-300">
                            {ph.correctCount}/{ph.totalQuestions} ({ph.accuracy}%) · Score: {ph.score}
                          </span>
                        </div>
                      ))}
                      {(selectedUserDetail.studySessions || []).map((ss) => (
                        <div
                          key={ss.id}
                          className="p-2.5 rounded-xl bg-[#131b2e] border border-[#d4af37]/20 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-[#fbf9f4] block">
                              Focus: {ss.subject} — {ss.topic}
                            </span>
                            <span className="text-[10px] text-[#9ca3af]">
                              {ss.date} · {ss.timestamp}
                            </span>
                          </div>
                          <span className="font-mono text-[#d4af37] font-bold">
                            {ss.durationMinutes} min
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : metrics ? (
            /* ======================================================================= */
            /* MAIN OWNER DASHBOARD VIEW                                               */
            /* ======================================================================= */
            <div className="space-y-6">
              {/* 1. Core Platform Reach: Users, Devices, App Open Sessions, Logins */}
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

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/30 space-y-1">
                    <div className="flex items-center justify-between text-xs text-[#9ca3af]">
                      <span>Total Users</span>
                      <Users className="w-4 h-4 text-[#d4af37]" />
                    </div>
                    <div className="font-display text-2xl sm:text-3xl font-bold text-[#fbf9f4] tabular-nums">
                      {summary?.totalUsers ?? metrics.totalUniqueUsers}
                    </div>
                    <p className="text-[11px] text-[#cbd5e1]">
                      {summary?.totalRegisteredAccounts ?? metrics.totalRegisteredAccounts ?? 0} Registered · {summary?.activeUsersCount ?? metrics.totalUniqueUsers} Active
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/30 space-y-1">
                    <div className="flex items-center justify-between text-xs text-[#9ca3af]">
                      <span>Total Vault Points (VP)</span>
                      <Sparkles className="w-4 h-4 text-[#d4af37]" />
                    </div>
                    <div className="font-display text-2xl sm:text-3xl font-bold text-[#d4af37] tabular-nums">
                      {(summary?.totalVaultPoints ?? 0).toLocaleString()} VP
                    </div>
                    <p className="text-[11px] text-[#cbd5e1] font-mono">
                      24h: +{summary?.dailyVP ?? 0} · 7d: +{summary?.weeklyVP ?? 0} · 30d: +{summary?.monthlyVP ?? 0}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/30 space-y-1">
                    <div className="flex items-center justify-between text-xs text-[#9ca3af]">
                      <span>Study &amp; Questions</span>
                      <Award className="w-4 h-4 text-[#d4af37]" />
                    </div>
                    <div className="font-display text-2xl sm:text-3xl font-bold text-[#fbf9f4] tabular-nums">
                      {summary?.totalQuestionsAttempted ?? 0}Q · {summary?.totalStudyMinutes ?? 0}m
                    </div>
                    <p className="text-[11px] text-[#cbd5e1]">
                      Accuracy: {summary?.overallPlatformAccuracy ?? 0}% · {summary?.totalFocusSessions ?? 0} Focus Sessions
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/30 space-y-1">
                    <div className="flex items-center justify-between text-xs text-[#9ca3af]">
                      <span>Devices &amp; Sessions</span>
                      <Smartphone className="w-4 h-4 text-[#d4af37]" />
                    </div>
                    <div className="font-display text-2xl sm:text-3xl font-bold text-[#fbf9f4] tabular-nums">
                      {metrics.totalDevices} Dev · {metrics.totalAppOpenSessions} Sess
                    </div>
                    <p className="text-[11px] text-[#cbd5e1]">
                      {summary?.totalLogins ?? 0} Logins · {summary?.totalDeletionEvents ?? deletionEvents.length} Deletions
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Vault Points (VP) Economy & Device/Platform Breakdown */}
              {summary && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display text-xs sm:text-sm font-bold text-[#d4af37] uppercase tracking-wider">
                        Vault Points (VP) Sources Breakdown
                      </h4>
                      <span className="text-xs font-mono font-bold text-[#fbf9f4]">
                        {summary.totalVaultPoints.toLocaleString()} Total VP
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2.5 rounded-xl bg-[#131b2e] border border-[#d4af37]/20 text-center">
                        <span className="font-mono text-base font-bold text-[#d4af37] block">
                          {summary.vpFromQuestions}
                        </span>
                        <span className="text-[10px] text-[#9ca3af]">Questions (+4 VP)</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#131b2e] border border-[#d4af37]/20 text-center">
                        <span className="font-mono text-base font-bold text-emerald-300 block">
                          {summary.vpFromFocusMinutes}
                        </span>
                        <span className="text-[10px] text-[#9ca3af]">Focus Mins (+1 VP)</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#131b2e] border border-[#d4af37]/20 text-center">
                        <span className="font-mono text-base font-bold text-amber-300 block">
                          {summary.vpFromBonuses}
                        </span>
                        <span className="text-[10px] text-[#9ca3af]">60m Bonuses (+20)</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display text-xs sm:text-sm font-bold text-[#d4af37] uppercase tracking-wider">
                        Device &amp; Platform Distribution
                      </h4>
                      <span className="text-xs font-mono text-[#9ca3af]">
                        {summary.inactiveUsersCount} Inactive · {summary.suspendedUsersCount} Suspended
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {Object.entries(summary.platformDistribution || {}).length === 0 ? (
                        <span className="text-xs text-[#9ca3af]">No device records yet.</span>
                      ) : (
                        Object.entries(summary.platformDistribution).map(([plat, cnt]) => (
                          <div
                            key={plat}
                            className="px-3 py-1.5 rounded-xl bg-[#131b2e] border border-[#d4af37]/25 text-xs flex items-center gap-2"
                          >
                            <span className="text-[#cbd5e1]">{plat}:</span>
                            <strong className="font-mono text-[#d4af37]">{cnt}</strong>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Active Retention (DAU / WAU / MAU) & New Users */}
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

              {/* 4. Registered Users Directory & Access Management (Search, Sort, Filter, Drill-down) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0f172a] border border-[#d4af37]/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#d4af37]" />
                    <h4 className="font-display text-sm font-bold text-[#fbf9f4]">
                      All Users Directory &amp; Detailed Analytics (Click Any User to Inspect)
                    </h4>
                  </div>
                  <span className="text-[11px] font-mono text-[#9ca3af]">
                    Showing {filteredAndSortedUsers.length} of {(usersList.length || metrics.registeredAccounts?.length || 0)} User(s)
                  </span>
                </div>

                {/* Search, Filter & Sort Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#9ca3af] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search name, @username, User ID, goal..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#090e1c] border border-[#d4af37]/25 text-xs text-[#fbf9f4] placeholder-[#9ca3af] focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'suspended')}
                      className="w-full px-3 py-1.5 rounded-xl bg-[#090e1c] border border-[#d4af37]/25 text-xs text-[#fbf9f4]"
                    >
                      <option value="all">Status: All Accounts</option>
                      <option value="active">Status: Active Only</option>
                      <option value="suspended">Status: Suspended Only</option>
                    </select>
                  </div>

                  <div>
                    <select
                      value={sortBy}
                      onChange={(e) =>
                        setSortBy(
                          e.target.value as 'lastSeen' | 'vp' | 'questions' | 'studyTime' | 'createdAt'
                        )
                      }
                      className="w-full px-3 py-1.5 rounded-xl bg-[#090e1c] border border-[#d4af37]/25 text-xs text-[#fbf9f4]"
                    >
                      <option value="lastSeen">Sort by: Last Active</option>
                      <option value="vp">Sort by: Highest Vault Points (VP)</option>
                      <option value="questions">Sort by: Questions Solved</option>
                      <option value="studyTime">Sort by: Study Time (Mins)</option>
                      <option value="createdAt">Sort by: Newest Account</option>
                    </select>
                  </div>
                </div>

                {filteredAndSortedUsers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#9ca3af]">
                    No user accounts match the current search or filter.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#1e293b] text-[10px] uppercase tracking-wider text-[#9ca3af]">
                          <th className="py-2 pr-3 font-semibold">User / Role</th>
                          <th className="py-2 px-3 font-semibold">Username &amp; ID</th>
                          <th className="py-2 px-3 font-semibold">Platform / Logins</th>
                          <th className="py-2 px-3 font-semibold text-right">Vault Points</th>
                          <th className="py-2 px-3 font-semibold text-right">Solved / Time</th>
                          <th className="py-2 px-3 font-semibold">Status</th>
                          <th className="py-2 pl-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e293b]/60">
                        {filteredAndSortedUsers.map((acc) => {
                          const uid = acc.userId || acc.id || '';
                          const isAccOwner = acc.role === 'owner';
                          const isSuspended = acc.accountStatus === 'suspended';
                          const isBusy = actionBusyId === uid;
                          const vpVal =
                            acc.vaultPointsTotal ??
                            (acc.questionsAttempted || 0) * 4 + (acc.totalStudyMinutes || 0);

                          return (
                            <tr
                              key={uid}
                              onClick={() => setSelectedUserId(uid)}
                              className="hover:bg-[#131b2e]/70 cursor-pointer transition-colors"
                            >
                              <td className="py-2.5 pr-3">
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
                                <span className="text-[10px] text-[#9ca3af] block">
                                  Goal: {acc.activeGoal || 'General'} · Streak: {acc.currentStreak ?? 0}d
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="font-mono text-[11px] text-[#d4af37] block">
                                  {acc.username ? `@${acc.username}` : 'Anonymous'}
                                </span>
                                <span className="font-mono text-[10px] text-[#9ca3af] block truncate max-w-[130px]">
                                  {uid}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="text-[11px] text-[#fbf9f4] block">
                                  {acc.devicePlatform || 'Web'}
                                </span>
                                <span className="text-[10px] text-[#9ca3af] font-mono">
                                  {acc.loginCount ?? 0} logins · {formatDateShort(acc.lastSeenAt)}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-[#d4af37] tabular-nums">
                                {vpVal.toLocaleString()} VP
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#fbf9f4]">
                                {acc.questionsAttempted || 0}Q ({acc.accuracy ?? 0}%) · {acc.totalStudyMinutes || 0}m
                              </td>
                              <td className="py-2.5 px-3">
                                {isSuspended ? (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/40 text-[10px] font-semibold text-rose-300">
                                    Suspended
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-semibold text-emerald-300">
                                    Active
                                  </span>
                                )}
                              </td>
                              <td
                                className="py-2.5 pl-3 text-right"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedUserId(uid)}
                                    title="Inspect Full User Analytics"
                                    className="px-2 py-1 rounded bg-[#131b2e] border border-[#d4af37]/30 text-[#d4af37] hover:bg-[#1a2540] text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Inspect</span>
                                  </button>
                                  {!isAccOwner &&
                                    (confirmDeleteUserId === uid ? (
                                      <>
                                        <button
                                          type="button"
                                          disabled={isBusy}
                                          onClick={() => handleRemoveUserAccount(uid)}
                                          className="px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-bold hover:bg-rose-500 cursor-pointer"
                                        >
                                          Confirm
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isBusy}
                                          onClick={() => setConfirmDeleteUserId(null)}
                                          className="px-2 py-1 rounded bg-[#131b2e] text-[#cbd5e1] text-[10px] cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          disabled={isBusy}
                                          onClick={() =>
                                            handleToggleUserStatus(uid, acc.accountStatus)
                                          }
                                          className={`px-2 py-1 rounded border text-[10px] font-semibold flex items-center gap-1 cursor-pointer ${
                                            isSuspended
                                              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                                              : 'bg-amber-950/60 border-amber-500/40 text-amber-200'
                                          }`}
                                        >
                                          {isSuspended ? 'Activate' : 'Suspend'}
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isBusy}
                                          onClick={() => setConfirmDeleteUserId(uid)}
                                          title="Remove User Account"
                                          className="p-1 rounded bg-rose-950/60 border border-rose-500/40 text-rose-200 hover:bg-rose-900/70 cursor-pointer"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </>
                                    ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 5. Community & SVH AI Engagement */}
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

              {/* 6. Community Moderation Reports & Account Deletion Events */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-[#0f172a] border border-[#d4af37]/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flag className="w-4 h-4 text-[#d4af37]" />
                      <h4 className="font-display text-sm font-bold text-[#fbf9f4]">
                        Community Moderation Queue
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono text-[#9ca3af]">
                      {metrics.moderationReports?.length || 0} Pending
                    </span>
                  </div>

                  {!metrics.moderationReports || metrics.moderationReports.length === 0 ? (
                    <div className="py-5 text-center text-xs text-[#9ca3af]">
                      No community reports pending moderation.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-52 overflow-y-auto">
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
                              <span className="font-semibold text-[#fbf9f4]">{rep.reason}</span>
                            </div>
                            <p className="text-[#cbd5e1] truncate">
                              {rep.targetPreview || 'Reported item'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={actionBusyId === rep.targetId}
                              onClick={() => handleModerationAction(rep.targetType, rep.targetId)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold hover:bg-rose-500 cursor-pointer"
                            >
                              Delete
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

                <div className="p-4 sm:p-5 rounded-2xl bg-[#0f172a] border border-[#d4af37]/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-[#d4af37]" />
                      <h4 className="font-display text-sm font-bold text-[#fbf9f4]">
                        Account Deletion Events
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono text-[#9ca3af]">
                      {deletionEvents.length} Recorded
                    </span>
                  </div>

                  {deletionEvents.length === 0 ? (
                    <div className="py-5 text-center text-xs text-[#9ca3af]">
                      No account deletion events recorded.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto">
                      {deletionEvents.map((ev) => (
                        <div
                          key={ev.id}
                          className="p-2.5 rounded-xl bg-[#131b2e] border border-[#d4af37]/20 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-mono text-[#fbf9f4] font-semibold">
                              {ev.username ? `@${ev.username}` : ev.userId}
                            </span>
                            <span className="text-[10px] text-[#9ca3af] block">
                              By: {ev.deletedBy || 'self'}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-[#cbd5e1]">
                            {formatDateShort(ev.deletedAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 7. New Users Over Time Chart */}
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
                        <div key={entry.date} className="flex items-center gap-3 text-xs">
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
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
