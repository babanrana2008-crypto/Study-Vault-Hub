import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ActiveSection, Book, StudyNote, UserStats, MCQQuestion, PracticeHistoryEntry, ThemePreference } from './types';
import { INITIAL_USER_STATS, SAMPLE_BOOKS, SAMPLE_NOTES, GOAL_SUBJECTS_MAP } from './data/sampleData';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeSection } from './components/HomeSection';
import { BooksSection } from './components/BooksSection';
import { NotesSection } from './components/NotesSection';
import { MCQSection } from './components/MCQSection';
import { TrackerSection } from './components/TrackerSection';
import { CommunitySection } from './components/CommunitySection';
import { ExamPrepSection } from './components/ExamPrepSection';
import { ProfileSection } from './components/ProfileSection';
import { BookReaderModal } from './components/BookReaderModal';
import { NoteViewerModal } from './components/NoteViewerModal';
import { SearchModal } from './components/SearchModal';
import { OnboardingModal } from './components/OnboardingModal';
import { SplashScreen } from './components/SplashScreen';
import { SVHAIFloatingAssistant } from './components/SVHAIFloatingAssistant';
import { FocusModeModal } from './components/FocusModeModal';
import { OwnerAnalyticsModal } from './components/OwnerAnalyticsModal';
import { StudySession } from './types';
import { apiFetch } from './services/nativeApiBridge';
import { computeSmartRevisionSchedule } from './utils/securityAndVp';

const STORAGE_KEY = 'study_vault_hub_data_v3';
const THEME_STORAGE_KEY = 'study_vault_theme_preference_v1';
const IDENTITY_STORAGE_KEY = 'study_vault_community_identity_v1';
const ANON_DEVICE_STORAGE_KEY = 'study_vault_anon_device_id_v1';
const OWNER_TOKEN_STORAGE_KEY = 'study_vault_owner_session_token_v1';

