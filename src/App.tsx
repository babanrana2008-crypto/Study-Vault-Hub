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
import { WhatsAppChannelBanner } from './components/WhatsAppChannelBanner';
import { PremiumFooter } from './components/PremiumFooter';
import { MiniBubbleBackground } from './components/MiniBubbleBackground';
import { SVHErrorBoundary } from './components/SVHErrorBoundary';
import { useGlobalCardTiltEffect } from './components/GlassMetallicSkeleton';
import { ConfettiCelebration, triggerConfettiCelebration } from './components/ConfettiCelebration';
import { useGlobalHapticFeedback } from './utils/haptics';
import { StudySession } from './types';
import { apiFetch } from './services/nativeApiBridge';
import { calculateUserVPBreakdown } from './utils/vpPoints';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import {
  upsertUserProfileInFirestore,
  removeActiveDeviceOnLogoutInFirestore,
  getClientDeviceId,
  handleUserTrackingFirestoreError,
} from './services/firebaseDb';

const STORAGE_KEY = 'study_vault_hub_data_v3';
const THEME_STORAGE_KEY = 'study_vault_theme_preference_v1';
const IDENTITY_STORAGE_KEY = 'study_vault_community_identity_v1';
const ANON_DEVICE_STORAGE_KEY = 'study_vault_anon_device_id_v1';
const OWNER_TOKEN_STORAGE_KEY = 'study_vault_owner_session_token_v1';

