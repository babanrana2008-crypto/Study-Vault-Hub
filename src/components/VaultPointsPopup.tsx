import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Award, Trophy, Flame, CheckCircle2 } from 'lucide-react';
import { UserStats } from '../types';
import { calculateUserVPBreakdown } from '../utils/vpPoints';
import { GlassMetallicSkeleton } from './GlassMetallicSkeleton';
import { RollingVPCounter } from './RollingVPCounter';

export type VaultModalTab = 'vp' | 'streak';

interface VaultPointsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  userStats: UserStats;
  initialTab?: VaultModalTab;
}

export const VaultPointsPopup: React.FC<VaultPointsPopupProps> = React.memo(({
  isOpen,
  onClose,
  userStats,
  initialTab = 'vp',
}) => {
  const [activeTab, setActiveTab] = useState<VaultModalTab>(initialTab);
  const [isVpHistoryLoading, setIsVpHistoryLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setIsVpHistoryLoading(true);
      const timer = window.setTimeout(() => {
        setIsVpHistoryLoading(false);
      }, 260);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const vpBreakdown = calculateUserVPBreakdown(userStats);
  const currentVp = Math.max(0, Number(vpBreakdown.totalVP) || 0);
  const questionsAttempted = Math.max(0, Number(userStats?.questionsAttempted) || 0);
  const completedSixtyMinSessions =
    userStats?.sixtyMinBonusCount ??
    (userStats?.studySessions || []).filter((s) => (Number(s?.durationMinutes) || 0) >= 60).length;
  const activeDaysCount = Math.max(
    0,
    Number(userStats?.streak?.current ?? userStats?.streakDays) || 0
  );
  const lastActiveDate = userStats?.streak?.lastActiveDate || null;
  const recentActivities = vpBreakdown.recentActivities.slice(0, 4);

  const modalContent = (
    <div
      role="presentation"
      className="svh-vp-streak-modal-overlay"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={activeTab === 'streak' ? 'Study Streak & VP Details' : 'VP Points & Streak Details'}
        onClick={(e) => e.stopPropagation()}
        className="svh-vp-streak-modal-card svh-popup-card bg-[#eef3fa] border border-[#b8c7dc] text-[#1e293b] shadow-[0_20px_50px_rgba(15,23,42,0.35)] text-left custom-scrollbar space-y-3.5"
      >
        {/* Header with Mode Switcher & Close Button */}
        <div className="pb-3 border-b border-[#cbd5e1] flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-[#d5e2f2] border border-[#b8c7dc] flex items-center justify-center text-[#1e293b] shrink-0">
              {activeTab === 'streak' ? (
                <Flame className="w-4 h-4 text-amber-500 fill-amber-400 svh-live-streak-flame" />
              ) : (
                <Trophy className="w-4 h-4 text-[#9a6f0a]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-xs sm:text-sm font-bold tracking-wider text-[#1e293b] uppercase break-words leading-snug">
                {activeTab === 'streak' ? 'DAILY STUDY STREAK' : 'VP POINTS'}
              </h3>
              <p className="text-[11px] text-[#475569] break-words leading-tight">
                {vpBreakdown.currentTier.title} · {activeDaysCount > 0 ? `${activeDaysCount}d Active Streak` : '0d (No streak yet)'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close popup"
            className="min-h-[44px] min-w-[44px] w-11 h-11 rounded-xl bg-[#d5e2f2] hover:bg-[#c5d6ec] border border-[#b8c7dc] text-[#1e293b] flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toggle Pills between VP Points & Study Streak */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('vp')}
            className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'vp'
                ? 'bg-[#d5e2f2] border-[#82a7cd] text-[#0f172a] shadow-xs'
                : 'bg-[#f7f9fc] border-[#cbd5e1] text-[#475569] hover:bg-[#e2eaf5]'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 shrink-0" />
            <span className="break-words">
              VP Points (<RollingVPCounter value={currentVp} suffix=" VP" />)
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('streak')}
            className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'streak'
                ? 'bg-[#dcfce7] border-[#86efac] text-[#0f172a] shadow-xs'
                : 'bg-[#f7f9fc] border-[#cbd5e1] text-[#475569] hover:bg-[#e2eaf5]'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0 svh-live-streak-flame" />
            <span className="break-words">Streak ({activeDaysCount}d)</span>
          </button>
        </div>

        {/* CURRENT BALANCE & STREAK OVERVIEW */}
        <div className="p-3.5 rounded-xl bg-[#f7f9fc] border border-[#cbd5e1] space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#475569] block break-words">
                CURRENT BALANCE
              </span>
              <span className="font-display text-xl sm:text-2xl font-extrabold text-[#1e293b] tabular-nums break-words">
                <RollingVPCounter value={currentVp} formatLocale suffix=" VP" />
              </span>
              <span className="text-[11px] text-[#475569] block mt-0.5 break-words">
                Active Streak: <strong>{activeDaysCount > 0 ? `${activeDaysCount}d (${activeDaysCount} Day${activeDaysCount === 1 ? '' : 's'})` : '0d (No streak yet)'}</strong>
              </span>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-1 min-w-0">
              <span className="svh-badge-shimmer inline-flex flex-wrap items-center gap-1 px-2.5 py-1 rounded-lg bg-[#e2eaf5] border border-[#b8c7dc] text-[11px] font-semibold text-[#1e293b] break-words">
                <Award className="w-3.5 h-3.5 text-[#9a6f0a] shrink-0" />
                <span className="break-words">{vpBreakdown.currentTier.title}</span>
              </span>
              {vpBreakdown.nextTier && (
                <span className="text-[10px] text-[#475569] font-mono break-words">
                  {vpBreakdown.vpNeededForNextTier} VP to {vpBreakdown.nextTier.title}
                </span>
              )}
              <div className="text-[10px] text-[#475569] font-mono flex flex-wrap gap-x-2.5 gap-y-0.5 mt-0.5">
                <span>Questions: {questionsAttempted}</span>
                <span>60m Focus: {completedSixtyMinSessions}</span>
              </div>
            </div>
          </div>

          {/* Animated Rank Tier Progress Bar bound to real VP state */}
          <div className="space-y-1 pt-1 border-t border-[#e2e8f0]">
            <div className="flex items-center justify-between text-[10px] font-mono text-[#475569]">
              <span>Rank Progress ({vpBreakdown.currentTier.title})</span>
              <span className="font-bold text-[#1e293b] tabular-nums">
                {vpBreakdown.tierProgressPercent}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#e2e8f0] overflow-hidden border border-[#cbd5e1]">
              <div
                className="svh-animated-progress-fill h-full rounded-full bg-gradient-to-r from-[#d4af37] to-amber-500"
                style={{ width: `${Math.max(0, Math.min(100, vpBreakdown.tierProgressPercent))}%` }}
              />
            </div>
          </div>
        </div>

        {/* STREAK DETAILS PANEL (shown when Streak tab is selected) */}
        {activeTab === 'streak' && (
          <div className="p-3.5 rounded-xl bg-[#f7f9fc] border border-[#cbd5e1] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#1e293b] break-words">
                DAILY STREAK RULES &amp; MILESTONES
              </h4>
              <span className="text-[10px] font-mono text-[#475569] break-words">
                {lastActiveDate ? `Last active: ${lastActiveDate}` : 'Start today'}
              </span>
            </div>

            {/* Animated Streak Milestone Progress Bar (5-Day Cycle) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-[#475569]">
                <span>5-Day Streak Bonus Progress</span>
                <span className="font-bold text-[#1e293b]">
                  {activeDaysCount % 5 === 0 && activeDaysCount > 0 ? 5 : activeDaysCount % 5} / 5 Days
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#e2e8f0] overflow-hidden border border-[#cbd5e1]">
                <div
                  className="svh-animated-progress-fill h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500"
                  style={{
                    width: `${
                      activeDaysCount === 0
                        ? 0
                        : activeDaysCount % 5 === 0
                        ? 100
                        : Math.round(((activeDaysCount % 5) / 5) * 100)
                    }%`,
                  }}
                />
              </div>
            </div>

            <ul className="space-y-1.5 text-[11px] text-[#334155]">
              <li className="flex flex-wrap items-center justify-between gap-2 py-1 border-b border-[#e2e8f0]">
                <span className="break-words flex-1 min-w-[160px]">
                  • Complete a study task, MCQ practice, or focus session daily
                </span>
                <span className="font-mono font-bold text-[#1e293b] shrink-0">+1 Day Streak</span>
              </li>
              <li className="flex flex-wrap items-center justify-between gap-2 py-1 border-b border-[#e2e8f0]">
                <span className="break-words flex-1 min-w-[160px]">
                  • Qualifying daily study consistency bonus
                </span>
                <span className="font-mono font-bold text-[#1e293b] shrink-0">+2 VP / Day</span>
              </li>
              <li className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <span className="break-words flex-1 min-w-[160px]">
                  • Every 5-day active study streak milestone
                </span>
                <span className="font-mono font-bold text-[#1e293b] shrink-0">
                  +20 VP ({vpBreakdown.streakMilestoneVP} VP earned)
                </span>
              </li>
            </ul>
          </div>
        )}

        {/* EARNING RULES */}
        <div className="p-3.5 rounded-xl bg-[#f7f9fc] border border-[#cbd5e1] space-y-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#1e293b] break-words">
            EARNING RULES
          </h4>
          <ul className="space-y-1.5 text-[11px] text-[#334155]">
            <li className="flex flex-wrap items-center justify-between gap-2 py-1 border-b border-[#e2e8f0]">
              <span className="break-words flex-1 min-w-[170px]">
                • <strong>10 VP</strong> — every 5 minutes of focused study
              </span>
              <span className="font-mono font-bold text-[#1e293b] shrink-0">
                +{vpBreakdown.studyTimeVP} VP
              </span>
            </li>
            <li className="flex flex-wrap items-center justify-between gap-2 py-1 border-b border-[#e2e8f0]">
              <span className="break-words flex-1 min-w-[170px]">
                • <strong>2 VP</strong> — every normal question solved
              </span>
              <span className="font-mono font-bold text-[#1e293b] shrink-0">
                +{vpBreakdown.normalQuestionVP} VP
              </span>
            </li>
            <li className="flex flex-wrap items-center justify-between gap-2 py-1 border-b border-[#e2e8f0]">
              <span className="break-words flex-1 min-w-[170px]">
                • <strong>5 VP</strong> — every correct Test Mode question
              </span>
              <span className="font-mono font-bold text-[#1e293b] shrink-0">
                +{vpBreakdown.testModeQuestionVP} VP
              </span>
            </li>
            <li className="flex flex-wrap items-center justify-between gap-2 py-1 border-b border-[#e2e8f0]">
              <span className="break-words flex-1 min-w-[170px]">
                • <strong>20 VP</strong> — completed 60-minute Focus Study bonus
              </span>
              <span className="font-mono font-bold text-[#1e293b] shrink-0">
                +{completedSixtyMinSessions * 20} VP
              </span>
            </li>
            <li className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              <span className="break-words flex-1 min-w-[170px]">
                • <strong>20 VP</strong> — every 5-day study streak
              </span>
              <span className="font-mono font-bold text-[#1e293b] shrink-0">
                +{vpBreakdown.streakMilestoneVP} VP
              </span>
            </li>
          </ul>
        </div>

        {/* YOUR ACTIVITY */}
        <div className="p-3.5 rounded-xl bg-[#f7f9fc] border border-[#cbd5e1] space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#1e293b] break-words">
              YOUR ACTIVITY
            </h4>
            <span className="text-[10px] font-mono text-[#475569] inline-flex items-center gap-1 break-words">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>Verified Records</span>
            </span>
          </div>

          {isVpHistoryLoading ? (
            <GlassMetallicSkeleton variant="vp-history" count={2} />
          ) : recentActivities.length === 0 ? (
            <p className="text-xs text-[#64748b] py-1.5 text-center break-words">
              No user activity yet — solve practice MCQs or start a focus session to earn VP!
            </p>
          ) : (
            <div className="space-y-1.5">
              {recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="svh-3d-tilt-card p-2.5 rounded-lg bg-[#eef3fa] border border-[#cbd5e1] flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-[#1e293b] break-words leading-snug">
                      {act.title}
                    </p>
                    <p className="text-[10px] text-[#475569] break-words leading-tight mt-0.5">
                      {act.subtitle} · {act.timestamp}
                    </p>
                  </div>
                  <span className="svh-badge-shimmer px-2 py-0.5 rounded-md bg-[#d5e2f2] border border-[#b8c7dc] font-mono text-[10px] font-bold text-[#1e293b] shrink-0">
                    +<RollingVPCounter value={act.vpEarned} suffix=" VP" />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
});