export default function App() {
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [activeSection, setActiveSection] = useState<ActiveSection>('home');
  const [practiceInitialSubject, setPracticeInitialSubject] = useState<string>('All');
  const [practiceInitialChapter, setPracticeInitialChapter] = useState<string | undefined>(undefined);
  const [practiceInitialClassLevel, setPracticeInitialClassLevel] = useState<string | undefined>(undefined);

  // Modals state
  const [readingBook, setReadingBook] = useState<Book | null>(null);
  const [viewingNote, setViewingNote] = useState<StudyNote | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isFocusModeOpen, setIsFocusModeOpen] = useState<boolean>(false);
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState<boolean>(false);
  const [isOwnerAuthenticated, setIsOwnerAuthenticated] = useState<boolean>(false);
  const [authModalConfig, setAuthModalConfig] = useState<{
    isOpen: boolean;
    mode: 'register' | 'login';
  }>({ isOpen: false, mode: 'register' });

  // User stats & robust local + backend persistence
  const [userStats, setUserStats] = useState<UserStats>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_USER_STATS,
          ...parsed,
          dailyGoals: {
            ...INITIAL_USER_STATS.dailyGoals,
            ...(parsed.dailyGoals || {})
          },
          subjectsStudied: {
            ...INITIAL_USER_STATS.subjectsStudied,
            ...(parsed.subjectsStudied || {})
          }
        };
      }
      return INITIAL_USER_STATS;
    } catch {
      return INITIAL_USER_STATS;
    }
  });

  // Verify streak validity on session open (never invent a streak for a new user with no activity)
  useEffect(() => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const lastDate = userStats.streak?.lastActiveDate;

      if (lastDate && lastDate !== today) {
        const lastDateTime = new Date(lastDate).getTime();
        const todayTime = new Date(today).getTime();
        const diffDays = Math.round((todayTime - lastDateTime) / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
          setUserStats((prev) => ({
            ...prev,
            streak: {
              current: 0,
              lastActiveDate: prev.streak?.lastActiveDate || ''
            }
          }));
        }
      }
    } catch {
      // Fallback
    }
  }, []);

  // Write changes to localStorage AND sync to backend account whenever userStats changes (non-blocking)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userStats));
      } catch {
        // Ignore write errors
      }

      // Sync to backend account if authenticated
      try {
        const rawId = localStorage.getItem(IDENTITY_STORAGE_KEY);
        if (rawId) {
          const parsedId = JSON.parse(rawId);
          if (parsedId?.authToken && userStats.hasCompletedSetup) {
            apiFetch('/api/auth/sync', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${parsedId.authToken}`,
              },
              body: JSON.stringify({ userStats }),
            }).catch(() => {
              // ignore transient sync error
            });
          }
        }
      } catch {
        // ignore
      }
    }, 180);
    return () => clearTimeout(timeoutId);
  }, [userStats]);

  // Global Theme Preference ('light' | 'dark' | 'system') & System Default Listener
  // New users with no saved preference always start in finalized Light Mode
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
        return savedTheme;
      }
      if (
        userStats.themePreference === 'light' ||
        userStats.themePreference === 'dark' ||
        userStats.themePreference === 'system'
      ) {
        return userStats.themePreference;
      }
      return 'light';
    } catch {
      return 'light';
    }
  });

  // Record real app open session, restore remote account data if signed in, & verify Owner session token on startup
  useEffect(() => {
    let isCancelled = false;

    const recordAppSessionAndCheckOwner = async () => {
      try {
        let anonDeviceId = localStorage.getItem(ANON_DEVICE_STORAGE_KEY);
        if (!anonDeviceId) {
          anonDeviceId = `dev_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
          localStorage.setItem(ANON_DEVICE_STORAGE_KEY, anonDeviceId);
        }

        let storedIdentity: { userId?: string; authToken?: string } | null = null;
        const rawId = localStorage.getItem(IDENTITY_STORAGE_KEY);
        if (rawId) {
          storedIdentity = JSON.parse(rawId);
        }

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (storedIdentity?.authToken) {
          headers.Authorization = `Bearer ${storedIdentity.authToken}`;
        }

        // 1. If user has a saved authToken, restore their authoritative cross-device account data & server-verified role
        if (storedIdentity?.authToken) {
          try {
            const meRes = await apiFetch('/api/auth/me', {
              headers: {
                Authorization: `Bearer ${storedIdentity.authToken}`,
              },
            });
            if (meRes.ok && !isCancelled) {
              const meData = await meRes.json();
              const verifiedOwner = Boolean(meData?.role === 'owner' || meData?.isOwner);
              setIsOwnerAuthenticated(verifiedOwner);
              if (verifiedOwner && storedIdentity.authToken) {
                try {
                  localStorage.setItem(OWNER_TOKEN_STORAGE_KEY, storedIdentity.authToken);
                } catch {
                  // ignore
                }
              } else {
                try {
                  localStorage.removeItem(OWNER_TOKEN_STORAGE_KEY);
                } catch {
                  // ignore
                }
              }

              if (meData?.userStats && typeof meData.userStats === 'object') {
                const remoteStats = meData.userStats;
                setUserStats((prev) => {
                  const hasRemoteSetup = Boolean(remoteStats.hasCompletedSetup);
                  return {
                    ...INITIAL_USER_STATS,
                    ...prev,
                    ...(hasRemoteSetup ? remoteStats : {}),
                    userId: meData.userId || prev.userId,
                    username: meData.username || prev.username,
                    role: verifiedOwner ? 'owner' : 'student',
                    name: meData.displayName || remoteStats.name || prev.name,
                    profilePhotoUrl:
                      meData.profilePhotoUrl !== undefined
                        ? meData.profilePhotoUrl
                        : prev.profilePhotoUrl,
                    svhAiButtonPosition:
                      meData.svhAiButtonPosition !== undefined
                        ? meData.svhAiButtonPosition
                        : prev.svhAiButtonPosition,
                  };
                });
                if (
                  remoteStats.themePreference === 'light' ||
                  remoteStats.themePreference === 'dark' ||
                  remoteStats.themePreference === 'system'
                ) {
                  setThemePreference(remoteStats.themePreference);
                  try {
                    localStorage.setItem(THEME_STORAGE_KEY, remoteStats.themePreference);
                  } catch {
                    // ignore
                  }
                }
              }
            } else if (meRes.status === 401 && !isCancelled) {
              setIsOwnerAuthenticated(false);
            }
          } catch {
            // ignore offline error
          }
        } else {
          setIsOwnerAuthenticated(false);
        }

        const res = await apiFetch('/api/telemetry/session', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            deviceId: anonDeviceId,
            displayName: userStats.name || 'Student',
          }),
        });

        if (res.ok && !isCancelled) {
          const data = await res.json();
          if (data.userId && (data.authToken || storedIdentity?.authToken)) {
            localStorage.setItem(
              IDENTITY_STORAGE_KEY,
              JSON.stringify({
                userId: data.userId,
                authToken: data.authToken || storedIdentity?.authToken,
              })
            );
          }
        }
      } catch {
        // ignore network error
      }

      // Verify Owner token ONLY if an Owner session token exists locally
      try {
        const savedOwnerToken = localStorage.getItem(OWNER_TOKEN_STORAGE_KEY);
        if (savedOwnerToken) {
          const ownerRes = await apiFetch('/api/owner/auth/status', {
            headers: {
              'X-Owner-Authorization': `Bearer ${savedOwnerToken}`,
            },
          });
          if (ownerRes.ok && !isCancelled) {
            const ownerData = await ownerRes.json();
            setIsOwnerAuthenticated(Boolean(ownerData.isOwnerAuthenticated));
          }
        }
      } catch {
        // ignore
      }
    };

    recordAppSessionAndCheckOwner();

    return () => {
      isCancelled = true;
    };
  }, []);

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const resolvedTheme: 'light' | 'dark' = useMemo(() => {
    if (themePreference === 'system') {
      return systemPrefersDark ? 'dark' : 'light';
    }
    return themePreference;
  }, [themePreference, systemPrefersDark]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  // FINAL NAVIGATION LOGIC FOR BOTTOM NAVIGATION:
  // A. MOBILE APP (Phone Portrait OR Phone Landscape) -> ALWAYS FLOATING (Native APK: Phone Portrait only; Tablet/Landscape uses top navigation)
  // B. WEBSITE IN PORTRAIT (Phone Portrait OR Tablet Portrait) -> FLOATING
  // C. WEBSITE IN DESKTOP-STYLE LANDSCAPE (Tablet Landscape, Laptop, Desktop) -> EXISTING NAVIGATION
  const [isFloatingBottomNav, setIsFloatingBottomNav] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const isNativeAndroid = Boolean(
        (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() ||
          window.navigator.userAgent.includes('Capacitor')
      );
      const isInstalledApp =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');

      const isPortrait =
        window.matchMedia('(orientation: portrait)').matches ||
        window.innerHeight > window.innerWidth;

      const ua = window.navigator.userAgent || '';
      const isTabletUA =
        /iPad|Tablet|PlayBook|Silk/i.test(ua) ||
        (/Android/i.test(ua) && !/Mobile/i.test(ua)) ||
        (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
      const isPhoneUA = /iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry|IEMobile|Opera Mini/i.test(
        ua
      );
      const isCoarsePointer =
        window.matchMedia('(pointer: coarse)').matches ||
        window.matchMedia('(hover: none)').matches;

      const minDim = Math.min(window.innerWidth, window.innerHeight);
      const isMobilePhone = isPhoneUA || (!isTabletUA && minDim < 768);
      const isPhoneOrTabletContext =
        isMobilePhone || isTabletUA || isCoarsePointer || window.innerWidth <= 1024;

      // Native Android APK: show floating bottom nav ONLY in phone portrait mode;
      // on tablets or in landscape/desktop-style mode, hide bottom nav so only top navigation appears.
      if (isNativeAndroid) {
        return Boolean(isPortrait && !isTabletUA && window.innerWidth < 768);
      }

      // A. Mobile App on a phone (web PWA) -> ALWAYS floating (both portrait and landscape)
      if (isInstalledApp && isMobilePhone) {
        return true;
      }

      // B. Website/App in Portrait on phone or tablet -> Floating
      if (isPortrait && isPhoneOrTabletContext) {
        return true;
      }

      // C. Website in desktop-style landscape -> Existing navigation
      return false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId: number | null = null;
    const evaluateFloatingBottomNav = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        try {
          const isNativeAndroid = Boolean(
            (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() ||
              window.navigator.userAgent.includes('Capacitor')
          );
          const isInstalledApp =
            window.matchMedia('(display-mode: standalone)').matches ||
            window.matchMedia('(display-mode: fullscreen)').matches ||
            window.matchMedia('(display-mode: minimal-ui)').matches ||
            (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
            document.referrer.includes('android-app://');

          const isPortrait =
            window.matchMedia('(orientation: portrait)').matches ||
            window.innerHeight > window.innerWidth;

          const ua = window.navigator.userAgent || '';
          const isTabletUA =
            /iPad|Tablet|PlayBook|Silk/i.test(ua) ||
            (/Android/i.test(ua) && !/Mobile/i.test(ua)) ||
            (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
          const isPhoneUA =
            /iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry|IEMobile|Opera Mini/i.test(ua);
          const isCoarsePointer =
            window.matchMedia('(pointer: coarse)').matches ||
            window.matchMedia('(hover: none)').matches;

          const minDim = Math.min(window.innerWidth, window.innerHeight);
          const isMobilePhone = isPhoneUA || (!isTabletUA && minDim < 768);
          const isPhoneOrTabletContext =
            isMobilePhone || isTabletUA || isCoarsePointer || window.innerWidth <= 1024;

          const shouldFloat = isNativeAndroid
            ? Boolean(isPortrait && !isTabletUA && window.innerWidth < 768)
            : Boolean(
                (isInstalledApp && isMobilePhone) || (isPortrait && isPhoneOrTabletContext)
              );

          setIsFloatingBottomNav((prev) => (prev === shouldFloat ? prev : shouldFloat));
        } catch {
          setIsFloatingBottomNav(false);
        }
      });
    };

    evaluateFloatingBottomNav();

    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    const portraitQuery = window.matchMedia('(orientation: portrait)');

    standaloneQuery.addEventListener?.('change', evaluateFloatingBottomNav);
    portraitQuery.addEventListener?.('change', evaluateFloatingBottomNav);
    window.addEventListener('resize', evaluateFloatingBottomNav, { passive: true });
    window.addEventListener('orientationchange', evaluateFloatingBottomNav, { passive: true });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      standaloneQuery.removeEventListener?.('change', evaluateFloatingBottomNav);
      portraitQuery.removeEventListener?.('change', evaluateFloatingBottomNav);
      window.removeEventListener('resize', evaluateFloatingBottomNav);
      window.removeEventListener('orientationchange', evaluateFloatingBottomNav);
    };
  }, []);

  // Detect Phone/Tablet PORTRAIT mode for the Floating Top Navigation (orientation-based, excludes desktop/laptop)
  const [isMobileOrTabletPortrait, setIsMobileOrTabletPortrait] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const isPortrait =
        window.matchMedia('(orientation: portrait)').matches ||
        window.innerHeight > window.innerWidth;
      if (!isPortrait) return false;

      const isNativeAndroid = Boolean(
        (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() ||
          window.navigator.userAgent.includes('Capacitor')
      );
      const ua = window.navigator.userAgent || '';
      const isTabletUA =
        /iPad|Tablet|PlayBook|Silk/i.test(ua) ||
        (/Android/i.test(ua) && !/Mobile/i.test(ua)) ||
        (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
      const isMobileOrTabletUA =
        isNativeAndroid ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|PlayBook|Silk/i.test(ua) ||
        (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
      const isCoarsePointer =
        window.matchMedia('(pointer: coarse)').matches ||
        window.matchMedia('(hover: none)').matches;
      const isMobileOrTabletViewport = window.innerWidth <= 1024;

      if (isNativeAndroid) {
        return Boolean(isPortrait && !isTabletUA && window.innerWidth < 768);
      }

      return isPortrait && (isMobileOrTabletUA || isCoarsePointer || isMobileOrTabletViewport);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId: number | null = null;
    const evaluateMobileOrTabletPortrait = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        try {
          const isPortrait =
            window.matchMedia('(orientation: portrait)').matches ||
            window.innerHeight > window.innerWidth;
          if (!isPortrait) {
            setIsMobileOrTabletPortrait((prev) => (prev === false ? prev : false));
            return;
          }

          const isNativeAndroid = Boolean(
            (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() ||
              window.navigator.userAgent.includes('Capacitor')
          );
          const ua = window.navigator.userAgent || '';
          const isTabletUA =
            /iPad|Tablet|PlayBook|Silk/i.test(ua) ||
            (/Android/i.test(ua) && !/Mobile/i.test(ua)) ||
            (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
          const isMobileOrTabletUA =
            isNativeAndroid ||
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|PlayBook|Silk/i.test(ua) ||
            (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
          const isCoarsePointer =
            window.matchMedia('(pointer: coarse)').matches ||
            window.matchMedia('(hover: none)').matches;
          const isMobileOrTabletViewport = window.innerWidth <= 1024;

          const nextVal = isNativeAndroid
            ? Boolean(isPortrait && !isTabletUA && window.innerWidth < 768)
            : Boolean(
                isPortrait && (isMobileOrTabletUA || isCoarsePointer || isMobileOrTabletViewport)
              );
          setIsMobileOrTabletPortrait((prev) => (prev === nextVal ? prev : nextVal));
        } catch {
          setIsMobileOrTabletPortrait(false);
        }
      });
    };

    evaluateMobileOrTabletPortrait();

    const portraitQuery = window.matchMedia('(orientation: portrait)');
    portraitQuery.addEventListener?.('change', evaluateMobileOrTabletPortrait);
    window.addEventListener('resize', evaluateMobileOrTabletPortrait, { passive: true });
    window.addEventListener('orientationchange', evaluateMobileOrTabletPortrait, { passive: true });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      portraitQuery.removeEventListener?.('change', evaluateMobileOrTabletPortrait);
      window.removeEventListener('resize', evaluateMobileOrTabletPortrait);
      window.removeEventListener('orientationchange', evaluateMobileOrTabletPortrait);
    };
  }, []);

  const handleChangeTheme = useCallback((newTheme: ThemePreference) => {
    setThemePreference(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // ignore storage errors
    }
    setUserStats((prev) => ({
      ...prev,
      themePreference: newTheme,
    }));
  }, []);

  const handleUpdateStats = useCallback((newPartial: Partial<UserStats>) => {
    setUserStats((prev) => ({
      ...prev,
      ...newPartial
    }));
  }, []);

  // Active Goal & Subjects computation
  const activeGoal = useMemo(() => {
    if (userStats.activeGoal && userStats.selectedGoals.includes(userStats.activeGoal)) {
      return userStats.activeGoal;
    }
    return userStats.selectedGoals[0] || 'General Study';
  }, [userStats.activeGoal, userStats.selectedGoals]);

  const activeSubjects = useMemo(() => {
    return GOAL_SUBJECTS_MAP[activeGoal] || ['General Studies', 'Core Sciences', 'Mathematics'];
  }, [activeGoal]);

  const handleSelectActiveGoal = useCallback((goal: string) => {
    setUserStats((prev) => ({
      ...prev,
      activeGoal: goal
    }));
  }, []);

  // Vault Points (VP) Reward Animation Toast & Idempotent Backend Grant Engine
  const [vpRewardToast, setVpRewardToast] = useState<{ id: string; text: string } | null>(null);
  const vpToastTimerRef = useRef<number | null>(null);
  const awardedGrantKeysRef = useRef<Set<string>>(new Set());

  const showVpRewardToast = useCallback((text: string) => {
    if (vpToastTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(vpToastTimerRef.current);
    }
    setVpRewardToast({ id: `vptoast_${Date.now()}_${Math.random()}`, text });
    if (typeof window !== 'undefined') {
      vpToastTimerRef.current = window.setTimeout(() => {
        setVpRewardToast(null);
      }, 3200);
    }
  }, []);

  const awardBackendVaultPoints = useCallback(
    async (params: {
      grantKey: string;
      category:
        | 'question'
        | 'focus_session'
        | 'exam_bonus_5q'
        | 'exam_bonus_20q'
        | 'daily_usage';
      questionId?: string;
      sessionId?: string;
      durationMinutes?: number;
      subject?: string;
      topic?: string;
      relatedId?: string;
    }) => {
      const cleanKey = params.grantKey.trim();
      if (!cleanKey || awardedGrantKeysRef.current.has(cleanKey)) {
        return;
      }
      awardedGrantKeysRef.current.add(cleanKey);

      try {
        let authToken = '';
        let userId = '';
        try {
          const rawId = localStorage.getItem(IDENTITY_STORAGE_KEY);
          if (rawId) {
            const parsedId = JSON.parse(rawId);
            authToken = parsedId?.authToken || '';
            userId = parsedId?.userId || '';
          }
        } catch {
          // ignore
        }

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (authToken) {
          headers.Authorization = `Bearer ${authToken}`;
        }

        const res = await apiFetch('/api/vp/award', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ...params,
            userId: userId || 'usr_local',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (!data.duplicate && Number(data.totalAwardedVp) > 0) {
            if (params.category === 'question') {
              showVpRewardToast(`+${data.awardedVp || 1} VP`);
            } else if (Number(data.bonusVp) > 0) {
              showVpRewardToast(`+${data.bonusVp} VP 60m Focus!`);
            } else if (Number(data.awardedVp) > 0) {
              showVpRewardToast(`+${data.awardedVp} VP`);
            }
          }
          if (typeof data.vaultPoints === 'number') {
            setUserStats((prev) => ({
              ...prev,
              vaultPoints: data.vaultPoints,
              questionVp:
                typeof data.questionVp === 'number' ? data.questionVp : prev.questionVp,
              focusMinuteVp:
                typeof data.focusMinuteVp === 'number'
                  ? data.focusMinuteVp
                  : prev.focusMinuteVp,
              focusBonusVp:
                typeof data.focusBonusVp === 'number'
                  ? data.focusBonusVp
                  : prev.focusBonusVp,
              sixtyMinBonusCount:
                typeof data.sixtyMinBonusCount === 'number'
                  ? data.sixtyMinBonusCount
                  : prev.sixtyMinBonusCount,
              vpTransactions: Array.isArray(data.vpTransactions)
                ? data.vpTransactions
                : prev.vpTransactions,
            }));
          }
        }
      } catch {
        // Fallback local VP calculation
      }
    },
    [showVpRewardToast]
  );

  // Verify achievements with backend whenever real activity metrics change
  useEffect(() => {
    const hasActivity =
      (userStats.questionsAttempted || 0) > 0 ||
      (userStats.totalStudyMinutes || 0) > 0 ||
      (userStats.studySessions?.length || 0) > 0 ||
      (userStats.vaultPoints || 0) > 0 ||
      (userStats.streak?.current || 0) > 0;
    if (!hasActivity) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        let authToken = '';
        try {
          const rawId = localStorage.getItem(IDENTITY_STORAGE_KEY);
          if (rawId) {
            const parsed = JSON.parse(rawId);
            authToken = parsed?.authToken || '';
          }
        } catch {
          // ignore
        }
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (authToken) headers.Authorization = `Bearer ${authToken}`;

        const res = await apiFetch('/api/achievements/verify', {
          method: 'POST',
          headers,
          body: JSON.stringify({ userStats }),
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data.unlockedAchievements && typeof data.unlockedAchievements === 'object') {
            setUserStats((prev) => {
              const prevKeys = Object.keys(prev.unlockedAchievements || {});
              const nextKeys = Object.keys(data.unlockedAchievements);
              if (
                prevKeys.length === nextKeys.length &&
                nextKeys.every((k) => Boolean(prev.unlockedAchievements?.[k]))
              ) {
                return prev;
              }
              return {
                ...prev,
                unlockedAchievements: {
                  ...(prev.unlockedAchievements || {}),
                  ...data.unlockedAchievements,
                },
              };
            });
          }
        }
      } catch {
        // ignore network error
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    userStats.questionsAttempted,
    userStats.totalStudyMinutes,
    userStats.vaultPoints,
    userStats.streak?.current,
    userStats.studySessions?.length,
  ]);

  const handleRecordSingleQuestion = useCallback(
    (isCorrect: boolean, question: MCQQuestion, chapterId?: string) => {
      const today = new Date().toISOString().split('T')[0];
      const grantKey = `vp_q_${question.id}_${today}`;
      const isAlreadyAwarded = awardedGrantKeysRef.current.has(grantKey);

      if (!isAlreadyAwarded) {
        showVpRewardToast('+1 VP');
        void awardBackendVaultPoints({
          grantKey,
          category: 'question',
          questionId: question.id,
          subject: question.subject,
          topic: question.topic,
        });
        const dailyKey = `vp_daily_usage_${today}`;
        if (!awardedGrantKeysRef.current.has(dailyKey)) {
          void awardBackendVaultPoints({
            grantKey: dailyKey,
            category: 'daily_usage',
            relatedId: today,
          });
        }
      }

      setUserStats((prev) => {
        const existingTxs = Array.isArray(prev.vpTransactions) ? prev.vpTransactions : [];
        const safeId = grantKey.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 150);
        if (isAlreadyAwarded || existingTxs.some((tx) => tx.id === safeId)) {
          return prev;
        }

        const newAttempted = prev.questionsAttempted + 1;
        const newCorrect = prev.correctAnswers + (isCorrect ? 1 : 0);
        const newIncorrect = prev.incorrectAnswers + (isCorrect ? 0 : 1);

        let milestoneBonus = 0;
        if (newAttempted === 5) {
          milestoneBonus += 10;
          void awardBackendVaultPoints({
            grantKey: `vp_exam_milestone_5q`,
            category: 'exam_bonus_5q',
            relatedId: 'exam_milestone_5q',
          });
          showVpRewardToast('+1 VP & +10 VP 5-Question Bonus!');
        } else if (newAttempted === 20) {
          milestoneBonus += 40;
          void awardBackendVaultPoints({
            grantKey: `vp_exam_milestone_20q`,
            category: 'exam_bonus_20q',
            relatedId: 'exam_milestone_20q',
          });
          showVpRewardToast('+1 VP & +40 VP 20-Question Bonus!');
        }

        const topicList = prev.topicsStudied.includes(question.topic)
          ? prev.topicsStudied
          : [question.topic, ...prev.topicsStudied];
        const seenList = Array.isArray(prev.seenQuestionIds)
          ? prev.seenQuestionIds.includes(question.id)
            ? prev.seenQuestionIds
            : [...prev.seenQuestionIds, question.id]
          : [question.id];

        // Update real chapter progress if chapterId is present
        const currentChapterProgress = prev.chapterProgress || {};
        const prevChap = currentChapterProgress[chapterId || ''] || {
          completed: false,
          questionsSolved: 0,
          accuracy: 0,
        };
        const updatedSolved = prevChap.questionsSolved + 1;
        const updatedAccuracy = Math.round(
          (((prevChap.accuracy * prevChap.questionsSolved) / 100 + (isCorrect ? 1 : 0)) /
            updatedSolved) *
            100
        );

        const updatedProgress = chapterId
          ? {
              ...currentChapterProgress,
              [chapterId]: {
                completed: updatedSolved >= 3,
                questionsSolved: updatedSolved,
                accuracy: updatedAccuracy,
              },
            }
          : currentChapterProgress;

        // Real subjectPerformance tracking
        const prevSubjPerf = prev.subjectPerformance?.[question.subject] || {
          attempted: 0,
          correct: 0,
          accuracy: 0,
        };
        const nextSubjAttempted = prevSubjPerf.attempted + 1;
        const nextSubjCorrect = prevSubjPerf.correct + (isCorrect ? 1 : 0);
        const updatedSubjectPerformance = {
          ...(prev.subjectPerformance || {}),
          [question.subject]: {
            attempted: nextSubjAttempted,
            correct: nextSubjCorrect,
            accuracy: Math.round((nextSubjCorrect / nextSubjAttempted) * 100),
          },
        };

        // Real topicPerformance tracking
        const prevTopicPerf = prev.topicPerformance?.[question.topic] || {
          attempted: 0,
          correct: 0,
          accuracy: 0,
        };
        const nextTopicAttempted = prevTopicPerf.attempted + 1;
        const nextTopicCorrect = prevTopicPerf.correct + (isCorrect ? 1 : 0);
        const updatedTopicPerformance = {
          ...(prev.topicPerformance || {}),
          [question.topic]: {
            attempted: nextTopicAttempted,
            correct: nextTopicCorrect,
            accuracy: Math.round((nextTopicCorrect / nextTopicAttempted) * 100),
          },
        };

        // Real dailyActivity tracking (+2 VP qualifying daily usage on first activity of the day)
        const prevDay = prev.dailyActivity?.[today] || {
          questionsSolved: 0,
          studyMinutes: 0,
          vpEarned: 0,
        };
        const isFirstActivityToday =
          prevDay.questionsSolved === 0 && prevDay.studyMinutes === 0;
        const dailyUsageBonus = isFirstActivityToday ? 2 : 0;
        const totalQuestionDeltaVp = 1 + milestoneBonus + dailyUsageBonus;

        const updatedDailyActivity = {
          ...(prev.dailyActivity || {}),
          [today]: {
            questionsSolved: prevDay.questionsSolved + 1,
            studyMinutes: prevDay.studyMinutes,
            vpEarned: (prevDay.vpEarned || 0) + totalQuestionDeltaVp,
          },
        };

        // Real recentMistakes tracking (deduplicated)
        const prevMistakes = Array.isArray(prev.recentMistakes) ? prev.recentMistakes : [];
        const updatedMistakes = !isCorrect
          ? [
              {
                id: question.id,
                question: question.question,
                subject: question.subject,
                topic: question.topic,
                date: today,
              },
              ...prevMistakes.filter((m) => m.id !== question.id),
            ].slice(0, 50)
          : prevMistakes;

        const prevStreak = prev.streak?.current || 0;
        const prevLastDate = prev.streak?.lastActiveDate || '';
        let nextStreak = prevStreak;
        if (prevLastDate !== today) {
          const diff = prevLastDate
            ? Math.round(
                (new Date(today).getTime() - new Date(prevLastDate).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : 0;
          nextStreak = diff === 1 ? prevStreak + 1 : 1;
        } else if (nextStreak === 0) {
          nextStreak = 1;
        }

        const nextState: UserStats = {
          ...prev,
          questionsAttempted: newAttempted,
          correctAnswers: newCorrect,
          incorrectAnswers: newIncorrect,
          vaultPoints: (prev.vaultPoints || 0) + totalQuestionDeltaVp,
          questionVp: (prev.questionVp || 0) + 1,
          topicsStudied: topicList,
          seenQuestionIds: seenList,
          chapterProgress: updatedProgress,
          subjectPerformance: updatedSubjectPerformance,
          topicPerformance: updatedTopicPerformance,
          dailyActivity: updatedDailyActivity,
          recentMistakes: updatedMistakes,
          streak: {
            current: nextStreak,
            lastActiveDate: today,
          },
        };
        nextState.revisionSchedule = computeSmartRevisionSchedule(nextState);
        return nextState;
      });
    },
    [awardBackendVaultPoints, showVpRewardToast]
  );

  // Record a completed timed test sprint
  const handleRecordTestCompleted = useCallback(
    (entry: PracticeHistoryEntry) => {
      const today = new Date().toISOString().split('T')[0];
      const baseVp = Math.max(0, entry.totalQuestions * 1);
      const grantKey = `vp_test_${entry.id}`;
      setUserStats((prev) => {
        const prevAttempted = prev.questionsAttempted || 0;
        const newAttempted = prevAttempted + entry.totalQuestions;
        let milestoneVp = 0;
        if (prevAttempted < 5 && newAttempted >= 5) {
          milestoneVp += 10;
          void awardBackendVaultPoints({
            grantKey: `vp_exam_milestone_5q`,
            category: 'exam_bonus_5q',
            relatedId: 'exam_milestone_5q',
          });
        }
        if (prevAttempted < 20 && newAttempted >= 20) {
          milestoneVp += 40;
          void awardBackendVaultPoints({
            grantKey: `vp_exam_milestone_20q`,
            category: 'exam_bonus_20q',
            relatedId: 'exam_milestone_20q',
          });
        }
        const prevDay = prev.dailyActivity?.[today] || {
          questionsSolved: 0,
          studyMinutes: 0,
          vpEarned: 0,
        };
        const isFirstActivityToday =
          prevDay.questionsSolved === 0 && prevDay.studyMinutes === 0;
        const dailyBonus = isFirstActivityToday ? 2 : 0;
        const earnedVp = baseVp + milestoneVp + dailyBonus;

        if (earnedVp > 0 && !awardedGrantKeysRef.current.has(grantKey)) {
          showVpRewardToast(`+${earnedVp} VP`);
        }

        const updatedDailyActivity = {
          ...(prev.dailyActivity || {}),
          [today]: {
            questionsSolved: prevDay.questionsSolved + entry.totalQuestions,
            studyMinutes: prevDay.studyMinutes,
            vpEarned: (prevDay.vpEarned || 0) + earnedVp,
          },
        };
        const nextState: UserStats = {
          ...prev,
          questionsAttempted: newAttempted,
          correctAnswers: prev.correctAnswers + entry.correctCount,
          incorrectAnswers: prev.incorrectAnswers + entry.wrongCount,
          vaultPoints: (prev.vaultPoints || 0) + earnedVp,
          questionVp: (prev.questionVp || 0) + baseVp,
          dailyActivity: updatedDailyActivity,
          practiceHistory: [{ ...entry, vpEarned: earnedVp }, ...prev.practiceHistory],
          streak: {
            current: Math.max(1, prev.streak?.current || 0),
            lastActiveDate: today,
          },
        };
        nextState.revisionSchedule = computeSmartRevisionSchedule(nextState);
        return nextState;
      });
    },
    [awardBackendVaultPoints, showVpRewardToast]
  );

  // Save a real study focus session from FocusModeModal & award +20 VP for completed 60-minute Focus Study (+2 VP daily usage if first activity)
  const handleSaveRealFocusSession = useCallback(
    (session: StudySession, completedTaskId?: string) => {
      const today = new Date().toISOString().split('T')[0];
      const mins = Math.max(0, Math.floor(Number(session.durationMinutes) || 0));
      const minuteVp = 0;
      const bonusVp = mins >= 60 ? Math.floor(mins / 60) * 20 : 0;
      const totalSessionVp = minuteVp + bonusVp;
      const grantKey = `vp_focus_${session.id}`;

      if (mins > 0 && !awardedGrantKeysRef.current.has(grantKey)) {
        if (bonusVp > 0) {
          showVpRewardToast(`+${bonusVp} VP 60m Focus Study!`);
          void awardBackendVaultPoints({
            grantKey,
            category: 'focus_session',
            sessionId: session.id,
            durationMinutes: mins,
            subject: session.subject,
            topic: session.topic,
          });
        }
        const dailyKey = `vp_daily_usage_${today}`;
        if (!awardedGrantKeysRef.current.has(dailyKey)) {
          void awardBackendVaultPoints({
            grantKey: dailyKey,
            category: 'daily_usage',
            relatedId: today,
          });
        }
      }

      setUserStats((prev) => {
        if (prev.studySessions.some((s) => s.id === session.id)) {
          return prev;
        }
        const updatedTotalMin = prev.totalStudyMinutes + mins;
        const currentSubjectMin = prev.subjectsStudied[session.subject] || 0;
        const updatedSubjectsStudied = {
          ...prev.subjectsStudied,
          [session.subject]: currentSubjectMin + mins,
        };
        const updatedTopics = prev.topicsStudied.includes(session.topic)
          ? prev.topicsStudied
          : [session.topic, ...prev.topicsStudied];
        const updatedTasks = completedTaskId
          ? prev.tasks.map((t) => (t.id === completedTaskId ? { ...t, completed: true } : t))
          : prev.tasks;

        const prevDay = prev.dailyActivity?.[today] || {
          questionsSolved: 0,
          studyMinutes: 0,
          vpEarned: 0,
        };
        const updatedDailyActivity = {
          ...(prev.dailyActivity || {}),
          [today]: {
            questionsSolved: prevDay.questionsSolved,
            studyMinutes: prevDay.studyMinutes + mins,
            vpEarned: (prevDay.vpEarned || 0) + totalSessionVp,
          },
        };

        const prevStreak = prev.streak?.current || 0;
        const prevLastDate = prev.streak?.lastActiveDate || '';
        let nextStreak = prevStreak;
        if (prevLastDate !== today) {
          const diff = prevLastDate
            ? Math.round(
                (new Date(today).getTime() - new Date(prevLastDate).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : 0;
          nextStreak = diff === 1 ? prevStreak + 1 : 1;
        } else if (nextStreak === 0) {
          nextStreak = 1;
        }

        const enrichedSession: StudySession = {
          ...session,
          durationMinutes: mins,
          vpEarned: totalSessionVp,
          bonusVpEarned: bonusVp,
        };

        const nextState: UserStats = {
          ...prev,
          totalStudyMinutes: updatedTotalMin,
          vaultPoints: (prev.vaultPoints || 0) + totalSessionVp,
          focusMinuteVp: (prev.focusMinuteVp || 0) + minuteVp,
          focusBonusVp: (prev.focusBonusVp || 0) + bonusVp,
          sixtyMinBonusCount:
            (prev.sixtyMinBonusCount || 0) + (mins >= 60 ? Math.floor(mins / 60) : 0),
          subjectsStudied: updatedSubjectsStudied,
          topicsStudied: updatedTopics,
          dailyActivity: updatedDailyActivity,
          studySessions: [enrichedSession, ...prev.studySessions],
          tasks: updatedTasks,
          streak: {
            current: nextStreak,
            lastActiveDate: today,
          },
        };
        nextState.revisionSchedule = computeSmartRevisionSchedule(nextState);
        return nextState;
      });
    },
    [awardBackendVaultPoints, showVpRewardToast]
  );

  const isItemBookmarked = useCallback(
    (id: string) => {
      return userStats.bookmarkedItemIds.includes(id);
    },
    [userStats.bookmarkedItemIds]
  );

  const handleToggleBookmark = useCallback((id: string) => {
    setUserStats((prev) => {
      const exists = prev.bookmarkedItemIds.includes(id);
      return {
        ...prev,
        bookmarkedItemIds: exists
          ? prev.bookmarkedItemIds.filter((item) => item !== id)
          : [...prev.bookmarkedItemIds, id]
      };
    });
  }, []);

  const isNoteCompleted = useCallback(
    (id: string) => {
      return userStats.completedNoteIds.includes(id);
    },
    [userStats.completedNoteIds]
  );

  const handleToggleNoteComplete = useCallback((id: string) => {
    setUserStats((prev) => {
      const exists = prev.completedNoteIds.includes(id);
      return {
        ...prev,
        completedNoteIds: exists
          ? prev.completedNoteIds.filter((item) => item !== id)
          : [...prev.completedNoteIds, id]
      };
    });
  }, []);

  const handleOpenPracticeWithSubject = useCallback((subject: string) => {
    setPracticeInitialSubject(subject);
    setPracticeInitialChapter(undefined);
    setActiveSection('practice');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const handleOpenPracticeWithChapter = useCallback((subject: string, chapterTitle: string, classLevel: string) => {
    setPracticeInitialSubject(subject);
    setPracticeInitialChapter(chapterTitle);
    setPracticeInitialClassLevel(classLevel);
    setActiveSection('practice');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const handleNavigate = useCallback((section: ActiveSection) => {
    setActiveSection((prev) => (prev === section ? prev : section));
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const handleOpenSearch = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  const handleFinishSplash = useCallback(() => {
    setShowSplash(false);
  }, []);

  const handleSelectBook = useCallback((book: Book) => {
    setReadingBook(book);
  }, []);

  const handleSelectNote = useCallback((note: StudyNote) => {
    setViewingNote(note);
  }, []);

  const handleOpenGoalsManager = useCallback(() => {
    setActiveSection((prev) => (prev === 'profile' ? prev : 'profile'));
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const handleOpenFocusMode = useCallback(() => {
    setIsFocusModeOpen(true);
  }, []);

  const handleNavigateToNotes = useCallback(() => {
    setActiveSection((prev) => (prev === 'notes' ? prev : 'notes'));
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const handleNavigateToPractice = useCallback(() => {
    setActiveSection((prev) => (prev === 'practice' ? prev : 'practice'));
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const handleOpenOwnerAnalytics = useCallback(() => {
    setIsOwnerModalOpen(true);
  }, []);

  const handleOpenAuthModal = useCallback((mode: 'register' | 'login') => {
    setAuthModalConfig({ isOpen: true, mode });
  }, []);

  const pendingTasks = useMemo(
    () => userStats.tasks.filter((t) => !t.completed),
    [userStats.tasks]
  );

  const handleAuthSuccess = useCallback(
    (payload: {
      userId: string;
      username: string;
      role: 'student' | 'owner';
      isOwner: boolean;
      authToken: string;
      userStats: Partial<UserStats>;
    }) => {
      const verifiedOwner = Boolean(payload.role === 'owner' || payload.isOwner);
      setIsOwnerAuthenticated(verifiedOwner);

      try {
        localStorage.setItem(
          IDENTITY_STORAGE_KEY,
          JSON.stringify({
            userId: payload.userId,
            authToken: payload.authToken,
          })
        );
        if (verifiedOwner) {
          localStorage.setItem(OWNER_TOKEN_STORAGE_KEY, payload.authToken);
        } else {
          localStorage.removeItem(OWNER_TOKEN_STORAGE_KEY);
        }
      } catch {
        // ignore
      }

      setUserStats((prev) => {
        const merged: UserStats = {
          ...INITIAL_USER_STATS,
          ...prev,
          ...payload.userStats,
          userId: payload.userId,
          username: payload.username,
          role: verifiedOwner ? 'owner' : 'student',
          hasCompletedSetup: true,
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch {
          // ignore
        }
        return merged;
      });

      if (
        payload.userStats.themePreference === 'light' ||
        payload.userStats.themePreference === 'dark' ||
        payload.userStats.themePreference === 'system'
      ) {
        setThemePreference(payload.userStats.themePreference);
        try {
          localStorage.setItem(THEME_STORAGE_KEY, payload.userStats.themePreference);
        } catch {
          // ignore
        }
      }

      setAuthModalConfig({ isOpen: false, mode: 'register' });
    },
    []
  );

  // Logout from current device WITHOUT deleting account on server
  const handleLogoutAccount = useCallback(async () => {
    try {
      const rawId = localStorage.getItem(IDENTITY_STORAGE_KEY);
      if (rawId) {
        const parsed = JSON.parse(rawId);
        if (parsed?.authToken) {
          await apiFetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${parsed.authToken}`,
            },
          });
        }
      }
    } catch {
      // ignore
    } finally {
      try {
        localStorage.removeItem(IDENTITY_STORAGE_KEY);
        localStorage.removeItem(OWNER_TOKEN_STORAGE_KEY);
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      setIsOwnerAuthenticated(false);
      setIsOwnerModalOpen(false);
      setUserStats(INITIAL_USER_STATS);
      setActiveSection('home');
      setAuthModalConfig({ isOpen: true, mode: 'login' });
    }
  }, []);

  // Permanent account deletion callback -> clear local session and return to welcome/registration screen
  const handleAccountDeleted = useCallback(() => {
    try {
      localStorage.removeItem(IDENTITY_STORAGE_KEY);
      localStorage.removeItem(OWNER_TOKEN_STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setIsOwnerAuthenticated(false);
    setIsOwnerModalOpen(false);
    setUserStats(INITIAL_USER_STATS);
    setActiveSection('home');
    setAuthModalConfig({ isOpen: true, mode: 'register' });
  }, []);

  return (
    <div className="min-h-screen min-h-[100dvh] w-full max-w-[100vw] overflow-x-clip bg-[#060b18] text-[#f7f4ee] flex flex-col selection:bg-[#d4af37]/30 selection:text-white">
      {/* Official Opening Splash Animation (~3.5s) */}
      {showSplash && (
        <SplashScreen onFinish={handleFinishSplash} />
      )}

      {/* Onboarding & Cross-Device Account Authentication Modal */}
      {(!userStats.hasCompletedSetup || authModalConfig.isOpen) && (
        <OnboardingModal
          currentStats={userStats}
          initialMode={authModalConfig.isOpen ? authModalConfig.mode : 'register'}
          onAuthSuccess={handleAuthSuccess}
          onClose={
            userStats.hasCompletedSetup
              ? () => setAuthModalConfig((prev) => ({ ...prev, isOpen: false }))
              : undefined
          }
        />
      )}

      {/* Top Bar Header with Uploaded Brand Logo */}
      <Header
        activeSection={activeSection}
        onNavigate={handleNavigate}
        onOpenSearch={handleOpenSearch}
        streakDays={userStats.streak?.current || 0}
        vaultPoints={userStats.vaultPoints ?? 0}
        vpRewardToast={vpRewardToast}
        userName={userStats.name || 'Student'}
        userProfilePhotoUrl={userStats.profilePhotoUrl}
        isFloatingTopDock={isMobileOrTabletPortrait}
      />

      {/* Main Container */}
      <main
        className={`flex-1 w-full max-w-5xl mx-auto px-3.5 sm:px-6 overflow-x-hidden ${
          isMobileOrTabletPortrait ? 'pt-6' : 'pt-5'
        } ${
          isFloatingBottomNav
            ? 'pb-32'
            : typeof window !== 'undefined' &&
              Boolean(
                (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() ||
                  window.navigator.userAgent.includes('Capacitor')
              )
            ? 'pb-12'
            : 'pb-24 md:pb-12'
        }`}
      >
        <div key={activeSection} className="svh-section-transition">
          {activeSection === 'home' && (
            <HomeSection
              userStats={userStats}
              onUpdateStats={handleUpdateStats}
              onNavigate={handleNavigate}
              onSelectBook={handleSelectBook}
              onSelectNote={handleSelectNote}
              isBookmarked={isItemBookmarked}
              onToggleBookmark={handleToggleBookmark}
              onRecordMCQAnswer={handleRecordSingleQuestion}
              onSelectActiveGoal={handleSelectActiveGoal}
              onOpenGoalsManager={handleOpenGoalsManager}
              onOpenFocusMode={handleOpenFocusMode}
              vpRewardToast={vpRewardToast}
            />
          )}

          {activeSection === 'books' && (
            <BooksSection
              activeGoal={activeGoal}
              activeSubjects={activeSubjects}
              onSelectBook={handleSelectBook}
              isBookmarked={isItemBookmarked}
              onToggleBookmark={handleToggleBookmark}
              onPracticeNCERTChapter={handleOpenPracticeWithChapter}
            />
          )}

          {activeSection === 'notes' && (
            <NotesSection
              activeGoal={activeGoal}
              activeSubjects={activeSubjects}
              onSelectNote={handleSelectNote}
              isBookmarked={isItemBookmarked}
              onToggleBookmark={handleToggleBookmark}
              isCompleted={isNoteCompleted}
              onToggleComplete={handleToggleNoteComplete}
              onOpenMCQWithSubject={handleOpenPracticeWithSubject}
            />
          )}

          {activeSection === 'practice' && (
            <MCQSection
              activeGoal={activeGoal}
              activeSubjects={activeSubjects}
              initialSubject={practiceInitialSubject}
              initialChapter={practiceInitialChapter}
              initialClassLevel={practiceInitialClassLevel}
              isBookmarked={isItemBookmarked}
              onToggleBookmark={handleToggleBookmark}
              onRecordResult={handleRecordSingleQuestion}
              onRecordTestCompleted={handleRecordTestCompleted}
            />
          )}

          {activeSection === 'tracker' && (
            <TrackerSection
              activeGoal={activeGoal}
              activeSubjects={activeSubjects}
              userStats={userStats}
              onUpdateStats={handleUpdateStats}
              onNavigateToPractice={handleNavigateToPractice}
              onOpenFocusMode={handleOpenFocusMode}
              onSaveRealSession={handleSaveRealFocusSession}
            />
          )}

          {activeSection === 'community' && (
            <CommunitySection
              userName={userStats.name || 'Student'}
              userProfilePhotoUrl={userStats.profilePhotoUrl}
              activeGoal={activeGoal}
              activeSubjects={activeSubjects}
              isOwnerAuthenticated={isOwnerAuthenticated}
            />
          )}

          {activeSection === 'prep' && (
            <ExamPrepSection
              activeGoal={activeGoal}
              activeSubjects={activeSubjects}
              userStats={userStats}
              onUpdateStats={handleUpdateStats}
              onNavigateToPracticeWithSubject={handleOpenPracticeWithSubject}
              onNavigateToNotes={handleNavigateToNotes}
            />
          )}

          {activeSection === 'profile' && (
            <ProfileSection
              userStats={userStats}
              onUpdateStats={handleUpdateStats}
              onSelectBook={handleSelectBook}
              onSelectNote={handleSelectNote}
              onNavigateToPractice={handleNavigateToPractice}
              onNavigate={handleNavigate}
              themePreference={themePreference}
              resolvedTheme={resolvedTheme}
              onChangeTheme={handleChangeTheme}
              isOwnerAuthenticated={isOwnerAuthenticated}
              onOpenOwnerAnalytics={handleOpenOwnerAnalytics}
              onOpenAuthModal={handleOpenAuthModal}
              onLogoutAccount={handleLogoutAccount}
              onAccountDeleted={handleAccountDeleted}
            />
          )}
        </div>
      </main>

      {/* Secure Owner Verification & Analytics Modal (Hidden from normal users) */}
      <OwnerAnalyticsModal
        isOpen={isOwnerModalOpen}
        onClose={() => setIsOwnerModalOpen(false)}
        onOwnerAuthStatusChange={setIsOwnerAuthenticated}
      />

      {/* Bottom Navigation */}
      <BottomNav
        activeSection={activeSection}
        onNavigate={handleNavigate}
        isFloatingDock={isFloatingBottomNav}
      />

      {/* Premium Study Focus Mode Modal */}
      <FocusModeModal
        isOpen={isFocusModeOpen}
        onClose={() => setIsFocusModeOpen(false)}
        activeGoal={activeGoal}
        activeSubjects={activeSubjects}
        pendingTasks={pendingTasks}
        onSaveRealSession={handleSaveRealFocusSession}
      />

      {/* Premium Floating SVH AI Personal Study Assistant */}
      <SVHAIFloatingAssistant
        userStats={userStats}
        onUpdateStats={handleUpdateStats}
        activeGoal={activeGoal}
        activeSubjects={activeSubjects}
        isFloatingBottomDock={isFloatingBottomNav}
        isFloatingTopDock={isMobileOrTabletPortrait}
      />

      {/* Book Reader Modal */}
      {readingBook && (
        <BookReaderModal
          book={readingBook}
          onClose={() => setReadingBook(null)}
          isBookmarked={isItemBookmarked(readingBook.id)}
          onToggleBookmark={handleToggleBookmark}
        />
      )}

      {/* Note Viewer Modal */}
      {viewingNote && (
        <NoteViewerModal
          note={viewingNote}
          onClose={() => setViewingNote(null)}
          isBookmarked={isItemBookmarked(viewingNote.id)}
          isCompleted={isNoteCompleted(viewingNote.id)}
          onToggleBookmark={handleToggleBookmark}
          onToggleComplete={handleToggleNoteComplete}
          onOpenMCQWithSubject={handleOpenPracticeWithSubject}
        />
      )}

      {/* Global Search Modal */}
      {isSearchOpen && (
        <SearchModal
          onClose={() => setIsSearchOpen(false)}
          onSelectBook={(book) => setReadingBook(book)}
          onSelectNote={(note) => setViewingNote(note)}
          onNavigateToMCQ={() => {
            setActiveSection('practice');
          }}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}