export default function App() {
  useGlobalCardTiltEffect();
  useGlobalHapticFeedback();

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
          vpPoints: Math.max(0, Number(parsed.vpPoints ?? parsed.vaultPoints ?? 0)),
          vaultPoints: Math.max(0, Number(parsed.vaultPoints ?? parsed.vpPoints ?? 0)),
          streakDays: Math.max(0, Number(parsed.streakDays ?? parsed.streak?.current ?? 0)),
          focusMinutes: Math.max(0, Number(parsed.focusMinutes ?? parsed.totalStudyMinutes ?? 0)),
          activityHistory: Array.isArray(parsed.activityHistory) ? parsed.activityHistory : [],
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
            streakDays: 0,
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
        const parsedId = rawId ? JSON.parse(rawId) : null;
        const resolvedUid =
          auth?.currentUser?.uid || userStats.userId || parsedId?.userId || '';
        const computedVp = calculateUserVPBreakdown(userStats).totalVP;

        if (resolvedUid && userStats.hasCompletedSetup) {
          upsertUserProfileInFirestore({
            uid: resolvedUid,
            displayName: userStats.name || auth?.currentUser?.displayName || 'Student',
            email:
              auth?.currentUser?.email ||
              (userStats.username
                ? userStats.username.includes('@')
                  ? userStats.username
                  : `${userStats.username}@svh.student`
                : `${resolvedUid}@svh.student`),
            username: userStats.username || null,
            role: userStats.role === 'owner' ? 'owner' : 'student',
            vpPoints: Math.max(computedVp, Number(userStats.vpPoints) || 0),
            deviceId: getClientDeviceId(),
            userStats,
          }).catch(() => {});
        }

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
      } catch {
        // ignore
      }
    }, 450);
    return () => clearTimeout(timeoutId);
  }, [userStats]);

  // Listen to Firebase Auth state changes and automatically create/update users/{uid}
  const [firebaseAuthUid, setFirebaseAuthUid] = useState<string | null>(() => {
    return auth?.currentUser?.uid || null;
  });
  const [isFirebaseAuthChecked, setIsFirebaseAuthChecked] = useState<boolean>(() => {
    return !auth || typeof onAuthStateChanged !== 'function';
  });
  const [isInitialStateSetupDone, setIsInitialStateSetupDone] = useState<boolean>(false);

  const userStatsRef = useRef<UserStats>(userStats);
  useEffect(() => {
    userStatsRef.current = userStats;
  }, [userStats]);

  useEffect(() => {
    if (!auth || typeof onAuthStateChanged !== 'function') {
      setIsFirebaseAuthChecked(true);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setFirebaseAuthUid(firebaseUser ? firebaseUser.uid : null);
      setIsFirebaseAuthChecked(true);
      if (!firebaseUser) return;
      const latestStats = userStatsRef.current;
      const nowIso = new Date().toISOString();
      const computedVp = calculateUserVPBreakdown(latestStats).totalVP;
      upsertUserProfileInFirestore({
        uid: firebaseUser.uid,
        displayName:
          firebaseUser.displayName || latestStats.name || firebaseUser.email?.split('@')[0] || 'Student',
        email: firebaseUser.email || `${firebaseUser.uid}@svh.student`,
        username: latestStats.username || firebaseUser.email?.split('@')[0] || null,
        role: latestStats.role === 'owner' ? 'owner' : 'student',
        createdAt: firebaseUser.metadata?.creationTime
          ? new Date(firebaseUser.metadata.creationTime).toISOString()
          : nowIso,
        lastLogin: firebaseUser.metadata?.lastSignInTime
          ? new Date(firebaseUser.metadata.lastSignInTime).toISOString()
          : nowIso,
        vpPoints: Math.max(computedVp, Number(latestStats.vpPoints) || 0),
        deviceId: getClientDeviceId(),
        userStats: latestStats,
      }).catch(() => {});
    });
    return () => unsubscribe();
  }, []);

  // REAL-TIME PROFILE VP READ: Attach live Firestore listener (onSnapshot) to users/{auth.currentUser.uid}
  const [liveFirestoreVpPoints, setLiveFirestoreVpPoints] = useState<number | null>(null);

  const activeProfileUid = useMemo(() => {
    if (auth?.currentUser?.uid) return auth.currentUser.uid;
    if (firebaseAuthUid) return firebaseAuthUid;
    if (userStats.userId) return userStats.userId;
    try {
      const rawId = localStorage.getItem(IDENTITY_STORAGE_KEY);
      if (rawId) {
        const parsed = JSON.parse(rawId);
        if (parsed?.userId) return String(parsed.userId);
      }
    } catch {
      // ignore
    }
    return null;
  }, [firebaseAuthUid, userStats.userId]);

  useEffect(() => {
    const uid = auth?.currentUser?.uid || activeProfileUid;
    if (!uid) {
      setLiveFirestoreVpPoints(null);
      return;
    }

    const userDocRef = doc(db, 'users', uid);
    const unsubscribe = onSnapshot(
      userDocRef,
      (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data() || {};
        const remoteVp = Math.max(
          0,
          Math.floor(Number(data.vpPoints ?? data.vaultPoints ?? data.userStats?.vpPoints ?? 0))
        );
        setLiveFirestoreVpPoints(remoteVp);

        setUserStats((prev) => {
          const prevVp = Math.max(0, Math.floor(Number(prev.vpPoints ?? prev.vaultPoints ?? 0)));
          const mergedVp = Math.max(prevVp, remoteVp);
          const remoteQuestions = Math.max(
            Number(prev.questionsAttempted) || 0,
            Number(data.questionsAttempted ?? data.userStats?.questionsAttempted) || 0
          );
          const remoteCorrect = Math.max(
            Number(prev.correctAnswers) || 0,
            Number(data.correctAnswers ?? data.userStats?.correctAnswers) || 0
          );
          const remoteMinutes = Math.max(
            Number(prev.totalStudyMinutes) || 0,
            Number(data.totalStudyMinutes ?? data.focusMinutes ?? data.userStats?.totalStudyMinutes ?? data.userStats?.focusMinutes) || 0
          );
          const remoteStreak = Math.max(
            Number(prev.streak?.current ?? prev.streakDays) || 0,
            Number(data.streakDays ?? data.userStats?.streak?.current ?? data.userStats?.streakDays) || 0
          );

          if (
            prev.vpPoints === mergedVp &&
            prev.vaultPoints === mergedVp &&
            prev.questionsAttempted === remoteQuestions &&
            prev.correctAnswers === remoteCorrect &&
            prev.totalStudyMinutes === remoteMinutes &&
            prev.focusMinutes === remoteMinutes &&
            prev.streakDays === remoteStreak
          ) {
            return prev;
          }

          return {
            ...prev,
            vpPoints: mergedVp,
            vaultPoints: mergedVp,
            questionsAttempted: remoteQuestions,
            correctAnswers: remoteCorrect,
            totalStudyMinutes: remoteMinutes,
            focusMinutes: remoteMinutes,
            streakDays: remoteStreak,
          };
        });
      },
      (error) => {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.toLowerCase().includes('Missing or insufficient permissions'.toLowerCase())) {
          try {
            handleUserTrackingFirestoreError(error, 'get' as any, `users/${uid}`);
          } catch {
            // logged by handler
          }
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [activeProfileUid]);

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
      } finally {
        if (!isCancelled) {
          setIsInitialStateSetupDone(true);
        }
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

  // Consolidated Viewport & Orientation evaluation (single rAF listener for both BottomNav & TopNav floating modes)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId: number | null = null;
    let lastEvalTime = 0;
    let trailingTimer: ReturnType<typeof setTimeout> | null = null;

    const runLayoutEvaluation = () => {
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
          const isMobileOrTabletUA =
            isNativeAndroid ||
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|PlayBook|Silk/i.test(ua) ||
            (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
          const isCoarsePointer =
            window.matchMedia('(pointer: coarse)').matches ||
            window.matchMedia('(hover: none)').matches;

          const minDim = Math.min(window.innerWidth, window.innerHeight);
          const isMobilePhone = isPhoneUA || (!isTabletUA && minDim < 768);
          const isMobileOrTabletViewport = window.innerWidth <= 1024;
          const isPhoneOrTabletContext =
            isMobilePhone || isTabletUA || isCoarsePointer || isMobileOrTabletViewport;

          const shouldFloatBottom = isNativeAndroid
            ? Boolean(isPortrait && !isTabletUA && window.innerWidth < 768)
            : Boolean(
                (isInstalledApp && isMobilePhone) || (isPortrait && isPhoneOrTabletContext)
              );

          const nextPortraitTopDock = !isPortrait
            ? false
            : isNativeAndroid
            ? Boolean(isPortrait && !isTabletUA && window.innerWidth < 768)
            : Boolean(
                isPortrait && (isMobileOrTabletUA || isCoarsePointer || isMobileOrTabletViewport)
              );

          setIsFloatingBottomNav((prev) => (prev === shouldFloatBottom ? prev : shouldFloatBottom));
          setIsMobileOrTabletPortrait((prev) =>
            prev === nextPortraitTopDock ? prev : nextPortraitTopDock
          );
        } catch {
          setIsFloatingBottomNav(false);
          setIsMobileOrTabletPortrait(false);
        }
      });
    };

    const evaluateViewportNavigationLayout = () => {
      const now = performance.now();
      if (now - lastEvalTime >= 90) {
        lastEvalTime = now;
        runLayoutEvaluation();
      } else {
        if (trailingTimer !== null) clearTimeout(trailingTimer);
        trailingTimer = setTimeout(() => {
          lastEvalTime = performance.now();
          runLayoutEvaluation();
        }, 90);
      }
    };

    runLayoutEvaluation();

    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    const portraitQuery = window.matchMedia('(orientation: portrait)');

    standaloneQuery.addEventListener?.('change', evaluateViewportNavigationLayout);
    portraitQuery.addEventListener?.('change', evaluateViewportNavigationLayout);
    window.addEventListener('resize', evaluateViewportNavigationLayout, { passive: true });
    window.addEventListener('orientationchange', evaluateViewportNavigationLayout, { passive: true });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (trailingTimer !== null) clearTimeout(trailingTimer);
      standaloneQuery.removeEventListener?.('change', evaluateViewportNavigationLayout);
      portraitQuery.removeEventListener?.('change', evaluateViewportNavigationLayout);
      window.removeEventListener('resize', evaluateViewportNavigationLayout);
      window.removeEventListener('orientationchange', evaluateViewportNavigationLayout);
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
    const effectiveStats: UserStats =
      liveFirestoreVpPoints !== null
        ? {
            ...userStats,
            vpPoints: Math.max(Number(userStats.vpPoints) || 0, liveFirestoreVpPoints),
            vaultPoints: Math.max(Number(userStats.vaultPoints) || 0, liveFirestoreVpPoints),
          }
        : userStats;
    return calculateUserVPBreakdown(effectiveStats);
  }, [userStats, liveFirestoreVpPoints]);

  // Trigger confetti celebration when user earns VP Points or completes a study task
  const completedTasksCount = useMemo(
    () => (userStats.tasks || []).filter((t) => t.completed).length,
    [userStats.tasks]
  );
  const prevVpRef = useRef<number | null>(null);
  const prevCompletedTasksRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isInitialStateSetupDone) {
      prevVpRef.current = vpBreakdown.totalVP;
      prevCompletedTasksRef.current = completedTasksCount;
      return;
    }

    const prevVp = prevVpRef.current;
    const prevTasks = prevCompletedTasksRef.current;
    const currentVp = vpBreakdown.totalVP;

    if (prevVp !== null && currentVp > prevVp) {
      triggerConfettiCelebration({ reason: 'vp' });
    } else if (prevTasks !== null && completedTasksCount > prevTasks) {
      triggerConfettiCelebration({ reason: 'task' });
    }

    prevVpRef.current = currentVp;
    prevCompletedTasksRef.current = completedTasksCount;
  }, [vpBreakdown.totalVP, completedTasksCount, isInitialStateSetupDone]);

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

  const bookmarkedIdsSet = useMemo(
    () => new Set(userStats.bookmarkedItemIds || []),
    [userStats.bookmarkedItemIds]
  );

  const isItemBookmarked = useCallback(
    (id: string) => {
      return bookmarkedIdsSet.has(id);
    },
    [bookmarkedIdsSet]
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

  const completedNotesSet = useMemo(
    () => new Set(userStats.completedNoteIds || []),
    [userStats.completedNoteIds]
  );

  const isNoteCompleted = useCallback(
    (id: string) => {
      return completedNotesSet.has(id);
    },
    [completedNotesSet]
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
      const parsed = rawId ? JSON.parse(rawId) : null;
      const targetUid = auth?.currentUser?.uid || userStats.userId || parsed?.userId;
      if (targetUid) {
        await removeActiveDeviceOnLogoutInFirestore(targetUid, getClientDeviceId());
      }
      if (parsed?.authToken) {
        await apiFetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${parsed.authToken}`,
          },
        });
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

  const handleFinishSplash = useCallback(() => {
    setShowSplash(false);
  }, []);

  const handleSelectBook = useCallback((book: Book) => {
    setReadingBook(book);
  }, []);

  const handleCloseReadingBook = useCallback(() => {
    setReadingBook(null);
  }, []);

  const handleSelectNote = useCallback((note: StudyNote) => {
    setViewingNote(note);
  }, []);

  const handleCloseViewingNote = useCallback(() => {
    setViewingNote(null);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  const handleNavigateToProfile = useCallback(() => {
    handleNavigate('profile');
  }, [handleNavigate]);

  const handleNavigateToPractice = useCallback(() => {
    handleNavigate('practice');
  }, [handleNavigate]);

  const handleNavigateToNotes = useCallback(() => {
    handleNavigate('notes');
  }, [handleNavigate]);

  const handleNavigateToTracker = useCallback(() => {
    handleNavigate('tracker');
  }, [handleNavigate]);

  const handleOpenFocusMode = useCallback(() => {
    setIsFocusModeOpen(true);
  }, []);

  const handleCloseFocusMode = useCallback(() => {
    setIsFocusModeOpen(false);
  }, []);

  const handleOpenOwnerAnalytics = useCallback(() => {
    setIsOwnerModalOpen(true);
  }, []);

  const handleCloseOwnerAnalytics = useCallback(() => {
    setIsOwnerModalOpen(false);
  }, []);

  const handleOpenAuthModal = useCallback((mode: 'register' | 'login') => {
    setAuthModalConfig({ isOpen: true, mode });
  }, []);

  const handleCloseAuthModal = useCallback(() => {
    setAuthModalConfig((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const pendingTasks = useMemo(
    () => (userStats.tasks || []).filter((t) => !t.completed),
    [userStats.tasks]
  );

  // Prevent default rubber-band overscroll on non-scrollable elements in the main app layout
  // while keeping scrolling 100% hardware-accelerated on the compositor thread at 90Hz-120Hz.
  const appLayoutRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const layoutEl = appLayoutRef.current;
    if (!layoutEl || typeof window === 'undefined') return;

    let isFixedNonScrollableTarget = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        isFixedNonScrollableTarget = false;
        return;
      }

      const target = e.target as HTMLElement | null;
      if (!target || typeof target.closest !== 'function') {
        isFixedNonScrollableTarget = false;
        return;
      }

      // Allow native touch handling on form controls and explicitly scrollable/interactive strips
      if (
        target.closest(
          'input, textarea, select, [contenteditable="true"], [data-allow-touch-scroll="true"], .nav-links, [class*="overflow-x-auto"], [class*="overflow-y-auto"]'
        )
      ) {
        isFixedNonScrollableTarget = false;
        return;
      }

      // Lock rubber-band drag only when touch originates on fixed non-scrollable chrome (top/bottom nav bars or splash overlay)
      isFixedNonScrollableTarget = Boolean(
        target.closest(
          'header[aria-label="Top Navigation"], nav[aria-label="Bottom Navigation"], .svh-splash-overlay, [data-non-scrollable="true"]'
        )
      );
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isFixedNonScrollableTarget) return;
      if (e.cancelable && e.touches.length === 1) {
        e.preventDefault();
      }
    };

    layoutEl.addEventListener('touchstart', handleTouchStart, { passive: true });
    layoutEl.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      layoutEl.removeEventListener('touchstart', handleTouchStart);
      layoutEl.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return (
    <div
      ref={appLayoutRef}
      className="svh-app-root-scroll min-h-screen min-h-[100dvh] w-full max-w-[100vw] overflow-x-clip bg-[#060b18] text-[#f7f4ee] flex flex-col selection:bg-[#d4af37]/30 selection:text-white"
    >
      {/* Standalone Mini Bubble Background Animation Layer */}
      <MiniBubbleBackground />
      <ConfettiCelebration />

      {/* Official Opening Splash Animation with Background Leaf Stencil Watermark */}
      {showSplash && (
        <SplashScreen
          isAppReady={isFirebaseAuthChecked && isInitialStateSetupDone}
          onFinish={handleFinishSplash}
        />
      )}

      {/* Onboarding & Cross-Device Account Authentication Modal */}
      {(!userStats.hasCompletedSetup || authModalConfig.isOpen) && (
        <OnboardingModal
          currentStats={userStats}
          initialMode={authModalConfig.isOpen ? authModalConfig.mode : 'register'}
          onAuthSuccess={handleAuthSuccess}
          onClose={
            userStats.hasCompletedSetup
              ? handleCloseAuthModal
              : undefined
          }
        />
      )}

      {/* Top Bar Header with Uploaded Brand Logo */}
      <div className="svh-focus-dimmable">
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

        {/* Official WhatsApp Channel Banner Directly Below Header */}
        <WhatsAppChannelBanner isFloatingTopDock={isMobileOrTabletPortrait} />
      </div>

      {/* Main Container */}
      <main
        className={`svh-dashboard-scroll-wrapper svh-focus-dimmable flex-1 w-full max-w-5xl mx-auto px-3.5 sm:px-6 overflow-x-hidden ${
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
        <SVHErrorBoundary fallbackTitle="Section View Temporarily Paused">
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
              onOpenGoalsManager={handleNavigateToProfile}
              onOpenFocusMode={handleOpenFocusMode}
              resolvedTheme={resolvedTheme}
              onChangeTheme={handleChangeTheme}
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
              onNavigateToNotes={handleNavigateToNotes}
              onNavigateToTracker={handleNavigateToTracker}
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
        </SVHErrorBoundary>

        {/* Premium Responsive Platform Footer */}
        <PremiumFooter onNavigate={handleNavigate} />
      </main>

      {/* Secure Owner Verification & Analytics Modal (Hidden from normal users) */}
      <OwnerAnalyticsModal
        isOpen={isOwnerModalOpen}
        onClose={handleCloseOwnerAnalytics}
        onOwnerAuthStatusChange={setIsOwnerAuthenticated}
      />

      {/* Bottom Navigation */}
      <div className="svh-focus-dimmable">
        <BottomNav
          activeSection={activeSection}
          onNavigate={handleNavigate}
          isFloatingDock={isFloatingBottomNav}
        />
      </div>

      {/* Premium Study Focus Mode Modal */}
      <FocusModeModal
        isOpen={isFocusModeOpen}
        onClose={handleCloseFocusMode}
        activeGoal={activeGoal}
        activeSubjects={activeSubjects}
        pendingTasks={pendingTasks}
        onSaveRealSession={handleSaveRealFocusSession}
      />

      {/* Premium Floating SVH AI Personal Study Assistant */}
      <SVHErrorBoundary fallbackTitle="SVH AI Assistant Temporarily Paused">
        <SVHAIFloatingAssistant
          userStats={userStats}
          onUpdateStats={handleUpdateStats}
          activeGoal={activeGoal}
          activeSubjects={activeSubjects}
          isFloatingBottomDock={isFloatingBottomNav}
          isFloatingTopDock={isMobileOrTabletPortrait}
        />
      </SVHErrorBoundary>

      {/* Book Reader Modal */}
      {readingBook && (
        <BookReaderModal
          book={readingBook}
          onClose={handleCloseReadingBook}
          isBookmarked={isItemBookmarked(readingBook.id)}
          onToggleBookmark={handleToggleBookmark}
        />
      )}

      {/* Note Viewer Modal */}
      {viewingNote && (
        <NoteViewerModal
          note={viewingNote}
          onClose={handleCloseViewingNote}
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
          onClose={handleCloseSearch}
          onSelectBook={handleSelectBook}
          onSelectNote={handleSelectNote}
          onNavigateToMCQ={handleNavigateToPractice}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}
