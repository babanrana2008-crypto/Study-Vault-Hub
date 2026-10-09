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
  Copy,
  Check,
  Calendar,
  Headphones,
} from 'lucide-react';
import { UserStats, SVHAIButtonPosition, AISmartRevisionPlan } from '../types';
import { APP_LOGO, SAMPLE_BOOKS, SAMPLE_NOTES } from '../data/sampleData';
import { NCERT_BOOKS_COLLECTION } from '../data/ncertBooksData';
import { apiFetch } from '../services/nativeApiBridge';

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
  speakingMessageId: string | null;
  isLoadingTTSId: string | null;
  onSpeakMessage: (msg: SVHAIMessage) => void;
}>(({ msg, displayUserName, speakingMessageId, isLoadingTTSId, onSpeakMessage }) => {
  const isUser = msg.role === 'user';
  const [copied, setCopied] = useState(false);
  const isSpeaking = speakingMessageId === msg.id;
  const isLoadingAudio = isLoadingTTSId === msg.id;

  const handleCopy = () => {
    if (!msg.content) return;
    navigator.clipboard?.writeText(msg.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      className={`flex flex-col ${
        isUser ? 'items-end' : 'items-start'
      }`}
    >
      <div
        className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-3.5 sm:p-4 space-y-2 border shadow-sm ${
          isUser
            ? 'bg-gradient-to-br from-[#d3dfed] to-[#c4d4e6] border-[#96b0cb] text-[#162438]'
            : 'bg-[#edf3f9] border-[#c5d4e5] text-[#1c2b3e]'
        }`}
      >
        <div className="flex items-center justify-between gap-3 text-[10px] font-mono">
          <span
            className={
              isUser
                ? 'text-[#1e3554] font-bold'
                : 'text-[#244166] font-bold flex items-center gap-1'
            }
          >
            {!isUser && <Sparkles className="w-3 h-3 text-[#2d5380]" />}
            {isUser ? displayUserName || 'You' : 'SVH AI'}
          </span>

          <div className="flex items-center gap-2">
            {!isUser && msg.content && (
              <>
                <button
                  type="button"
                  onClick={() => onSpeakMessage(msg)}
                  title={isSpeaking ? 'Stop AI Voice Tutor' : 'Listen with AI Voice Tutor'}
                  className={`px-2 py-0.5 rounded-md border flex items-center gap-1 transition-all cursor-pointer ${
                    isSpeaking
                      ? 'bg-[#b8cde3] text-[#132238] border-[#7e9ec2] font-bold shadow-xs'
                      : 'bg-[#dce7f3] hover:bg-[#ceddf0] border-[#b0c5dd] text-[#1f3654]'
                  }`}
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX className="w-3 h-3" />
                      <span>Stop</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3 h-3" />
                      <span>{isLoadingAudio ? 'Loading...' : 'Listen'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copy explanation"
                  className="p-1 rounded-md bg-[#dce7f3] hover:bg-[#ceddf0] border border-[#b0c5dd] text-[#284263] hover:text-[#132238] transition-colors cursor-pointer"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-700" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </>
            )}

            <span className="text-[#4a6280]">
              {new Date(msg.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        {msg.imageUrl && (
          <div className="rounded-xl overflow-hidden border border-[#b0c5dd] bg-[#f4f8fc] max-w-xs">
            <img
              src={msg.imageUrl}
              alt="Uploaded question"
              className="max-h-56 w-auto mx-auto object-contain"
              loading="lazy"
            />
          </div>
        )}

        <div className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed text-[#162438]">
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

  // AI Voice Tutor & Smart Study Planner state
  const [isVoiceTutorMode, setIsVoiceTutorMode] = useState<boolean>(false);
  const [autoSpeakTutor, setAutoSpeakTutor] = useState<boolean>(false);
  const [isListeningMic, setIsListeningMic] = useState<boolean>(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isLoadingTTSId, setIsLoadingTTSId] = useState<string | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [planAddedToast, setPlanAddedToast] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const activeAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const speechRecognitionRef = useRef<unknown>(null);

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
      if (activeAudioSourceRef.current) {
        try {
          activeAudioSourceRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Stop any playing AI Voice Tutor audio
  const stopVoicePlayback = useCallback(() => {
    if (activeAudioSourceRef.current) {
      try {
        activeAudioSourceRef.current.stop();
        activeAudioSourceRef.current.disconnect();
      } catch {
        // ignore
      }
      activeAudioSourceRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMessageId(null);
    setIsLoadingTTSId(null);
  }, []);

  // Speak any SVH AI message using Gemini 2.5 Flash TTS (with Web Speech API fallback)
  const speakMessageWithGeminiTTS = useCallback(
    async (msg: SVHAIMessage) => {
      if (!msg?.content) return;
      if (speakingMessageId === msg.id) {
        stopVoicePlayback();
        return;
      }

      stopVoicePlayback();
      setIsLoadingTTSId(msg.id);

      const cleanText = msg.content
        .replace(/[#*`_~>-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 1100);

      try {
        let activeId = getLatestIdentity() || (await ensureIdentity());
        if (!activeId?.authToken) {
          activeId = await ensureIdentity(true);
        }

        if (activeId?.authToken) {
          const res = await apiFetch('/api/svh-ai/tts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${activeId.authToken}`,
            },
            body: JSON.stringify({
              text: cleanText,
              voiceName: 'Kore',
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data?.audioBase64) {
              const binaryStr = window.atob(data.audioBase64);
              const len = binaryStr.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
              }

              const AudioCtx =
                window.AudioContext ||
                (window as unknown as { webkitAudioContext: typeof AudioContext })
                  .webkitAudioContext;
              if (!audioContextRef.current) {
                audioContextRef.current = new AudioCtx({ sampleRate: 24000 });
              }
              const ctx = audioContextRef.current;
              if (ctx.state === 'suspended') {
                await ctx.resume();
              }

              // Convert 16-bit PCM little-endian at 24kHz to AudioBuffer
              const int16 = new Int16Array(bytes.buffer, 0, Math.floor(bytes.byteLength / 2));
              const audioBuffer = ctx.createBuffer(1, int16.length, 24000);
              const channelData = audioBuffer.getChannelData(0);
              for (let i = 0; i < int16.length; i++) {
                channelData[i] = int16[i] / 32768.0;
              }

              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.onended = () => {
                setSpeakingMessageId((prev) => (prev === msg.id ? null : prev));
                activeAudioSourceRef.current = null;
              };

              activeAudioSourceRef.current = source;
              setIsLoadingTTSId(null);
              setSpeakingMessageId(msg.id);
              source.start(0);
              return;
            }
          }
        }
      } catch {
        // Fallback to browser speechSynthesis below
      }

      // Fallback to native SpeechSynthesis if offline or TTS quota reached
      setIsLoadingTTSId(null);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.02;
        utterance.onend = () => {
          setSpeakingMessageId((prev) => (prev === msg.id ? null : prev));
        };
        utterance.onerror = () => {
          setSpeakingMessageId((prev) => (prev === msg.id ? null : prev));
        };
        setSpeakingMessageId(msg.id);
        window.speechSynthesis.speak(utterance);
      }
    },
    [speakingMessageId, stopVoicePlayback, getLatestIdentity, ensureIdentity]
  );

  // Voice Input (Microphone Speech-to-Text) for AI Voice Tutor
  const toggleMicrophoneVoiceInput = useCallback(async () => {
    if (isListeningMic) {
      const rec = speechRecognitionRef.current as { stop?: () => void; abort?: () => void } | null;
      try {
        rec?.stop?.();
      } catch {
        // ignore
      }
      speechRecognitionRef.current = null;
      setIsListeningMic(false);
      return;
    }

    stopVoicePlayback();
    setErrorState(null);

    // 1. Explicitly trigger native audio permission request via navigator.mediaDevices.getUserMedia first
    // so Android/iOS WebView (APK) and browsers always prompt for native RECORD_AUDIO permission.
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        stream.getTracks().forEach((track) => track.stop());
      } catch (permErr) {
        const errName = (permErr as { name?: string })?.name || '';
        if (
          errName === 'NotAllowedError' ||
          errName === 'PermissionDeniedError' ||
          errName === 'SecurityError'
        ) {
          setErrorState(
            'Microphone permission was denied. Please allow microphone access in your device/app settings, or type your question below.'
          );
          return;
        }
        if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
          setErrorState(
            'No microphone was detected on this device. You can still type your question below.'
          );
          return;
        }
      }
    }

    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;

    if (!SpeechRec) {
      setErrorState(
        'Microphone permission is active, but native WebView speech-to-text is unavailable on this device. Please use your keyboard voice dictation mic or type your question below.'
      );
      textareaRef.current?.focus();
      return;
    }

    try {
      const prevRec = speechRecognitionRef.current as { abort?: () => void } | null;
      try {
        prevRec?.abort?.();
      } catch {
        // ignore
      }

      const recognition = new SpeechRec() as {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        maxAlternatives: number;
        onstart: () => void;
        onresult: (event: {
          results: ArrayLike<{ isFinal?: boolean; 0: { transcript: string } }>;
        }) => void;
        onerror: (event: { error?: string }) => void;
        onend: () => void;
        start: () => void;
      };
      recognition.lang = 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      let finalCapturedTranscript = '';

      recognition.onstart = () => {
        setIsListeningMic(true);
        setErrorState(null);
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        const len = event.results?.length || 0;
        for (let i = 0; i < len; i++) {
          const res = event.results[i];
          const textPiece = res?.[0]?.transcript || '';
          if (res?.isFinal) {
            finalTranscript += textPiece;
          } else {
            interimTranscript += textPiece;
          }
        }
        const combined = (finalTranscript || interimTranscript).trim();
        if (combined) {
          finalCapturedTranscript = combined;
          setInputPrompt(combined);
        }
      };

      recognition.onerror = (event) => {
        setIsListeningMic(false);
        speechRecognitionRef.current = null;
        const code = event?.error || '';
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          setErrorState(
            'Microphone access is blocked. Please enable microphone permission or type your question below.'
          );
        } else if (code === 'no-speech') {
          setErrorState('No speech was detected. Tap the microphone and speak your question clearly.');
        } else if (code && code !== 'aborted') {
          setErrorState(`Voice recognition error (${code}). Please try again or type your question.`);
        }
      };

      recognition.onend = () => {
        setIsListeningMic(false);
        speechRecognitionRef.current = null;
        const cleanSpoken = finalCapturedTranscript.trim();
        if (cleanSpoken && !isSubmittingRef.current) {
          setAutoSpeakTutor(true);
          setTimeout(() => {
            sendPromptToSVHAI(cleanSpoken, null);
          }, 120);
        }
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListeningMic(false);
      speechRecognitionRef.current = null;
      setErrorState('Could not start voice recognition. Please try again or type your question.');
    }
  }, [isListeningMic, stopVoicePlayback]);

  // Generate AI Smart Revision Plan directly inside SVH AI & sync to Study Planner
  const handleGenerateQuickSmartPlan = async () => {
    if (isGeneratingPlan || isGenerating) return;
    setIsGeneratingPlan(true);
    setErrorState(null);

    try {
      let activeId = getLatestIdentity() || (await ensureIdentity());
      if (!activeId?.authToken) {
        activeId = await ensureIdentity(true);
      }
      if (!activeId?.authToken) {
        throw new Error('Session required to generate AI Smart Study Plan.');
      }

      const res = await apiFetch('/api/svh-ai/study-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeId.authToken}`,
        },
        body: JSON.stringify({
          goal: activeGoal || 'CBSE Class 12',
          subjects: activeSubjects.length > 0 ? activeSubjects : ['Physics', 'Chemistry', 'Mathematics'],
          dailyHours: Math.max(2, Math.round((userStats.dailyGoals?.minutes || 120) / 60)),
          daysCount: 5,
          focusNotes:
            realStudentContext.weakTopicAnalysis.weakTopics
              .map((w) => `${w.topicOrSubject} (${w.accuracy}%)`)
              .join(', ') || 'High-yield NCERT chapters and board/competitive exam priority topics',
          studentContext: realStudentContext,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Could not generate AI Smart Revision Plan.');
      }

      const data = await res.json();
      const plan: AISmartRevisionPlan = data.plan;

      if (plan && Array.isArray(plan.blocks)) {
        // Save plan and optionally add top blocks to student's active tasks
        if (onUpdateStats) {
          const newTasks = plan.blocks.slice(0, 4).map((b, i) => ({
            id: `ai_plan_task_${Date.now()}_${i}`,
            text: `[${b.subject}] ${b.chapterOrTopic} — ${b.activityType} (${b.durationMinutes}m)`,
            completed: false,
            category: 'Study' as const,
          }));
          onUpdateStats({
            aiSmartRevisionPlan: plan,
            tasks: [...newTasks, ...(userStats.tasks || [])],
          });
        }

        // Also append the structured plan summary into the current SVH AI conversation
        const nowIso = new Date().toISOString();
        const targetConvId =
          activeConversationId || `svhai_conv_${Date.now()}_plan`;
        const formattedPlanMarkdown = [
          `### AI Smart Revision Plan: ${plan.title}`,
          `**Target Goal:** ${plan.examGoal} | **Daily Target:** ${plan.dailyTargetMinutes} mins`,
          `**Strategy:** ${plan.focusSummary}`,
          '',
          ...plan.blocks.map(
            (b, idx) =>
              `**${idx + 1}. ${b.dayOrPhase} — ${b.subject}: ${b.chapterOrTopic}** (${b.durationMinutes} mins · *${b.priority} Priority*)\n   • **Activity:** ${b.activityType}\n   • **Actionable Tip:** ${b.keyTakeawayOrTip}`
          ),
        ].join('\n');

        const planMsg: SVHAIMessage = {
          id: `msg_plan_${Date.now()}`,
          role: 'assistant',
          content: formattedPlanMarkdown,
          createdAt: nowIso,
        };

        setActiveConversationId(targetConvId);
        setConversations((prev) => {
          const existing = prev.find((c) => c.id === targetConvId);
          if (existing) {
            return [
              {
                ...existing,
                updatedAt: nowIso,
                messages: [...existing.messages, planMsg],
              },
              ...prev.filter((c) => c.id !== targetConvId),
            ];
          }
          return [
            {
              id: targetConvId,
              userId: identity?.userId || userStats.userId || 'local',
              title: plan.title.slice(0, 56),
              createdAt: nowIso,
              updatedAt: nowIso,
              messages: [planMsg],
            },
            ...prev,
          ];
        });

        setPlanAddedToast('Smart Revision Plan generated & synced to your Study Planner!');
        setTimeout(() => setPlanAddedToast(null), 4000);
        scrollChatToBottom(false);
      }
    } catch (err) {
      setErrorState(
        err instanceof Error ? err.message : 'Could not generate AI Smart Revision Plan.'
      );
    } finally {
      setIsGeneratingPlan(false);
    }
  };

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
                  if (autoSpeakTutor || isVoiceTutorMode) {
                    const lastAi = [...(finalConv.messages || [])]
                      .reverse()
                      .find((m) => m.role === 'assistant');
                    if (lastAi) {
                      setTimeout(() => {
                        speakMessageWithGeminiTTS(lastAi);
                      }, 150);
                    }
                  }
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
          if (autoSpeakTutor || isVoiceTutorMode) {
            const lastAi = [...(updatedConv.messages || [])]
              .reverse()
              .find((m) => m.role === 'assistant');
            if (lastAi) {
              setTimeout(() => {
                speakMessageWithGeminiTTS(lastAi);
              }, 150);
            }
          }
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
            className="hidden sm:block fixed inset-0 bg-[#1e2d42]/25 backdrop-blur-[2px] -z-10"
          />

          <div
            className={`w-full h-full sm:rounded-3xl bg-gradient-to-b from-[#e6eef7] via-[#edf3fa] to-[#e2ecf6] border-0 sm:border-2 sm:border-[#b5c8de] shadow-[0_20px_50px_rgba(22,36,56,0.25)] flex flex-col overflow-hidden transition-all duration-200 will-change-transform ${
              isExpandedDesktop
                ? 'sm:w-[92vw] sm:max-w-4xl sm:h-[85vh] sm:max-h-[calc(100dvh-2rem)]'
                : 'sm:w-[430px] md:w-[480px] sm:h-[660px] sm:max-h-[calc(100vh-2.5rem)] sm:max-h-[calc(100dvh-2rem)]'
            }`}
          >
            {/* Top Header */}
            <div className="px-4 py-3.5 bg-[#d8e5f3]/95 border-b border-[#b5c8de] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 aspect-square border border-[#9eb8d4] bg-[#eef4fa]">
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
                    <Sparkles className="w-3.5 h-3.5 text-[#2b4c73] shrink-0" />
                    <h2 className="font-display text-sm sm:text-base font-bold text-[#162438] truncate">
                      SVH AI
                    </h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#c6d8ec] text-[#1e3859] border border-[#9eb8d4] font-semibold">
                      Personal Tutor
                    </span>
                  </div>
                  <p className="text-[10px] text-[#3b5370] truncate">
                    {activeGoal ? `Tailored for ${activeGoal}` : 'Study Vault Hub AI Assistant'}
                  </p>
                </div>
              </div>

              {/* Header Controls: Voice Tutor, New Chat, History, Expand (Desktop), Close */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    const nextMode = !isVoiceTutorMode;
                    setIsVoiceTutorMode(nextMode);
                    setAutoSpeakTutor(nextMode);
                    if (!nextMode) {
                      stopVoicePlayback();
                    }
                  }}
                  title="AI Voice Tutor Mode (Speak & Listen)"
                  className={`px-2.5 py-1.5 rounded-xl border text-xs flex items-center gap-1 transition-all cursor-pointer ${
                    isVoiceTutorMode
                      ? 'bg-[#b3cae3] text-[#112033] border-[#7b9bc0] font-bold shadow-xs'
                      : 'bg-[#e8f0f8] hover:bg-[#d7e5f3] border-[#b2c7df] text-[#1f3654]'
                  }`}
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Voice Tutor</span>
                </button>

                <button
                  onClick={handleStartNewChat}
                  title="New Chat"
                  className="px-2.5 py-1.5 rounded-xl bg-[#e8f0f8] hover:bg-[#d7e5f3] border border-[#b2c7df] text-xs text-[#1f3654] hover:text-[#112033] flex items-center gap-1 transition-colors cursor-pointer font-medium"
                >
                  <Plus className="w-3.5 h-3.5 text-[#2b4c73]" />
                  <span className="hidden sm:inline">New</span>
                </button>

                <button
                  onClick={() => setShowHistoryView((prev) => !prev)}
                  title="Conversation History"
                  className={`p-2 rounded-xl border text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                    showHistoryView
                      ? 'bg-[#b3cae3] text-[#112033] border-[#7b9bc0] font-bold'
                      : 'bg-[#e8f0f8] hover:bg-[#d7e5f3] border-[#b2c7df] text-[#284263] hover:text-[#112033]'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-mono">{conversations.length}</span>
                </button>

                <button
                  onClick={() => setIsExpandedDesktop((prev) => !prev)}
                  title={isExpandedDesktop ? 'Compact Panel' : 'Expand Panel'}
                  className="hidden sm:flex p-2 rounded-xl bg-[#e8f0f8] hover:bg-[#d7e5f3] border border-[#b2c7df] text-[#284263] hover:text-[#112033] transition-colors cursor-pointer"
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
                  className="p-2 rounded-xl bg-[#e8f0f8] hover:bg-[#f5dce0] border border-[#b2c7df] hover:border-[#d99aa5] text-[#284263] hover:text-[#7a2030] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Real User Data Context Strip + AI Smart Study Planner Trigger */}
            <div className="px-4 py-2 bg-[#dfe9f5] border-b border-[#bfd1e5] flex items-center justify-between gap-2 text-[11px] text-[#2c4463] overflow-x-auto no-scrollbar shrink-0">
              <div className="flex items-center gap-3 whitespace-nowrap">
                {displayUserName && (
                  <span className="text-[#162438] font-medium">
                    Student: <strong className="text-[#1e3a5f]">{displayUserName}</strong>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-[#2b4c73]" />
                  <span>{activeGoal || 'General Study'}</span>
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                  <span>
                    {userStats.questionsAttempted > 0
                      ? `${userStats.questionsAttempted} Solved (${(
                          (userStats.correctAnswers / userStats.questionsAttempted) *
                          100
                        ).toFixed(0)}%)`
                      : '0 Solved yet'}
                  </span>
                </span>
              </div>

              <button
                type="button"
                onClick={handleGenerateQuickSmartPlan}
                disabled={isGeneratingPlan || isGenerating}
                className="px-2.5 py-1 rounded-lg bg-[#ceddf0] hover:bg-[#bdd1e8] border border-[#9ab4d1] text-[#162840] font-semibold text-[10px] flex items-center gap-1 shrink-0 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Calendar className="w-3 h-3 text-[#234166]" />
                <span>{isGeneratingPlan ? 'Planning...' : 'Smart Revision Plan'}</span>
              </button>
            </div>

            {/* AI Voice Tutor Active Banner */}
            {isVoiceTutorMode && (
              <div className="px-4 py-2.5 bg-gradient-to-r from-[#d4e2f2] via-[#dce8f6] to-[#d4e2f2] border-b border-[#adc3dc] flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      speakingMessageId || isListeningMic
                        ? 'bg-[#b3cae3] text-[#112033] border border-[#7b9bc0] animate-pulse'
                        : 'bg-[#e6eef8] text-[#234166] border border-[#a6bed9]'
                    }`}
                  >
                    <Headphones className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#162438] truncate">
                      AI Voice Tutor Active{' '}
                      <span className="text-[10px] font-mono text-[#2b4c73]">
                        (Gemini Neural Voice)
                      </span>
                    </p>
                    <p className="text-[10px] text-[#354f6e] truncate">
                      {isListeningMic
                        ? 'Listening to your question... speak clearly'
                        : speakingMessageId
                        ? 'SVH AI Tutor is speaking explanation aloud...'
                        : 'Tap Speak Doubt or the Mic button to ask by voice'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {speakingMessageId && (
                    <button
                      type="button"
                      onClick={stopVoicePlayback}
                      className="px-2.5 py-1 rounded-lg bg-[#f2d8dc] border border-[#d69ba4] text-[#6e1c2a] text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <VolumeX className="w-3 h-3" />
                      <span>Mute</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={toggleMicrophoneVoiceInput}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all border ${
                      isListeningMic
                        ? 'bg-[#e8b4bc] text-[#5c1420] border-[#c9828d] animate-pulse'
                        : 'bg-[#bdd1e8] hover:bg-[#acc4e0] text-[#132238] border-[#8eabcb]'
                    }`}
                  >
                    {isListeningMic ? (
                      <>
                        <MicOff className="w-3 h-3" />
                        <span>Stop Mic</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3 h-3" />
                        <span>Speak Doubt</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {planAddedToast && (
              <div className="px-4 py-2 bg-[#d7ece3] border-b border-[#9ec8b5] text-[#154230] text-xs flex items-center justify-between gap-2 shrink-0">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>{planAddedToast}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setPlanAddedToast(null)}
                  className="text-[10px] underline font-semibold"
                >
                  Dismiss
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
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e3a5f] hover:underline"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to Current Chat</span>
                  </button>

                  {conversations.length > 0 && (
                    <div>
                      {confirmClearAll ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[#7a2030] font-medium">Clear all?</span>
                          <button
                            onClick={handleClearAllConversations}
                            className="px-2.5 py-1 rounded-lg bg-[#d98c98] text-[#3d0c14] text-[11px] font-bold border border-[#b86b77]"
                          >
                            Yes, Clear
                          </button>
                          <button
                            onClick={() => setConfirmClearAll(false)}
                            className="px-2 py-1 rounded-lg bg-[#dce7f3] text-[#284263] text-[11px] border border-[#b2c7df]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmClearAll(true)}
                          className="px-2.5 py-1 rounded-lg bg-[#f2dce0] border border-[#d9a3ac] text-[#6e1c2a] hover:bg-[#ebd0d5] text-[11px] flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Clear All History</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <h3 className="font-display text-sm font-bold text-[#162438] uppercase tracking-wider">
                  Your Saved Conversations ({conversations.length})
                </h3>

                {conversations.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-[#f0f5fb] border border-[#c5d5e6] text-center space-y-2">
                    <History className="w-8 h-8 text-[#2b4c73] mx-auto opacity-80" />
                    <p className="text-sm font-semibold text-[#162438]">
                      No previous conversations yet.
                    </p>
                    <p className="text-xs text-[#435b78]">
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
                              ? 'bg-[#cfe0f2] border-[#7e9ec2] shadow-xs'
                              : 'bg-[#f0f5fb] hover:bg-[#e1ebf7] border-[#c5d5e6]'
                          }`}
                        >
                          <div className="min-w-0 space-y-1">
                            <h4 className="font-display text-xs sm:text-sm font-bold text-[#162438] truncate">
                              {conv.title}
                            </h4>
                            <p className="text-[11px] text-[#435b78]">
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
                            className="p-2 rounded-lg text-[#7a2030]/80 hover:text-[#6e1c2a] hover:bg-[#f2dce0] shrink-0"
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
                    <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center shrink-0 aspect-square border border-[#adc3dc] bg-[#f0f5fb] shadow-xs">
                      <img
                        src={logoSrc}
                        alt="SVH AI"
                        className="w-full h-full rounded-full object-contain aspect-square"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="space-y-1.5 max-w-sm">
                      <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#d7e5f3] border border-[#adc3dc] text-[10px] font-mono text-[#1e3859] uppercase tracking-widest font-semibold">
                        <Sparkles className="w-3 h-3 text-[#2b4c73]" />
                        <span>SVH AI Personal Study Assistant</span>
                      </div>
                      <h3 className="font-display text-lg sm:text-xl font-bold text-[#162438]">
                        Ask SVH AI anything about your studies.
                      </h3>
                      <p className="text-xs text-[#354f6e] leading-relaxed">
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
                          className="p-3 rounded-xl bg-[#f0f5fb] hover:bg-[#dfeaf6] border border-[#bfd1e5] hover:border-[#8eabcb] text-xs text-[#162438] flex items-center justify-between gap-2 transition-all group cursor-pointer shadow-2xs"
                        >
                          <span className="line-clamp-1 font-medium">{suggestion}</span>
                          <BookOpen className="w-3.5 h-3.5 text-[#2b4c73] shrink-0 opacity-75 group-hover:opacity-100" />
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
                        speakingMessageId={speakingMessageId}
                        isLoadingTTSId={isLoadingTTSId}
                        onSpeakMessage={speakMessageWithGeminiTTS}
                      />
                    ))}

                    {/* Loading Indicator (shown until first streaming chunk arrives) */}
                    {isGenerating &&
                      currentMessages[currentMessages.length - 1]?.role !== 'assistant' && (
                        <div className="flex items-start">
                          <div className="rounded-2xl px-4 py-3 bg-[#edf3f9] border border-[#bfd1e5] text-xs text-[#243b57] flex items-center gap-2.5 shadow-2xs">
                            <Sparkles className="w-4 h-4 text-[#2b4c73] animate-spin" />
                            <span>SVH AI is analyzing and preparing your explanation...</span>
                          </div>
                        </div>
                      )}

                    {/* Error + Retry State (User question remains visible above!) */}
                    {errorState && (
                      <div className="p-3.5 rounded-2xl bg-[#f7e4e7] border border-[#dba6b0] text-[#611825] text-xs space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-[#9e2a3b] shrink-0" />
                          <span>{errorState}</span>
                        </div>
                        {failedTurn && (
                          <button
                            onClick={handleRetryFailedTurn}
                            disabled={isGenerating}
                            className="px-3 py-1.5 rounded-lg bg-[#c7d8eb] hover:bg-[#b5cae2] border border-[#8eabcb] text-[#132238] font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
                className="p-3 sm:p-3.5 bg-[#d8e5f3] border-t border-[#b5c8de] space-y-2 shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-3.5"
              >
                {attachedImage && (
                  <div className="relative inline-block rounded-xl overflow-hidden border border-[#9eb8d4] bg-[#f4f8fc]">
                    <img
                      src={attachedImage}
                      alt="Question preview"
                      className="max-h-24 w-auto object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setAttachedImage(null)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#f2dce0] text-[#6e1c2a] border border-[#d69ba4] flex items-center justify-center"
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
                    className="p-2.5 rounded-xl bg-[#ebf2f9] hover:bg-[#dce7f3] border border-[#b0c5dd] text-[#234166] transition-colors shrink-0 cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={toggleMicrophoneVoiceInput}
                    title={isListeningMic ? 'Stop Voice Input' : 'Ask doubt by voice (AI Voice Tutor)'}
                    className={`p-2.5 rounded-xl border transition-all shrink-0 cursor-pointer ${
                      isListeningMic
                        ? 'bg-[#e8b4bc] text-[#5c1420] border-[#c9828d] animate-pulse'
                        : 'bg-[#ebf2f9] hover:bg-[#dce7f3] border-[#b0c5dd] text-[#234166]'
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
                    className="flex-1 max-h-28 px-3.5 py-2.5 rounded-xl bg-[#f5f8fc] border border-[#b0c5dd] text-xs sm:text-sm text-[#162438] placeholder-[#5a718f] focus:outline-none focus:border-[#7899be] resize-none"
                  />

                  <button
                    type="submit"
                    disabled={isGenerating || (!inputPrompt.trim() && !attachedImage)}
                    className="px-4 py-2.5 rounded-xl bg-[#bdd1e8] hover:bg-[#abc4e0] border border-[#8eabcb] text-[#132238] font-bold text-xs sm:text-sm flex items-center gap-1.5 disabled:opacity-50 transition-all shrink-0 cursor-pointer shadow-2xs"
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
