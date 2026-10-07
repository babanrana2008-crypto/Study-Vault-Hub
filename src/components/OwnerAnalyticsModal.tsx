import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { apiFetch } from '../services/nativeApiBridge';

const IDENTITY_STORAGE_KEY = 'study_vault_community_identity_v1';
const OWNER_TOKEN_STORAGE_KEY = 'study_vault_owner_session_token_v1';

interface RegisteredAccountItem {
  userId: string;
  username: string | null;
  displayName: string;
  role?: 'owner' | 'student';
  accountStatus?: 'active' | 'suspended';
  activeGoal: string | null;
  questionsAttempted: number;
  totalStudyMinutes: number;
  createdAt: string;
  lastSeenAt: string;
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

export const OwnerAnalyticsModal: React.FC<OwnerAnalyticsModalProps> = ({
  isOpen,
  onClose,
  onOwnerAuthStatusChange,
}) => {
  const [metrics, setMetrics] = useState<OwnerAnalyticsMetrics | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState<boolean>(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);

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
      <div className="w-full max-w-5xl rounded-2xl sm:rounded-3xl bg-[#0b1324] border border-[#d4af37]/40 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
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
                Founded &amp; Created by Soumyadip Rana · Verified Owner Session
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
                        {metrics.totalUniqueUsers}
                      </div>
                      <p className="text-[11px] text-[#cbd5e1]">
                        {typeof metrics.totalRegisteredAccounts === 'number'
                          ? `${metrics.totalRegisteredAccounts} with username credentials`
                          : 'Verified unique accounts'}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/30 space-y-1">
                      <div className="flex items-center justify-between text-xs text-[#9ca3af]">
                        <span>Total Devices</span>
                        <Smartphone className="w-4 h-4 text-[#d4af37]" />
                      </div>
                      <div className="font-display text-2xl sm:text-3xl font-bold text-[#fbf9f4] tabular-nums">
                        {metrics.totalDevices}
                      </div>
                      <p className="text-[11px] text-[#cbd5e1]">
                        Unique anonymous device identifiers
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/30 space-y-1">
                      <div className="flex items-center justify-between text-xs text-[#9ca3af]">
                        <span>Total App Open Sessions</span>
                        <Activity className="w-4 h-4 text-[#d4af37]" />
                      </div>
                      <div className="font-display text-2xl sm:text-3xl font-bold text-[#fbf9f4] tabular-nums">
                        {metrics.totalAppOpenSessions}
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

                {/* 4. Registered Users Directory & Access Management (Owner-Only) */}
                {Array.isArray(metrics.registeredAccounts) && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#0f172a] border border-[#d4af37]/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#d4af37]" />
                        <h4 className="font-display text-sm font-bold text-[#fbf9f4]">
                          Registered Users Directory &amp; Account Access Management
                        </h4>
                      </div>
                      <span className="text-[11px] font-mono text-[#9ca3af]">
                        {metrics.registeredAccounts.length} Account(s)
                      </span>
                    </div>

                    {metrics.registeredAccounts.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#9ca3af]">
                        No accounts registered yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-[#1e293b] text-[10px] uppercase tracking-wider text-[#9ca3af]">
                              <th className="py-2 pr-3 font-semibold">User / Role</th>
                              <th className="py-2 px-3 font-semibold">Username</th>
                              <th className="py-2 px-3 font-semibold">User ID</th>
                              <th className="py-2 px-3 font-semibold">Goal</th>
                              <th className="py-2 px-3 font-semibold text-right">Solved / Time</th>
                              <th className="py-2 px-3 font-semibold">Status</th>
                              <th className="py-2 pl-3 font-semibold text-right">Management</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1e293b]/60">
                            {metrics.registeredAccounts.map((acc) => {
                              const isAccOwner = acc.role === 'owner';
                              const isSuspended = acc.accountStatus === 'suspended';
                              const isBusy = actionBusyId === acc.userId;

                              return (
                                <tr key={acc.userId} className="hover:bg-[#131b2e]/50">
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
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-[11px] text-[#d4af37]">
                                    {acc.username ? `@${acc.username}` : 'Anonymous'}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-[10px] text-[#9ca3af]">
                                    {acc.userId}
                                  </td>
                                  <td className="py-2.5 px-3 text-[#cbd5e1] truncate max-w-[110px]">
                                    {acc.activeGoal || 'General'}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#fbf9f4]">
                                    {acc.questionsAttempted}Q · {acc.totalStudyMinutes}m
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
                                  <td className="py-2.5 pl-3 text-right">
                                    {isAccOwner ? (
                                      <span className="text-[10px] font-mono text-[#9ca3af]">
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
                                      <div className="inline-flex items-center gap-1.5">
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
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
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
};
