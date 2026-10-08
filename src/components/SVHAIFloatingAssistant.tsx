import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Sparkles,
  X,
  Send,
  Plus,
  History,
  Trash2,
  RotateCcw,
  Image as ImageIcon,
  Minimize2,
  Maximize2,
  ChevronLeft,
  AlertTriangle,
  BookOpen,
  Target,
  CheckCircle2,
  Clock,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Calendar,
  Brain,
  BarChart3,
  RefreshCw,
  Play,
  Square,
  Zap,
} from 'lucide-react';
import {
  UserStats,
  SVHAIButtonPosition,
  StudyPlanRecord,
  RevisionItem,
  StudyTask,
  SmartStudySessionPlan,
} from '../types';
import { APP_LOGO, SAMPLE_BOOKS, SAMPLE_NOTES } from '../data/sampleData';
import { NCERT_BOOKS_COLLECTION } from '../data/ncertBooksData';
import { apiFetch } from '../services/nativeApiBridge';
import { computeSmartRevisionSchedule, advanceRevisionItemStage } from '../utils/securityAndVp';

interface SVHAIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  createdAt: string;
}

interface SVHAIConversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: SVHAIMessage[];
}

interface StoredIdentity {
  userId: string;
  authToken: string;
}

interface SVHAIFloatingAssistantProps {
  userStats: UserStats;
  onUpdateStats?: (newPartial: Partial<UserStats>) => void;
  activeGoal: string;
  activeSubjects: string[];
  isFloatingBottomDock?: boolean;
  isFloatingTopDock?: boolean;
}

const IDENTITY_STORAGE_KEY = 'study_vault_community_identity_v1';
const LOCAL_CONVERSATIONS_BACKUP_KEY = 'study_vault_svh_ai_conversations_v1';
const SVH_AI_POSITION_KEY_PREFIX = 'study_vault_svh_ai_pos_v1_';
const BUTTON_SIZE = 56;
const EDGE_MARGIN = 12;

async function compressQuestionImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        reject(new Error('Failed to read image file.'));
        return;
      }
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1400;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

