import React, { useEffect, useRef } from 'react';
import { Sparkles, X, Award } from 'lucide-react';
import { UserStats } from '../types';

interface VaultPointsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  userStats: UserStats;
}

export const VaultPointsPopup: React.FC<VaultPointsPopupProps> = React.memo(({
  isOpen,
  onClose,
  userStats,
}) => {
  const popupRef = useRef<HTMLDivElement | null>(null);

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

  if (!isOpen) return null;

  const currentVp = typeof userStats.vaultPoints === 'number' ? userStats.vaultPoints : 0;
  const questionsAttempted = Number(userStats.questionsAttempted) || 0;
  const completedSixtyMinSessions =
    userStats.sixtyMinBonusCount ??
    (userStats.studySessions || []).filter((s) => (Number(s?.durationMinutes) || 0) >= 60).length;
  const activeDaysCount = Object.values(userStats.dailyActivity || {}).filter(
    (act) => act && ((act.questionsSolved || 0) > 0 || (act.studyMinutes || 0) > 0)
  ).length;
  const recentTransactions = Array.isArray(userStats.vpTransactions)
    ? userStats.vpTransactions.slice(0, 3)
    : [];

  const hasAnyVpData =
    currentVp > 0 ||
    questionsAttempted > 0 ||
    completedSixtyMinSessions > 0 ||
    activeDaysCount > 0 ||
    recentTransactions.length > 0;

  return (
    <>
      {/* Transparent backdrop to close on outside tap without triggering navigation */}
      <div
        className="fixed inset-0 z-40"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />

      {/* Anchored Popup Card */}
      <div
        ref={popupRef}
        role="dialog"
        aria-label="Vault Points Summary and Earning Rules"
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-24px)] max-h-[68vh] sm:max-h-[75vh] overflow-y-auto overscroll-contain touch-pan-y rounded-2xl bg-[#0c1428] border border-[#d4af37]/45 shadow-2xl p-4 z-50 space-y-3 text-left animate-in fade-in duration-150 custom-scrollbar"
      >
        {/* Header */}
        <div className="sticky -top-4 -mx-4 px-4 pt-3 pb-2.5 bg-[#0c1428]/95 backdrop-blur-md z-10 flex items-center justify-between border-b border-[#1f293d]">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#d4af37]" />
            <span className="font-display text-xs sm:text-sm font-bold text-[#fbf9f4]">
              Vault Points (VP)
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 rounded-lg text-[#9ca3af] hover:text-[#fbf9f4] transition-colors cursor-pointer"
            aria-label="Close Vault Points popup"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Real Backend Current VP Balance */}
        <div className="p-3 rounded-xl bg-[#131b2e] border border-[#d4af37]/25 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#9ca3af] uppercase font-mono block">
              Current Balance
            </span>
            <span className="font-display text-xl font-bold text-[#d4af37] tabular-nums">
              {currentVp.toLocaleString()} VP
            </span>
          </div>
          <div className="text-right text-[10px] text-[#cbd5e1] font-mono space-y-0.5">
            <div>Questions: {questionsAttempted}</div>
            <div>60m Focus: {completedSixtyMinSessions}</div>
            <div>Active Days: {activeDaysCount}</div>
          </div>
        </div>

        {/* Official Earning Rules */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#d4af37] block">
            VP Earning Rules
          </span>
          <ul className="space-y-1 text-[11px] text-[#fbf9f4] font-medium">
            <li className="flex items-center justify-between gap-2 py-0.5">
              <span className="text-[#cbd5e1]">valid completed question</span>
              <span className="font-mono font-bold text-[#d4af37] shrink-0">+1 VP</span>
            </li>
            <li className="flex items-center justify-between gap-2 py-0.5">
              <span className="text-[#cbd5e1]">completed 60-minute Focus Study</span>
              <span className="font-mono font-bold text-[#d4af37] shrink-0">+20 VP</span>
            </li>
            <li className="flex items-center justify-between gap-2 py-0.5">
              <span className="text-[#cbd5e1]">after 5 valid Exam/Exam-Oriented questions</span>
              <span className="font-mono font-bold text-[#d4af37] shrink-0">+10 VP</span>
            </li>
            <li className="flex items-center justify-between gap-2 py-0.5">
              <span className="text-[#cbd5e1]">after 20 valid Exam/Exam-Oriented questions</span>
              <span className="font-mono font-bold text-[#d4af37] shrink-0">+40 VP</span>
            </li>
            <li className="flex items-center justify-between gap-2 py-0.5">
              <span className="text-[#cbd5e1]">qualifying daily usage</span>
              <span className="font-mono font-bold text-[#d4af37] shrink-0">+2 VP</span>
            </li>
          </ul>
        </div>

        {/* Real Progress & Available Rewards */}
        <div className="pt-2 border-t border-[#1f293d] space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#9ca3af] flex items-center gap-1">
            <Award className="w-3 h-3 text-[#d4af37]" />
            <span>Real Progress &amp; Rewards</span>
          </span>

          {!hasAnyVpData ? (
            <p className="text-[11px] text-[#9ca3af] py-1">
              0 VP · No data yet
            </p>
          ) : (
            <div className="space-y-1.5 text-[11px] text-[#cbd5e1]">
              <div className="flex items-center justify-between">
                <span>5 Exam Questions Bonus:</span>
                <span className="font-mono text-[#d4af37]">
                  {Math.min(5, questionsAttempted)}/5{' '}
                  {questionsAttempted >= 5 ? '(+10 VP Earned)' : ''}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>20 Exam Questions Bonus:</span>
                <span className="font-mono text-[#d4af37]">
                  {Math.min(20, questionsAttempted)}/20{' '}
                  {questionsAttempted >= 20 ? '(+40 VP Earned)' : ''}
                </span>
              </div>
              {recentTransactions.length > 0 && (
                <div className="pt-1 border-t border-[#1f293d]/70 space-y-1">
                  {recentTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-2 text-[10px] text-[#9ca3af]"
                    >
                      <span className="truncate">{tx.reason}</span>
                      <span className="font-mono font-bold text-emerald-400 shrink-0">
                        +{tx.amount} VP
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
});
