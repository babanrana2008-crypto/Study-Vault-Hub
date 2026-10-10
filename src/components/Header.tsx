import React, { useState, useCallback } from 'react';
import { Search, Flame, User, Trophy } from 'lucide-react';
import { ActiveSection, UserStats } from '../types';
import { APP_LOGO, INITIAL_USER_STATS } from '../data/sampleData';
import { VaultPointsPopup } from './VaultPointsPopup';
import { RollingVPCounter } from './RollingVPCounter';
import { useInertialFluidPill, scheduleRafAction } from './InteractiveFluidRippleLayer';

interface HeaderProps {
  activeSection: ActiveSection;
  onNavigate: (section: ActiveSection) => void;
  onOpenSearch: () => void;
  streakDays: number;
  vpPoints?: number;
  userStats?: UserStats;
  userName: string;
  userProfilePhotoUrl?: string | null;
  isFloatingTopDock?: boolean;
}

export const Header: React.FC<HeaderProps> = React.memo(({
  activeSection,
  onNavigate,
  onOpenSearch,
  streakDays,
  vpPoints = 0,
  userStats,
  userName,
  userProfilePhotoUrl,
  isFloatingTopDock = false,
}) => {
  const [isVpPopupOpen, setIsVpPopupOpen] = useState(false);
  const [vpPopupTab, setVpPopupTab] = useState<'vp' | 'streak'>('vp');
  const handleCloseVpPopup = useCallback(() => setIsVpPopupOpen(false), []);

  const isNativeAndroid =
    typeof window !== 'undefined' &&
    Boolean(
      (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() ||
        window.navigator.userAgent.includes('Capacitor')
    );
  const showApkDesktopNav = isNativeAndroid && !isFloatingTopDock;

  const { containerRef: navLinksRef, pillMetrics } = useInertialFluidPill<HTMLDivElement>(activeSection);

  React.useEffect(() => {
    const el = navLinksRef.current;
    if (!el) return;
    const ensureStartVisible = () => {
      if (activeSection === 'home' && el.scrollLeft !== 0) {
        el.scrollLeft = 0;
      }
    };
    ensureStartVisible();
    window.addEventListener('resize', ensureStartVisible, { passive: true });
    window.addEventListener('orientationchange', ensureStartVisible, { passive: true });
    return () => {
      window.removeEventListener('resize', ensureStartVisible);
      window.removeEventListener('orientationchange', ensureStartVisible);
    };
  }, [activeSection, navLinksRef]);

  const navItems: { id: ActiveSection; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'books', label: 'Books' },
    { id: 'notes', label: 'Notes' },
    { id: 'practice', label: 'Practice' },
    { id: 'tracker', label: 'Tracker' },
    { id: 'community', label: 'Community' },
    { id: 'profile', label: 'Profile' },
  ];

  return (
    <header
      aria-label="Top Navigation"
      className={
        isFloatingTopDock
          ? 'sticky top-[calc(0.5rem+env(safe-area-inset-top))] z-30 w-full max-w-full px-3 sm:px-4 overflow-x-clip pointer-events-none transition-all'
          : 'sticky top-0 z-30 w-full max-w-full px-3 sm:px-4 bg-[#060b18]/95 backdrop-blur-md border-b border-[#d4af37]/20 overflow-x-clip transition-colors'
      }
    >
      <nav
        aria-label="Main Header Navigation"
        className={
          isFloatingTopDock
            ? 'svh-header-navbar svh-header-ambient-mesh pointer-events-auto w-full max-w-5xl mx-auto px-3 sm:px-4 min-h-[3.5rem] py-1.5 rounded-2xl bg-[#060b18]/95 backdrop-blur-xl border border-[#d4af37]/35 shadow-[0_10px_30px_rgba(0,0,0,0.65),0_0_20px_rgba(212,175,55,0.14)] flex items-center justify-between gap-2 sm:gap-3 lg:gap-4 min-w-0 overflow-visible relative'
            : 'svh-header-navbar svh-header-ambient-mesh w-full max-w-5xl mx-auto px-1 sm:px-2 min-h-[3.5rem] py-1.5 flex items-center justify-between gap-2 sm:gap-3 lg:gap-4 min-w-0 overflow-visible relative'
        }
      >
        {/* Subtle Ambient Mesh Gradient Blob Motion in Header (10%-15% opacity, pointer-events-none) */}
        <div
          aria-hidden="true"
          className="svh-header-mesh-stage pointer-events-none absolute inset-0 overflow-hidden rounded-inherit z-0"
        >
          <span className="svh-header-mesh-blob svh-header-mesh-blob-rose" />
          <span className="svh-header-mesh-blob svh-header-mesh-blob-gold" />
        </div>

        {/* 1. LEFT CONTAINER (brand-section): Logo + "Study Vault Hub" + "Developed by Soumyadip Rana" */}
        <div
          className={`brand-section relative z-10 flex items-center gap-2 min-w-0 mr-1 sm:mr-1.5 ${
            showApkDesktopNav ? 'flex-1 sm:flex-initial sm:shrink-0' : 'flex-1 md:flex-initial md:shrink-0'
          }`}
        >
          <button
            type="button"
            onClick={() => scheduleRafAction(() => onNavigate('home'))}
            className={`flex items-center gap-2 sm:gap-2.5 text-left group focus:outline-none min-w-0 ${
              showApkDesktopNav ? 'flex-1 sm:flex-initial' : 'flex-1 md:flex-initial'
            }`}
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0 aspect-square">
              <img
                src={APP_LOGO}
                alt="Study Vault Hub"
                width={40}
                height={40}
                decoding="async"
                className="w-full h-full rounded-full object-contain aspect-square"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="flex flex-col justify-center flex-1 min-w-0">
              <span className="font-display text-xs sm:text-sm lg:text-base font-bold tracking-tight text-[#fbf9f4] group-hover:text-[#d4af37] transition-colors leading-[1.2] truncate block">
                Study Vault Hub
              </span>
              <span className="hidden min-[380px]:block sm:block text-[9px] sm:text-[10px] text-[#cbd5e1]/90 font-mono tracking-tight leading-[1.2] mt-0.5 truncate">
                Developed by <span className="text-[#d4af37]/95 font-semibold">Soumyadip Rana</span>
              </span>
            </div>
          </button>
        </div>

        {/* 2. CENTER CONTAINER (nav-links): Inertial Smooth Fluid Pill Tab */}
        <div
          ref={navLinksRef}
          className={`nav-links relative z-10 ${
            showApkDesktopNav
              ? 'hidden sm:flex flex-1 items-center justify-start gap-1 md:gap-1.5 lg:gap-2.5 text-[11px] sm:text-xs lg:text-sm font-semibold overflow-x-auto no-scrollbar min-w-0 px-1.5 py-0.5'
              : 'hidden md:flex flex-1 items-center justify-start gap-1.5 md:gap-2 lg:gap-3 text-xs lg:text-sm font-semibold overflow-x-auto no-scrollbar min-w-0 px-1.5 py-0.5'
          }`}
        >
          {/* Inertial Smooth Fluid Pill Indicator (cubic-bezier(0.16, 1, 0.3, 1)) */}
          {pillMetrics.visible && (
            <span
              aria-hidden="true"
              style={{
                width: `${pillMetrics.width}px`,
                height: `${Math.max(34, pillMetrics.height - 8)}px`,
                transform: `translate3d(${pillMetrics.x}px, ${pillMetrics.y + 4}px, 0)`,
              }}
              className="svh-inertial-fluid-pill svh-header-nav-fluid-pill"
            />
          )}

          {navItems.map((item, idx) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-svh-fluid-active={isActive ? 'true' : 'false'}
                onClick={() => scheduleRafAction(() => onNavigate(item.id))}
                className={`relative z-10 min-h-[44px] px-2.5 lg:px-3 rounded-xl flex items-center justify-center transition-colors hover:text-[#d4af37] whitespace-nowrap shrink-0 cursor-pointer ${
                  idx === 0 ? 'first:ml-auto' : ''
                } ${idx === navItems.length - 1 ? 'last:mr-auto' : ''} ${
                  isActive ? 'text-[#d4af37] font-bold' : 'text-[#cbd5e1]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* 3. RIGHT CONTAINER (user-actions): Search icon, VP Points badge, Streak badge, User Profile badge */}
        <div className="user-actions relative z-10 flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* 1. Light Pastel Yellow Box: Quick Search */}
          <button
            type="button"
            onClick={() => scheduleRafAction(onOpenSearch)}
            aria-label="Search Vault"
            className="svh-header-box-yellow min-h-[38px] min-w-[38px] sm:min-h-[44px] sm:min-w-[44px] px-2 rounded-xl border border-[#d4af37]/25 bg-[#0f172a] text-[#fbf9f4] hover:text-[#d4af37] hover:border-[#d4af37] flex items-center justify-center transition-colors focus-visible:ring-1 focus-visible:ring-[#d4af37] shrink-0 cursor-pointer"
          >
            <Search className="w-4 h-4 shrink-0" />
          </button>

          {/* 2. Light Pastel Pink Box: VP Points Pill ("0 VP") */}
          <button
            type="button"
            onClick={() =>
              scheduleRafAction(() => {
                setVpPopupTab('vp');
                setIsVpPopupOpen(true);
              })
            }
            className="svh-header-box-pink svh-badge-shimmer min-h-[38px] sm:min-h-[44px] inline-flex w-fit items-center justify-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl border border-[#d4af37]/35 bg-[#0f172a] hover:border-[#d4af37] text-[11px] sm:text-xs font-medium text-[#fbf9f4] shrink-0 whitespace-nowrap transition-colors cursor-pointer"
            title={`${vpPoints} Vault Points (VP) — Click to view Rank & Milestones`}
            aria-haspopup="dialog"
            aria-expanded={isVpPopupOpen && vpPopupTab === 'vp'}
          >
            <Trophy className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
            <RollingVPCounter
              value={vpPoints}
              suffix=" VP"
              className="tabular-nums font-bold text-[#d4af37] whitespace-nowrap"
            />
          </button>

          {/* 3. Light Pastel Green Box: Daily Streak ("0d") */}
          <button
            type="button"
            onClick={() =>
              scheduleRafAction(() => {
                setVpPopupTab('streak');
                setIsVpPopupOpen(true);
              })
            }
            className="svh-header-box-green min-h-[38px] sm:min-h-[44px] inline-flex w-fit items-center justify-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl border border-[#d4af37]/25 bg-[#0f172a] hover:border-[#86efac] text-[11px] sm:text-xs font-medium text-[#fbf9f4] shrink-0 whitespace-nowrap transition-colors cursor-pointer"
            title={`${streakDays} Day Active Streak — Click to view Streak & VP details`}
            aria-haspopup="dialog"
            aria-expanded={isVpPopupOpen && vpPopupTab === 'streak'}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0 svh-live-streak-flame" />
            <span className="tabular-nums font-semibold text-amber-300 whitespace-nowrap">{streakDays}d</span>
          </button>

          <VaultPointsPopup
            isOpen={isVpPopupOpen}
            onClose={handleCloseVpPopup}
            userStats={userStats || INITIAL_USER_STATS}
            initialTab={vpPopupTab}
          />

          {/* 4. Light Pastel Orange Box: Profile Trigger */}
          <button
            type="button"
            onClick={() => scheduleRafAction(() => onNavigate('profile'))}
            aria-label="Student Profile"
            className={`svh-header-box-orange min-h-[38px] min-w-[38px] sm:min-h-[44px] sm:min-w-[44px] py-1.5 px-2 sm:px-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all text-xs shrink-0 whitespace-nowrap max-w-[130px] sm:max-w-[160px] cursor-pointer ${
              activeSection === 'profile'
                ? 'border-[#d4af37] bg-[#d4af37]/20 text-[#fbf9f4] shadow-[0_0_12px_rgba(212,175,55,0.2)]'
                : 'border-[#d4af37]/25 bg-[#0f172a] text-[#cbd5e1] hover:text-[#fbf9f4] hover:border-[#d4af37]'
            }`}
          >
            {userProfilePhotoUrl ? (
              <img
                src={userProfilePhotoUrl}
                alt={userName || 'Student'}
                loading="lazy"
                decoding="async"
                className="w-5 h-5 rounded-full object-cover border border-[#d4af37]/50 shrink-0 aspect-square"
              />
            ) : (
              <User className="w-4 h-4 text-[#d4af37] shrink-0" />
            )}
            <span className="hidden sm:inline max-w-[96px] md:max-w-[116px] truncate leading-tight whitespace-nowrap" title={userName}>
              {userName}
            </span>
          </button>
        </div>
      </nav>
    </header>
  );
});