// Memoized individual message bubble for 144Hz-class rendering performance
const SVHAIMessageItem = React.memo<{
  msg: SVHAIMessage;
  displayUserName: string;
  isSpeakingThis?: boolean;
  isLoadingAudioThis?: boolean;
  onToggleSpeak?: (msg: SVHAIMessage) => void;
}>(({ msg, displayUserName, isSpeakingThis = false, isLoadingAudioThis = false, onToggleSpeak }) => {
  const isUser = msg.role === 'user';
  return (
    <div
      className={`flex flex-col ${
        isUser ? 'items-end' : 'items-start'
      }`}
    >
      <div
        className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-3.5 sm:p-4 space-y-2 border ${
          isUser
            ? 'bg-gradient-to-br from-[#172647] to-[#111c36] border-[#d4af37]/45 text-[#fbf9f4]'
            : 'bg-[#0d162a] border-[#1e293b] text-[#f7f4ee]'
        }`}
      >
        <div className="flex items-center justify-between gap-3 text-[10px] font-mono">
          <span
            className={
              isUser
                ? 'text-[#d4af37] font-bold'
                : 'text-[#d4af37] font-bold flex items-center gap-1'
            }
          >
            {!isUser && <Sparkles className="w-3 h-3" />}
            {isUser ? displayUserName || 'You' : 'SVH AI'}
          </span>
          <div className="flex items-center gap-2">
            {!isUser && onToggleSpeak && (
              <button
                type="button"
                onClick={() => onToggleSpeak(msg)}
                title={
                  isSpeakingThis
                    ? 'Stop AI Voice Tutor'
                    : 'Listen with AI Voice Tutor (Male Voice)'
                }
                className={`px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer ${
                  isSpeakingThis
                    ? 'bg-[#d4af37] text-[#080d1a] font-bold'
                    : 'bg-[#131b2e] text-[#d4af37] hover:bg-[#19243d] border border-[#d4af37]/30'
                }`}
              >
                {isLoadingAudioThis ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : isSpeakingThis ? (
                  <>
                    <VolumeX className="w-3 h-3" />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3 h-3" />
                    <span>Listen</span>
                  </>
                )}
              </button>
            )}
            <span className="text-[#9ca3af]">
              {new Date(msg.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        {msg.imageUrl && (
          <div className="rounded-xl overflow-hidden border border-[#d4af37]/30 bg-[#050914] max-w-xs">
            <img
              src={msg.imageUrl}
              alt="Uploaded question"
              className="max-h-56 w-auto mx-auto object-contain"
              loading="lazy"
            />
          </div>
        )}

        <div className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
          {msg.content}
        </div>
      </div>
    </div>
  );
});

export const SVHAIFloatingAssistant: React.FC<SVHAIFloatingAssistantProps> = React.memo(({
  userStats,
  onUpdateStats,
  activeGoal,
  activeSubjects,
  isFloatingBottomDock = false,
  isFloatingTopDock = false,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isExpandedDesktop, setIsExpandedDesktop] = useState<boolean>(false);
  const [showHistoryView, setShowHistoryView] = useState<boolean>(false);
  const [logoSrc, setLogoSrc] = useState<string>(APP_LOGO);

  // User cryptographic session identity (shared with backend)
  const [identity, setIdentity] = useState<StoredIdentity | null>(() => {
    try {
      const raw = localStorage.getItem(IDENTITY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.userId && parsed?.authToken) {
          return { userId: parsed.userId, authToken: parsed.authToken };
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  // Always read latest identity from localStorage if updated by login/registration
  const getLatestIdentity = useCallback((): StoredIdentity | null => {
    try {
      const raw = localStorage.getItem(IDENTITY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.userId && parsed?.authToken) {
          return { userId: parsed.userId, authToken: parsed.authToken };
        }
      }
    } catch {
      // ignore
    }
    return identity;
  }, [identity]);

  const userStorageKey = useMemo(() => {
    const uid =
      userStats.userId ||
      identity?.userId ||
      (userStats.name || 'default').trim().toLowerCase().replace(/\s+/g, '_') ||
      'default';
    return `${SVH_AI_POSITION_KEY_PREFIX}${uid}`;
  }, [userStats.userId, identity?.userId, userStats.name]);

  const userConversationsStorageKey = useMemo(() => {
    const uid = userStats.userId || identity?.userId || 'default';
    return `${LOCAL_CONVERSATIONS_BACKUP_KEY}_${uid}`;
  }, [userStats.userId, identity?.userId]);

  // Compute safe viewport boundaries so button never overlaps top/bottom nav or screen edges
  const getSafeBounds = useCallback(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 390;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 844;
    const isMobileWidth = vw < 768;

    const minX = EDGE_MARGIN;
    const maxX = Math.max(minX, vw - BUTTON_SIZE - EDGE_MARGIN);

    const topNavClearance = isFloatingTopDock ? 78 : 66;
    const minY = topNavClearance;

    const isNativeAndroid =
      typeof window !== 'undefined' &&
      Boolean(
        (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() ||
          window.navigator.userAgent.includes('Capacitor')
      );

    const bottomNavClearance = isFloatingBottomDock
      ? 88
      : isNativeAndroid
      ? 20
      : isMobileWidth
      ? 76
      : 20;
    const maxY = Math.max(minY, vh - BUTTON_SIZE - bottomNavClearance);

    return { minX, maxX, minY, maxY, vw, vh };
  }, [isFloatingBottomDock, isFloatingTopDock]);

  const ratioToPixels = useCallback(
    (ratio: SVHAIButtonPosition) => {
      const { minX, maxX, minY, maxY } = getSafeBounds();
      const clampedXRatio = Math.max(0, Math.min(1, ratio.xRatio));
      const clampedYRatio = Math.max(0, Math.min(1, ratio.yRatio));
      const x = Math.round(minX + clampedXRatio * Math.max(0, maxX - minX));
      const y = Math.round(minY + clampedYRatio * Math.max(0, maxY - minY));
      return {
        x: Math.max(minX, Math.min(maxX, x)),
        y: Math.max(minY, Math.min(maxY, y)),
      };
    },
    [getSafeBounds]
  );

  const pixelsToRatio = useCallback(
    (x: number, y: number): SVHAIButtonPosition => {
      const { minX, maxX, minY, maxY } = getSafeBounds();
      const clampedX = Math.max(minX, Math.min(maxX, x));
      const clampedY = Math.max(minY, Math.min(maxY, y));
      const xSpan = Math.max(1, maxX - minX);
      const ySpan = Math.max(1, maxY - minY);
      return {
        xRatio: Number(((clampedX - minX) / xSpan).toFixed(4)),
        yRatio: Number(((clampedY - minY) / ySpan).toFixed(4)),
      };
    },
    [getSafeBounds]
  );

  // Load initial saved ratio for this real user (default: bottom-right safe corner xRatio=1, yRatio=1)
  const [savedRatio, setSavedRatio] = useState<SVHAIButtonPosition>(() => {
    if (
      userStats.svhAiButtonPosition &&
      typeof userStats.svhAiButtonPosition.xRatio === 'number' &&
      typeof userStats.svhAiButtonPosition.yRatio === 'number'
    ) {
      return {
        xRatio: Math.max(0, Math.min(1, userStats.svhAiButtonPosition.xRatio)),
        yRatio: Math.max(0, Math.min(1, userStats.svhAiButtonPosition.yRatio)),
      };
    }
    try {
      const rawId = localStorage.getItem(IDENTITY_STORAGE_KEY);
      const parsedId = rawId ? JSON.parse(rawId) : null;
      const uid =
        parsedId?.userId ||
        (userStats.name || 'default').trim().toLowerCase().replace(/\s+/g, '_') ||
        'default';
      const rawPos = localStorage.getItem(`${SVH_AI_POSITION_KEY_PREFIX}${uid}`);
      if (rawPos) {
        const parsedPos = JSON.parse(rawPos);
        if (typeof parsedPos?.xRatio === 'number' && typeof parsedPos?.yRatio === 'number') {
          return {
            xRatio: Math.max(0, Math.min(1, parsedPos.xRatio)),
            yRatio: Math.max(0, Math.min(1, parsedPos.yRatio)),
          };
        }
      }
    } catch {
      // ignore storage read error
    }
    return { xRatio: 1, yRatio: 1 };
  });

  const [buttonCoords, setButtonCoords] = useState<{ x: number; y: number }>(() =>
    ratioToPixels(savedRatio)
  );
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const floatingContainerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startClientX: number;
    startClientY: number;
    startButtonX: number;
    startButtonY: number;
    currentX: number;
    currentY: number;
    hasMovedBeyondThreshold: boolean;
  }>({
    active: false,
    pointerId: null,
    startClientX: 0,
    startClientY: 0,
    startButtonX: 0,
    startButtonY: 0,
    currentX: 0,
    currentY: 0,
    hasMovedBeyondThreshold: false,
  });

  // Sync when user identity or userStats.svhAiButtonPosition changes
  useEffect(() => {
    if (
      userStats.svhAiButtonPosition &&
      typeof userStats.svhAiButtonPosition.xRatio === 'number' &&
      typeof userStats.svhAiButtonPosition.yRatio === 'number'
    ) {
      const nextRatio = {
        xRatio: Math.max(0, Math.min(1, userStats.svhAiButtonPosition.xRatio)),
        yRatio: Math.max(0, Math.min(1, userStats.svhAiButtonPosition.yRatio)),
      };
      setSavedRatio(nextRatio);
      setButtonCoords(ratioToPixels(nextRatio));
      return;
    }
    try {
      const rawPos = localStorage.getItem(userStorageKey);
      if (rawPos) {
        const parsedPos = JSON.parse(rawPos);
        if (typeof parsedPos?.xRatio === 'number' && typeof parsedPos?.yRatio === 'number') {
          const nextRatio = {
            xRatio: Math.max(0, Math.min(1, parsedPos.xRatio)),
            yRatio: Math.max(0, Math.min(1, parsedPos.yRatio)),
          };
          setSavedRatio(nextRatio);
          setButtonCoords(ratioToPixels(nextRatio));
        }
      }
    } catch {
      // ignore
    }
  }, [userStorageKey, userStats.svhAiButtonPosition, ratioToPixels]);

  // Re-clamp position smoothly whenever screen size or orientation changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let rafId: number | null = null;
    const handleViewportChange = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!dragStateRef.current.active) {
          setButtonCoords(ratioToPixels(savedRatio));
        }
      });
    };
    window.addEventListener('resize', handleViewportChange, { passive: true });
    window.addEventListener('orientationchange', handleViewportChange, { passive: true });
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
    };
  }, [savedRatio, ratioToPixels]);

  // Real conversations list (never pre-populated with fake chats)
  const [conversations, setConversations] = useState<SVHAIConversation[]>(() => {
    try {
      const saved =
        localStorage.getItem(userConversationsStorageKey) ||
        localStorage.getItem(LOCAL_CONVERSATIONS_BACKUP_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch {
      return [];
    }
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [failedTurn, setFailedTurn] = useState<{
    conversationId: string;
    userMessageId: string;
    message: string;
    imageUrl: string | null;
  } | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState<boolean>(false);

  // Upgraded SVH AI capabilities state (Chat | Smart Session | AI Study Planner | Smart Revision | Performance Insights)
  const [activeAiMode, setActiveAiMode] = useState<'chat' | 'session' | 'planner' | 'revision' | 'insights'>('chat');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [planNotice, setPlanNotice] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  // Smart Study Session state
  const [smartSessionSubject, setSmartSessionSubject] = useState<string>('');
  const [smartSessionTopic, setSmartSessionTopic] = useState<string>('');
  const [smartSessionDuration, setSmartSessionDuration] = useState<number>(45);
  const [smartSessionPlan, setSmartSessionPlan] = useState<SmartStudySessionPlan | null>(null);
  const [isGeneratingSmartSession, setIsGeneratingSmartSession] = useState<boolean>(false);
  const [smartSessionNotice, setSmartSessionNotice] = useState<string | null>(null);
  const [smartSessionError, setSmartSessionError] = useState<string | null>(null);

  // Real Voice Tutor state (Microphone recording -> STT -> Gemini -> Male TTS -> Audio Playback)
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [loadingAudioMessageId, setLoadingAudioMessageId] = useState<string | null>(null);
  const [pendingManualPlayAudio, setPendingManualPlayAudio] = useState<{
    messageId: string;
    audioDataUrl: string;
  } | null>(null);
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState<boolean>(false);
  const [isListeningMic, setIsListeningMic] = useState<boolean>(false);
  const [isTranscribingMic, setIsTranscribingMic] = useState<boolean>(false);
  const [micAudioLevel, setMicAudioLevel] = useState<number>(0);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceSendAfterTranscribe, setVoiceSendAfterTranscribe] = useState<boolean>(true);
  const [micPermissionState, setMicPermissionState] = useState<PermissionState | 'unknown'>('unknown');
  const micPermissionGrantedRef = useRef<boolean>(false);
  const speechRecognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRafRef = useRef<number | null>(null);
  const activeAudioElementRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isSubmittingRef = useRef<boolean>(false);
  const activeRequestCounterRef = useRef<number>(0);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const lastLoadedStorageKeyRef = useRef<string>(userConversationsStorageKey);

  const displayUserName = (userStats.name || '').trim();

  // Sync conversations ONLY when the actual storage key changes (and never wipe an active generation)
  useEffect(() => {
    if (lastLoadedStorageKeyRef.current === userConversationsStorageKey) return;
    lastLoadedStorageKeyRef.current = userConversationsStorageKey;
    if (isSubmittingRef.current) return;

    try {
      const saved = localStorage.getItem(userConversationsStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setConversations(Array.isArray(parsed) ? parsed : []);
      } else {
        setConversations([]);
      }
      setActiveConversationId(null);
    } catch {
      setConversations([]);
    }
  }, [userConversationsStorageKey]);

  // Save conversations backup to localStorage whenever updated (debounced slightly for smooth streaming)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(userConversationsStorageKey, JSON.stringify(conversations));
      } catch {
        // ignore storage quota errors
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [conversations, userConversationsStorageKey]);

  // Ensure session identity with backend
  const ensureIdentity = useCallback(
    async (forceRefresh = false): Promise<StoredIdentity | null> => {
      try {
        const latestId = forceRefresh ? null : getLatestIdentity();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (latestId?.authToken) {
          headers.Authorization = `Bearer ${latestId.authToken}`;
        }
        const res = await apiFetch('/api/community/auth/session', {
          method: 'POST',
          headers,
          body: JSON.stringify({ displayName: displayUserName || 'Student' }),
        });
        if (!res.ok) return latestId;
        const data = await res.json();
        const resolved: StoredIdentity = {
          userId: data.userId,
          authToken: data.authToken || latestId?.authToken || '',
        };
        if (resolved.userId && resolved.authToken) {
          setIdentity((prev) =>
            prev?.userId === resolved.userId && prev?.authToken === resolved.authToken
              ? prev
              : resolved
          );
          try {
            localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(resolved));
          } catch {
            // ignore
          }
          if (
            data.svhAiButtonPosition &&
            typeof data.svhAiButtonPosition.xRatio === 'number' &&
            typeof data.svhAiButtonPosition.yRatio === 'number' &&
            !userStats.svhAiButtonPosition
          ) {
            const remotePos: SVHAIButtonPosition = {
              xRatio: Math.max(0, Math.min(1, data.svhAiButtonPosition.xRatio)),
              yRatio: Math.max(0, Math.min(1, data.svhAiButtonPosition.yRatio)),
            };
            setSavedRatio(remotePos);
            setButtonCoords(ratioToPixels(remotePos));
            if (onUpdateStats) {
              onUpdateStats({ svhAiButtonPosition: remotePos });
            }
          }
          return resolved;
        }
        return latestId;
      } catch {
        return getLatestIdentity();
      }
    },
    [displayUserName, getLatestIdentity, onUpdateStats, ratioToPixels, userStats.svhAiButtonPosition]
  );

  // Persist user's chosen SVH AI button position locally, in userStats, and on the backend
  const persistButtonPosition = useCallback(
    async (newRatio: SVHAIButtonPosition) => {
      setSavedRatio(newRatio);
      try {
        localStorage.setItem(userStorageKey, JSON.stringify(newRatio));
      } catch {
        // ignore storage errors
      }
      if (onUpdateStats) {
        onUpdateStats({ svhAiButtonPosition: newRatio });
      }
      const activeId = identity || (await ensureIdentity());
      if (activeId?.authToken) {
        try {
          await apiFetch('/api/community/auth/profile', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${activeId.authToken}`,
            },
            body: JSON.stringify({
              svhAiButtonPosition: newRatio,
            }),
          });
        } catch {
          // ignore network error
        }
      }
    },
    [userStorageKey, onUpdateStats, identity, ensureIdentity]
  );

  // Direct DOM transform during pointer drag for zero-latency 144Hz dragging
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== undefined && e.button !== 0) return;
      const currentCoords = ratioToPixels(savedRatio);
      dragStateRef.current = {
        active: true,
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startButtonX: currentCoords.x,
        startButtonY: currentCoords.y,
        currentX: currentCoords.x,
        currentY: currentCoords.y,
        hasMovedBeyondThreshold: false,
      };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore capture error
      }
    },
    [ratioToPixels, savedRatio]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const state = dragStateRef.current;
      if (!state.active || state.pointerId !== e.pointerId) return;

      const dx = e.clientX - state.startClientX;
      const dy = e.clientY - state.startClientY;
      const distance = Math.hypot(dx, dy);

      if (!state.hasMovedBeyondThreshold && distance > 6) {
        state.hasMovedBeyondThreshold = true;
        setIsDragging(true);
      }

      if (state.hasMovedBeyondThreshold) {
        const { minX, maxX, minY, maxY } = getSafeBounds();
        const nextX = Math.max(minX, Math.min(maxX, Math.round(state.startButtonX + dx)));
        const nextY = Math.max(minY, Math.min(maxY, Math.round(state.startButtonY + dy)));
        state.currentX = nextX;
        state.currentY = nextY;
        if (floatingContainerRef.current) {
          floatingContainerRef.current.style.transform = `translate3d(${nextX}px, ${nextY}px, 0)`;
        }
      }
    },
    [getSafeBounds]
  );

  const handlePointerUpOrCancel = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const state = dragStateRef.current;
      if (!state.active || state.pointerId !== e.pointerId) return;

      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // ignore release error
      }

      const wasDragged = state.hasMovedBeyondThreshold;
      const finalX = state.currentX;
      const finalY = state.currentY;

      state.active = false;
      state.pointerId = null;
      setIsDragging(false);

      if (wasDragged) {
        setButtonCoords({ x: finalX, y: finalY });
        const newRatio = pixelsToRatio(finalX, finalY);
        persistButtonPosition(newRatio);
      } else {
        setIsOpen(true);
      }
    },
    [pixelsToRatio, persistButtonPosition]
  );

  // Merge remote conversations with local conversations without ever dropping local messages
  const mergeConversationsSafely = useCallback(
    (localList: SVHAIConversation[], remoteList: SVHAIConversation[]): SVHAIConversation[] => {
      const mergedMap = new Map<string, SVHAIConversation>();
      for (const rem of remoteList) {
        if (rem && rem.id) {
          mergedMap.set(rem.id, rem);
        }
      }
      for (const loc of localList) {
        if (!loc || !loc.id) continue;
        const existingRem = mergedMap.get(loc.id);
        if (!existingRem) {
          mergedMap.set(loc.id, loc);
        } else {
          // Keep whichever version has more messages or newer messages
          const locMsgs = Array.isArray(loc.messages) ? loc.messages : [];
          const remMsgs = Array.isArray(existingRem.messages) ? existingRem.messages : [];
          if (locMsgs.length > remMsgs.length) {
            mergedMap.set(loc.id, loc);
          } else if (locMsgs.length === remMsgs.length && locMsgs.length > 0) {
            const lastLoc = locMsgs[locMsgs.length - 1];
            const lastRem = remMsgs[remMsgs.length - 1];
            if ((lastLoc?.content?.length || 0) > (lastRem?.content?.length || 0)) {
              mergedMap.set(loc.id, loc);
            }
          }
        }
      }
      return Array.from(mergedMap.values()).sort((a, b) =>
        (b.updatedAt || '').localeCompare(a.updatedAt || '')
      );
    },
    []
  );

  // Fetch user's real conversation history from server when opened (never overwrites active generation)
  const loadConversationsFromServer = useCallback(async () => {
    if (isSubmittingRef.current) return;
    let activeId = getLatestIdentity() || (await ensureIdentity());
    if (!activeId?.authToken) return;
    try {
      let res = await apiFetch('/api/svh-ai/conversations', {
        headers: {
          Authorization: `Bearer ${activeId.authToken}`,
        },
      });
      if (res.status === 401) {
        activeId = await ensureIdentity(true);
        if (!activeId?.authToken) return;
        res = await apiFetch('/api/svh-ai/conversations', {
          headers: {
            Authorization: `Bearer ${activeId.authToken}`,
          },
        });
      }
      if (!res.ok || isSubmittingRef.current) return;
      const data = await res.json();
      if (Array.isArray(data.conversations) && !isSubmittingRef.current) {
        setConversations((prev) => mergeConversationsSafely(prev, data.conversations));
      }
    } catch {
      // fallback to local state
    }
  }, [getLatestIdentity, ensureIdentity, mergeConversationsSafely]);

  useEffect(() => {
    if (isOpen) {
      loadConversationsFromServer();
    }
  }, [isOpen]);

  // Abort any in-flight stream on component unmount and support Escape key + mobile scroll lock when open
  useEffect(() => {
    return () => {
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const isMobileViewport = window.innerWidth < 640;
    const prevOverflow = document.body.style.overflow;
    if (isMobileViewport) {
      document.body.style.overflow = 'hidden';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmClearAll) {
          setConfirmClearAll(false);
        } else if (showHistoryView) {
          setShowHistoryView(false);
        } else {
          setIsOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      if (isMobileViewport) {
        document.body.style.overflow = prevOverflow;
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, confirmClearAll, showHistoryView]);

  const activeConversation = useMemo(() => {
    if (!activeConversationId) return null;
    return conversations.find((c) => c.id === activeConversationId) || null;
  }, [conversations, activeConversationId]);

  const currentMessages = useMemo(() => {
    return activeConversation?.messages || [];
  }, [activeConversation]);

  // Smooth, non-blocking scroll to bottom when new messages or streaming chunks arrive
  const scrollChatToBottom = useCallback((instant = false) => {
    const container = chatScrollContainerRef.current;
    if (!container) return;
    requestAnimationFrame(() => {
      if (instant) {
        container.scrollTop = container.scrollHeight;
      } else {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        });
      }
    });
  }, []);

  useEffect(() => {
    if (isOpen && !showHistoryView && currentMessages.length > 0) {
      scrollChatToBottom(false);
    }
  }, [currentMessages.length, isOpen, showHistoryView, scrollChatToBottom]);

  // Build real, honest student context from actual app data (NEVER inventing fake stats)
  const realStudentContext = useMemo(() => {
    const hasEnoughPracticeData = userStats.questionsAttempted >= 3;
    const overallAccuracy =
      userStats.questionsAttempted > 0
        ? Number(((userStats.correctAnswers / userStats.questionsAttempted) * 100).toFixed(1))
        : null;

    // Detect real weak topics ONLY when enough real performance data exists
    const detectedWeakTopics: Array<{ topicOrSubject: string; accuracy: number; solved: number }> = [];
    if (hasEnoughPracticeData) {
      if (userStats.chapterProgress) {
        for (const [chapId, prog] of Object.entries(userStats.chapterProgress)) {
          if (prog.questionsSolved >= 2 && prog.accuracy < 60) {
            detectedWeakTopics.push({
              topicOrSubject: chapId,
              accuracy: prog.accuracy,
              solved: prog.questionsSolved,
            });
          }
        }
      }
      for (const entry of userStats.practiceHistory) {
        if (entry.totalQuestions >= 2 && entry.accuracy < 60) {
          detectedWeakTopics.push({
            topicOrSubject: entry.subject,
            accuracy: entry.accuracy,
            solved: entry.totalQuestions,
          });
        }
      }
    }

    const savedBookTitles = SAMPLE_BOOKS.filter((b) =>
      userStats.bookmarkedItemIds.includes(b.id)
    ).map((b) => `${b.title} (${b.subject})`);

    const savedNoteTitles = SAMPLE_NOTES.filter((n) =>
      userStats.bookmarkedItemIds.includes(n.id)
    ).map((n) => `${n.title} (${n.subject})`);

    const completedNoteTitles = SAMPLE_NOTES.filter((n) =>
      userStats.completedNoteIds.includes(n.id)
    ).map((n) => `${n.title} (${n.subject})`);

    const availableNCERTBooks = NCERT_BOOKS_COLLECTION.filter((nb) =>
      activeSubjects.some((s) => nb.subject.toLowerCase().includes(s.toLowerCase()))
    ).map((nb) => `${nb.title} (${nb.classLevel} - ${nb.subject})`);

    return {
      studentName: displayUserName || null,
      hasCompletedOnboarding: userStats.hasCompletedSetup,
      selectedGoals: userStats.selectedGoals,
      activeGoal: activeGoal || null,
      activeSubjects,
      targetScore: userStats.targetScore || null,
      targetInstitution: userStats.targetCollegeOrInstitution || null,
      practiceStats: {
        questionsAttempted: userStats.questionsAttempted,
        correctAnswers: userStats.correctAnswers,
        incorrectAnswers: userStats.incorrectAnswers,
        overallAccuracyPercent: overallAccuracy,
        topicsStudied: userStats.topicsStudied,
        recentTestSessions: userStats.practiceHistory.slice(0, 5),
      },
      weakTopicAnalysis: {
        hasEnoughRealData: hasEnoughPracticeData && detectedWeakTopics.length > 0,
        weakTopics: detectedWeakTopics.slice(0, 8),
      },
      trackerActivity: {
        totalStudyMinutes: userStats.totalStudyMinutes,
        activeStreakDays: userStats.streak?.current || 1,
        dailyGoals: userStats.dailyGoals,
        subjectsStudiedMinutes: userStats.subjectsStudied,
        pendingStudyTasks: userStats.tasks.filter((t) => !t.completed).map((t) => t.text),
        completedStudyTasksCount: userStats.tasks.filter((t) => t.completed).length,
        recentStudySessions: userStats.studySessions.slice(0, 5),
      },
      savedAndCompletedContent: {
        bookmarkedBooks: savedBookTitles,
        bookmarkedNotes: savedNoteTitles,
        completedNotes: completedNoteTitles,
        relevantNCERTTextbooksInApp: availableNCERTBooks.slice(0, 12),
      },
    };
  }, [userStats, activeGoal, activeSubjects, displayUserName]);

  const handleSelectImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressQuestionImage(file);
      setAttachedImage(compressed);
      setErrorState(null);
    } catch (err) {
      setErrorState(err instanceof Error ? err.message : 'Failed to attach image.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Complete end-to-end SVH AI Question -> Streaming Gemini Answer Pipeline
  // Guarantees user question is immediately saved in conversation history and NEVER disappears
  const sendPromptToSVHAI = async (
    promptText: string,
    imageToUse: string | null,
    retryOptions?: {
      isRetry: boolean;
      existingConversationId: string;
      existingUserMessageId: string;
    }
  ) => {
    if (isSubmittingRef.current) return;
    const rawFromTextarea = textareaRef.current?.value || '';
    const trimmed = (promptText || rawFromTextarea).trim();
    if (!trimmed && !imageToUse) return;

    isSubmittingRef.current = true;
    const requestId = ++activeRequestCounterRef.current;

    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    activeAbortControllerRef.current = abortController;

    setIsGenerating(true);
    setErrorState(null);
    setFailedTurn(null);

    if (!retryOptions?.isRetry) {
      setInputPrompt('');
      setAttachedImage(null);
      if (textareaRef.current) {
        textareaRef.current.value = '';
      }
    }

    const nowIso = new Date().toISOString();
    const targetConvId =
      retryOptions?.existingConversationId ||
      activeConversationId ||
      `svhai_conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const userMsgId =
      retryOptions?.existingUserMessageId ||
      `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const userMsgObj: SVHAIMessage = {
      id: userMsgId,
      role: 'user',
      content: trimmed || 'Uploaded a question image for analysis',
      ...(imageToUse ? { imageUrl: imageToUse } : {}),
      createdAt: nowIso,
    };

    // 1. Permanently commit the user's question into the conversation state immediately
    setActiveConversationId(targetConvId);
    if (!retryOptions?.isRetry) {
      setConversations((prev) => {
        const existingConv = prev.find((c) => c.id === targetConvId);
        if (existingConv) {
          const alreadyHasMsg = existingConv.messages.some((m) => m.id === userMsgId);
          const updatedConv: SVHAIConversation = {
            ...existingConv,
            updatedAt: nowIso,
            messages: alreadyHasMsg
              ? existingConv.messages
              : [...existingConv.messages, userMsgObj],
          };
          return [updatedConv, ...prev.filter((c) => c.id !== targetConvId)];
        } else {
          const newConv: SVHAIConversation = {
            id: targetConvId,
            userId: identity?.userId || userStats.userId || 'local',
            title: (trimmed || 'Doubt Image Analysis').slice(0, 56),
            createdAt: nowIso,
            updatedAt: nowIso,
            messages: [userMsgObj],
          };
          return [newConv, ...prev];
        }
      });
    }

    scrollChatToBottom(false);

    try {
      let activeId = getLatestIdentity() || (await ensureIdentity());
      if (!activeId?.authToken) {
        activeId = await ensureIdentity(true);
      }
      if (!activeId?.authToken) {
        throw new Error('Could not initialize secure session. Please tap Retry.');
      }

      const executeStreamRequest = async (token: string) =>
        apiFetch('/api/svh-ai/chat/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            conversationId: targetConvId,
            clientTurnId: userMsgId,
            isRetry: Boolean(retryOptions?.isRetry),
            message: trimmed,
            imageUrl: imageToUse || undefined,
            studentContext: realStudentContext,
          }),
          signal: abortController.signal,
        });

      let res = await executeStreamRequest(activeId.authToken);
      if (res.status === 401) {
        const refreshedId = await ensureIdentity(true);
        if (refreshedId?.authToken) {
          res = await executeStreamRequest(refreshedId.authToken);
        }
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.error || 'SVH AI could not process your request right now. Please tap Retry.'
        );
      }

      const contentType = res.headers.get('content-type') || '';

      // Handle SSE Streaming Response
      if (contentType.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let streamingAssistantId = `msg_ai_${Date.now()}`;
        let accumulatedAnswer = '';
        let receivedDone = false;

        const updateStreamingMessage = (convId: string, msgId: string, fullText: string) => {
          if (activeRequestCounterRef.current !== requestId) return;
          const nowStr = new Date().toISOString();
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== convId) return c;
              const hasAiMsg = c.messages.some((m) => m.id === msgId);
              const updatedMessages = hasAiMsg
                ? c.messages.map((m) =>
                    m.id === msgId ? { ...m, content: fullText } : m
                  )
                : [
                    ...c.messages,
                    {
                      id: msgId,
                      role: 'assistant' as const,
                      content: fullText,
                      createdAt: nowStr,
                    },
                  ];
              return {
                ...c,
                updatedAt: nowStr,
                messages: updatedMessages,
              };
            })
          );
          scrollChatToBottom(true);
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const events = buffer.split('\n\n');
          buffer = events.pop() || '';

          for (const rawEvent of events) {
            const lines = rawEvent.split('\n');
            for (const line of lines) {
              if (!line.startsWith('data:')) continue;
              const jsonStr = line.slice(5).trim();
              if (!jsonStr) continue;

              let eventData: {
                type?: string;
                assistantMessageId?: string;
                delta?: string;
                error?: string;
                conversation?: SVHAIConversation;
              };
              try {
                eventData = JSON.parse(jsonStr);
              } catch {
                continue;
              }

              if (eventData.type === 'meta') {
                if (eventData.assistantMessageId) {
                  streamingAssistantId = eventData.assistantMessageId;
                }
              } else if (eventData.type === 'chunk') {
                if (typeof eventData.delta === 'string' && eventData.delta.length > 0) {
                  accumulatedAnswer += eventData.delta;
                  updateStreamingMessage(targetConvId, streamingAssistantId, accumulatedAnswer);
                }
              } else if (eventData.type === 'done') {
                receivedDone = true;
                if (eventData.conversation && activeRequestCounterRef.current === requestId) {
                  const finalConv = eventData.conversation;
                  setConversations((prev) => [
                    finalConv,
                    ...prev.filter((c) => c.id !== finalConv.id),
                  ]);
                  setActiveConversationId(finalConv.id);
                }
              } else if (eventData.type === 'error') {
                throw new Error(
                  eventData.error ||
                    'SVH AI encountered an error while generating your answer. Please tap Retry.'
                );
              }
            }
          }
        }

        if (!receivedDone && accumulatedAnswer.trim().length === 0) {
          throw new Error('SVH AI returned an empty response. Please tap Retry.');
        }
      } else {
        // Fallback if JSON unary response is returned
        const data = await res.json();
        const updatedConv: SVHAIConversation = data.conversation;
        if (updatedConv?.id && activeRequestCounterRef.current === requestId) {
          setConversations((prev) => [
            updatedConv,
            ...prev.filter((c) => c.id !== updatedConv.id),
          ]);
          setActiveConversationId(updatedConv.id);
        }
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        return;
      }
      if (activeRequestCounterRef.current === requestId) {
        setErrorState(
          err instanceof Error
            ? err.message
            : 'Connection error while contacting SVH AI. Your question is saved — please tap Retry.'
        );
        setFailedTurn({
          conversationId: targetConvId,
          userMessageId: userMsgId,
          message: trimmed,
          imageUrl: imageToUse,
        });
      }
    } finally {
      if (activeRequestCounterRef.current === requestId) {
        setIsGenerating(false);
        isSubmittingRef.current = false;
        scrollChatToBottom(false);
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 20);
      }
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGenerating || isSubmittingRef.current) return;
    await sendPromptToSVHAI(inputPrompt, attachedImage);
  };

  const handleRetryFailedTurn = async () => {
    if (!failedTurn || isGenerating || isSubmittingRef.current) return;
    await sendPromptToSVHAI(failedTurn.message, failedTurn.imageUrl, {
      isRetry: true,
      existingConversationId: failedTurn.conversationId,
      existingUserMessageId: failedTurn.userMessageId,
    });
  };

  const handleStartNewChat = () => {
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
    }
    isSubmittingRef.current = false;
    setIsGenerating(false);
    setActiveConversationId(null);
    setShowHistoryView(false);
    setErrorState(null);
    setFailedTurn(null);
    setInputPrompt('');
    setAttachedImage(null);
  };

  const handleDeleteConversation = async (convId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeConversationId === convId) {
      setActiveConversationId(null);
    }
    const activeId = identity || (await ensureIdentity());
    if (!activeId?.authToken) return;
    try {
      await apiFetch(`/api/svh-ai/conversations/${convId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${activeId.authToken}`,
        },
      });
    } catch {
      // ignore network error
    }
  };

  const handleClearAllConversations = async () => {
    setConversations([]);
    setActiveConversationId(null);
    setConfirmClearAll(false);
    setShowHistoryView(false);
    const activeId = identity || (await ensureIdentity());
    if (!activeId?.authToken) return;
    try {
      await apiFetch('/api/svh-ai/conversations', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${activeId.authToken}`,
        },
      });
    } catch {
      // ignore network error
    }
  };

  // Personalized quick prompts based on real user context
  const quickSuggestions = useMemo(() => {
    const primarySubject = activeSubjects[0] || 'Science';
    const goalLabel = activeGoal || 'my exams';
    const list = [
      `Explain a key ${primarySubject} concept step-by-step`,
      `Give me 5 high-yield practice MCQs for ${goalLabel}`,
      `Create a realistic study plan based on my ${goalLabel} syllabus`,
      `Generate rapid revision notes & important formulas for ${primarySubject}`,
    ];
    if (realStudentContext.weakTopicAnalysis.hasEnoughRealData) {
      list.unshift('Analyze my practice accuracy and help me revise my weak topics');
    }
    return list.slice(0, 4);
  }, [activeGoal, activeSubjects, realStudentContext.weakTopicAnalysis.hasEnoughRealData]);

  // Real Smart Revision + Spaced Repetition schedule derived from real student data
  const smartRevisionList: RevisionItem[] = useMemo(() => {
    return computeSmartRevisionSchedule(userStats);
  }, [userStats]);

  const handleMarkRevisionCompleted = useCallback(
    async (revItem: RevisionItem) => {
      const updatedSchedule = advanceRevisionItemStage(smartRevisionList, revItem.id);
      if (onUpdateStats) {
        onUpdateStats({ revisionSchedule: updatedSchedule });
      }
      const activeId = getLatestIdentity() || (await ensureIdentity());
      if (activeId?.authToken) {
        apiFetch('/api/svh-ai/smart-revision', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeId.authToken}`,
          },
          body: JSON.stringify({
            action: 'complete_review',
            revisionId: revItem.id,
            userStats: {
              ...userStats,
              revisionSchedule: updatedSchedule,
            },
          }),
        }).catch(() => {});
      }
    },
    [smartRevisionList, onUpdateStats, getLatestIdentity, ensureIdentity, userStats]
  );

  // Generate AI Personal Study Plan from real Firebase/backend data via Gemini
  const handleGenerateAIStudyPlan = useCallback(async () => {
    if (isGeneratingPlan) return;
    setIsGeneratingPlan(true);
    setPlanError(null);
    setPlanNotice(null);

    try {
      let activeId = getLatestIdentity() || (await ensureIdentity());
      if (!activeId?.authToken) {
        activeId = await ensureIdentity(true);
      }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (activeId?.authToken) {
        headers.Authorization = `Bearer ${activeId.authToken}`;
      }

      const res = await apiFetch('/api/svh-ai/study-plan', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          studentContext: realStudentContext,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not generate AI study plan right now.');
      }

      if (data.insufficientData) {
        setPlanNotice(
          data.notice ||
            'More real study activity is needed to generate a data-driven personal study plan. Solve practice questions or log a focus session first!'
        );
      } else if (data.studyPlan && onUpdateStats) {
        onUpdateStats({
          activeStudyPlan: data.studyPlan as StudyPlanRecord,
          svhAiUsageCount: (userStats.svhAiUsageCount || 0) + 1,
        });
      }
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Failed to generate AI Study Plan.');
    } finally {
      setIsGeneratingPlan(false);
    }
  }, [
    isGeneratingPlan,
    getLatestIdentity,
    ensureIdentity,
    realStudentContext,
    onUpdateStats,
    userStats.svhAiUsageCount,
  ]);

  const handleAddPlanItemToTracker = useCallback(
    (item: StudyPlanRecord['items'][number]) => {
      if (!onUpdateStats) return;
      const taskText = `[AI Plan · ${item.dayLabel}] ${item.subject}: ${item.topic} (${item.practiceQuestions} Qs)`;
      const alreadyExists = userStats.tasks.some((t) => t.text === taskText);
      if (alreadyExists) return;
      const newTask: StudyTask = {
        id: `task_ai_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        text: taskText,
        completed: false,
        createdAt: new Date().toISOString(),
        subject: item.subject,
        chapter: item.topic,
        targetMinutes: item.focusMinutes,
        priority: item.priority,
      };
      onUpdateStats({
        tasks: [newTask, ...userStats.tasks],
      });
    },
    [onUpdateStats, userStats.tasks]
  );

  // Stop all active audio playback and speech synthesis cleanly
  const stopAllVoicePlayback = useCallback(() => {
    if (activeAudioElementRef.current) {
      try {
        activeAudioElementRef.current.pause();
        activeAudioElementRef.current.currentTime = 0;
        activeAudioElementRef.current.src = '';
      } catch {
        // ignore
      }
      activeAudioElementRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    setSpeakingMessageId(null);
    setLoadingAudioMessageId(null);
  }, []);

  // Select a natural-sounding MALE voice when falling back to Web SpeechSynthesis
  const speakWithDeviceMaleVoice = useCallback((msgId: string, cleanText: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeakingMessageId(null);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voices = window.speechSynthesis.getVoices() || [];
      const maleVoice =
        voices.find(
          (v) =>
            /en/i.test(v.lang) &&
            /\b(male|david|rishi|prabhat|daniel|alex|james|guy|christopher|eric|george|mark|arthur|oliver)\b/i.test(
              v.name
            )
        ) ||
        voices.find(
          (v) =>
            /en-IN|en-GB|en-US/i.test(v.lang) &&
            !/\b(female|zira|heera|veena|samantha|victoria|karen|moira|tessa|aria|jenny)\b/i.test(
              v.name
            )
        ) ||
        voices.find((v) => /en/i.test(v.lang));

      if (maleVoice) {
        utterance.voice = maleVoice;
        utterance.lang = maleVoice.lang;
      } else {
        utterance.lang = 'en-IN';
      }
      utterance.pitch = 0.92;
      utterance.rate = 1.0;
      utterance.onstart = () => setSpeakingMessageId(msgId);
      utterance.onend = () => setSpeakingMessageId(null);
      utterance.onerror = () => setSpeakingMessageId(null);
      setSpeakingMessageId(msgId);
      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeakingMessageId(null);
    }
  }, []);

  // Play a synthesized audio data URL with proper browser autoplay handling
  const playAudioDataUrl = useCallback(
    async (msgId: string, audioDataUrl: string, fallbackText: string) => {
      stopAllVoicePlayback();
      setPendingManualPlayAudio(null);
      try {
        const audio = new Audio(audioDataUrl);
        activeAudioElementRef.current = audio;
        audio.onplay = () => {
          setSpeakingMessageId(msgId);
          setLoadingAudioMessageId(null);
        };
        audio.onended = () => {
          setSpeakingMessageId(null);
          activeAudioElementRef.current = null;
        };
        audio.onerror = () => {
          activeAudioElementRef.current = null;
          speakWithDeviceMaleVoice(msgId, fallbackText);
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
      } catch (err) {
        // Browser blocked autoplay without direct user gesture: provide explicit Play/Listen button
        const errName = (err as Error)?.name || '';
        if (errName === 'NotAllowedError') {
          setLoadingAudioMessageId(null);
          setSpeakingMessageId(null);
          setPendingManualPlayAudio({ messageId: msgId, audioDataUrl });
        } else {
          speakWithDeviceMaleVoice(msgId, fallbackText);
        }
      }
    },
    [stopAllVoicePlayback, speakWithDeviceMaleVoice]
  );

  // Full AI Voice Tutor TTS handler (calls secure Gemini Male TTS backend first, falls back to device male voice)
  const handleToggleSpeakMessage = useCallback(
    async (msg: SVHAIMessage) => {
      if (speakingMessageId === msg.id || loadingAudioMessageId === msg.id) {
        stopAllVoicePlayback();
        return;
      }

      stopAllVoicePlayback();
      const cleanText = msg.content
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/[#*`_~]/g, '')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
      if (!cleanText) return;

      setLoadingAudioMessageId(msg.id);

      try {
        let activeId = getLatestIdentity() || (await ensureIdentity());
        if (!activeId?.authToken) {
          activeId = await ensureIdentity(true);
        }
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (activeId?.authToken) {
          headers.Authorization = `Bearer ${activeId.authToken}`;
        }

        const res = await apiFetch('/api/svh-ai/voice/tts', {
          method: 'POST',
          headers,
          body: JSON.stringify({ text: cleanText }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.audioDataUrl) {
            await playAudioDataUrl(msg.id, data.audioDataUrl, cleanText);
            return;
          }
        }
      } catch {
        // fallback below
      }

      setLoadingAudioMessageId(null);
      speakWithDeviceMaleVoice(msg.id, cleanText);
    },
    [
      speakingMessageId,
      loadingAudioMessageId,
      stopAllVoicePlayback,
      getLatestIdentity,
      ensureIdentity,
      playAudioDataUrl,
      speakWithDeviceMaleVoice,
    ]
  );

  // Clean up any active microphone stream and audio analyser
  const cleanupMicRecording = useCallback(() => {
    if (analyserRafRef.current !== null) {
      cancelAnimationFrame(analyserRafRef.current);
      analyserRafRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
      mediaStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setMicAudioLevel(0);
    setRecordingSeconds(0);
    setIsListeningMic(false);
  }, []);

  const handleCancelVoiceRecording = useCallback(() => {
    recordedChunksRef.current = [];
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        cleanupMicRecording();
      };
      try {
        mediaRecorderRef.current.stop();
      } catch {
        cleanupMicRecording();
      }
    } else {
      cleanupMicRecording();
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.abort?.();
        speechRecognitionRef.current.stop?.();
      } catch {
        // ignore
      }
    }
  }, [cleanupMicRecording]);

  const handlePlayBlockedAudio = useCallback(() => {
    if (!pendingManualPlayAudio) return;
    playAudioDataUrl(
      pendingManualPlayAudio.messageId,
      pendingManualPlayAudio.audioDataUrl,
      ''
    );
  }, [pendingManualPlayAudio, playAudioDataUrl]);

  // Live recording timer while microphone is active
  useEffect(() => {
    if (!isListeningMic) {
      setRecordingSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isListeningMic]);

  // Stop speech & mic recording when closing assistant or unmounting
  useEffect(() => {
    if (!isOpen) {
      stopAllVoicePlayback();
      cleanupMicRecording();
    }
  }, [isOpen, stopAllVoicePlayback, cleanupMicRecording]);

  useEffect(() => {
    return () => {
      stopAllVoicePlayback();
      cleanupMicRecording();
    };
  }, [stopAllVoicePlayback, cleanupMicRecording]);

  // Real Microphone -> Audio Recording -> Speech-to-Text -> Secure Gemini Backend -> TTS
  const handleToggleVoiceInput = useCallback(async () => {
    if (typeof window === 'undefined') return;

    // If currently recording, stop and transcribe
    if (isListeningMic) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          cleanupMicRecording();
        }
        return;
      }
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      cleanupMicRecording();
      return;
    }

    stopAllVoicePlayback();
    setErrorState(null);
    setVoiceError(null);

    // Check HTTPS / Secure Context requirement on Web
    if (
      typeof window !== 'undefined' &&
      !window.isSecureContext &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      const msg = 'Microphone access requires a secure HTTPS connection.';
      setVoiceError(msg);
      setErrorState(msg);
      return;
    }

    // 0. Explicitly check 'granted', 'denied', and 'prompt' states via Permissions API when supported
    let currentPermState: PermissionState | 'unknown' = micPermissionGrantedRef.current
      ? 'granted'
      : micPermissionState;

    if (navigator.permissions && typeof navigator.permissions.query === 'function') {
      try {
        const permStatus = await navigator.permissions.query({
          name: 'microphone' as PermissionName,
        });
        currentPermState = permStatus.state;
        setMicPermissionState(permStatus.state);
        if (permStatus.state === 'granted') {
          micPermissionGrantedRef.current = true;
        }
        permStatus.onchange = () => {
          setMicPermissionState(permStatus.state);
          if (permStatus.state === 'granted') {
            micPermissionGrantedRef.current = true;
          } else if (permStatus.state === 'denied') {
            micPermissionGrantedRef.current = false;
          }
        };
      } catch {
        // Some Android WebViews or browsers do not support querying 'microphone' in navigator.permissions.query;
        // fall through to navigator.mediaDevices.getUserMedia
      }
    }

    // Explicit branch for 'denied' state: do not call getUserMedia or trigger false prompts; show clear settings/retry guidance
    if (currentPermState === 'denied' && !micPermissionGrantedRef.current) {
      const deniedMsg =
        'Microphone permission is currently blocked. Please enable Microphone access in your browser site settings or Android App Settings (Settings → Apps → Study Vault Hub → Permissions → Microphone → Allow), then tap the Mic button to retry.';
      setVoiceError(deniedMsg);
      setErrorState(deniedMsg);
      return;
    }

    // Explicit handling for 'granted' (records immediately without re-prompting) and 'prompt' (requests permission via standard OS/browser dialog)
    if (navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined') {
      try {
        let stream: MediaStream;
        if (currentPermState === 'granted' || micPermissionGrantedRef.current) {
          // Permission is already 'granted' -> start recording immediately without extra permission checks
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            });
          } catch {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          }
        } else {
          // Permission state is 'prompt' or 'unknown' -> request permission once via standard getUserMedia
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            });
          } catch (constraintErr) {
            const cName = (constraintErr as Error)?.name || '';
            if (cName === 'NotAllowedError' || cName === 'PermissionDeniedError') {
              throw constraintErr;
            }
            // Fallback to basic audio constraint on older Android WebViews so constraint mismatches never trigger a false permission error
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          }
        }

        // Successfully acquired stream -> mark permission as granted so subsequent recordings start immediately
        micPermissionGrantedRef.current = true;
        setMicPermissionState('granted');
        mediaStreamRef.current = stream;
        recordedChunksRef.current = [];

        // Real-time audio waveform level indicator from actual microphone input
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const audioCtx = new AudioCtx();
            audioContextRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            let lastMeterUpdate = 0;
            const updateMeter = (timestamp: number) => {
              if (!mediaStreamRef.current) return;
              if (timestamp - lastMeterUpdate >= 90) {
                lastMeterUpdate = timestamp;
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                  sum += dataArray[i];
                }
                const avg = sum / dataArray.length;
                const nextLevel = Math.min(100, Math.round((avg / 128) * 100));
                setMicAudioLevel((prev) => (Math.abs(prev - nextLevel) >= 3 ? nextLevel : prev));
              }
              analyserRafRef.current = requestAnimationFrame(updateMeter);
            };
            analyserRafRef.current = requestAnimationFrame(updateMeter);
          }
        } catch {
          // ignore meter error
        }

        const preferredMime =
          typeof MediaRecorder.isTypeSupported === 'function'
            ? MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
              ? 'audio/webm;codecs=opus'
              : MediaRecorder.isTypeSupported('audio/webm')
              ? 'audio/webm'
              : MediaRecorder.isTypeSupported('audio/mp4')
              ? 'audio/mp4'
              : ''
            : '';

        const recorder = preferredMime
          ? new MediaRecorder(stream, { mimeType: preferredMime })
          : new MediaRecorder(stream);

        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) {
            recordedChunksRef.current.push(ev.data);
          }
        };

        recorder.onstop = async () => {
          const chunks = [...recordedChunksRef.current];
          const actualMime = recorder.mimeType || preferredMime || 'audio/webm';
          cleanupMicRecording();

          if (chunks.length === 0) {
            const noAudioMsg = 'No audio was captured. Please tap the microphone and speak clearly.';
            setVoiceError(noAudioMsg);
            setErrorState(noAudioMsg);
            return;
          }

          const blob = new Blob(chunks, { type: actualMime });
          if (blob.size < 400) {
            const shortMsg = 'Recording was too short. Please speak your question clearly.';
            setVoiceError(shortMsg);
            setErrorState(shortMsg);
            return;
          }

          setIsTranscribingMic(true);
          try {
            const base64Audio = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const resStr = String(reader.result || '');
                const commaIdx = resStr.indexOf(',');
                resolve(commaIdx >= 0 ? resStr.slice(commaIdx + 1) : resStr);
              };
              reader.onerror = () => reject(new Error('Failed to read recorded audio.'));
              reader.readAsDataURL(blob);
            });

            let activeId = getLatestIdentity() || (await ensureIdentity());
            if (!activeId?.authToken) {
              activeId = await ensureIdentity(true);
            }
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (activeId?.authToken) {
              headers.Authorization = `Bearer ${activeId.authToken}`;
            }

            const sttRes = await apiFetch('/api/svh-ai/voice/transcribe', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                audioBase64: base64Audio,
                mimeType: actualMime.split(';')[0] || 'audio/webm',
              }),
            });

            const sttData = await sttRes.json().catch(() => ({}));
            if (!sttRes.ok) {
              throw new Error(sttData.error || 'Could not transcribe your voice recording.');
            }

            const transcript = String(sttData.transcript || '').trim();
            if (!transcript) {
              const emptyTranscriptMsg =
                'Could not detect clear speech in the recording. Please try again or type your question.';
              setVoiceError(emptyTranscriptMsg);
              setErrorState(emptyTranscriptMsg);
              return;
            }

            setInputPrompt(transcript);
            if (voiceSendAfterTranscribe) {
              setAutoSpeakEnabled(true);
              setActiveAiMode('chat');
              await sendPromptToSVHAI(transcript, attachedImage);
            }
          } catch (err) {
            const transcribeErrMsg =
              err instanceof Error
                ? err.message
                : 'Voice transcription failed. Please try again or type your question.';
            setVoiceError(transcribeErrMsg);
            setErrorState(transcribeErrMsg);
          } finally {
            setIsTranscribingMic(false);
          }
        };

        recorder.start(250);
        setIsListeningMic(true);
        return;
      } catch (permErr) {
        cleanupMicRecording();
        const errName = (permErr as Error)?.name || '';
        const errMsg = (permErr as Error)?.message || '';
        if (
          errName === 'NotAllowedError' ||
          errName === 'PermissionDeniedError' ||
          errMsg.toLowerCase().includes('permission denied') ||
          errMsg.toLowerCase().includes('not allowed')
        ) {
          micPermissionGrantedRef.current = false;
          setMicPermissionState('denied');
          const notAllowedMsg =
            'Microphone permission was not granted. Please allow Microphone access in your browser address bar or Android App Settings (Settings → Apps → Study Vault Hub → Permissions → Microphone → Allow), then tap the Mic button to retry.';
          setVoiceError(notAllowedMsg);
          setErrorState(notAllowedMsg);
          return;
        }
        if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
          const notFoundMsg =
            'No microphone hardware was detected on this device. Please connect a microphone or type your question below.';
          setVoiceError(notFoundMsg);
          setErrorState(notFoundMsg);
          return;
        }
        if (errName === 'NotReadableError' || errName === 'TrackStartError') {
          const busyMsg =
            'Your microphone is currently in use by another application. Please close other audio/call apps and tap the Mic button to retry.';
          setVoiceError(busyMsg);
          setErrorState(busyMsg);
          return;
        }
        const fallbackErrMsg = errMsg
          ? `Could not start audio recording (${errMsg}). Please tap the Mic button to retry or type your question.`
          : 'Could not start audio recording. Please tap the Mic button to retry or type your question.';
        setVoiceError(fallbackErrMsg);
        setErrorState(fallbackErrMsg);
        return;
      }
    }

    // 2. Fallback to browser SpeechRecognition if MediaRecorder is unavailable
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      const noRecMsg =
        'Microphone recording is not supported on this device/browser. Please type your question.';
      setVoiceError(noRecMsg);
      setErrorState(noRecMsg);
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = 'en-IN';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onstart = () => setIsListeningMic(true);
      rec.onresult = async (event: any) => {
        const transcript = (event?.results?.[0]?.[0]?.transcript || '').trim();
        setIsListeningMic(false);
        if (transcript) {
          setInputPrompt(transcript);
          if (voiceSendAfterTranscribe) {
            setAutoSpeakEnabled(true);
            setActiveAiMode('chat');
            await sendPromptToSVHAI(transcript, attachedImage);
          }
        }
      };
      rec.onerror = () => {
        setIsListeningMic(false);
        const recErr = 'Could not capture voice input. Please check microphone permissions.';
        setVoiceError(recErr);
        setErrorState(recErr);
      };
      rec.onend = () => setIsListeningMic(false);
      speechRecognitionRef.current = rec;
      rec.start();
    } catch {
      setIsListeningMic(false);
      const startErr = 'Could not start voice recognition.';
      setVoiceError(startErr);
      setErrorState(startErr);
    }
  }, [
    isListeningMic,
    micPermissionState,
    cleanupMicRecording,
    stopAllVoicePlayback,
    getLatestIdentity,
    ensureIdentity,
    voiceSendAfterTranscribe,
    attachedImage,
  ]);

  // Generate Smart Study Session via Secure Gemini Backend
  const handleGenerateSmartStudySession = useCallback(async () => {
    if (isGeneratingSmartSession) return;
    setIsGeneratingSmartSession(true);
    setSmartSessionError(null);
    setSmartSessionNotice(null);

    try {
      let activeId = getLatestIdentity() || (await ensureIdentity());
      if (!activeId?.authToken) {
        activeId = await ensureIdentity(true);
      }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (activeId?.authToken) {
        headers.Authorization = `Bearer ${activeId.authToken}`;
      }

      const res = await apiFetch('/api/svh-ai/smart-session', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          subject: smartSessionSubject.trim() || undefined,
          topic: smartSessionTopic.trim() || undefined,
          durationMinutes: smartSessionDuration,
          studentContext: realStudentContext,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not generate Smart Study Session right now.');
      }

      if (data.insufficientData) {
        setSmartSessionNotice(
          data.notice ||
            'Not enough data yet — enter a specific topic above or complete at least one practice question or focus session first.'
        );
        setSmartSessionPlan(null);
      } else if (data.smartSession) {
        setSmartSessionPlan(data.smartSession as SmartStudySessionPlan);
      }
    } catch (err) {
      setSmartSessionError(
        err instanceof Error ? err.message : 'Failed to generate Smart Study Session.'
      );
    } finally {
      setIsGeneratingSmartSession(false);
    }
  }, [
    isGeneratingSmartSession,
    getLatestIdentity,
    ensureIdentity,
    smartSessionSubject,
    smartSessionTopic,
    smartSessionDuration,
    realStudentContext,
  ]);

  return (
    <>
      {/* ===================================================================== */}
      {/* FLOATING SVH AI BUTTON (Compact Circular, Fully Draggable)            */}
      {/* ===================================================================== */}
      {!isOpen && (
        <div
          ref={floatingContainerRef}
          style={{
            transform: `translate3d(${buttonCoords.x}px, ${buttonCoords.y}px, 0)`,
          }}
          className="fixed top-0 left-0 z-40 pointer-events-none will-change-transform"
        >
          <button
            type="button"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUpOrCancel}
            onPointerCancel={handlePointerUpOrCancel}
            aria-label="Open SVH AI Study Assistant"
            title="SVH AI Study Assistant (Tap to open, drag to move)"
            className={`pointer-events-auto touch-none select-none group relative w-14 h-14 aspect-square rounded-full bg-gradient-to-br from-[#0b1326] via-[#101c38] to-[#0b1326] border-2 border-[#d4af37]/70 hover:border-[#d4af37] text-[#fbf9f4] shadow-[0_0_25px_rgba(212,175,55,0.28)] hover:shadow-[0_0_32px_rgba(212,175,55,0.45)] flex items-center justify-center ${
              isDragging
                ? 'scale-105 cursor-grabbing'
                : 'hover:scale-105 active:scale-95 transition-transform duration-150 cursor-grab'
            }`}
          >
            {/* Subtle elegant ambient pulse ring */}
            <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#d4af37]/20 via-amber-400/10 to-[#d4af37]/20 blur-sm animate-pulse pointer-events-none" />

            {/* Existing SVH AI Brand Logo */}
            <div className="relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0 aspect-square pointer-events-none">
              <img
                src={logoSrc}
                alt="SVH AI"
                draggable={false}
                className="w-full h-full rounded-full object-contain aspect-square select-none pointer-events-none"
                referrerPolicy="no-referrer"
                onError={() => {
                  if (logoSrc !== '/official_logo.jpg') {
                    setLogoSrc('/official_logo.jpg');
                  }
                }}
              />
            </div>

            {/* Existing Sparkles Accent Badge */}
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#0b1326] border border-[#d4af37]/70 flex items-center justify-center shadow-sm pointer-events-none">
              <Sparkles className="w-3 h-3 text-[#d4af37]" />
            </span>
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* EXPANDED SVH AI CHAT PANEL / MODAL                                    */}
      {/* ===================================================================== */}
      {isOpen && (
        <div className="fixed inset-0 z-50 sm:inset-auto sm:bottom-5 sm:right-5 flex flex-col">
          {/* Mobile backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            className="hidden sm:block fixed inset-0 bg-black/40 backdrop-blur-[2px] -z-10"
          />

          <div
            className={`w-full h-full sm:rounded-3xl bg-gradient-to-b from-[#0a1224] via-[#080f1e] to-[#060b18] border-0 sm:border-2 sm:border-[#d4af37]/45 shadow-[0_0_50px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden transition-all duration-200 will-change-transform ${
              isExpandedDesktop
                ? 'sm:w-[92vw] sm:max-w-4xl sm:h-[85vh] sm:max-h-[calc(100dvh-2rem)]'
                : 'sm:w-[430px] md:w-[480px] sm:h-[660px] sm:max-h-[calc(100vh-2.5rem)] sm:max-h-[calc(100dvh-2rem)]'
            }`}
          >
            {/* Top Header */}
            <div className="px-4 py-3.5 bg-[#0c162c]/95 border-b border-[#d4af37]/25 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 aspect-square">
                  <img
                    src={logoSrc}
                    alt="SVH AI"
                    className="w-full h-full rounded-full object-contain aspect-square"
                    referrerPolicy="no-referrer"
                    onError={() => {
                      if (logoSrc !== '/official_logo.jpg') {
                        setLogoSrc('/official_logo.jpg');
                      }
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
                    <h2 className="font-display text-sm sm:text-base font-bold text-[#fbf9f4] truncate">
                      SVH AI
                    </h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/30">
                      Personal Tutor
                    </span>
                  </div>
                  <p className="text-[10px] text-[#cbd5e1]/80 truncate">
                    {activeGoal ? `Tailored for ${activeGoal}` : 'Study Vault Hub AI Assistant'}
                  </p>
                </div>
              </div>

              {/* Header Controls: New Chat, History, Expand (Desktop), Close */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleStartNewChat}
                  title="New Chat"
                  className="px-2.5 py-1.5 rounded-xl bg-[#131b2e] hover:bg-[#19243d] border border-[#d4af37]/25 text-xs text-[#fbf9f4] hover:text-[#d4af37] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span className="hidden xs:inline">New</span>
                </button>

                <button
                  onClick={() => setShowHistoryView((prev) => !prev)}
                  title="Conversation History"
                  className={`p-2 rounded-xl border text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                    showHistoryView
                      ? 'bg-[#d4af37] text-[#080d1a] border-[#d4af37] font-bold'
                      : 'bg-[#131b2e] hover:bg-[#19243d] border-[#d4af37]/25 text-[#cbd5e1] hover:text-[#d4af37]'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-mono">{conversations.length}</span>
                </button>

                <button
                  onClick={() => setIsExpandedDesktop((prev) => !prev)}
                  title={isExpandedDesktop ? 'Compact Panel' : 'Expand Panel'}
                  className="hidden sm:flex p-2 rounded-xl bg-[#131b2e] hover:bg-[#19243d] border border-[#d4af37]/25 text-[#cbd5e1] hover:text-[#d4af37] transition-colors cursor-pointer"
                >
                  {isExpandedDesktop ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Minimize SVH AI"
                  title="Minimize / Close"
                  className="p-2 rounded-xl bg-[#131b2e] hover:bg-rose-950/70 border border-[#d4af37]/25 hover:border-rose-500/40 text-[#cbd5e1] hover:text-rose-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Real User Data Context Strip */}
            <div className="px-4 py-2 bg-[#081020] border-b border-[#1e293b] flex items-center justify-between gap-2 text-[11px] text-[#cbd5e1] overflow-x-auto no-scrollbar shrink-0">
              <div className="flex items-center gap-3 whitespace-nowrap">
                {displayUserName && (
                  <span className="text-[#fbf9f4] font-medium">
                    Student: <strong className="text-[#d4af37]">{displayUserName}</strong>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-[#d4af37]" />
                  <span>{activeGoal || 'General Study'}</span>
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>
                    {userStats.questionsAttempted > 0
                      ? `${userStats.questionsAttempted} Solved (${(
                          (userStats.correctAnswers / userStats.questionsAttempted) *
                          100
                        ).toFixed(0)}%)`
                      : '0 Solved yet'}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>{userStats.totalStudyMinutes}m Tracked</span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const next = !autoSpeakEnabled;
                  setAutoSpeakEnabled(next);
                  if (!next) {
                    stopAllVoicePlayback();
                  }
                }}
                title="Toggle AI Voice Tutor (Male Voice)"
                className={`px-2 py-0.5 rounded-lg border text-[10px] font-mono flex items-center gap-1 shrink-0 cursor-pointer ${
                  autoSpeakEnabled
                    ? 'bg-[#d4af37] text-[#080d1a] border-[#d4af37] font-bold'
                    : 'bg-[#131b2e] text-[#cbd5e1] border-[#d4af37]/30 hover:text-[#d4af37]'
                }`}
              >
                {autoSpeakEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                <span>Voice Tutor</span>
              </button>
            </div>

            {/* Capability Switcher Bar: AI Tutor Chat | Smart Session | AI Study Planner | Smart Revision | Insights */}
            {!showHistoryView && (
              <div className="px-3 py-1.5 bg-[#0a1224] border-b border-[#1e293b] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveAiMode('chat')}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap transition-colors cursor-pointer ${
                    activeAiMode === 'chat'
                      ? 'bg-[#d4af37] text-[#080d1a] font-bold'
                      : 'bg-[#131b2e] text-[#cbd5e1] hover:text-[#d4af37] border border-[#d4af37]/20'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>AI Chat</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAiMode('session')}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap transition-colors cursor-pointer ${
                    activeAiMode === 'session'
                      ? 'bg-[#d4af37] text-[#080d1a] font-bold'
                      : 'bg-[#131b2e] text-[#cbd5e1] hover:text-[#d4af37] border border-[#d4af37]/20'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  <span>Smart Session</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAiMode('planner')}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap transition-colors cursor-pointer ${
                    activeAiMode === 'planner'
                      ? 'bg-[#d4af37] text-[#080d1a] font-bold'
                      : 'bg-[#131b2e] text-[#cbd5e1] hover:text-[#d4af37] border border-[#d4af37]/20'
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  <span>Study Planner</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAiMode('revision')}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap transition-colors cursor-pointer ${
                    activeAiMode === 'revision'
                      ? 'bg-[#d4af37] text-[#080d1a] font-bold'
                      : 'bg-[#131b2e] text-[#cbd5e1] hover:text-[#d4af37] border border-[#d4af37]/20'
                  }`}
                >
                  <Brain className="w-3 h-3" />
                  <span>Smart Revision</span>
                  {smartRevisionList.filter((r) => r.status === 'Due Now').length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-mono">
                      {smartRevisionList.filter((r) => r.status === 'Due Now').length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAiMode('insights')}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap transition-colors cursor-pointer ${
                    activeAiMode === 'insights'
                      ? 'bg-[#d4af37] text-[#080d1a] font-bold'
                      : 'bg-[#131b2e] text-[#cbd5e1] hover:text-[#d4af37] border border-[#d4af37]/20'
                  }`}
                >
                  <BarChart3 className="w-3 h-3" />
                  <span>Insights</span>
                </button>
              </div>
            )}

            {/* ================================================================= */}
            {/* CONVERSATION HISTORY VIEW                                         */}
            {/* ================================================================= */}
            {showHistoryView ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowHistoryView(false)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#d4af37] hover:underline"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to Current Chat</span>
                  </button>

                  {conversations.length > 0 && (
                    <div>
                      {confirmClearAll ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-rose-300">Clear all?</span>
                          <button
                            onClick={handleClearAllConversations}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold"
                          >
                            Yes, Clear
                          </button>
                          <button
                            onClick={() => setConfirmClearAll(false)}
                            className="px-2 py-1 rounded-lg bg-[#131b2e] text-[#cbd5e1] text-[11px]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmClearAll(true)}
                          className="px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 hover:bg-rose-900/60 text-[11px] flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Clear All History</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <h3 className="font-display text-sm font-bold text-[#fbf9f4] uppercase tracking-wider">
                  Your Saved Conversations ({conversations.length})
                </h3>

                {conversations.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-[#0c1428] border border-[#d4af37]/20 text-center space-y-2">
                    <History className="w-8 h-8 text-[#d4af37] mx-auto opacity-80" />
                    <p className="text-sm font-semibold text-[#fbf9f4]">
                      No previous conversations yet.
                    </p>
                    <p className="text-xs text-[#9ca3af]">
                      Your real study sessions with SVH AI will be saved here automatically.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {conversations.map((conv) => {
                      const isCurrent = conv.id === activeConversationId;
                      return (
                        <div
                          key={conv.id}
                          onClick={() => {
                            setActiveConversationId(conv.id);
                            setShowHistoryView(false);
                          }}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isCurrent
                              ? 'bg-[#131f3a] border-[#d4af37] shadow-md'
                              : 'bg-[#0b1324] hover:bg-[#101b33] border-[#d4af37]/20'
                          }`}
                        >
                          <div className="min-w-0 space-y-1">
                            <h4 className="font-display text-xs sm:text-sm font-bold text-[#fbf9f4] truncate">
                              {conv.title}
                            </h4>
                            <p className="text-[11px] text-[#9ca3af]">
                              {conv.messages.length}{' '}
                              {conv.messages.length === 1 ? 'message' : 'messages'} ·{' '}
                              {new Date(conv.updatedAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteConversation(conv.id);
                            }}
                            className="p-2 rounded-lg text-rose-300/75 hover:text-rose-300 hover:bg-rose-950/50 shrink-0"
                            title="Delete conversation"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : activeAiMode === 'session' ? (
              /* =============================================================== */
              /* SMART STUDY SESSION VIEW (REAL GEMINI + REAL FIREBASE DATA)     */
              /* =============================================================== */
              <div className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
                <div className="p-4 rounded-2xl bg-[#0c1428] border border-[#d4af37]/30 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#d4af37] block">
                        Gemini-Guided Focus Sprint
                      </span>
                      <h3 className="font-display text-sm sm:text-base font-bold text-[#fbf9f4]">
                        Smart Study Session ({activeGoal || 'General Study'})
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateSmartStudySession}
                      disabled={isGeneratingSmartSession}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingSmartSession ? 'animate-spin' : ''}`} />
                      <span>
                        {isGeneratingSmartSession
                          ? 'Planning...'
                          : smartSessionPlan
                          ? 'New Session'
                          : 'Start Session'}
                      </span>
                    </button>
                  </div>

                  <p className="text-xs text-[#cbd5e1] leading-relaxed">
                    Builds a focused right-now study block based on your real accuracy, weak topics, and revision queue.
                  </p>
                </div>

                {smartSessionError && (
                  <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs">
                    {smartSessionError}
                  </div>
                )}

                {smartSessionNotice ||
                (userStats.questionsAttempted === 0 && userStats.totalStudyMinutes === 0) ? (
                  <div className="p-5 rounded-2xl bg-[#0c1428] border border-[#d4af37]/25 text-center space-y-2.5">
                    <Zap className="w-7 h-7 text-[#d4af37] mx-auto opacity-85" />
                    <h4 className="font-display text-sm font-bold text-[#fbf9f4]">
                      Not enough data yet
                    </h4>
                    <p className="text-xs text-[#9ca3af] leading-relaxed">
                      {smartSessionNotice ||
                        'Not enough data yet. Complete at least 1 practice question or focus session so SVH AI can generate a Smart Study Session based on your real performance.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveAiMode('chat');
                        sendPromptToSVHAI(
                          `Guide me through a 25-minute starter study session on ${activeSubjects[0] || 'Physics'} with key concepts and 2 quick check questions.`,
                          null
                        );
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#131b2e] border border-[#d4af37]/40 text-xs font-semibold text-[#d4af37] hover:bg-[#19243d] cursor-pointer"
                    >
                      Start Guided Chat Session →
                    </button>
                  </div>
                ) : smartSessionPlan ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-[#0d162a] border border-[#d4af37]/30 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded bg-[#131b2e] border border-[#d4af37]/30 text-[10px] font-mono text-[#d4af37] font-bold">
                          {smartSessionPlan.subject} · {smartSessionPlan.durationMinutes} min
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400">
                          {smartSessionPlan.practicePrompts.length} Practice Prompts
                        </span>
                      </div>
                      <h4 className="font-display text-sm sm:text-base font-bold text-[#fbf9f4]">
                        {smartSessionPlan.topic}
                      </h4>
                      <p className="text-xs text-[#cbd5e1] leading-relaxed">
                        {smartSessionPlan.conceptSummary}
                      </p>
                    </div>

                    {smartSessionPlan.objectives.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-[#0b1324] border border-[#d4af37]/20 space-y-1.5">
                        <span className="text-xs font-bold text-[#d4af37] block">
                          Session Objectives
                        </span>
                        {smartSessionPlan.objectives.map((obj, idx) => (
                          <p key={idx} className="text-[11px] text-[#fbf9f4] leading-relaxed">
                            • {obj}
                          </p>
                        ))}
                      </div>
                    )}

                    {smartSessionPlan.keyFormulasOrPoints.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-[#0b1324] border border-[#d4af37]/20 space-y-1.5">
                        <span className="text-xs font-bold text-[#d4af37] block">
                          Key Formulas &amp; High-Yield Points
                        </span>
                        {smartSessionPlan.keyFormulasOrPoints.map((pt, idx) => (
                          <p key={idx} className="text-[11px] text-[#cbd5e1] leading-relaxed">
                            • {pt}
                          </p>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setActiveAiMode('chat');
                        sendPromptToSVHAI(
                          `Let's start my Smart Study Session on "${smartSessionPlan.topic}" (${smartSessionPlan.subject}). Guide me through the concept summary, key formulas, and then quiz me on the practice prompts one by one.`,
                          null
                        );
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-xs cursor-pointer"
                    >
                      Launch Interactive Session in Chat →
                    </button>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-[#0c1428] border border-[#d4af37]/20 text-center space-y-3">
                    <p className="text-xs text-[#cbd5e1]">
                      Tap <strong>Start Session</strong> above to generate a personalized Gemini study sprint from your real activity.
                    </p>
                  </div>
                )}
              </div>
            ) : activeAiMode === 'planner' ? (
              /* =============================================================== */
              /* AI PERSONAL STUDY PLANNER VIEW (REAL GEMINI + REAL FIREBASE DATA)*/
              /* =============================================================== */
              <div className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
                <div className="p-4 rounded-2xl bg-[#0c1428] border border-[#d4af37]/30 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#d4af37] block">
                        Gemini-Powered Study Planner
                      </span>
                      <h3 className="font-display text-sm sm:text-base font-bold text-[#fbf9f4]">
                        AI Personal Study Plan ({activeGoal || 'General Study'})
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateAIStudyPlan}
                      disabled={isGeneratingPlan}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingPlan ? 'animate-spin' : ''}`} />
                      <span>
                        {isGeneratingPlan
                          ? 'Generating...'
                          : userStats.activeStudyPlan
                          ? 'Refresh Plan'
                          : 'Generate Plan'}
                      </span>
                    </button>
                  </div>

                  <p className="text-xs text-[#cbd5e1] leading-relaxed">
                    Uses your real study time ({userStats.totalStudyMinutes}m), solved questions (
                    {userStats.questionsAttempted}), accuracy, and weak topics to build a practical schedule.
                  </p>
                </div>

                {planError && (
                  <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs">
                    {planError}
                  </div>
                )}

                {planNotice || (userStats.questionsAttempted === 0 && userStats.totalStudyMinutes === 0) ? (
                  <div className="p-5 rounded-2xl bg-[#0c1428] border border-[#d4af37]/25 text-center space-y-2.5">
                    <Calendar className="w-7 h-7 text-[#d4af37] mx-auto opacity-85" />
                    <h4 className="font-display text-sm font-bold text-[#fbf9f4]">
                      More real study activity needed
                    </h4>
                    <p className="text-xs text-[#9ca3af] leading-relaxed">
                      {planNotice ||
                        'You have 0 solved questions and 0 tracked study minutes so far. SVH AI never invents fake weaknesses or imaginary statistics. Complete at least 1 practice question or focus session to generate your data-backed study plan.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveAiMode('chat');
                        sendPromptToSVHAI(
                          `I am starting fresh for ${activeGoal || 'my exams'}. Please ask me how many hours I can study daily and suggest a starter syllabus schedule for ${activeSubjects.join(', ')}.`,
                          null
                        );
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#131b2e] border border-[#d4af37]/40 text-xs font-semibold text-[#d4af37] hover:bg-[#19243d] cursor-pointer"
                    >
                      Ask SVH AI for a Starter Schedule →
                    </button>
                  </div>
                ) : userStats.activeStudyPlan ? (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-2xl bg-[#0d162a] border border-[#d4af37]/25 text-xs text-[#fbf9f4] leading-relaxed">
                      <span className="text-[#d4af37] font-bold block mb-1">
                        AI Coach Summary:
                      </span>
                      {userStats.activeStudyPlan.summary}
                    </div>

                    <div className="space-y-2.5">
                      {userStats.activeStudyPlan.items.map((item) => (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-2xl bg-[#0b1324] border border-[#d4af37]/25 flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded bg-[#131b2e] border border-[#d4af37]/30 text-[10px] font-mono text-[#d4af37] font-bold">
                              {item.dayLabel} · {item.subject}
                            </span>
                            <span className="text-[10px] font-mono text-[#9ca3af]">
                              {item.focusMinutes}m Focus · {item.practiceQuestions} MCQs
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm font-semibold text-[#fbf9f4]">
                            {item.topic}
                          </p>
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleAddPlanItemToTracker(item)}
                              className="px-2.5 py-1 rounded-lg bg-[#131b2e] hover:bg-[#d4af37] text-[#d4af37] hover:text-[#080d1a] border border-[#d4af37]/30 text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              + Add to Daily Planner
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveAiMode('chat');
                                sendPromptToSVHAI(
                                  `Help me study "${item.topic}" in ${item.subject} with key concepts, formulas, and 3 practice questions.`,
                                  null
                                );
                              }}
                              className="text-[11px] text-[#cbd5e1] hover:text-[#d4af37] underline cursor-pointer"
                            >
                              Study with AI →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-[#0c1428] border border-[#d4af37]/20 text-center space-y-3">
                    <p className="text-xs text-[#cbd5e1]">
                      Tap <strong>Generate Plan</strong> above to let Gemini analyze your real progress and build your personalized study plan.
                    </p>
                  </div>
                )}
              </div>
            ) : activeAiMode === 'revision' ? (
              /* =============================================================== */
              /* SMART REVISION + SPACED REPETITION VIEW                          */
              /* =============================================================== */
              <div className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
                <div className="p-4 rounded-2xl bg-[#0c1428] border border-[#d4af37]/30 space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#d4af37] block">
                    Spaced Repetition Engine (1d · 3d · 7d · 14d · 30d)
                  </span>
                  <h3 className="font-display text-sm sm:text-base font-bold text-[#fbf9f4]">
                    Smart Revision Recommendations
                  </h3>
                  <p className="text-xs text-[#cbd5e1] leading-relaxed">
                    Computed strictly from your real studied topics, practice accuracy, and mistakes.
                  </p>
                </div>

                {smartRevisionList.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-[#0c1428] border border-[#d4af37]/20 text-center space-y-2">
                    <Brain className="w-7 h-7 text-[#d4af37] mx-auto opacity-80" />
                    <p className="text-sm font-bold text-[#fbf9f4]">
                      No revision topics scheduled yet
                    </p>
                    <p className="text-xs text-[#9ca3af] leading-relaxed">
                      Start solving practice questions or logging study focus sessions. Topics you study or make mistakes in will automatically enter your Spaced Repetition queue.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {smartRevisionList.map((rev) => (
                      <div
                        key={rev.id}
                        className="p-3.5 rounded-2xl bg-[#0b1324] border border-[#d4af37]/25 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#131b2e] border border-[#d4af37]/30 text-[10px] font-mono text-[#d4af37] font-bold">
                            {rev.subject}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              rev.status === 'Due Now'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : rev.status === 'Mastered'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-[#131b2e] text-[#cbd5e1]'
                            }`}
                          >
                            {rev.status} · Stage {rev.repetitionStage}/5
                          </span>
                        </div>

                        <div>
                          <h4 className="font-display text-xs sm:text-sm font-bold text-[#fbf9f4]">
                            {rev.topic}
                          </h4>
                          <p className="text-[11px] text-[#9ca3af] mt-0.5">{rev.reason}</p>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveAiMode('chat');
                              sendPromptToSVHAI(
                                `Give me a rapid spaced-repetition revision summary, key formulas, common pitfalls, and 2 quick check questions for "${rev.topic}" (${rev.subject}).`,
                                null
                              );
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#131b2e] hover:bg-[#19243d] border border-[#d4af37]/30 text-[11px] font-semibold text-[#d4af37] cursor-pointer"
                          >
                            Revise with AI
                          </button>

                          <button
                            type="button"
                            onClick={() => handleMarkRevisionCompleted(rev)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-200 text-[11px] font-semibold cursor-pointer"
                          >
                            ✓ Mark Revised (+{rev.intervalDays}d)
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeAiMode === 'insights' ? (
              /* =============================================================== */
              /* REAL PERFORMANCE INSIGHTS VIEW                                   */
              /* =============================================================== */
              <div className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
                <div className="p-4 rounded-2xl bg-[#0c1428] border border-[#d4af37]/30 space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#d4af37] block">
                    Verified Student Telemetry
                  </span>
                  <h3 className="font-display text-sm sm:text-base font-bold text-[#fbf9f4]">
                    Personal Performance Insights
                  </h3>
                </div>

                {userStats.questionsAttempted === 0 && userStats.totalStudyMinutes === 0 ? (
                  <div className="p-6 rounded-2xl bg-[#0c1428] border border-[#d4af37]/20 text-center space-y-2">
                    <BarChart3 className="w-7 h-7 text-[#d4af37] mx-auto opacity-80" />
                    <p className="text-sm font-bold text-[#fbf9f4]">No data yet</p>
                    <p className="text-xs text-[#9ca3af]">
                      Start studying to build your statistics.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 rounded-xl bg-[#0b1324] border border-[#d4af37]/25">
                        <span className="text-[10px] text-[#9ca3af] block">Questions Solved</span>
                        <span className="font-display text-lg font-bold text-[#fbf9f4] tabular-nums">
                          {userStats.questionsAttempted}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#0b1324] border border-[#d4af37]/25">
                        <span className="text-[10px] text-[#9ca3af] block">Verified Accuracy</span>
                        <span className="font-display text-lg font-bold text-emerald-400 tabular-nums">
                          {userStats.questionsAttempted > 0
                            ? `${((userStats.correctAnswers / userStats.questionsAttempted) * 100).toFixed(1)}%`
                            : '0%'}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#0b1324] border border-[#d4af37]/25">
                        <span className="text-[10px] text-[#9ca3af] block">Total Study Time</span>
                        <span className="font-display text-lg font-bold text-[#d4af37] tabular-nums">
                          {userStats.totalStudyMinutes} min
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#0b1324] border border-[#d4af37]/25">
                        <span className="text-[10px] text-[#9ca3af] block">Active Streak</span>
                        <span className="font-display text-lg font-bold text-amber-300 tabular-nums">
                          {userStats.streak?.current || 0} days
                        </span>
                      </div>
                    </div>

                    {realStudentContext.weakTopicAnalysis.weakTopics.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-[#0b1324] border border-amber-500/30 space-y-2">
                        <span className="text-xs font-bold text-amber-300 block">
                          Detected Weak Areas (&lt;60% Accuracy)
                        </span>
                        {realStudentContext.weakTopicAnalysis.weakTopics.map((wt, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-xs text-[#fbf9f4]"
                          >
                            <span>{wt.topicOrSubject}</span>
                            <span className="font-mono text-amber-300">
                              {wt.accuracy}% ({wt.solved} Qs)
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setActiveAiMode('chat');
                        sendPromptToSVHAI(
                          'Analyze my real performance statistics, accuracy, and study time, and give me specific, actionable recommendations to improve.',
                          null
                        );
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-xs cursor-pointer"
                    >
                      Get Deep AI Performance Review
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* =============================================================== */
              /* ACTIVE CHAT STREAM                                              */
              /* =============================================================== */
              <div
                ref={chatScrollContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain"
              >
                {currentMessages.length === 0 ? (
                  /* Clean, Authentic Empty State for New Chat / New User */
                  <div className="h-full flex flex-col items-center justify-center text-center px-3 py-6 space-y-5">
                    <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center shrink-0 aspect-square">
                      <img
                        src={logoSrc}
                        alt="SVH AI"
                        className="w-full h-full rounded-full object-contain aspect-square"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="space-y-1.5 max-w-sm">
                      <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#131b2e] border border-[#d4af37]/30 text-[10px] font-mono text-[#d4af37] uppercase tracking-widest">
                        <Sparkles className="w-3 h-3" />
                        <span>SVH AI Personal Study Assistant</span>
                      </div>
                      <h3 className="font-display text-lg sm:text-xl font-bold text-[#fbf9f4]">
                        Ask SVH AI anything about your studies.
                      </h3>
                      <p className="text-xs text-[#cbd5e1] leading-relaxed">
                        Get step-by-step doubt solutions, NCERT concept explanations, formula revision, custom MCQs, and study plans tailored to your real progress.
                      </p>
                    </div>

                    {/* Quick Starter Prompts */}
                    <div className="w-full max-w-md grid grid-cols-1 gap-2 text-left pt-1">
                      {quickSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => sendPromptToSVHAI(suggestion, null)}
                          disabled={isGenerating}
                          className="p-3 rounded-xl bg-[#0d162b] hover:bg-[#13203d] border border-[#d4af37]/25 hover:border-[#d4af37]/60 text-xs text-[#fbf9f4] flex items-center justify-between gap-2 transition-all group cursor-pointer"
                        >
                          <span className="line-clamp-1">{suggestion}</span>
                          <BookOpen className="w-3.5 h-3.5 text-[#d4af37] shrink-0 opacity-75 group-hover:opacity-100" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentMessages.map((msg) => (
                      <SVHAIMessageItem
                        key={msg.id}
                        msg={msg}
                        displayUserName={displayUserName}
                        isSpeakingThis={speakingMessageId === msg.id}
                        isLoadingAudioThis={loadingAudioMessageId === msg.id}
                        onToggleSpeak={handleToggleSpeakMessage}
                      />
                    ))}

                    {/* Autoplay Blocked Prompt (Browser Audio Policy Compliance) */}
                    {pendingManualPlayAudio && (
                      <div className="p-3 rounded-2xl bg-[#0d162a] border border-[#d4af37]/50 text-xs text-[#fbf9f4] flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-4 h-4 text-[#d4af37] shrink-0" />
                          <span>Voice Tutor response is ready. Tap Play to listen.</span>
                        </div>
                        <button
                          type="button"
                          onClick={handlePlayBlockedAudio}
                          className="px-3 py-1.5 rounded-xl bg-[#d4af37] text-[#080d1a] font-bold text-xs inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Play Voice</span>
                        </button>
                      </div>
                    )}

                    {/* Loading Indicator (shown until first streaming chunk arrives) */}
                    {isGenerating &&
                      currentMessages[currentMessages.length - 1]?.role !== 'assistant' && (
                        <div className="flex items-start">
                          <div className="rounded-2xl px-4 py-3 bg-[#0d162a] border border-[#d4af37]/30 text-xs text-[#cbd5e1] flex items-center gap-2.5">
                            <Sparkles className="w-4 h-4 text-[#d4af37] animate-spin" />
                            <span>SVH AI is analyzing and preparing your explanation...</span>
                          </div>
                        </div>
                      )}

                    {/* Error + Retry State (User question remains visible above!) */}
                    {errorState && (
                      <div className="p-3.5 rounded-2xl bg-rose-950/85 border border-rose-500/40 text-rose-200 text-xs space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>{errorState}</span>
                        </div>
                        {failedTurn && (
                          <button
                            onClick={handleRetryFailedTurn}
                            disabled={isGenerating}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Retry Request</span>
                          </button>
                        )}
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            )}

            {/* ================================================================= */}
            {/* BOTTOM MESSAGE COMPOSER                                           */}
            {/* ================================================================= */}
            {!showHistoryView && (
              <form
                onSubmit={handleFormSubmit}
                className="p-3 sm:p-3.5 bg-[#0a1224] border-t border-[#d4af37]/25 space-y-2 shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-3.5"
              >
                {/* Real Voice Tutor Recording / Transcribing / Error Bar */}
                {(isListeningMic || isTranscribingMic || voiceError) && (
                  <div className="px-3 py-2 rounded-xl bg-[#0d162a] border border-[#d4af37]/35 flex items-center justify-between gap-2 text-xs">
                    {isListeningMic ? (
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                        <span className="text-[#fbf9f4] font-semibold truncate">
                          Recording Voice ({recordingSeconds}s)...
                        </span>
                        {/* Real audio level indicator bar */}
                        <div className="flex items-end gap-0.5 h-4 px-1 shrink-0">
                          {[0.35, 0.7, 1, 0.8, 0.45].map((mult, idx) => {
                            const barHeight = Math.max(
                              20,
                              Math.min(100, Math.round((micAudioLevel || 18) * mult))
                            );
                            return (
                              <span
                                key={idx}
                                style={{ height: `${barHeight}%` }}
                                className="w-1 rounded-full bg-[#d4af37] transition-all duration-75"
                              />
                            );
                          })}
                        </div>
                      </div>
                    ) : isTranscribingMic ? (
                      <div className="flex items-center gap-2 text-[#d4af37]">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                        <span>Transcribing your voice with Gemini...</span>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 text-rose-300 min-w-0 flex-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span className="leading-snug break-words">{voiceError}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isListeningMic && (
                        <>
                          <button
                            type="button"
                            onClick={handleToggleVoiceInput}
                            className="px-2.5 py-1 rounded-lg bg-[#d4af37] text-[#080d1a] font-bold text-[11px] cursor-pointer"
                          >
                            Send Voice
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelVoiceRecording}
                            className="px-2 py-1 rounded-lg bg-rose-950/80 text-rose-200 border border-rose-500/30 text-[11px] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {voiceError && !isListeningMic && !isTranscribingMic && (
                        <button
                          type="button"
                          onClick={() => setVoiceError(null)}
                          className="text-[11px] text-[#9ca3af] hover:text-white"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {attachedImage && (
                  <div className="relative inline-block rounded-xl overflow-hidden border border-[#d4af37]/40 bg-[#050914]">
                    <img
                      src={attachedImage}
                      alt="Question preview"
                      className="max-h-24 w-auto object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setAttachedImage(null)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-950/90 text-rose-200 flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSelectImage}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload textbook question or diagram image"
                    className="p-2.5 rounded-xl bg-[#131b2e] hover:bg-[#19243d] border border-[#d4af37]/25 text-[#d4af37] transition-colors shrink-0 cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleVoiceInput}
                    title={isListeningMic ? 'Stop voice input' : 'Ask by voice (AI Voice Tutor)'}
                    className={`p-2.5 rounded-xl border transition-colors shrink-0 cursor-pointer ${
                      isListeningMic
                        ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                        : 'bg-[#131b2e] hover:bg-[#19243d] border-[#d4af37]/25 text-[#d4af37]'
                    }`}
                  >
                    {isListeningMic ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (!isGenerating && (inputPrompt.trim() || attachedImage)) {
                          sendPromptToSVHAI(inputPrompt, attachedImage);
                        }
                      }
                    }}
                    placeholder="Ask SVH AI a doubt, concept, formula, or study plan..."
                    className="flex-1 max-h-28 px-3.5 py-2.5 rounded-xl bg-[#060b18] border border-[#d4af37]/30 text-xs sm:text-sm text-[#fbf9f4] placeholder-[#9ca3af] focus:outline-none focus:border-[#d4af37] resize-none"
                  />

                  <button
                    type="submit"
                    disabled={isGenerating || (!inputPrompt.trim() && !attachedImage)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-xs sm:text-sm flex items-center gap-1.5 disabled:opacity-50 hover:brightness-110 transition-all shrink-0 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Ask</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
});
