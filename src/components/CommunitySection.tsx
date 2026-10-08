import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  MessagesSquare,
  MessageCircle,
  Plus,
  Send,
  Image as ImageIcon,
  Trash2,
  Flag,
  X,
  ArrowLeft,
  Clock,
  User,
  Search,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  HelpCircle,
} from 'lucide-react';
import {
  CommunityPost,
  CommunityReply,
  CommunityChatMessage,
} from '../types';
import { apiFetch } from '../services/nativeApiBridge';

interface CommunitySectionProps {
  userName: string;
  userProfilePhotoUrl?: string | null;
  activeGoal: string;
  activeSubjects: string[];
  isOwnerAuthenticated?: boolean;
}

interface StoredIdentity {
  userId: string;
  authToken: string;
}

interface ReportModalTarget {
  targetType: 'post' | 'reply' | 'chat';
  targetId: string;
  authorName: string;
}

const IDENTITY_STORAGE_KEY = 'study_vault_community_identity_v1';
const HIDDEN_ITEMS_STORAGE_KEY = 'study_vault_community_reported_hidden_v1';
const COMMUNITY_POSTS_CACHE_KEY = 'study_vault_community_posts_cache_v1';
const COMMUNITY_REPLIES_CACHE_KEY = 'study_vault_community_replies_cache_v1';
const COMMUNITY_CHAT_CACHE_KEY = 'study_vault_community_chat_cache_v1';
const COMMUNITY_UI_STATE_KEY = 'study_vault_community_ui_state_v1';

const REPORT_REASONS = [
  'Spam or irrelevant content',
  'Inappropriate or disrespectful language',
  'Incorrect or misleading academic content',
  'Harassment or off-topic behavior',
  'Other community guideline concern',
];

function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);

    if (diffSec < 45) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

async function compressImageFile(file: File): Promise<string> {
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
        const MAX_DIMENSION = 1400;
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
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
        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        resolve(compressed);
      };
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

