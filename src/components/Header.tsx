import React from 'react';
import { Search, Flame, User, Sparkles } from 'lucide-react';
import { ActiveSection } from '../types';
import { APP_LOGO } from '../data/sampleData';

interface HeaderProps {
  activeSection: ActiveSection;
  onNavigate: (section: ActiveSection) => void;
  onOpenSearch: () => void;
  streakDays: number;
  vaultPoints?: number;
  vpRewardToast?: { id: string; text: string } | null;
  userName: string;
  userProfilePhotoUrl?: string | null;
  isFloatingTopDock?: boolean;
}

export const Header: React.FC<HeaderProps> = React.memo(({
  activeSection,
  onNavigate,
  onOpenSearch,
  streakDays,
  vaultPoints = 0,
  vpRewardToast = null,
  userName,
  userProfilePhotoUrl,
  isFloatingTopDock = false,
}) => {
  const sectionTitles: Record<ActiveSection, string> = {
    home: 'Vault Home',
    books: 'Books Library',
    notes: 'High-Yield Notes',
    practice: 'Question Practice',
    tracker: 'Study Tracker',
    community: 'Community',
    prep: 'Exam Prep',
    profile: 'Profile'
  };

  const isNativeAndroid =
    typeof window !== 'undefined' &&
    Boolean(
      (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() ||
        window.navigator.userAgent.includes('Capacitor')
    );
  const showApkDesktopNav = isNativeAndroid && !isFloatingTopDock;

  return (
    <header
      aria-label="Top Navigation"
      className={
        isFloatingTopDock
          ? 'sticky top-[calc(0.5rem+env(safe-area-inset-top))] z-30 w-full max-w-full px-2.5 sm:px-4 pointer-events-none transition-all'
          : 'sticky top-0 z-30 w-full max-w-full bg-[#060b18]/95 backdrop-blur-md border-b border-[#d4af37]/20 transition-colors'
      }
    >
      <div
        className={
          isFloatingTopDock
            ? 'pointer-events-auto max-w-5xl mx-auto px-3 sm:px-5 h-14 rounded-2xl bg-[#060b18]/95 backdrop-blur-xl border border-[#d4af37]/35 shadow-[0_10px_30px_rgba(0,0,0,0.65),0_0_20px_rgba(212,175,55,0.14)] flex items-center justify-between gap-2 sm:gap-3 min-w-0 overflow-hidden'
            : 'max-w-5xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2 sm:gap-3 min-w-0'
        }
      >
        {/* Zone 1: Main App Logo & Title using the official Study Vault Hub logo */}
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2 sm:gap-2.5 text-left group focus:outline-none min-w-0 shrink overflow-hidden"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0 aspect-square">
            <img
              src={APP_LOGO}
              alt="Study Vault Hub"
              className="w-full h-full rounded-full object-contain aspect-square"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fallback if image load error
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div className="flex flex-col min-w-0 overflow-hidden">
            <span className="font-display text-xs sm:text-base font-bold tracking-tight text-[#fbf9f4] group-hover:text-[#d4af37] transition-colors leading-tight truncate">
              Study Vault Hub
            </span>
            <span
              className={`text-[8px] sm:text-[10px] text-[#cbd5e1]/80 font-mono tracking-tight leading-tight mt-0.5 flex flex-col ${
                showApkDesktopNav ? 'lg:flex-row lg:items-center lg:gap-1' : 'sm:flex-row sm:items-center sm:gap-1'
              } min-w-0`}
            >
              <span className="text-[#d4af37]/95 font-semibold truncate">Developed by Soumyadip Rana</span>
            </span>
          </div>
        </button>

        {/* Zone 2: Navigation Links for desktop */}
        <div
          className={`${
            showApkDesktopNav
              ? 'flex items-center gap-1.5 sm:gap-2.5 md:gap-4 lg:gap-5 text-[11px] sm:text-xs lg:text-sm font-medium overflow-x-auto no-scrollbar min-w-0 max-w-full px-1'
              : 'hidden md:flex items-center gap-4 lg:gap-5 text-xs lg:text-sm font-medium shrink-0'
          }`}
        >
          <button
            onClick={() => onNavigate('home')}
            className={`transition-colors hover:text-[#d4af37] whitespace-nowrap shrink-0 ${activeSection === 'home' ? 'text-[#d4af37] font-semibold' : 'text-[#cbd5e1]'}`}
          >
            Home
          </button>
          <button
            onClick={() => onNavigate('books')}
            className={`transition-colors hover:text-[#d4af37] whitespace-nowrap shrink-0 ${activeSection === 'books' ? 'text-[#d4af37] font-semibold' : 'text-[#cbd5e1]'}`}
          >
            Books
          </button>
          <button
            onClick={() => onNavigate('notes')}
            className={`transition-colors hover:text-[#d4af37] whitespace-nowrap shrink-0 ${activeSection === 'notes' ? 'text-[#d4af37] font-semibold' : 'text-[#cbd5e1]'}`}
          >
            Notes
          </button>
          <button
            onClick={() => onNavigate('practice')}
            className={`transition-colors hover:text-[#d4af37] whitespace-nowrap shrink-0 ${activeSection === 'practice' ? 'text-[#d4af37] font-semibold' : 'text-[#cbd5e1]'}`}
          >
            Practice
          </button>
          <button
            onClick={() => onNavigate('tracker')}
            className={`transition-colors hover:text-[#d4af37] whitespace-nowrap shrink-0 ${activeSection === 'tracker' ? 'text-[#d4af37] font-semibold' : 'text-[#cbd5e1]'}`}
          >
            Tracker
          </button>
          <button
            onClick={() => onNavigate('community')}
            className={`transition-colors hover:text-[#d4af37] whitespace-nowrap shrink-0 ${activeSection === 'community' ? 'text-[#d4af37] font-semibold' : 'text-[#cbd5e1]'}`}
          >
            Community
          </button>
          <button
            onClick={() => onNavigate('profile')}
            className={`transition-colors hover:text-[#d4af37] whitespace-nowrap shrink-0 ${activeSection === 'profile' ? 'text-[#d4af37] font-semibold' : 'text-[#cbd5e1]'}`}
          >
            Profile
          </button>
        </div>

        {/* Mobile current active label */}
        {!showApkDesktopNav && (
          <div className="hidden sm:flex md:hidden items-center text-xs tracking-wider uppercase text-[#d4af37] font-medium truncate">
            {sectionTitles[activeSection]}
          </div>
        )}

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Search */}
          <button
            onClick={onOpenSearch}
            aria-label="Search Vault"
            className="w-8 h-8 rounded-lg border border-[#d4af37]/25 bg-[#0f172a] text-[#fbf9f4] hover:text-[#d4af37] hover:border-[#d4af37] flex items-center justify-center transition-colors focus-visible:ring-1 focus-visible:ring-[#d4af37] shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Vault Points (VP) Balance Indicator (Web only; Android APK displays it stacked cleanly below Streak on the Home screen) */}
          {!isNativeAndroid && (
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="relative flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-[#d4af37]/25 bg-[#0f172a] text-[10px] sm:text-xs font-medium text-[#fbf9f4] hover:border-[#d4af37] transition-all shrink-0 cursor-pointer"
              title={`${vaultPoints} Vault Points (VP) — +1 VP per question, +20 VP per 60-min Focus Study, +10/+40 VP Exam Bonuses, +2 VP Daily Usage`}
            >
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#d4af37] shrink-0" />
              <span className="tabular-nums font-semibold text-[#d4af37]">{vaultPoints}</span>
              <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-[#cbd5e1]">
                VP
              </span>
              {vpRewardToast && (
                <span
                  key={vpRewardToast.id}
                  className="pointer-events-none absolute -bottom-7 right-0 z-50 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-mono text-[10px] font-extrabold whitespace-nowrap shadow-lg animate-bounce"
                >
                  {vpRewardToast.text}
                </span>
              )}
            </button>
          )}

          {/* Daily Streak */}
          <div
            className="flex items-center gap-1 ml-0.5 sm:ml-0 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-[#d4af37]/25 bg-[#0f172a] text-[10px] sm:text-xs font-medium text-[#fbf9f4] shrink-0"
            title={`${streakDays} Day Active Streak`}
          >
            <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 fill-amber-400 shrink-0" />
            <span className="tabular-nums font-semibold text-amber-300">{streakDays}d</span>
          </div>

          {/* Profile Trigger */}
          <button
            onClick={() => onNavigate('profile')}
            aria-label="Student Profile"
            className={`h-8 px-2 rounded-lg border flex items-center gap-1.5 transition-all text-xs shrink-0 ${
              activeSection === 'profile'
                ? 'border-[#d4af37] bg-[#d4af37]/20 text-[#fbf9f4]'
                : 'border-[#d4af37]/25 bg-[#0f172a] text-[#cbd5e1] hover:text-[#fbf9f4] hover:border-[#d4af37]'
            }`}
          >
            {userProfilePhotoUrl ? (
              <img
                src={userProfilePhotoUrl}
                alt={userName || 'Student'}
                className="w-5 h-5 rounded-full object-cover border border-[#d4af37]/50 shrink-0 aspect-square"
              />
            ) : (
              <User className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
            )}
            <span className="hidden sm:inline max-w-[80px] truncate">{userName}</span>
          </button>
        </div>
      </div>
    </header>
  );
});

