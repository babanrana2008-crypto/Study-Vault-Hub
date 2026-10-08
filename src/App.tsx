import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { calculateUserVPBreakdown } from './utils/vpPoints';

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

  const vpBreakdown = useMemo(() => {
    return calculateUserVPBreakdown(userStats);
  }, [userStats]);

  const handleSelectActiveGoal = useCallback((goal: string) => {
    setUserStats((prev) => ({
      ...prev,
      activeGoal: goal
    }));
  }, []);

  const handleRecordSingleQuestion = useCallback(
    (isCorrect: boolean, question: MCQQuestion, chapterId?: string) => {
      setUserStats((prev) => {
        const newAttempted = prev.questionsAttempted + 1;
        const newCorrect = prev.correctAnswers + (isCorrect ? 1 : 0);
        const newIncorrect = prev.incorrectAnswers + (isCorrect ? 0 : 1);

        const topicList = prev.topicsStudied.includes(question.topic)
          ? prev.topicsStudied
          : [question.topic, ...prev.topicsStudied];

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

        const today = new Date().toISOString().split('T')[0];
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

        const nextFiveDayMilestone = Math.max(
          prev.highestFiveDayStreakMilestone || 0,
          Math.floor(nextStreak / 5)
        );

        const nextState: UserStats = {
          ...prev,
          questionsAttempted: newAttempted,
          correctAnswers: newCorrect,
          incorrectAnswers: newIncorrect,
          topicsStudied: topicList,
          chapterProgress: updatedProgress,
          highestFiveDayStreakMilestone: nextFiveDayMilestone,
          streak: {
            current: nextStreak,
            lastActiveDate: today,
          },
        };
        nextState.vpPoints = calculateUserVPBreakdown(nextState).totalVP;
        return nextState;
      });
    },
    []
  );

  // Record a completed timed test sprint
  const handleRecordTestCompleted = useCallback((entry: PracticeHistoryEntry) => {
    const today = new Date().toISOString().split('T')[0];
    setUserStats((prev) => {
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

      const nextFiveDayMilestone = Math.max(
        prev.highestFiveDayStreakMilestone || 0,
        Math.floor(nextStreak / 5)
      );

      const nextState: UserStats = {
        ...prev,
        questionsAttempted: prev.questionsAttempted + entry.totalQuestions,
        correctAnswers: prev.correctAnswers + entry.correctCount,
        incorrectAnswers: prev.incorrectAnswers + entry.wrongCount,
        practiceHistory: [entry, ...prev.practiceHistory],
        highestFiveDayStreakMilestone: nextFiveDayMilestone,
        streak: {
          current: nextStreak,
          lastActiveDate: today,
        },
      };
      nextState.vpPoints = calculateUserVPBreakdown(nextState).totalVP;
      return nextState;
    });
  }, []);

  // Save a real study focus session from FocusModeModal
  const handleSaveRealFocusSession = useCallback(
    (session: StudySession, completedTaskId?: string) => {
      const today = new Date().toISOString().split('T')[0];
      setUserStats((prev) => {
        const updatedTotalMin = prev.totalStudyMinutes + session.durationMinutes;
        const currentSubjectMin = prev.subjectsStudied[session.subject] || 0;
        const updatedSubjectsStudied = {
          ...prev.subjectsStudied,
          [session.subject]: currentSubjectMin + session.durationMinutes,
        };
        const updatedTopics = prev.topicsStudied.includes(session.topic)
          ? prev.topicsStudied
          : [session.topic, ...prev.topicsStudied];
        const updatedTasks = completedTaskId
          ? prev.tasks.map((t) => (t.id === completedTaskId ? { ...t, completed: true } : t))
          : prev.tasks;

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

        const nextFiveDayMilestone = Math.max(
          prev.highestFiveDayStreakMilestone || 0,
          Math.floor(nextStreak / 5)
        );

        const nextState: UserStats = {
          ...prev,
          totalStudyMinutes: updatedTotalMin,
          subjectsStudied: updatedSubjectsStudied,
          topicsStudied: updatedTopics,
          studySessions: [session, ...prev.studySessions],
          tasks: updatedTasks,
          highestFiveDayStreakMilestone: nextFiveDayMilestone,
          streak: {
            current: nextStreak,
            lastActiveDate: today,
          },
        };
        nextState.vpPoints = calculateUserVPBreakdown(nextState).totalVP;
        return nextState;
      });
    },
    []
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
      {/* Official Opening Splash Animation (1.8s) */}
      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} />
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
        vpPoints={vpBreakdown.totalVP}
        userStats={userStats}
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
              onSelectBook={(book) => setReadingBook(book)}
              onSelectNote={(note) => setViewingNote(note)}
              isBookmarked={isItemBookmarked}
              onToggleBookmark={handleToggleBookmark}
              onRecordMCQAnswer={handleRecordSingleQuestion}
              onSelectActiveGoal={handleSelectActiveGoal}
              onOpenGoalsManager={() => handleNavigate('profile')}
              onOpenFocusMode={() => setIsFocusModeOpen(true)}
            />
          )}

          {activeSection === 'books' && (
            <BooksSection
              activeGoal={activeGoal}
              activeSubjects={activeSubjects}
              onSelectBook={(book) => setReadingBook(book)}
              isBookmarked={isItemBookmarked}
              onToggleBookmark={handleToggleBookmark}
              onPracticeNCERTChapter={handleOpenPracticeWithChapter}
            />
          )}

          {activeSection === 'notes' && (
            <NotesSection
              activeGoal={activeGoal}
              activeSubjects={activeSubjects}
              onSelectNote={(note) => setViewingNote(note)}
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
              onNavigateToPractice={() => handleNavigate('practice')}
              onOpenFocusMode={() => setIsFocusModeOpen(true)}
            />
          )}

          {activeSection === 'community' && (
            <CommunitySection
              userName={userStats.name || 'Student'}
              userProfilePhotoUrl={userStats.profilePhotoUrl}
              userStats={userStats}
              activeGoal={activeGoal}
              activeSubjects={activeSubjects}
              isOwnerAuthenticated={isOwnerAuthenticated}
            />
          )}

          {activeSection === 'prep' && (
            <ExamPrepSection
              activeGoal={activeGoal}
              activeSubjects={activeSubjects}
              onNavigateToPracticeWithSubject={handleOpenPracticeWithSubject}
              onNavigateToNotes={() => handleNavigate('notes')}
              onNavigateToTracker={() => handleNavigate('tracker')}
            />
          )}

          {activeSection === 'profile' && (
            <ProfileSection
              userStats={userStats}
              onUpdateStats={handleUpdateStats}
              onSelectBook={(book) => setReadingBook(book)}
              onSelectNote={(note) => setViewingNote(note)}
              onNavigateToPractice={() => handleNavigate('practice')}
              onNavigate={handleNavigate}
              themePreference={themePreference}
              resolvedTheme={resolvedTheme}
              onChangeTheme={handleChangeTheme}
              isOwnerAuthenticated={isOwnerAuthenticated}
              onOpenOwnerAnalytics={() => setIsOwnerModalOpen(true)}
              onOpenAuthModal={(mode) => setAuthModalConfig({ isOpen: true, mode })}
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
        pendingTasks={userStats.tasks.filter((t) => !t.completed)}
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