export const CommunitySection: React.FC<CommunitySectionProps> = React.memo(({
  userName,
  userProfilePhotoUrl,
  activeGoal,
  activeSubjects,
  isOwnerAuthenticated = false,
}) => {
  const displayUserName = (userName || 'Student').trim() || 'Student';

  // Sub-navigation: 'feed' (Doubts & Discussions) vs 'chat' (Community Chat)
  const [activeTab, setActiveTab] = useState<'feed' | 'chat'>(() => {
    try {
      const savedUi = localStorage.getItem(COMMUNITY_UI_STATE_KEY);
      if (savedUi) {
        const parsed = JSON.parse(savedUi);
        if (parsed?.activeTab === 'chat' || parsed?.activeTab === 'feed') {
          return parsed.activeTab;
        }
      }
      return 'feed';
    } catch {
      return 'feed';
    }
  });

  // Authenticated User Identity (cryptographic token stored locally, never exposed to others)
  const [identity, setIdentity] = useState<StoredIdentity | null>(() => {
    try {
      const saved = localStorage.getItem(IDENTITY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.userId && parsed?.authToken) {
          return { userId: parsed.userId, authToken: parsed.authToken };
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  // Real-time Server State (NO fake data; initializes from real persisted cache and syncs with backend)
  const [posts, setPosts] = useState<CommunityPost[]>(() => {
    try {
      const saved = localStorage.getItem(COMMUNITY_POSTS_CACHE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch {
      return [];
    }
  });
  const [replies, setReplies] = useState<CommunityReply[]>(() => {
    try {
      const saved = localStorage.getItem(COMMUNITY_REPLIES_CACHE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch {
      return [];
    }
  });
  const [chatMessages, setChatMessages] = useState<CommunityChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(COMMUNITY_CHAT_CACHE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    try {
      const hasCachedPosts = Boolean(localStorage.getItem(COMMUNITY_POSTS_CACHE_KEY));
      const hasCachedChat = Boolean(localStorage.getItem(COMMUNITY_CHAT_CACHE_KEY));
      return !hasCachedPosts && !hasCachedChat;
    } catch {
      return true;
    }
  });
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected post for detail & replies view
  const [selectedPostId, setSelectedPostId] = useState<string | null>(() => {
    try {
      const savedUi = localStorage.getItem(COMMUNITY_UI_STATE_KEY);
      if (savedUi) {
        const parsed = JSON.parse(savedUi);
        if (typeof parsed?.selectedPostId === 'string') {
          return parsed.selectedPostId;
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COMMUNITY_POSTS_CACHE_KEY, JSON.stringify(posts));
    } catch {
      // ignore storage quota errors
    }
  }, [posts]);

  useEffect(() => {
    try {
      localStorage.setItem(COMMUNITY_REPLIES_CACHE_KEY, JSON.stringify(replies));
    } catch {
      // ignore storage quota errors
    }
  }, [replies]);

  useEffect(() => {
    try {
      localStorage.setItem(COMMUNITY_CHAT_CACHE_KEY, JSON.stringify(chatMessages));
    } catch {
      // ignore storage quota errors
    }
  }, [chatMessages]);

  useEffect(() => {
    try {
      localStorage.setItem(
        COMMUNITY_UI_STATE_KEY,
        JSON.stringify({ activeTab, selectedPostId })
      );
    } catch {
      // ignore storage errors
    }
  }, [activeTab, selectedPostId]);

  // Filter & Search for feed
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Create Post / Ask Doubt Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newPostSubject, setNewPostSubject] = useState<string>('General');
  const [newPostContent, setNewPostContent] = useState<string>('');
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [isSubmittingPost, setIsSubmittingPost] = useState<boolean>(false);

  // Reply composer state
  const [replyContent, setReplyContent] = useState<string>('');
  const [replyImage, setReplyImage] = useState<string | null>(null);
  const [isSubmittingReply, setIsSubmittingReply] = useState<boolean>(false);

  // Chat composer state
  const [chatInput, setChatInput] = useState<string>('');
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);

  // Delete confirmation state (avoids window.confirm)
  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'post' | 'reply' | 'chat';
    id: string;
  } | null>(null);

  // Report modal state
  const [reportTarget, setReportTarget] = useState<ReportModalTarget | null>(null);
  const [reportReason, setReportReason] = useState<string>(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState<string>('');
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);

  // Hidden reported items (optional local hide after reporting)
  const [hiddenIds, setHiddenIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(HIDDEN_ITEMS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Fullscreen image zoom modal
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

  const postFileInputRef = useRef<HTMLInputElement | null>(null);
  const replyFileInputRef = useRef<HTMLInputElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const identityRef = useRef<StoredIdentity | null>(identity);

  useEffect(() => {
    identityRef.current = identity;
  }, [identity]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    if (!isMountedRef.current) return;
    setToastMessage(msg);
    setTimeout(() => {
      if (isMountedRef.current) {
        setToastMessage((prev) => (prev === msg ? null : prev));
      }
    }, 3200);
  }, []);

  // 1. Initialize & sync cryptographic user identity with backend (with resilient retry)
  const ensureSessionIdentity = useCallback(async (): Promise<StoredIdentity | null> => {
    let currentIdentity = identityRef.current;
    try {
      const saved = localStorage.getItem(IDENTITY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.userId && parsed?.authToken) {
          currentIdentity = { userId: parsed.userId, authToken: parsed.authToken };
          identityRef.current = currentIdentity;
          if (isMountedRef.current) {
            setIdentity(currentIdentity);
          }
        }
      }
    } catch {
      // ignore
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (currentIdentity?.authToken) {
      headers.Authorization = `Bearer ${currentIdentity.authToken}`;
    }

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (!isMountedRef.current) return currentIdentity;
      try {
        const res = await apiFetch('/api/community/auth/session', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            displayName: displayUserName,
            profilePhotoUrl: userProfilePhotoUrl ?? null,
          }),
        });

        if (!res.ok) {
          throw new Error('Could not establish community session');
        }

        const data = await res.json();
        const resolvedIdentity: StoredIdentity = {
          userId: data.userId,
          authToken: data.authToken || currentIdentity?.authToken || '',
        };

        if (resolvedIdentity.userId && resolvedIdentity.authToken) {
          identityRef.current = resolvedIdentity;
          if (isMountedRef.current) {
            setIdentity(resolvedIdentity);
          }
          try {
            localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(resolvedIdentity));
          } catch {
            // ignore storage quota errors
          }
          return resolvedIdentity;
        }
        return currentIdentity;
      } catch {
        if (attempt < maxAttempts && isMountedRef.current) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 600));
        }
      }
    }
    return identityRef.current;
  }, [displayUserName, userProfilePhotoUrl]);

  // Fetch initial state from backend API (with resilient retry)
  const fetchCommunityState = useCallback(async () => {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (!isMountedRef.current) return;
      try {
        const res = await apiFetch('/api/community/state');
        if (!res.ok) throw new Error('Failed to load community data');
        const data = await res.json();
        if (!isMountedRef.current) return;
        setPosts(Array.isArray(data.posts) ? data.posts : []);
        setReplies(Array.isArray(data.replies) ? data.replies : []);
        setChatMessages(Array.isArray(data.chatMessages) ? data.chatMessages : []);
        setErrorBanner(null);
        setIsLoading(false);
        return;
      } catch {
        if (attempt < maxAttempts && isMountedRef.current) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 600));
        }
      }
    }
    if (isMountedRef.current) {
      setIsLoading(false);
    }
  }, []);

  // Run session initialization and initial state fetch
  useEffect(() => {
    ensureSessionIdentity();
    fetchCommunityState();
  }, [ensureSessionIdentity, fetchCommunityState]);

  // 2. Real-time WebSocket connection with idempotent event handlers & exponential backoff
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let isUnmounted = false;
    let failedAttempts = 0;

    const connectWebSocket = () => {
      if (isUnmounted) return;
      const isNativeAndroid =
        typeof window !== 'undefined' &&
        (Boolean(
          (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
        ) ||
          window.location.origin === 'https://localhost' ||
          window.location.protocol === 'capacitor:');

      // In standalone Android APK, if WebSocket handshake already failed due to Cloud Run cookie gate, stop spamming reconnects
      if (isNativeAndroid && failedAttempts >= 1) {
        return;
      }

      const protocol = isNativeAndroid || window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = isNativeAndroid
        ? 'ais-pre-w3eilfsiu6bgskrqwaueau-208888461367.asia-east1.run.app'
        : window.location.host;
      const wsUrl = `${protocol}//${host}/ws/community`;

      try {
        ws = new WebSocket(wsUrl);
      } catch {
        failedAttempts += 1;
        if (!isNativeAndroid) {
          const delay = Math.min(30000, 3000 * Math.pow(2, failedAttempts - 1));
          reconnectTimer = setTimeout(connectWebSocket, delay);
        }
        return;
      }

      ws.onopen = () => {
        failedAttempts = 0;
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          switch (payload.type) {
            case 'init': {
              if (Array.isArray(payload.posts)) setPosts(payload.posts);
              if (Array.isArray(payload.replies)) setReplies(payload.replies);
              if (Array.isArray(payload.chatMessages)) setChatMessages(payload.chatMessages);
              setIsLoading(false);
              break;
            }
            case 'post:created': {
              const incomingPost: CommunityPost = payload.post;
              if (!incomingPost?.id) break;
              setPosts((prev) => {
                if (prev.some((p) => p.id === incomingPost.id)) return prev;
                return [incomingPost, ...prev];
              });
              break;
            }
            case 'post:deleted': {
              const deletedPostId: string = payload.postId;
              if (!deletedPostId) break;
              setPosts((prev) => prev.filter((p) => p.id !== deletedPostId));
              setReplies((prev) => prev.filter((r) => r.postId !== deletedPostId));
              setSelectedPostId((prev) => (prev === deletedPostId ? null : prev));
              break;
            }
            case 'reply:created': {
              const incomingReply: CommunityReply = payload.reply;
              const targetPostId: string = payload.postId;
              const updatedCount: number = payload.replyCount;
              if (!incomingReply?.id) break;

              setReplies((prev) => {
                if (prev.some((r) => r.id === incomingReply.id)) return prev;
                return [...prev, incomingReply];
              });

              if (targetPostId && typeof updatedCount === 'number') {
                setPosts((prev) =>
                  prev.map((p) =>
                    p.id === targetPostId ? { ...p, replyCount: updatedCount } : p
                  )
                );
              }
              break;
            }
            case 'reply:deleted': {
              const deletedReplyId: string = payload.replyId;
              const targetPostId: string = payload.postId;
              const updatedCount: number = payload.replyCount;
              if (!deletedReplyId) break;

              setReplies((prev) => prev.filter((r) => r.id !== deletedReplyId));
              if (targetPostId && typeof updatedCount === 'number') {
                setPosts((prev) =>
                  prev.map((p) =>
                    p.id === targetPostId ? { ...p, replyCount: updatedCount } : p
                  )
                );
              }
              break;
            }
            case 'chat:created': {
              const incomingMessage: CommunityChatMessage = payload.message;
              if (!incomingMessage?.id) break;
              setChatMessages((prev) => {
                if (prev.some((m) => m.id === incomingMessage.id)) return prev;
                return [...prev, incomingMessage];
              });
              break;
            }
            case 'chat:deleted': {
              const deletedMessageId: string = payload.messageId;
              if (!deletedMessageId) break;
              setChatMessages((prev) => prev.filter((m) => m.id !== deletedMessageId));
              break;
            }
            case 'user:updated': {
              const updatedUserId: string = payload.userId;
              const updatedName: string = payload.displayName;
              const hasUpdatedPhoto = Object.prototype.hasOwnProperty.call(payload, 'profilePhotoUrl');
              const updatedPhoto: string | null = hasUpdatedPhoto ? payload.profilePhotoUrl : undefined;
              if (!updatedUserId) break;
              setPosts((prev) =>
                prev.map((p) =>
                  p.authorId === updatedUserId
                    ? {
                        ...p,
                        ...(updatedName ? { authorName: updatedName } : {}),
                        ...(hasUpdatedPhoto ? { authorAvatarUrl: updatedPhoto } : {}),
                      }
                    : p
                )
              );
              setReplies((prev) =>
                prev.map((r) =>
                  r.authorId === updatedUserId
                    ? {
                        ...r,
                        ...(updatedName ? { authorName: updatedName } : {}),
                        ...(hasUpdatedPhoto ? { authorAvatarUrl: updatedPhoto } : {}),
                      }
                    : r
                )
              );
              setChatMessages((prev) =>
                prev.map((m) =>
                  m.authorId === updatedUserId
                    ? {
                        ...m,
                        ...(updatedName ? { authorName: updatedName } : {}),
                        ...(hasUpdatedPhoto ? { authorAvatarUrl: updatedPhoto } : {}),
                      }
                    : m
                )
              );
              break;
            }
            default:
              break;
          }
        } catch {
          // ignore malformed event
        }
      };

      ws.onclose = () => {
        if (!isUnmounted) {
          failedAttempts += 1;
          if (isNativeAndroid && failedAttempts >= 1) {
            return;
          }
          const delay = Math.min(30000, 3000 * Math.pow(2, Math.min(failedAttempts - 1, 3)));
          reconnectTimer = setTimeout(() => {
            fetchCommunityState();
            connectWebSocket();
          }, delay);
        }
      };
    };

    connectWebSocket();

    return () => {
      isUnmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [fetchCommunityState]);

  const hasOpenCommunityModal = Boolean(
    isCreateModalOpen || confirmDelete || reportTarget || zoomedImageUrl
  );

  useEffect(() => {
    if (!hasOpenCommunityModal || typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomedImageUrl) setZoomedImageUrl(null);
        else if (confirmDelete) setConfirmDelete(null);
        else if (reportTarget && !isSubmittingReport) setReportTarget(null);
        else if (isCreateModalOpen && !isSubmittingPost) setIsCreateModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    hasOpenCommunityModal,
    zoomedImageUrl,
    confirmDelete,
    reportTarget,
    isSubmittingReport,
    isCreateModalOpen,
    isSubmittingPost,
  ]);

  // Auto-scroll chat when new messages arrive and user is on Chat tab
  useEffect(() => {
    if (activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages.length, activeTab]);

  // Subject options for posts and filtering
  const subjectOptions = useMemo(() => {
    const base = ['General', ...activeSubjects, 'Physics', 'Chemistry', 'Biology', 'Mathematics'];
    return Array.from(new Set(base));
  }, [activeSubjects]);

  const filterTabs = useMemo(() => {
    return ['All', ...subjectOptions];
  }, [subjectOptions]);

  // Filtered visible posts (excluding items the user chose to hide after reporting)
  const visiblePosts = useMemo(() => {
    return posts.filter((post) => {
      if (hiddenIds.includes(post.id)) return false;
      const matchesSubject =
        selectedSubjectFilter === 'All' ||
        post.subject.toLowerCase() === selectedSubjectFilter.toLowerCase();
      const matchesSearch =
        !searchQuery.trim() ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.subject.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSubject && matchesSearch;
    });
  }, [posts, hiddenIds, selectedSubjectFilter, searchQuery]);

  const selectedPost = useMemo(() => {
    if (!selectedPostId) return null;
    return posts.find((p) => p.id === selectedPostId) || null;
  }, [posts, selectedPostId]);

  const selectedPostReplies = useMemo(() => {
    if (!selectedPostId) return [];
    return replies.filter(
      (r) => r.postId === selectedPostId && !hiddenIds.includes(r.id)
    );
  }, [replies, selectedPostId, hiddenIds]);

  const visibleChatMessages = useMemo(() => {
    return chatMessages.filter((m) => !hiddenIds.includes(m.id));
  }, [chatMessages, hiddenIds]);

  // Handlers for Image Upload
  const handlePostImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUrl = await compressImageFile(file);
      setNewPostImage(compressedDataUrl);
      setErrorBanner(null);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Could not process image');
    } finally {
      if (postFileInputRef.current) postFileInputRef.current.value = '';
    }
  };

  const handleReplyImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUrl = await compressImageFile(file);
      setReplyImage(compressedDataUrl);
      setErrorBanner(null);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Could not process image');
    } finally {
      if (replyFileInputRef.current) replyFileInputRef.current.value = '';
    }
  };

  // Create Post / Ask Doubt
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() && !newPostImage) {
      setErrorBanner('Please write your question or attach a question image.');
      return;
    }

    setIsSubmittingPost(true);
    setErrorBanner(null);

    try {
      const activeIdentity = identity || (await ensureSessionIdentity());
      if (!activeIdentity?.authToken) {
        throw new Error('Could not verify your session identity. Please try again.');
      }

      const res = await apiFetch('/api/community/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeIdentity.authToken}`,
        },
        body: JSON.stringify({
          subject: newPostSubject || 'General',
          content: newPostContent.trim(),
          imageUrl: newPostImage || undefined,
          authorName: displayUserName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish post.');
      }

      const createdPost: CommunityPost = data.post;
      setPosts((prev) => {
        if (prev.some((p) => p.id === createdPost.id)) return prev;
        return [createdPost, ...prev];
      });

      setNewPostContent('');
      setNewPostImage(null);
      setIsCreateModalOpen(false);
      showToast('Your doubt has been posted to the Community!');
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to create post.');
    } finally {
      setIsSubmittingPost(false);
    }
  };

  // Submit Reply / Solution
  const handleCreateReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost) return;
    if (!replyContent.trim() && !replyImage) {
      setErrorBanner('Please enter an explanation or attach a solution image.');
      return;
    }

    setIsSubmittingReply(true);
    setErrorBanner(null);

    try {
      const activeIdentity = identity || (await ensureSessionIdentity());
      if (!activeIdentity?.authToken) {
        throw new Error('Could not verify your session identity.');
      }

      const res = await apiFetch(`/api/community/posts/${selectedPost.id}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeIdentity.authToken}`,
        },
        body: JSON.stringify({
          content: replyContent.trim(),
          imageUrl: replyImage || undefined,
          authorName: displayUserName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit reply.');
      }

      const createdReply: CommunityReply = data.reply;
      setReplies((prev) => {
        if (prev.some((r) => r.id === createdReply.id)) return prev;
        return [...prev, createdReply];
      });

      if (typeof data.replyCount === 'number') {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === selectedPost.id ? { ...p, replyCount: data.replyCount } : p
          )
        );
      }

      setReplyContent('');
      setReplyImage(null);
      showToast('Reply posted!');
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to post reply.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Send Community Chat Message
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const messageText = chatInput.trim();
    setIsSendingChat(true);
    setErrorBanner(null);

    try {
      const activeIdentity = identity || (await ensureSessionIdentity());
      if (!activeIdentity?.authToken) {
        throw new Error('Could not verify your session identity.');
      }

      const res = await apiFetch('/api/community/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeIdentity.authToken}`,
        },
        body: JSON.stringify({
          content: messageText,
          subjectTag: activeGoal || undefined,
          authorName: displayUserName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message.');
      }

      const createdMsg: CommunityChatMessage = data.message;
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === createdMsg.id)) return prev;
        return [...prev, createdMsg];
      });

      setChatInput('');
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setIsSendingChat(false);
    }
  };

  // Delete Own Post, Reply, or Chat Message
  const handleExecuteDelete = async () => {
    if (!confirmDelete) return;
    const { type, id } = confirmDelete;

    try {
      const activeIdentity = identity || (await ensureSessionIdentity());
      if (!activeIdentity?.authToken) {
        throw new Error('Unauthorized');
      }

      const endpoint =
        type === 'post'
          ? `/api/community/posts/${id}`
          : type === 'reply'
          ? `/api/community/replies/${id}`
          : `/api/community/chat/${id}`;

      const res = await apiFetch(endpoint, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${activeIdentity.authToken}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Could not delete item.');
      }

      if (type === 'post') {
        setPosts((prev) => prev.filter((p) => p.id !== id));
        setReplies((prev) => prev.filter((r) => r.postId !== id));
        if (selectedPostId === id) setSelectedPostId(null);
        showToast('Your post was deleted.');
      } else if (type === 'reply') {
        const data = await res.json().catch(() => ({}));
        setReplies((prev) => prev.filter((r) => r.id !== id));
        if (data.postId && typeof data.replyCount === 'number') {
          setPosts((prev) =>
            prev.map((p) =>
              p.id === data.postId ? { ...p, replyCount: data.replyCount } : p
            )
          );
        }
        showToast('Your reply was deleted.');
      } else if (type === 'chat') {
        setChatMessages((prev) => prev.filter((m) => m.id !== id));
        showToast('Your message was deleted.');
      }
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setConfirmDelete(null);
    }
  };

  // Submit Report for Moderation
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTarget) return;

    setIsSubmittingReport(true);
    try {
      const activeIdentity = identity || (await ensureSessionIdentity());
      if (!activeIdentity?.authToken) {
        throw new Error('Session required to submit report.');
      }

      const res = await apiFetch('/api/community/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeIdentity.authToken}`,
        },
        body: JSON.stringify({
          targetType: reportTarget.targetType,
          targetId: reportTarget.targetId,
          reason: reportReason,
          details: reportDetails.trim() || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit report.');
      }

      // Hide reported item from reporter's view and save locally
      const updatedHidden = Array.from(new Set([...hiddenIds, reportTarget.targetId]));
      setHiddenIds(updatedHidden);
      try {
        localStorage.setItem(HIDDEN_ITEMS_STORAGE_KEY, JSON.stringify(updatedHidden));
      } catch {
        // ignore storage error
      }

      if (reportTarget.targetType === 'post' && selectedPostId === reportTarget.targetId) {
        setSelectedPostId(null);
      }

      setReportTarget(null);
      setReportDetails('');
      showToast('Report submitted and content hidden from your feed.');
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to submit report.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-full overflow-x-hidden">
      {/* Header & Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#d4af37]">
            <MessagesSquare className="w-3.5 h-3.5" />
            <span className="uppercase tracking-widest font-mono text-[11px]">
              Study Vault Hub Peer Network
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#fbf9f4] tracking-tight">
            Student Community
          </h1>
          <p className="text-xs sm:text-sm text-[#cbd5e1] max-w-2xl leading-relaxed">
            Ask textbook doubts, upload problem images, discuss step-by-step solutions, and collaborate live with fellow students as{' '}
            <span className="text-[#d4af37] font-semibold">{displayUserName}</span>.
          </p>
        </div>

        {/* Prominent Ask a Doubt / Create Post Button */}
        <button
          onClick={() => {
            setSelectedPostId(null);
            setActiveTab('feed');
            setIsCreateModalOpen(true);
          }}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] hover:brightness-110 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#d4af37]/20 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Ask a Doubt</span>
        </button>
      </div>

      {/* Feedback Toast */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-300 hover:text-white font-semibold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Banner */}
      {errorBanner && (
        <div className="p-3.5 rounded-xl bg-rose-950/90 border border-rose-500/40 text-rose-200 text-xs sm:text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button
            onClick={() => setErrorBanner(null)}
            className="text-rose-300 hover:text-white font-semibold text-xs"
          >
            Close
          </button>
        </div>
      )}

      {/* Main Mode Switcher: Doubts & Discussions vs Community Chat */}
      <div className="p-1.5 bg-[#090e1c] rounded-2xl border border-[#d4af37]/25 flex items-center gap-2">
        <button
          onClick={() => {
            setActiveTab('feed');
          }}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'feed'
              ? 'bg-[#d4af37] text-[#080d1a] shadow-sm font-bold'
              : 'text-[#cbd5e1] hover:text-[#fbf9f4] hover:bg-[#131b2e]'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Doubts &amp; Discussions</span>
          <span className="text-[10px] font-mono opacity-80">({visiblePosts.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('chat');
            setSelectedPostId(null);
          }}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'chat'
              ? 'bg-[#d4af37] text-[#080d1a] shadow-sm font-bold'
              : 'text-[#cbd5e1] hover:text-[#fbf9f4] hover:bg-[#131b2e]'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>Community Chat</span>
          <span className="text-[10px] font-mono opacity-80">({visibleChatMessages.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: DOUBTS & DISCUSSIONS FEED OR POST DETAIL                          */}
      {/* ========================================================================= */}
      {activeTab === 'feed' && (
        <>
          {selectedPost ? (
            /* --------------------------------------------------------------------- */
            /* POST DETAIL & REPLIES / SOLUTIONS VIEW                                */
            /* --------------------------------------------------------------------- */
            <div className="space-y-5">
              <button
                onClick={() => setSelectedPostId(null)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0f172a] border border-[#d4af37]/25 text-xs sm:text-sm text-[#cbd5e1] hover:text-[#d4af37] hover:border-[#d4af37] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to All Discussions</span>
              </button>

              {/* Original Question / Post Card */}
              <article className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#0c1428] via-[#0a1122] to-[#070c18] border border-[#d4af37]/35 shadow-xl space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#131b2e] border border-[#d4af37]/40 overflow-hidden flex items-center justify-center text-[#d4af37] font-display font-bold text-sm shrink-0 aspect-square">
                      {selectedPost.authorAvatarUrl ? (
                        <img
                          src={selectedPost.authorAvatarUrl}
                          alt={selectedPost.authorName}
                          className="w-full h-full object-cover rounded-full aspect-square"
                        />
                      ) : (
                        <User className="w-5 h-5 text-[#d4af37]" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-bold text-sm sm:text-base text-[#fbf9f4]">
                          {selectedPost.authorName}
                        </span>
                        {identity?.userId === selectedPost.authorId && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30">
                            You
                          </span>
                        )}
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-[#131b2e] text-[#d4af37] border border-[#d4af37]/20">
                          {selectedPost.subject}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#9ca3af] mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{formatDateTime(selectedPost.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Moderation Actions */}
                  <div className="flex items-center gap-2">
                    {identity?.userId === selectedPost.authorId || isOwnerAuthenticated ? (
                      <button
                        onClick={() =>
                          setConfirmDelete({ type: 'post', id: selectedPost.id })
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 hover:bg-rose-900/70 text-xs flex items-center gap-1.5 transition-colors"
                        title={
                          identity?.userId === selectedPost.authorId
                            ? 'Delete your post'
                            : 'Delete post (Owner Moderation)'
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          setReportTarget({
                            targetType: 'post',
                            targetId: selectedPost.id,
                            authorName: selectedPost.authorName,
                          })
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-[#131b2e] border border-[#d4af37]/20 text-[#9ca3af] hover:text-amber-300 hover:border-amber-400/40 text-xs flex items-center gap-1.5 transition-colors"
                        title="Report post"
                      >
                        <Flag className="w-3.5 h-3.5" />
                        <span>Report</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Post Text Content */}
                {selectedPost.content && (
                  <p className="text-sm sm:text-base text-[#f7f4ee] whitespace-pre-wrap leading-relaxed">
                    {selectedPost.content}
                  </p>
                )}

                {/* Uploaded Question Image */}
                {selectedPost.imageUrl && (
                  <div className="pt-1">
                    <div
                      onClick={() => setZoomedImageUrl(selectedPost.imageUrl || null)}
                      className="relative group max-w-xl rounded-xl overflow-hidden border border-[#d4af37]/30 bg-[#050914] cursor-zoom-in"
                    >
                      <img
                        src={selectedPost.imageUrl}
                        alt="Uploaded question"
                        className="max-h-[420px] w-auto mx-auto object-contain"
                      />
                      <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-[#060b18]/85 border border-[#d4af37]/30 text-[11px] text-[#fbf9f4] flex items-center gap-1 opacity-90 group-hover:opacity-100">
                        <ZoomIn className="w-3.5 h-3.5 text-[#d4af37]" />
                        <span>Click to enlarge</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-[#1e293b] flex items-center justify-between text-xs text-[#9ca3af]">
                  <span>
                    {selectedPostReplies.length}{' '}
                    {selectedPostReplies.length === 1 ? 'Reply / Solution' : 'Replies & Solutions'}
                  </span>
                </div>
              </article>

              {/* Replies & Solutions List */}
              <div className="space-y-3">
                <h3 className="font-display text-sm sm:text-base font-bold text-[#d4af37] uppercase tracking-wider">
                  Replies &amp; Solutions ({selectedPostReplies.length})
                </h3>

                {selectedPostReplies.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-[#0a1020] border border-[#d4af37]/20 text-center space-y-1">
                    <p className="text-sm font-semibold text-[#fbf9f4]">
                      No replies yet.
                    </p>
                    <p className="text-xs text-[#9ca3af]">
                      Know the answer or want to help solve this doubt? Share your explanation below!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedPostReplies.map((reply) => {
                      const isOwnReply = identity?.userId === reply.authorId;
                      return (
                        <div
                          key={reply.id}
                          className="p-4 sm:p-5 rounded-2xl bg-[#0b1324] border border-[#d4af37]/20 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-[#131b2e] border border-[#d4af37]/30 overflow-hidden flex items-center justify-center text-[#d4af37] font-bold text-xs shrink-0 aspect-square">
                                {reply.authorAvatarUrl ? (
                                  <img
                                    src={reply.authorAvatarUrl}
                                    alt={reply.authorName}
                                    className="w-full h-full object-cover rounded-full aspect-square"
                                  />
                                ) : (
                                  <User className="w-4 h-4 text-[#d4af37]" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-xs sm:text-sm text-[#fbf9f4]">
                                    {reply.authorName}
                                  </span>
                                  {isOwnReply && (
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#d4af37]/20 text-[#d4af37]">
                                      You
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-[#9ca3af]">
                                  {formatDateTime(reply.createdAt)}
                                </span>
                              </div>
                            </div>

                            {isOwnReply || isOwnerAuthenticated ? (
                              <button
                                onClick={() =>
                                  setConfirmDelete({ type: 'reply', id: reply.id })
                                }
                                className="p-1.5 rounded-lg text-rose-300/80 hover:text-rose-300 hover:bg-rose-950/50 transition-colors"
                                title={
                                  isOwnReply
                                    ? 'Delete your reply'
                                    : 'Delete reply (Owner Moderation)'
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  setReportTarget({
                                    targetType: 'reply',
                                    targetId: reply.id,
                                    authorName: reply.authorName,
                                  })
                                }
                                className="p-1.5 rounded-lg text-[#9ca3af] hover:text-amber-300 hover:bg-[#131b2e] transition-colors"
                                title="Report reply"
                              >
                                <Flag className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {reply.content && (
                            <p className="text-xs sm:text-sm text-[#f7f4ee] whitespace-pre-wrap leading-relaxed">
                              {reply.content}
                            </p>
                          )}

                          {reply.imageUrl && (
                            <div
                              onClick={() => setZoomedImageUrl(reply.imageUrl || null)}
                              className="relative group max-w-md rounded-xl overflow-hidden border border-[#d4af37]/25 bg-[#050914] cursor-zoom-in"
                            >
                              <img
                                src={reply.imageUrl}
                                alt="Solution attachment"
                                className="max-h-72 w-auto mx-auto object-contain"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Write a Reply / Solution Box */}
              <form
                onSubmit={handleCreateReply}
                className="p-4 sm:p-5 rounded-2xl bg-[#0c1428] border border-[#d4af37]/30 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#d4af37] uppercase tracking-wider">
                    Post a Solution or Reply as {displayUserName}
                  </label>
                </div>

                <textarea
                  rows={3}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write your step-by-step solution, explanation, or follow-up clarification..."
                  className="w-full p-3 rounded-xl bg-[#070c18] border border-[#d4af37]/25 text-xs sm:text-sm text-[#fbf9f4] placeholder-[#9ca3af] focus:outline-none focus:border-[#d4af37] resize-y"
                />

                {replyImage && (
                  <div className="relative inline-block rounded-xl overflow-hidden border border-[#d4af37]/40 bg-[#050914]">
                    <img
                      src={replyImage}
                      alt="Reply attachment preview"
                      className="max-h-40 w-auto object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setReplyImage(null)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-950/90 text-rose-200 flex items-center justify-center hover:bg-rose-800"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-1">
                  <div>
                    <input
                      ref={replyFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleReplyImageSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => replyFileInputRef.current?.click()}
                      className="px-3 py-2 rounded-xl bg-[#131b2e] border border-[#d4af37]/25 text-xs text-[#cbd5e1] hover:text-[#d4af37] hover:border-[#d4af37] flex items-center gap-1.5 transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-[#d4af37]" />
                      <span>Attach Solution Image</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingReply || (!replyContent.trim() && !replyImage)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-xs sm:text-sm flex items-center gap-1.5 disabled:opacity-50 hover:brightness-110 transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmittingReply ? 'Posting...' : 'Post Reply'}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* --------------------------------------------------------------------- */
            /* DISCUSSIONS FEED LIST                                                 */
            /* --------------------------------------------------------------------- */
            <div className="space-y-4">
              {/* Search & Subject Filter Controls */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#d4af37] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search doubts, questions, subjects, or student names..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0f172a] border border-[#d4af37]/25 text-xs sm:text-sm text-[#fbf9f4] placeholder-[#9ca3af] focus:outline-none focus:border-[#d4af37] transition-colors"
                  />
                </div>

                <div className="flex items-center gap-1.5 p-1 bg-[#090e1c] rounded-xl border border-[#d4af37]/20 overflow-x-auto no-scrollbar">
                  {filterTabs.map((sub) => {
                    const isActive = selectedSubjectFilter === sub;
                    return (
                      <button
                        key={sub}
                        onClick={() => setSelectedSubjectFilter(sub)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                          isActive
                            ? 'bg-[#d4af37] text-[#080d1a] font-bold shadow-sm'
                            : 'text-[#cbd5e1] hover:text-[#fbf9f4] hover:bg-[#131b2e]'
                        }`}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Feed Posts or Authentic Empty State */}
              {isLoading ? (
                <div className="p-10 rounded-2xl bg-[#0b1324] border border-[#d4af37]/20 text-center space-y-2">
                  <p className="text-sm text-[#cbd5e1] font-mono">
                    Loading real-time community discussions...
                  </p>
                </div>
              ) : visiblePosts.length === 0 ? (
                <div className="p-8 sm:p-12 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0c1428] via-[#091020] to-[#060b18] border border-[#d4af37]/30 text-center space-y-4 shadow-lg">
                  <div className="w-14 h-14 rounded-2xl bg-[#131b2e] border border-[#d4af37]/35 flex items-center justify-center mx-auto text-[#d4af37]">
                    <MessagesSquare className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display text-lg sm:text-xl font-bold text-[#fbf9f4]">
                      No discussions yet.
                    </h3>
                    <p className="text-sm sm:text-base text-[#d4af37] font-medium">
                      Be the first to ask a doubt!
                    </p>
                    <p className="text-xs text-[#9ca3af] max-w-md mx-auto pt-1">
                      Post a question or upload a photo of a textbook problem, worksheet, or diagram to start a real peer discussion.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-xs sm:text-sm inline-flex items-center gap-2 hover:brightness-110 transition-all shadow-md cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Post / Ask a Doubt</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {visiblePosts.map((post) => {
                    const isOwnPost = identity?.userId === post.authorId;
                    return (
                      <article
                        key={post.id}
                        onClick={() => setSelectedPostId(post.id)}
                        className="p-4 sm:p-5 rounded-2xl bg-[#0b1324] hover:bg-[#0e172c] border border-[#d4af37]/25 hover:border-[#d4af37]/60 transition-all cursor-pointer space-y-3.5 group shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#131b2e] border border-[#d4af37]/35 overflow-hidden flex items-center justify-center text-[#d4af37] font-display font-bold text-xs sm:text-sm shrink-0 aspect-square">
                              {post.authorAvatarUrl ? (
                                <img
                                  src={post.authorAvatarUrl}
                                  alt={post.authorName}
                                  className="w-full h-full object-cover rounded-full aspect-square"
                                />
                              ) : (
                                <User className="w-4 h-4 text-[#d4af37]" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-display font-bold text-xs sm:text-sm text-[#fbf9f4] group-hover:text-[#d4af37] transition-colors">
                                  {post.authorName}
                                </span>
                                {isOwnPost && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#d4af37]/20 text-[#d4af37]">
                                    You
                                  </span>
                                )}
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#131b2e] text-[#d4af37] border border-[#d4af37]/20">
                                  {post.subject}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-[#9ca3af] mt-0.5">
                                <Clock className="w-3 h-3" />
                                <span>{formatDateTime(post.createdAt)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Stop propagation on action buttons so card click doesn't trigger */}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5"
                          >
                            {isOwnPost || isOwnerAuthenticated ? (
                              <button
                                onClick={() =>
                                  setConfirmDelete({ type: 'post', id: post.id })
                                }
                                className="p-1.5 rounded-lg text-rose-300/80 hover:text-rose-300 hover:bg-rose-950/60 transition-colors"
                                title={
                                  isOwnPost
                                    ? 'Delete your post'
                                    : 'Delete post (Owner Moderation)'
                                }
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  setReportTarget({
                                    targetType: 'post',
                                    targetId: post.id,
                                    authorName: post.authorName,
                                  })
                                }
                                className="p-1.5 rounded-lg text-[#9ca3af] hover:text-amber-300 hover:bg-[#131b2e] transition-colors"
                                title="Report post"
                              >
                                <Flag className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {post.content && (
                          <p className="text-xs sm:text-sm text-[#f7f4ee] whitespace-pre-wrap line-clamp-4 leading-relaxed">
                            {post.content}
                          </p>
                        )}

                        {post.imageUrl && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomedImageUrl(post.imageUrl || null);
                            }}
                            className="relative max-w-md rounded-xl overflow-hidden border border-[#d4af37]/25 bg-[#050914]"
                          >
                            <img
                              src={post.imageUrl}
                              alt="Question attachment"
                              className="max-h-64 w-auto mx-auto object-contain"
                            />
                          </div>
                        )}

                        <div className="pt-2.5 border-t border-[#1e293b] flex items-center justify-between text-xs">
                          <span className="text-[#d4af37] font-semibold flex items-center gap-1.5">
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>
                              {post.replyCount}{' '}
                              {post.replyCount === 1 ? 'Reply' : 'Replies'}
                            </span>
                          </span>
                          <span className="text-[#cbd5e1] group-hover:text-[#d4af37] font-medium transition-colors">
                            View Discussion &amp; Reply →
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: REAL-TIME COMMUNITY STUDY CHAT                                    */}
      {/* ========================================================================= */}
      {activeTab === 'chat' && (
        <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#0b1324] to-[#070c18] border border-[#d4af37]/30 shadow-xl overflow-hidden flex flex-col h-[540px] sm:h-[600px]">
          {/* Chat Header */}
          <div className="px-4 sm:px-6 py-3.5 bg-[#0d172c] border-b border-[#d4af37]/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <MessageCircle className="w-4 h-4 text-[#d4af37]" />
              <div>
                <h2 className="font-display text-sm sm:text-base font-bold text-[#fbf9f4]">
                  Live Study Chat
                </h2>
                <p className="text-[11px] text-[#9ca3af]">
                  Chatting as <span className="text-[#d4af37] font-semibold">{displayUserName}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Chat Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            {visibleChatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-[#131b2e] border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37]">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <h3 className="font-display text-base sm:text-lg font-bold text-[#fbf9f4]">
                  No messages yet.
                </h3>
                <p className="text-xs sm:text-sm text-[#d4af37] font-medium">
                  Start the conversation!
                </p>
              </div>
            ) : (
              visibleChatMessages.map((msg) => {
                const isOwn = identity?.userId === msg.authorId;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isOwn ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 space-y-1 border ${
                        isOwn
                          ? 'bg-[#172544] border-[#d4af37]/45 text-[#fbf9f4]'
                          : 'bg-[#0f172a] border-[#1e293b] text-[#f7f4ee]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-[#131b2e] border border-[#d4af37]/35 overflow-hidden flex items-center justify-center shrink-0 aspect-square">
                            {msg.authorAvatarUrl ? (
                              <img
                                src={msg.authorAvatarUrl}
                                alt={msg.authorName}
                                className="w-full h-full object-cover rounded-full aspect-square"
                              />
                            ) : (
                              <User className="w-3 h-3 text-[#d4af37]" />
                            )}
                          </div>
                          <span className="text-[11px] font-bold text-[#d4af37]">
                            {msg.authorName}
                          </span>
                          {msg.subjectTag && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#090e1c] text-[#cbd5e1] border border-[#d4af37]/20">
                              {msg.subjectTag}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-[#9ca3af]">
                            {formatDateTime(msg.createdAt)}
                          </span>
                          {isOwn || isOwnerAuthenticated ? (
                            <button
                              onClick={() =>
                                setConfirmDelete({ type: 'chat', id: msg.id })
                              }
                              className="text-rose-300/70 hover:text-rose-300 p-0.5"
                              title={
                                isOwn
                                  ? 'Delete your message'
                                  : 'Delete message (Owner Moderation)'
                              }
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                setReportTarget({
                                  targetType: 'chat',
                                  targetId: msg.id,
                                  authorName: msg.authorName,
                                })
                              }
                              className="text-[#9ca3af] hover:text-amber-300 p-0.5"
                              title="Report message"
                            >
                              <Flag className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={handleSendChatMessage}
            className="p-3 sm:p-4 bg-[#0a1122] border-t border-[#d4af37]/25 flex items-center gap-2.5"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Write a study message to the community..."
              maxLength={2000}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#060b18] border border-[#d4af37]/30 text-xs sm:text-sm text-[#fbf9f4] placeholder-[#9ca3af] focus:outline-none focus:border-[#d4af37]"
            />
            <button
              type="submit"
              disabled={isSendingChat || !chatInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-xs sm:text-sm flex items-center gap-1.5 disabled:opacity-50 hover:brightness-110 transition-all shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ASK A DOUBT / CREATE POST                                          */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl sm:rounded-3xl bg-[#0b1324] border border-[#d4af37]/40 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-[#0f1930] border-b border-[#d4af37]/25 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base sm:text-lg font-bold text-[#fbf9f4]">
                  Ask a Doubt / Create Post
                </h2>
                <p className="text-[11px] text-[#cbd5e1]">
                  Posting as <span className="text-[#d4af37] font-semibold">{displayUserName}</span>
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-[#131b2e] text-[#cbd5e1] hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="p-5 space-y-4">
              {/* Subject Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#d4af37] uppercase tracking-wider block">
                  Subject / Category
                </label>
                <select
                  value={newPostSubject}
                  onChange={(e) => setNewPostSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070c18] border border-[#d4af37]/30 text-xs sm:text-sm text-[#fbf9f4] focus:outline-none focus:border-[#d4af37]"
                >
                  {subjectOptions.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              {/* Question Text */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#d4af37] uppercase tracking-wider block">
                  Your Question or Doubt
                </label>
                <textarea
                  rows={4}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Type your question, concept doubt, or problem statement here..."
                  className="w-full p-3.5 rounded-xl bg-[#070c18] border border-[#d4af37]/30 text-xs sm:text-sm text-[#fbf9f4] placeholder-[#9ca3af] focus:outline-none focus:border-[#d4af37] resize-y"
                />
              </div>

              {/* Question Image Upload */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#d4af37] uppercase tracking-wider block">
                  Question / Problem Image (Optional)
                </label>
                <input
                  ref={postFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePostImageSelect}
                  className="hidden"
                />

                {newPostImage ? (
                  <div className="relative rounded-xl overflow-hidden border border-[#d4af37]/40 bg-[#050914] p-2">
                    <img
                      src={newPostImage}
                      alt="Selected problem preview"
                      className="max-h-52 w-auto mx-auto object-contain rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setNewPostImage(null)}
                      className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-rose-950/90 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-1 hover:bg-rose-900"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => postFileInputRef.current?.click()}
                    className="w-full py-4 px-4 rounded-xl border-2 border-dashed border-[#d4af37]/35 bg-[#070c18] hover:bg-[#0f172a] hover:border-[#d4af37] text-xs sm:text-sm text-[#cbd5e1] flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-6 h-6 text-[#d4af37]" />
                    <span className="font-semibold text-[#fbf9f4]">
                      Upload Image of Textbook Question, Diagram or Handwritten Doubt
                    </span>
                    <span className="text-[11px] text-[#9ca3af]">
                      Supports JPG, PNG, WebP (Text only, Image only, or Text + Image)
                    </span>
                  </button>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#131b2e] text-xs sm:text-sm text-[#cbd5e1] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPost || (!newPostContent.trim() && !newPostImage)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-xs sm:text-sm flex items-center gap-1.5 disabled:opacity-50 hover:brightness-110 transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingPost ? 'Publishing...' : 'Publish Post'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE CONFIRMATION                                                */}
      {/* ========================================================================= */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0b1324] border border-rose-500/40 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-rose-300">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h3 className="font-display text-base font-bold text-[#fbf9f4]">
                Confirm Delete
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[#cbd5e1] leading-relaxed">
              Are you sure you want to permanently delete your{' '}
              {confirmDelete.type === 'post'
                ? 'discussion post and its replies'
                : confirmDelete.type === 'reply'
                ? 'reply'
                : 'chat message'}
              ?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-xl bg-[#131b2e] text-xs text-[#cbd5e1] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REPORT CONTENT                                                     */}
      {/* ========================================================================= */}
      {reportTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0b1324] border border-[#d4af37]/40 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-300">
                <Flag className="w-4 h-4" />
                <h3 className="font-display text-base font-bold text-[#fbf9f4]">
                  Report {reportTarget.targetType === 'post' ? 'Post' : reportTarget.targetType === 'reply' ? 'Reply' : 'Message'}
                </h3>
              </div>
              <button
                onClick={() => setReportTarget(null)}
                className="w-7 h-7 rounded-lg bg-[#131b2e] text-[#cbd5e1] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#d4af37] block">
                  Reason for reporting content by {reportTarget.authorName}
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#070c18] border border-[#d4af37]/30 text-xs sm:text-sm text-[#fbf9f4]"
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#cbd5e1] block">
                  Additional Details (Optional)
                </label>
                <textarea
                  rows={2}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide any context..."
                  className="w-full p-3 rounded-xl bg-[#070c18] border border-[#d4af37]/25 text-xs text-[#fbf9f4]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setReportTarget(null)}
                  className="px-4 py-2 rounded-xl bg-[#131b2e] text-xs text-[#cbd5e1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#080d1a] font-bold text-xs"
                >
                  {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FULLSCREEN IMAGE LIGHTBOX                                          */}
      {/* ========================================================================= */}
      {zoomedImageUrl && (
        <div
          onClick={() => setZoomedImageUrl(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
        >
          <button
            onClick={() => setZoomedImageUrl(null)}
            className="fixed top-4 right-4 w-10 h-10 rounded-full bg-[#131b2e] border border-[#d4af37]/40 text-white flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={zoomedImageUrl}
            alt="Full size view"
            className="max-w-full max-h-[90vh] object-contain rounded-xl border border-[#d4af37]/30"
          />
        </div>
      )}
    </div>
  );
});
