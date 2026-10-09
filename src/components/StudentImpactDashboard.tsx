import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  MessagesSquare,
  RefreshCw,
  Award,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { apiFetch } from '../services/nativeApiBridge';
import { UserStats } from '../types';

interface StudentImpactDashboardProps {
  userStats: UserStats;
}

interface VerifiedImpactMetrics {
  registeredStudents: number;
  activeLearners: number;
  totalQuestionsPractised: number;
  totalFocusMinutes: number;
  communityInteractions: number;
  lastVerifiedAt: string;
}

export const StudentImpactDashboard: React.FC<StudentImpactDashboardProps> = React.memo(
  ({ userStats }) => {
    const [remoteMetrics, setRemoteMetrics] = useState<VerifiedImpactMetrics | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const loadVerifiedImpactData = useCallback(async () => {
      setIsLoading(true);
      setFetchError(null);

      try {
        const userMap = new Map<
          string,
          {
            isRegistered: boolean;
            questionsAttempted: number;
            studyMinutes: number;
            hasActivity: boolean;
          }
        >();

        let postsCount = 0;
        let repliesCount = 0;
        let chatCount = 0;
        let anySourceSucceeded = false;

        // 1. Query existing public-readable Firestore collections (if reachable)
        try {
          const [accountsSnap, usersSnap, postsSnap, repliesSnap, chatSnap] =
            await Promise.all([
              getDocs(collection(db, 'svh_accounts')).catch(() => null),
              getDocs(collection(db, 'svh_users')).catch(() => null),
              getDocs(collection(db, 'svh_posts')).catch(() => null),
              getDocs(collection(db, 'svh_replies')).catch(() => null),
              getDocs(collection(db, 'svh_chat')).catch(() => null),
            ]);

          if (accountsSnap || usersSnap || postsSnap || repliesSnap || chatSnap) {
            anySourceSucceeded = true;
          }

          if (usersSnap) {
            usersSnap.forEach((docSnap) => {
              const d = docSnap.data();
              const uid = String(d?.userId || docSnap.id || '');
              if (!uid) return;
              const stats = (d?.userStats || {}) as Partial<UserStats>;
              const q = Math.max(0, Number(stats.questionsAttempted) || 0);
              const m = Math.max(0, Number(stats.totalStudyMinutes) || 0);
              const isReg = Boolean(d?.username || d?.usernameLower || stats.username);
              userMap.set(uid, {
                isRegistered: isReg,
                questionsAttempted: q,
                studyMinutes: m,
                hasActivity: isReg || q > 0 || m > 0,
              });
            });
          }

          if (accountsSnap) {
            accountsSnap.forEach((docSnap) => {
              const d = docSnap.data();
              const uid = String(d?.userId || docSnap.id || '');
              if (!uid) return;
              const prev = userMap.get(uid);
              const stats = (d?.userStats || {}) as Partial<UserStats>;
              const q = Math.max(
                prev?.questionsAttempted || 0,
                Number(stats.questionsAttempted) || 0
              );
              const m = Math.max(
                prev?.studyMinutes || 0,
                Number(stats.totalStudyMinutes) || 0
              );
              const isReg = Boolean(
                prev?.isRegistered || d?.username || d?.usernameLower || stats.username
              );
              userMap.set(uid, {
                isRegistered: isReg,
                questionsAttempted: q,
                studyMinutes: m,
                hasActivity: isReg || q > 0 || m > 0,
              });
            });
          }

          if (postsSnap) postsCount = postsSnap.size;
          if (repliesSnap) repliesCount = repliesSnap.size;
          if (chatSnap) chatCount = chatSnap.size;
        } catch {
          // Firestore query failed or offline; continue to API state check
        }

        // 2. Also query existing /api/community/state endpoint for any server/native records
        try {
          const res = await apiFetch('/api/community/state');
          if (res.ok) {
            anySourceSucceeded = true;
            const data = await res.json();
            const apiPosts = Array.isArray(data?.posts) ? data.posts.length : 0;
            const apiReplies = Array.isArray(data?.replies) ? data.replies.length : 0;
            const apiChat = Array.isArray(data?.chatMessages) ? data.chatMessages.length : 0;

            postsCount = Math.max(postsCount, apiPosts);
            repliesCount = Math.max(repliesCount, apiReplies);
            chatCount = Math.max(chatCount, apiChat);

            if (Array.isArray(data?.leaderboard)) {
              for (const entry of data.leaderboard) {
                const uid = String(entry?.userId || '');
                if (!uid) continue;
                const prev = userMap.get(uid);
                const q = Math.max(
                  prev?.questionsAttempted || 0,
                  Number(entry?.questionsSolved) || 0
                );
                const m = Math.max(
                  prev?.studyMinutes || 0,
                  Number(entry?.studyMinutes) || 0
                );
                const vp = Math.max(0, Number(entry?.vpPoints || entry?.vaultPoints) || 0);
                userMap.set(uid, {
                  isRegistered: Boolean(prev?.isRegistered || entry?.username),
                  questionsAttempted: q,
                  studyMinutes: m,
                  hasActivity: Boolean(prev?.hasActivity || q > 0 || m > 0 || vp > 0),
                });
              }
            }
          }
        } catch {
          // API unreachable
        }

        if (!anySourceSucceeded) {
          setFetchError(
            'Live platform telemetry could not be reached right now. Showing your verified local session data only.'
          );
        }

        let regCount = 0;
        let activeCount = 0;
        let totalQ = 0;
        let totalMin = 0;

        for (const item of userMap.values()) {
          if (item.isRegistered) regCount += 1;
          if (item.hasActivity) activeCount += 1;
          totalQ += item.questionsAttempted;
          totalMin += item.studyMinutes;
        }

        setRemoteMetrics({
          registeredStudents: regCount,
          activeLearners: activeCount,
          totalQuestionsPractised: totalQ,
          totalFocusMinutes: totalMin,
          communityInteractions: postsCount + repliesCount + chatCount,
          lastVerifiedAt: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        });
      } catch {
        setFetchError('Unable to verify live platform impact metrics right now.');
      } finally {
        setIsLoading(false);
      }
    }, []);

    useEffect(() => {
      loadVerifiedImpactData();
    }, [loadVerifiedImpactData]);

    // Combine with current user's verified local activity so real progress is never under-reported
    const combinedMetrics = useMemo(() => {
      const localQ = Math.max(0, userStats.questionsAttempted || 0);
      const localMin = Math.max(0, userStats.totalStudyMinutes || 0);
      const localIsRegistered = Boolean(userStats.username || userStats.hasCompletedSetup);
      const localHasActivity =
        localIsRegistered ||
        localQ > 0 ||
        localMin > 0 ||
        userStats.studySessions.length > 0;

      const registeredStudents = Math.max(
        remoteMetrics?.registeredStudents || 0,
        localIsRegistered ? 1 : 0
      );
      const activeLearners = Math.max(
        remoteMetrics?.activeLearners || 0,
        localHasActivity ? 1 : 0
      );
      const totalQuestionsPractised = Math.max(
        remoteMetrics?.totalQuestionsPractised || 0,
        localQ
      );
      const totalFocusMinutes = Math.max(
        remoteMetrics?.totalFocusMinutes || 0,
        localMin
      );
      const communityInteractions = remoteMetrics?.communityInteractions || 0;

      const hasAnyImpactData =
        registeredStudents > 0 ||
        activeLearners > 0 ||
        totalQuestionsPractised > 0 ||
        totalFocusMinutes > 0 ||
        communityInteractions > 0;

      return {
        registeredStudents,
        activeLearners,
        totalQuestionsPractised,
        totalFocusMinutes,
        communityInteractions,
        hasAnyImpactData,
      };
    }, [remoteMetrics, userStats]);

    return (
      <section
        aria-label="Student Impact Dashboard"
        className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0c1428] via-[#091020] to-[#060b18] border border-[#d4af37]/35 shadow-xl space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#d4af37] uppercase tracking-wider">
              <Activity className="w-4 h-4" />
              <span>Student Impact Dashboard</span>
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#fbf9f4]">
              Verified Platform &amp; Study Activity
            </h2>
            <p className="text-xs text-[#9ca3af]">
              Real-time metrics computed strictly from verified student accounts, study timers, and question practice records.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {remoteMetrics?.lastVerifiedAt && (
              <span className="text-[11px] font-mono text-[#9ca3af]">
                Verified {remoteMetrics.lastVerifiedAt}
              </span>
            )}
            <button
              type="button"
              onClick={loadVerifiedImpactData}
              disabled={isLoading}
              aria-label="Refresh Impact Metrics"
              className="px-3 py-1.5 rounded-xl bg-[#131b2e] hover:bg-[#19243d] border border-[#d4af37]/30 hover:border-[#d4af37] text-xs font-semibold text-[#fbf9f4] inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#d4af37] ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Syncing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {fetchError && (
          <div className="p-3 rounded-xl bg-[#090e1c] border border-amber-500/35 text-xs text-amber-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{fetchError}</span>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Registered & Active Learners */}
          <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#9ca3af] font-medium flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>Active Learners</span>
              </span>
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-[#fbf9f4] tabular-nums">
                {combinedMetrics.activeLearners}
              </div>
              <p className="text-[11px] text-[#9ca3af] mt-0.5 tabular-nums">
                {combinedMetrics.registeredStudents} registered{' '}
                {combinedMetrics.registeredStudents === 1 ? 'account' : 'accounts'}
              </p>
            </div>
          </div>

          {/* 2. Questions Practised */}
          <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#9ca3af] font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Questions Practised</span>
              </span>
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-[#fbf9f4] tabular-nums">
                {combinedMetrics.totalQuestionsPractised.toLocaleString()}
              </div>
              <p className="text-[11px] text-[#9ca3af] mt-0.5">
                {combinedMetrics.totalQuestionsPractised > 0
                  ? 'Verified MCQ attempts recorded'
                  : 'No questions practised yet'}
              </p>
            </div>
          </div>

          {/* 3. Verified Study Focus Time */}
          <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#9ca3af] font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Focus Study Time</span>
              </span>
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-[#fbf9f4] tabular-nums">
                {combinedMetrics.totalFocusMinutes.toLocaleString()} min
              </div>
              <p className="text-[11px] text-[#9ca3af] mt-0.5">
                {combinedMetrics.totalFocusMinutes > 0
                  ? 'Logged via Study Stopwatch & Focus Mode'
                  : 'No focus minutes logged yet'}
              </p>
            </div>
          </div>

          {/* 4. Community Discussions & Solutions */}
          <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#9ca3af] font-medium flex items-center gap-1.5">
                <MessagesSquare className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>Community Activity</span>
              </span>
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-[#fbf9f4] tabular-nums">
                {combinedMetrics.communityInteractions.toLocaleString()}
              </div>
              <p className="text-[11px] text-[#9ca3af] mt-0.5">
                {combinedMetrics.communityInteractions > 0
                  ? 'Doubts, replies & study chat messages'
                  : 'No community posts recorded yet'}
              </p>
            </div>
          </div>
        </div>

        {!combinedMetrics.hasAnyImpactData && !isLoading && (
          <div className="p-3.5 rounded-xl bg-[#090e1c] border border-[#d4af37]/20 text-xs text-[#cbd5e1] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#d4af37] shrink-0" />
              <span>
                No platform activity has been recorded yet. All metrics start at zero and increment only as real students study and practice.
              </span>
            </div>
          </div>
        )}
      </section>
    );
  }
);
