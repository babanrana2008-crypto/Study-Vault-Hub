import React from 'react';
import { Home, BookOpen, FileText, CheckCircle2, BarChart3, MessagesSquare, User } from 'lucide-react';
import { ActiveSection } from '../types';

interface BottomNavProps {
  activeSection: ActiveSection;
  onNavigate: (section: ActiveSection) => void;
  isFloatingDock?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = React.memo(
  ({ activeSection, onNavigate, isFloatingDock = false }) => {
    const navItems: {
      id: ActiveSection;
      label: string;
      icon: React.FC<{ className?: string }>;
    }[] = [
      { id: 'home', label: 'Home', icon: Home },
      { id: 'books', label: 'Books', icon: BookOpen },
      { id: 'notes', label: 'Notes', icon: FileText },
      { id: 'practice', label: 'Practice', icon: CheckCircle2 },
      { id: 'tracker', label: 'Tracker', icon: BarChart3 },
      { id: 'community', label: 'Community', icon: MessagesSquare },
      { id: 'profile', label: 'Profile', icon: User },
    ];

    // Floating Navigation Mode:
    // Active when running as Mobile App (Phone Portrait OR Landscape) OR Website in Portrait (Phone Portrait OR Tablet Portrait)
    if (isFloatingDock) {
      return (
        <nav
          aria-label="Bottom Navigation"
          className="fixed bottom-[calc(0.65rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 px-2.5 pointer-events-none"
        >
          <div className="pointer-events-auto grid grid-cols-7 h-16 w-full max-w-md mx-auto px-1 rounded-2xl bg-[#060b18]/95 backdrop-blur-xl border border-[#d4af37]/35 shadow-[0_10px_30px_rgba(0,0,0,0.65),0_0_20px_rgba(212,175,55,0.14)] overflow-hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className="min-h-[44px] min-w-0 w-full px-0.5 flex flex-col items-center justify-center relative transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d4af37]"
                >
                  {/* Subtle top indicator bar on active */}
                  {isActive && (
                    <span className="absolute top-0 w-6 sm:w-8 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent rounded-full" />
                  )}
                  <Icon
                    className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-transform duration-150 ${
                      isActive
                        ? 'text-[#d4af37] scale-110'
                        : 'text-[#9ca3af] hover:text-[#fbf9f4]'
                    }`}
                  />
                  <span
                    className={`text-[9px] sm:text-[10px] font-medium tracking-tight mt-1 truncate max-w-full transition-colors ${
                      isActive ? 'text-[#d4af37] font-bold' : 'text-[#9ca3af]'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      );
    }

    const isNativeAndroid =
      typeof window !== 'undefined' &&
      Boolean(
        (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() ||
          window.navigator.userAgent.includes('Capacitor')
      );

    // In the Android APK, when not in phone portrait mode (i.e. tablet or landscape/desktop-style mode),
    // completely hide the bottom navigation so only the top/desktop navigation is shown.
    if (isNativeAndroid && !isFloatingDock) {
      return null;
    }

    // Website / Browser, Installed Mobile Landscape, Tablet, Desktop = Unchanged
    return (
      <nav
        aria-label="Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 w-full max-w-full bg-[#060b18]/95 backdrop-blur-lg border-t border-[#d4af37]/25 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-7 h-16 w-full max-w-lg mx-auto px-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="min-h-[44px] min-w-0 w-full px-0.5 flex flex-col items-center justify-center relative transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d4af37]"
              >
                {/* Subtle top indicator bar on active */}
                {isActive && (
                  <span className="absolute top-0 w-6 sm:w-8 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent rounded-full" />
                )}
                <Icon
                  className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-transform duration-150 ${
                    isActive
                      ? 'text-[#d4af37] scale-110'
                      : 'text-[#9ca3af] hover:text-[#fbf9f4]'
                  }`}
                />
                <span
                  className={`text-[9px] sm:text-[10px] font-medium tracking-tight mt-1 truncate max-w-full transition-colors ${
                    isActive ? 'text-[#d4af37] font-bold' : 'text-[#9ca3af]'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }
);

