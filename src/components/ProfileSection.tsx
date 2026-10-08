import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  User,
  Flame,
  Bookmark,
  BookOpen,
  FileText,
  CheckCircle2,
  Share2,
  Clock,
  Target,
  Edit3,
  Check,
  ShieldAlert,
  ShieldCheck,
  BarChart3,
  Plus,
  Trash2,
  X,
  Sun,
  Moon,
  Monitor,
  Palette,
  Camera,
  ZoomIn,
  ZoomOut,
  Move,
  Loader2,
  AlertTriangle,
  Settings,
  LogOut,
  LogIn,
  AtSign,
  Lock
} from 'lucide-react';
import { UserStats, Book, StudyNote, ActiveSection, ThemePreference } from '../types';
import { SAMPLE_BOOKS, SAMPLE_NOTES, SAMPLE_MCQS, PRESET_GOALS } from '../data/sampleData';
import { apiFetch } from '../services/nativeApiBridge';

const IDENTITY_STORAGE_KEY = 'study_vault_community_identity_v1';

interface ProfileSectionProps {
  userStats: UserStats;
  onUpdateStats: (newStats: Partial<UserStats>) => void;
  onSelectBook: (book: Book) => void;
  onSelectNote: (note: StudyNote) => void;
  onNavigateToPractice: () => void;
  onNavigate: (section: ActiveSection) => void;
  themePreference: ThemePreference;
  resolvedTheme: 'light' | 'dark';
  onChangeTheme: (theme: ThemePreference) => void;
  isOwnerAuthenticated?: boolean;
  onOpenOwnerAnalytics?: () => void;
  onOpenAuthModal?: (mode: 'register' | 'login') => void;
  onLogoutAccount?: () => void;
  onAccountDeleted?: () => void;
}

export const ProfileSection: React.FC<ProfileSectionProps> = React.memo(({
  userStats,
  onUpdateStats,
  onSelectBook,
  onSelectNote,
  onNavigateToPractice,
  onNavigate,
  themePreference,
  resolvedTheme,
  onChangeTheme,
  isOwnerAuthenticated = false,
  onOpenOwnerAnalytics,
  onOpenAuthModal,
  onLogoutAccount,
  onAccountDeleted,
}) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [nameInput, setNameInput] = useState(userStats.name);
  const [copiedReport, setCopiedReport] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');
  const [deleteConfirmWord, setDeleteConfirmWord] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

  // Real User Profile Photo & Interactive Crop State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  const [rawSelectedDataUrl, setRawSelectedDataUrl] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState<number>(1);
  const [cropOffset, setCropOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingCrop, setIsDraggingCrop] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; startOffsetX: number; startOffsetY: number }>({
    x: 0,
    y: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  });

  const [isSavingPhoto, setIsSavingPhoto] = useState<boolean>(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSuccessToast, setPhotoSuccessToast] = useState<string | null>(null);

  // Add goal drawer state
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [customGoalText, setCustomGoalText] = useState('');

  // Overall accuracy calculation from real data
  const overallAccuracy =
    userStats.questionsAttempted > 0
      ? ((userStats.correctAnswers / userStats.questionsAttempted) * 100).toFixed(1)
      : '0.0';

  const formatTotalTime = (totalMin: number) => {
    const hrs = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    if (hrs === 0) return `${mins}m`;
    return `${hrs}h ${mins}m`;
  };

  // Sync authenticated profile update (name and/or photo) to backend so Community reflects real user data
  const syncProfileWithBackend = useCallback(
    async (payload: { displayName?: string; profilePhotoUrl?: string | null }) => {
      let storedIdentity: { userId?: string; authToken?: string } | null = null;
      try {
        const raw = localStorage.getItem(IDENTITY_STORAGE_KEY);
        if (raw) {
          storedIdentity = JSON.parse(raw);
        }
      } catch {
        // ignore parse error
      }

      // Ensure session identity exists first if user hasn't opened Community yet
      if (!storedIdentity?.authToken) {
        const sessionRes = await apiFetch('/api/community/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName: payload.displayName ?? (userStats.name || 'Student'),
            ...(Object.prototype.hasOwnProperty.call(payload, 'profilePhotoUrl')
              ? { profilePhotoUrl: payload.profilePhotoUrl }
              : {}),
          }),
        });
        if (!sessionRes.ok) {
          const errData = await sessionRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Could not establish profile storage session.');
        }
        const sessionData = await sessionRes.json();
        if (sessionData.userId && sessionData.authToken) {
          storedIdentity = {
            userId: sessionData.userId,
            authToken: sessionData.authToken,
          };
          try {
            localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(storedIdentity));
          } catch {
            // ignore storage quota error
          }
        }
        return;
      }

      const res = await apiFetch('/api/community/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${storedIdentity.authToken}`,
        },
        body: JSON.stringify({
          displayName: payload.displayName ?? (userStats.name || 'Student'),
          ...(Object.prototype.hasOwnProperty.call(payload, 'profilePhotoUrl')
            ? { profilePhotoUrl: payload.profilePhotoUrl }
            : {}),
        }),
      });

      if (res.status === 401) {
        // Re-initialize session if token expired or server restarted
        const reinitRes = await apiFetch('/api/community/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName: payload.displayName ?? (userStats.name || 'Student'),
            ...(Object.prototype.hasOwnProperty.call(payload, 'profilePhotoUrl')
              ? { profilePhotoUrl: payload.profilePhotoUrl }
              : {}),
          }),
        });
        if (!reinitRes.ok) {
          throw new Error('Failed to synchronize profile with server.');
        }
        const reinitData = await reinitRes.json();
        if (reinitData.userId && reinitData.authToken) {
          try {
            localStorage.setItem(
              IDENTITY_STORAGE_KEY,
              JSON.stringify({ userId: reinitData.userId, authToken: reinitData.authToken })
            );
          } catch {
            // ignore
          }
        }
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save profile changes to server.');
      }
    },
    [userStats.name]
  );

  // Render interactive circular crop preview onto canvas whenever zoom or offset changes
  const drawCropPreview = useCallback(() => {
    const canvas = cropCanvasRef.current;
    const img = loadedImageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width; // 320x320 high-DPI square canvas
    ctx.clearRect(0, 0, size, size);

    // Compute cover scale so image fills the square at zoom = 1
    const baseScale = Math.max(size / img.width, size / img.height);
    const activeScale = baseScale * cropZoom;

    const drawWidth = img.width * activeScale;
    const drawHeight = img.height * activeScale;

    // Clamp offsets so image edges never leave empty gaps inside the crop circle
    const maxOffsetX = Math.max(0, (drawWidth - size) / 2);
    const maxOffsetY = Math.max(0, (drawHeight - size) / 2);

    const clampedX = Math.max(-maxOffsetX, Math.min(maxOffsetX, cropOffset.x));
    const clampedY = Math.max(-maxOffsetY, Math.min(maxOffsetY, cropOffset.y));

    const dx = (size - drawWidth) / 2 + clampedX;
    const dy = (size - drawHeight) / 2 + clampedY;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
    ctx.restore();
  }, [cropZoom, cropOffset]);

  useEffect(() => {
    if (rawSelectedDataUrl) {
      drawCropPreview();
    }
  }, [rawSelectedDataUrl, drawCropPreview]);

  const hasOpenProfileModal = Boolean(rawSelectedDataUrl || showDeleteAccountConfirm);

  useEffect(() => {
    if (!hasOpenProfileModal || typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (rawSelectedDataUrl && !isSavingPhoto) {
          setRawSelectedDataUrl(null);
        } else if (showDeleteAccountConfirm && !isDeletingAccount) {
          setShowDeleteAccountConfirm(false);
          setDeleteAccountError(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    hasOpenProfileModal,
    rawSelectedDataUrl,
    isSavingPhoto,
    showDeleteAccountConfirm,
    isDeletingAccount,
  ]);

  // Handle user selecting an image file from device
  const handleSelectPhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setPhotoError(null);
    setPhotoSuccessToast(null);

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file (JPG, PNG, WebP, etc.) from your device.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setPhotoError('Selected file exceeds 15 MB. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result !== 'string') {
        setPhotoError('Could not read the selected image file.');
        return;
      }

      const img = new Image();
      img.onload = () => {
        if (img.width < 32 || img.height < 32) {
          setPhotoError('Image resolution is too small. Please select a clearer photo.');
          return;
        }
        loadedImageRef.current = img;
        setCropZoom(1);
        setCropOffset({ x: 0, y: 0 });
        setRawSelectedDataUrl(result);
      };
      img.onerror = () => {
        setPhotoError('The selected file could not be decoded as a valid image.');
      };
      img.src = result;
    };
    reader.onerror = () => {
      setPhotoError('Failed to read the selected file from your device.');
    };
    reader.readAsDataURL(file);
  };

  // Drag/pan handlers for crop adjustment (mouse & touch)
  const handleCropPointerDown = (clientX: number, clientY: number) => {
    setIsDraggingCrop(true);
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      startOffsetX: cropOffset.x,
      startOffsetY: cropOffset.y,
    };
  };

  const handleCropPointerMove = (clientX: number, clientY: number) => {
    if (!isDraggingCrop || !loadedImageRef.current || !cropCanvasRef.current) return;
    const img = loadedImageRef.current;
    const size = cropCanvasRef.current.width;
    const displaySize = cropCanvasRef.current.clientWidth || 200;
    const ratio = size / displaySize;

    const deltaX = (clientX - dragStartRef.current.x) * ratio;
    const deltaY = (clientY - dragStartRef.current.y) * ratio;

    const baseScale = Math.max(size / img.width, size / img.height);
    const activeScale = baseScale * cropZoom;
    const drawWidth = img.width * activeScale;
    const drawHeight = img.height * activeScale;

    const maxOffsetX = Math.max(0, (drawWidth - size) / 2);
    const maxOffsetY = Math.max(0, (drawHeight - size) / 2);

    setCropOffset({
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, dragStartRef.current.startOffsetX + deltaX)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, dragStartRef.current.startOffsetY + deltaY)),
    });
  };

  const handleCropPointerUp = () => {
    setIsDraggingCrop(false);
  };

  // Confirm & Save Cropped Profile Photo
  const handleConfirmSavePhoto = async () => {
    if (!cropCanvasRef.current || !loadedImageRef.current) return;

    setIsSavingPhoto(true);
    setPhotoError(null);
    setPhotoSuccessToast(null);

    try {
      drawCropPreview();
      // Export clean, square-aspect-ratio compressed JPEG (320x320)
      const compressedAvatarDataUrl = cropCanvasRef.current.toDataURL('image/jpeg', 0.86);

      if (!compressedAvatarDataUrl || !compressedAvatarDataUrl.startsWith('data:image/')) {
        throw new Error('Failed to process cropped photo.');
      }

      // Persist to backend for authenticated user ownership & Community display
      await syncProfileWithBackend({
        displayName: userStats.name || 'Student',
        profilePhotoUrl: compressedAvatarDataUrl,
      });

      // Persist to local userStats
      onUpdateStats({
        profilePhotoUrl: compressedAvatarDataUrl,
      });

      setRawSelectedDataUrl(null);
      loadedImageRef.current = null;
      setPhotoSuccessToast('Your profile photo has been saved.');
      setTimeout(() => setPhotoSuccessToast(null), 3200);
    } catch (err) {
      setPhotoError(
        err instanceof Error
          ? err.message
          : 'Failed to upload and save your profile photo. Please try again.'
      );
    } finally {
      setIsSavingPhoto(false);
    }
  };

  // Remove Profile Photo and revert to neutral/default avatar
  const handleRemoveProfilePhoto = async () => {
    setIsSavingPhoto(true);
    setPhotoError(null);
    setPhotoSuccessToast(null);

    try {
      await syncProfileWithBackend({
        displayName: userStats.name || 'Student',
        profilePhotoUrl: null,
      });

      onUpdateStats({
        profilePhotoUrl: null,
      });

      setRawSelectedDataUrl(null);
      loadedImageRef.current = null;
      setPhotoSuccessToast('Profile photo removed. Reverted to default avatar.');
      setTimeout(() => setPhotoSuccessToast(null), 3200);
    } catch (err) {
      setPhotoError(
        err instanceof Error
          ? err.message
          : 'Failed to remove profile photo. Please try again.'
      );
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    const trimmed = nameInput.trim();
    onUpdateStats({
      name: trimmed
    });
    try {
      await syncProfileWithBackend({ displayName: trimmed });
    } catch {
      // Name is still saved locally even if community sync is offline
    }
    setPhotoSuccessToast('Profile name updated.');
    setTimeout(() => setPhotoSuccessToast(null), 2500);
  };

  const handleAddGoal = (goal: string) => {
    if (!goal.trim()) return;
    if (userStats.selectedGoals.includes(goal)) return;

    const updated = [...userStats.selectedGoals, goal];
    onUpdateStats({
      selectedGoals: updated,
      activeGoal: userStats.activeGoal || goal
    });
  };

  const handleRemoveGoal = (goalToRemove: string) => {
    const updated = userStats.selectedGoals.filter((g) => g !== goalToRemove);
    const newActive =
      userStats.activeGoal === goalToRemove
        ? updated[0] || ''
        : userStats.activeGoal;

    onUpdateStats({
      selectedGoals: updated,
      activeGoal: newActive
    });
  };

  const handleAddCustomGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoalText.trim()) return;
    handleAddGoal(customGoalText.trim());
    setCustomGoalText('');
  };

  const handleShareReport = () => {
    const report = `Study Vault Hub - Student Summary
Name: ${userStats.name || 'Student'}
Preparing for: ${userStats.selectedGoals.join(', ') || 'General Study'}
Active Goal: ${userStats.activeGoal || 'None'}
Total Questions Solved: ${userStats.questionsAttempted}
Correct Answers: ${userStats.correctAnswers}
Incorrect Answers: ${userStats.incorrectAnswers}
Overall Accuracy: ${overallAccuracy}%
Total Study Time: ${formatTotalTime(userStats.totalStudyMinutes)}
Active Streak: ${userStats.streak?.current || 0} Days
(Data saved locally on device)`;

    navigator.clipboard?.writeText?.(report);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  // Find real bookmarked items
  const bookmarkedBooks = SAMPLE_BOOKS.filter((b) =>
    userStats.bookmarkedItemIds.includes(b.id)
  );
  const bookmarkedNotes = SAMPLE_NOTES.filter((n) =>
    userStats.bookmarkedItemIds.includes(n.id)
  );
  const bookmarkedMCQs = SAMPLE_MCQS.filter((q) =>
    userStats.bookmarkedItemIds.includes(q.id)
  );

  return (
    <div className="space-y-6 pb-12 max-w-full overflow-x-hidden">
      {/* Title & Introduction */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#d4af37]">
          <User className="w-3.5 h-3.5" />
          <span className="uppercase tracking-widest font-mono text-[11px]">Aspirant Profile & Dossier</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#fbf9f4] tracking-tight">
          Student Profile
        </h1>
        <p className="text-xs sm:text-sm text-[#cbd5e1] max-w-2xl leading-relaxed">
          Manage your student name, selected exams, academic target streams, and review verified performance records.
        </p>
      </div>

      {copiedReport && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between">
          <span>Copied performance summary report to clipboard!</span>
          <Check className="w-4 h-4 text-emerald-400" />
        </div>
      )}

      {/* 1. Main Profile Card */}
      <section className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0c1428] via-[#090f20] to-[#060b18] border border-[#d4af37]/35 shadow-xl relative overflow-hidden space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {/* Circular Profile Avatar — Shows user's own uploaded photo or neutral default avatar */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-[#d4af37] via-[#aa7c11] to-[#5a3e06] p-[2px] shadow-lg shrink-0 aspect-square">
              <div className="w-full h-full bg-[#080d1a] rounded-full overflow-hidden flex items-center justify-center relative">
                {userStats.profilePhotoUrl ? (
                  <img
                    src={userStats.profilePhotoUrl}
                    alt={userStats.name ? `${userStats.name}'s profile photo` : 'Profile photo'}
                    className="w-full h-full object-cover rounded-full aspect-square"
                  />
                ) : (
                  <User className="w-8 h-8 sm:w-9 sm:h-9 text-[#d4af37]" aria-label="Default neutral avatar" />
                )}
              </div>
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl sm:text-2xl font-bold text-[#fbf9f4] truncate">
                  {userStats.name || 'Student'}
                </h2>
                {userStats.username && (
                  <span className="px-2 py-0.5 rounded-lg bg-[#131b2e] border border-[#d4af37]/30 text-[11px] font-mono text-[#d4af37] inline-flex items-center gap-0.5">
                    <AtSign className="w-3 h-3" />
                    <span>{userStats.username}</span>
                  </span>
                )}
                {isOwnerAuthenticated && (
                  <span className="px-2 py-0.5 rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/50 text-[10px] font-mono font-bold uppercase tracking-wider text-[#d4af37] inline-flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Owner</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[#9ca3af] truncate">
                Active Focus:{' '}
                <span className="text-[#d4af37] font-semibold">
                  {userStats.activeGoal || 'Choose your exam or study goal'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setNameInput(userStats.name || '');
                setPhotoError(null);
                setIsEditingProfile(!isEditingProfile);
              }}
              className="px-3.5 py-2 rounded-xl bg-[#131b2e] border border-[#d4af37]/30 text-[#fbf9f4] hover:text-[#d4af37] hover:border-[#d4af37] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditingProfile ? 'Close Edit Profile' : 'Edit Profile'}</span>
            </button>

            <button
              onClick={handleShareReport}
              aria-label="Share Report"
              className="w-9 h-9 rounded-xl bg-[#131b2e] border border-[#d4af37]/25 text-[#cbd5e1] hover:text-[#d4af37] hover:border-[#d4af37] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              title="Export Report"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status / Feedback Messages */}
        {photoSuccessToast && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{photoSuccessToast}</span>
            </div>
            <button
              onClick={() => setPhotoSuccessToast(null)}
              className="text-emerald-300 hover:text-white text-xs font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {photoError && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{photoError}</span>
            </div>
            <button
              onClick={() => setPhotoError(null)}
              className="text-rose-300 hover:text-white text-xs font-semibold"
            >
              Close
            </button>
          </div>
        )}

        {/* Edit Profile Panel (Profile Photo + Student Name) */}
        {isEditingProfile && (
          <div className="p-4 sm:p-5 rounded-2xl bg-[#090e1c] border border-[#d4af37]/35 space-y-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-[#1f293d] pb-3">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[#d4af37] uppercase tracking-wider">
                  Edit Profile
                </h3>
                <p className="text-[11px] text-[#9ca3af] mt-0.5">
                  Personalize your own profile photo and display name
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRawSelectedDataUrl(null);
                  loadedImageRef.current = null;
                  setIsEditingProfile(false);
                }}
                className="w-7 h-7 rounded-lg bg-[#131b2e] text-[#9ca3af] hover:text-[#fbf9f4] flex items-center justify-center"
                aria-label="Close Edit Profile"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* A. PROFILE PHOTO SECTION */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-[#fbf9f4] uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>Profile Photo</span>
                </h4>
                <span className="text-[11px] text-[#9ca3af]">
                  {userStats.profilePhotoUrl ? 'Custom photo active' : 'Default avatar active'}
                </span>
              </div>

              {/* Hidden file input for selecting photo from user's own device */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleSelectPhotoFile}
                className="hidden"
              />

              {!rawSelectedDataUrl ? (
                /* Current Avatar Preview + Upload / Change / Remove Controls */
                <div className="p-4 rounded-xl bg-[#0f172a] border border-[#d4af37]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#d4af37] via-[#aa7c11] to-[#5a3e06] p-[2px] shrink-0 aspect-square">
                      <div className="w-full h-full bg-[#080d1a] rounded-full overflow-hidden flex items-center justify-center">
                        {userStats.profilePhotoUrl ? (
                          <img
                            src={userStats.profilePhotoUrl}
                            alt="Current profile photo"
                            className="w-full h-full object-cover rounded-full aspect-square"
                          />
                        ) : (
                          <User className="w-7 h-7 text-[#d4af37]" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs sm:text-sm font-semibold text-[#fbf9f4]">
                        {userStats.profilePhotoUrl
                          ? 'Your Uploaded Profile Photo'
                          : 'No profile photo uploaded'}
                      </p>
                      <p className="text-[11px] text-[#9ca3af] leading-relaxed max-w-md">
                        {userStats.profilePhotoUrl
                          ? 'You can change or remove your photo anytime.'
                          : 'Select a photo from your device to crop and set as your circular profile avatar.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isSavingPhoto}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-xs flex items-center gap-1.5 hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{userStats.profilePhotoUrl ? 'Change Photo' : 'Upload Photo'}</span>
                    </button>

                    {userStats.profilePhotoUrl && (
                      <button
                        type="button"
                        disabled={isSavingPhoto}
                        onClick={handleRemoveProfilePhoto}
                        className="px-3.5 py-2 rounded-xl bg-rose-950/60 border border-rose-500/35 text-rose-200 hover:bg-rose-900/70 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        {isSavingPhoto ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        <span>Remove Photo</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Interactive Crop & Position Adjustment Before Explicit Confirmation */
                <div className="p-4 sm:p-5 rounded-xl bg-[#0f172a] border border-[#d4af37]/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#d4af37] uppercase tracking-wider">
                      Adjust Crop &amp; Position Before Saving
                    </span>
                    <span className="text-[11px] text-[#9ca3af] flex items-center gap-1">
                      <Move className="w-3 h-3 text-[#d4af37]" />
                      <span>Drag to reposition</span>
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    {/* Circular Crop Viewport */}
                    <div className="relative w-44 h-44 sm:w-48 sm:h-48 rounded-full p-[2px] bg-gradient-to-br from-[#d4af37] via-[#aa7c11] to-[#5a3e06] shadow-xl shrink-0 select-none touch-none">
                      <canvas
                        ref={cropCanvasRef}
                        width={320}
                        height={320}
                        onMouseDown={(e) => handleCropPointerDown(e.clientX, e.clientY)}
                        onMouseMove={(e) => handleCropPointerMove(e.clientX, e.clientY)}
                        onMouseUp={handleCropPointerUp}
                        onMouseLeave={handleCropPointerUp}
                        onTouchStart={(e) => {
                          if (e.touches.length === 1) {
                            handleCropPointerDown(e.touches[0].clientX, e.touches[0].clientY);
                          }
                        }}
                        onTouchMove={(e) => {
                          if (e.touches.length === 1) {
                            handleCropPointerMove(e.touches[0].clientX, e.touches[0].clientY);
                          }
                        }}
                        onTouchEnd={handleCropPointerUp}
                        className="w-full h-full rounded-full bg-[#080d1a] cursor-grab active:cursor-grabbing block"
                      />
                    </div>

                    {/* Zoom Slider & Confirmation Controls */}
                    <div className="flex-1 w-full space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#cbd5e1] font-medium flex items-center gap-1.5">
                            <ZoomIn className="w-3.5 h-3.5 text-[#d4af37]" />
                            <span>Zoom &amp; Scale</span>
                          </span>
                          <span className="font-mono text-[#d4af37] text-xs">
                            {Math.round(cropZoom * 100)}%
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCropZoom((z) => Math.max(1, Number((z - 0.1).toFixed(2))))}
                            className="p-1.5 rounded-lg bg-[#131b2e] border border-[#d4af37]/25 text-[#cbd5e1] hover:text-[#d4af37]"
                            aria-label="Zoom out"
                          >
                            <ZoomOut className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.05}
                            value={cropZoom}
                            onChange={(e) => setCropZoom(Number(e.target.value))}
                            className="flex-1 accent-[#d4af37] cursor-pointer"
                          />
                          <button
                            type="button"
                            onClick={() => setCropZoom((z) => Math.min(3, Number((z + 0.1).toFixed(2))))}
                            className="p-1.5 rounded-lg bg-[#131b2e] border border-[#d4af37]/25 text-[#cbd5e1] hover:text-[#d4af37]"
                            aria-label="Zoom in"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-[#9ca3af] leading-relaxed">
                        Drag the image inside the circle to center your photo. Your photo will only be saved after you click <strong className="text-[#fbf9f4]">Save Profile Photo</strong>.
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          disabled={isSavingPhoto}
                          onClick={handleConfirmSavePhoto}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-xs flex items-center gap-1.5 hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer"
                        >
                          {isSavingPhoto ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Saving Photo...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Save Profile Photo</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={isSavingPhoto}
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3.5 py-2 rounded-xl bg-[#131b2e] border border-[#d4af37]/30 text-xs text-[#fbf9f4] hover:border-[#d4af37] transition-colors cursor-pointer"
                        >
                          Choose Different File
                        </button>

                        <button
                          type="button"
                          disabled={isSavingPhoto}
                          onClick={() => {
                            setRawSelectedDataUrl(null);
                            loadedImageRef.current = null;
                          }}
                          className="px-3 py-2 rounded-xl text-xs text-[#9ca3af] hover:text-[#fbf9f4]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* B. STUDENT DISPLAY NAME SECTION */}
            <form onSubmit={handleSaveName} className="space-y-2.5 pt-3 border-t border-[#1f293d]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#fbf9f4] uppercase tracking-wider">
                  Student Display Name
                </label>
                <span className="text-[11px] text-[#9ca3af]">Used in Profile &amp; Community</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Enter student name..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[#131b2e] border border-[#273557] text-[#fbf9f4] text-xs sm:text-sm focus:border-[#d4af37] focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#d4af37] text-[#080d1a] font-bold text-xs sm:text-sm hover:brightness-110 cursor-pointer"
                >
                  Save Name
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 2. Preparing for: Selected Exams / Study Goals */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#080d1a] border border-[#d4af37]/25 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase font-semibold text-[#d4af37] tracking-wider">
              Preparing For:
            </h3>
            <button
              onClick={() => setIsAddingGoal(!isAddingGoal)}
              className="text-xs text-[#d4af37] hover:underline flex items-center gap-1 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add / Change Exam</span>
            </button>
          </div>

          {userStats.selectedGoals.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#131b2e] border border-[#273557] text-center space-y-2">
              <p className="text-xs sm:text-sm text-[#fbf9f4]">
                Choose your exam or study goal
              </p>
              <p className="text-[11px] text-[#9ca3af]">
                Select the entrance exams, board classes, or academic goals you are preparing for.
              </p>
              <button
                onClick={() => setIsAddingGoal(true)}
                className="px-4 py-1.5 rounded-lg bg-[#d4af37] text-[#080d1a] font-bold text-xs"
              >
                Select Goals Now
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {userStats.selectedGoals.map((goal) => {
                const isActive = goal === userStats.activeGoal;
                return (
                  <div
                    key={goal}
                    className={`px-3 py-1.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                      isActive
                        ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#fbf9f4] shadow-sm'
                        : 'bg-[#131b2e] border-[#d4af37]/20 text-[#cbd5e1]'
                    }`}
                  >
                    <button
                      onClick={() => onUpdateStats({ activeGoal: goal })}
                      className="text-xs font-semibold hover:text-[#d4af37] text-left flex items-center gap-1.5"
                      title="Set as Active Goal"
                    >
                      <span>{goal}</span>
                      {isActive && (
                        <span className="text-[10px] text-[#d4af37] font-mono">(Active)</span>
                      )}
                    </button>
                    <button
                      onClick={() => handleRemoveGoal(goal)}
                      aria-label={`Remove ${goal}`}
                      className="w-4 h-4 rounded text-[#9ca3af] hover:text-rose-400 flex items-center justify-center transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Goal Drawer */}
          {isAddingGoal && (
            <div className="p-4 rounded-xl bg-[#131b2e] border border-[#d4af37]/30 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#fbf9f4]">Add Another Study Goal</span>
                <button onClick={() => setIsAddingGoal(false)} className="text-xs text-[#9ca3af] hover:text-white">
                  Done
                </button>
              </div>

              {/* Preset Goals Pills */}
              <div className="flex flex-wrap gap-1.5">
                {PRESET_GOALS.map((pGoal) => {
                  const alreadyAdded = userStats.selectedGoals.includes(pGoal);
                  return (
                    <button
                      key={pGoal}
                      onClick={() => {
                        if (alreadyAdded) {
                          handleRemoveGoal(pGoal);
                        } else {
                          handleAddGoal(pGoal);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        alreadyAdded
                          ? 'bg-[#d4af37] text-[#080d1a] font-bold'
                          : 'bg-[#080d1a] border border-[#273557] text-[#cbd5e1] hover:border-[#d4af37]'
                      }`}
                    >
                      {alreadyAdded ? `✓ ${pGoal}` : `+ ${pGoal}`}
                    </button>
                  );
                })}
              </div>

              {/* Custom Goal Form */}
              <form onSubmit={handleAddCustomGoalSubmit} className="flex gap-2 pt-2 border-t border-[#1f293d]">
                <input
                  type="text"
                  value={customGoalText}
                  onChange={(e) => setCustomGoalText(e.target.value)}
                  placeholder="Or type custom exam / goal name..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-[#080d1a] border border-[#273557] text-xs text-[#fbf9f4] focus:border-[#d4af37] focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-[#d4af37] text-[#080d1a] font-bold text-xs hover:brightness-110"
                >
                  Add Custom
                </button>
              </form>
            </div>
          )}
        </div>

        {/* 4 Quantitative Real Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#d4af37]/20">
          <div className="p-3.5 rounded-xl bg-[#131b2e]/80 border border-[#d4af37]/20 text-center">
            <span className="text-[11px] text-[#9ca3af] block">Questions Solved</span>
            <span className="font-display text-2xl font-bold text-[#d4af37] tabular-nums mt-1 block">
              {userStats.questionsAttempted}
            </span>
            <span className="text-[10px] text-[#9ca3af]">
              +{userStats.correctAnswers} / -{userStats.incorrectAnswers}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#131b2e]/80 border border-[#d4af37]/20 text-center">
            <span className="text-[11px] text-[#9ca3af] block">Total Study Time</span>
            <span className="font-display text-2xl font-bold text-[#fbf9f4] tabular-nums mt-1 block">
              {formatTotalTime(userStats.totalStudyMinutes)}
            </span>
            <span className="text-[10px] text-[#9ca3af]">Real session timer</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#131b2e]/80 border border-[#d4af37]/20 text-center">
            <span className="text-[11px] text-[#9ca3af] block">Overall Accuracy</span>
            <span className="font-display text-2xl font-bold text-emerald-400 tabular-nums mt-1 block">
              {overallAccuracy}%
            </span>
            <span className="text-[10px] text-[#9ca3af]">Accuracy ratio</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#131b2e]/80 border border-[#d4af37]/20 text-center">
            <span className="text-[11px] text-[#9ca3af] block">Current Streak</span>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <Flame className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span className="font-display text-2xl font-bold text-[#fbf9f4] tabular-nums">
                {userStats.streak?.current || 0}d
              </span>
            </div>
            <span className="text-[10px] text-[#9ca3af]">Active days</span>
          </div>
        </div>
      </section>

      {/* 2. Account & Settings Section (Cross-Device Sync, Logout & Permanent Account Deletion) */}
      <section className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#0c1428] via-[#0a1122] to-[#060b18] border border-[#d4af37]/30 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#d4af37] uppercase tracking-wider">
              <Settings className="w-4 h-4" />
              <span>Account &amp; Settings</span>
            </div>
            <p className="text-xs text-[#cbd5e1] leading-relaxed">
              {userStats.username ? (
                <>
                  Signed in as <strong className="font-mono text-[#d4af37]">@{userStats.username}</strong> · Your study tracker, progress, practice history, and preferences sync automatically across phone, tablet, laptop, and desktop.
                </>
              ) : (
                <>
                  Set a unique username &amp; password or sign in to an existing account to access your Study Vault across all your devices.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {!userStats.username ? (
              <>
                <button
                  type="button"
                  onClick={() => onOpenAuthModal?.('register')}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-xs flex items-center gap-1.5 hover:brightness-110 transition-all cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Set Username &amp; Password</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuthModal?.('login')}
                  className="px-3.5 py-2 rounded-xl bg-[#131b2e] border border-[#d4af37]/35 text-xs font-semibold text-[#fbf9f4] hover:border-[#d4af37] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>Sign In</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onOpenAuthModal?.('login')}
                  className="px-3.5 py-2 rounded-xl bg-[#131b2e] border border-[#d4af37]/30 text-xs font-semibold text-[#fbf9f4] hover:border-[#d4af37] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>Switch Account</span>
                </button>
                <button
                  type="button"
                  onClick={() => onLogoutAccount?.()}
                  className="px-3.5 py-2 rounded-xl bg-[#131b2e] border border-[#d4af37]/30 text-xs font-semibold text-[#cbd5e1] hover:text-white hover:border-[#d4af37] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>Log Out</span>
                </button>
              </>
            )}

            {!isOwnerAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  setDeleteAccountError(null);
                  setDeleteConfirmPassword('');
                  setDeleteConfirmWord('');
                  setShowDeleteAccountConfirm((prev) => !prev);
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 hover:bg-rose-900/70 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>
            )}
          </div>
        </div>

        {/* Owner / Admin Management Console (Visible ONLY when authenticated as Owner) */}
        {isOwnerAuthenticated && (
          <div className="p-4 sm:p-5 rounded-xl bg-[#090e1c] border border-[#d4af37]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-[#d4af37] uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Owner &amp; Admin Management Console</span>
              </div>
              <p className="text-xs text-[#cbd5e1] leading-relaxed">
                Access real platform analytics, registered student accounts, user IDs, account status &amp; access management, and community moderation controls.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenOwnerAnalytics?.()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-md hover:brightness-110 transition-all shrink-0 cursor-pointer"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Open Owner &amp; Admin Console</span>
            </button>
          </div>
        )}

        {/* Permanent Delete Account Confirmation Panel */}
        {showDeleteAccountConfirm && (
          <div className="p-4 sm:p-5 rounded-xl bg-rose-950/40 border border-rose-500/50 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-display text-sm font-bold text-rose-200">
                  Permanent Account Deletion Warning
                </h3>
                <p className="text-xs text-rose-100/90 leading-relaxed">
                  Deleting your account will permanently erase your Study Vault Hub account, profile, study tracker records, practice history, bookmarks, and private SVH AI conversations. This action cannot be undone.
                </p>
              </div>
            </div>

            {deleteAccountError && (
              <div className="p-3 rounded-xl bg-rose-950/90 border border-rose-500/60 text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{deleteAccountError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {userStats.username && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-rose-200 uppercase tracking-wider block">
                    Enter Your Password to Confirm
                  </label>
                  <input
                    type="password"
                    value={deleteConfirmPassword}
                    onChange={(e) => {
                      setDeleteConfirmPassword(e.target.value);
                      setDeleteAccountError(null);
                    }}
                    placeholder="Account password..."
                    className="w-full px-3.5 py-2 rounded-xl bg-[#080d1a] border border-rose-500/40 text-xs sm:text-sm text-[#fbf9f4] placeholder-[#6b7280] focus:border-rose-400 focus:outline-none"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-rose-200 uppercase tracking-wider block">
                  Type DELETE to Confirm Permanent Removal
                </label>
                <input
                  type="text"
                  value={deleteConfirmWord}
                  onChange={(e) => {
                    setDeleteConfirmWord(e.target.value);
                    setDeleteAccountError(null);
                  }}
                  placeholder="Type DELETE"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#080d1a] border border-rose-500/40 text-xs sm:text-sm font-mono text-[#fbf9f4] placeholder-[#6b7280] focus:border-rose-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={async () => {
                  if (deleteConfirmWord.trim().toUpperCase() !== 'DELETE') {
                    setDeleteAccountError('Please type DELETE to confirm permanent account deletion.');
                    return;
                  }
                  if (userStats.username && !deleteConfirmPassword) {
                    setDeleteAccountError('Please enter your account password to confirm deletion.');
                    return;
                  }
                  setIsDeletingAccount(true);
                  setDeleteAccountError(null);
                  try {
                    let storedIdentity: { userId?: string; authToken?: string } | null = null;
                    try {
                      const raw = localStorage.getItem(IDENTITY_STORAGE_KEY);
                      if (raw) storedIdentity = JSON.parse(raw);
                    } catch {
                      // ignore
                    }

                    if (storedIdentity?.authToken) {
                      const res = await apiFetch('/api/auth/account', {
                        method: 'DELETE',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${storedIdentity.authToken}`,
                        },
                        body: JSON.stringify({
                          confirmDelete: true,
                          ...(userStats.username ? { password: deleteConfirmPassword } : {}),
                        }),
                      });
                      if (!res.ok && res.status !== 401) {
                        const errData = await res.json().catch(() => ({}));
                        throw new Error(errData.error || 'Could not delete account.');
                      }
                    }

                    setShowDeleteAccountConfirm(false);
                    onAccountDeleted?.();
                  } catch (err) {
                    setDeleteAccountError(
                      err instanceof Error ? err.message : 'Account deletion failed.'
                    );
                  } finally {
                    setIsDeletingAccount(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isDeletingAccount ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting Account Permanently...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Permanent Delete Account</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={() => {
                  setShowDeleteAccountConfirm(false);
                  setDeleteAccountError(null);
                }}
                className="px-3.5 py-2 rounded-xl bg-[#131b2e] border border-[#d4af37]/25 text-xs text-[#cbd5e1] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 3. Saved Items */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[#d4af37]" />
            <h2 className="font-display text-base font-bold text-[#fbf9f4] tracking-tight">
              Saved Bookmarks ({userStats.bookmarkedItemIds.length})
            </h2>
          </div>
          <span className="text-xs text-[#9ca3af]">Quick Revisit</span>
        </div>

        {userStats.bookmarkedItemIds.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#0f172a] border border-[#d4af37]/20 text-center space-y-2">
            <Bookmark className="w-8 h-8 text-[#9ca3af] mx-auto opacity-50" />
            <p className="text-xs text-[#cbd5e1]">No bookmarks saved yet</p>
            <p className="text-[11px] text-[#9ca3af]">
              Tap the bookmark icon on any book chapter, revision note, or question to pin it here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookmarkedBooks.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[#d4af37] uppercase tracking-wider block">
                  Books ({bookmarkedBooks.length})
                </span>
                <div className="grid gap-2">
                  {bookmarkedBooks.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => onSelectBook(b)}
                      className="p-3 rounded-xl bg-[#0f172a] border border-[#d4af37]/20 hover:border-[#d4af37] cursor-pointer flex items-center justify-between gap-3 group transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <BookOpen className="w-4 h-4 text-[#d4af37] shrink-0" />
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-semibold text-[#fbf9f4] truncate group-hover:text-[#d4af37]">
                            {b.title}
                          </h4>
                          <span className="text-[11px] text-[#9ca3af]">
                            {b.subject} · {b.edition}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-[#d4af37] font-medium shrink-0">Open →</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bookmarkedNotes.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[#d4af37] uppercase tracking-wider block">
                  Revision Notes ({bookmarkedNotes.length})
                </span>
                <div className="grid gap-2">
                  {bookmarkedNotes.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => onSelectNote(n)}
                      className="p-3 rounded-xl bg-[#0f172a] border border-[#d4af37]/20 hover:border-[#d4af37] cursor-pointer flex items-center justify-between gap-3 group transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-4 h-4 text-[#d4af37] shrink-0" />
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-semibold text-[#fbf9f4] truncate group-hover:text-[#d4af37]">
                            {n.title}
                          </h4>
                          <span className="text-[11px] text-[#9ca3af]">
                            {n.subject} · {n.category}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-[#d4af37] font-medium shrink-0">Study →</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bookmarkedMCQs.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[#d4af37] uppercase tracking-wider block">
                  Questions ({bookmarkedMCQs.length})
                </span>
                <div className="grid gap-2">
                  {bookmarkedMCQs.map((q) => (
                    <div
                      key={q.id}
                      onClick={onNavigateToPractice}
                      className="p-3 rounded-xl bg-[#0f172a] border border-[#d4af37]/20 hover:border-[#d4af37] cursor-pointer flex items-center justify-between gap-3 group transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-[#d4af37] shrink-0" />
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-medium text-[#fbf9f4] line-clamp-1 group-hover:text-[#d4af37]">
                            {q.question}
                          </h4>
                          <span className="text-[11px] text-[#9ca3af]">
                            {q.subject} · {q.topic}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-[#d4af37] font-medium shrink-0">Solve →</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Appearance & Theme Section */}
      <section className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#0c1428] via-[#0a1122] to-[#060b18] border border-[#d4af37]/30 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#d4af37] uppercase tracking-wider">
              <Palette className="w-4 h-4" />
              <span>Appearance &amp; Theme</span>
            </div>
            <p className="text-xs text-[#cbd5e1]">
              Choose your preferred Study Vault Hub reading and study theme. Active mode:{' '}
              <span className="font-semibold text-[#d4af37] capitalize">{resolvedTheme} Mode</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Option 1: Light Mode */}
          <button
            type="button"
            onClick={() => onChangeTheme('light')}
            className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
              themePreference === 'light'
                ? 'bg-[#131f3a] border-2 border-[#d4af37] shadow-md'
                : 'bg-[#0f172a] border-[#d4af37]/20 hover:border-[#d4af37]/50'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                themePreference === 'light'
                  ? 'bg-[#d4af37] text-[#080d1a]'
                  : 'bg-[#131b2e] text-[#d4af37]'
              }`}
            >
              <Sun className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-xs sm:text-sm font-bold text-[#fbf9f4]">
                  Light Mode
                </span>
                {themePreference === 'light' && (
                  <Check className="w-4 h-4 text-[#d4af37] shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-[#9ca3af] mt-0.5 leading-snug">
                Clean pure white background with soft Dusty Blue accents &amp; deep black text
              </p>
            </div>
          </button>

          {/* Option 2: Dark Mode */}
          <button
            type="button"
            onClick={() => onChangeTheme('dark')}
            className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
              themePreference === 'dark'
                ? 'bg-[#131f3a] border-2 border-[#d4af37] shadow-md'
                : 'bg-[#0f172a] border-[#d4af37]/20 hover:border-[#d4af37]/50'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                themePreference === 'dark'
                  ? 'bg-[#d4af37] text-[#080d1a]'
                  : 'bg-[#131b2e] text-[#d4af37]'
              }`}
            >
              <Moon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-xs sm:text-sm font-bold text-[#fbf9f4]">
                  Dark Mode
                </span>
                {themePreference === 'dark' && (
                  <Check className="w-4 h-4 text-[#d4af37] shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-[#9ca3af] mt-0.5 leading-snug">
                Signature deep cosmic navy &amp; royal gold night study design
              </p>
            </div>
          </button>

          {/* Option 3: System Default */}
          <button
            type="button"
            onClick={() => onChangeTheme('system')}
            className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
              themePreference === 'system'
                ? 'bg-[#131f3a] border-2 border-[#d4af37] shadow-md'
                : 'bg-[#0f172a] border-[#d4af37]/20 hover:border-[#d4af37]/50'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                themePreference === 'system'
                  ? 'bg-[#d4af37] text-[#080d1a]'
                  : 'bg-[#131b2e] text-[#d4af37]'
              }`}
            >
              <Monitor className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-xs sm:text-sm font-bold text-[#fbf9f4]">
                  System Default
                </span>
                {themePreference === 'system' && (
                  <Check className="w-4 h-4 text-[#d4af37] shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-[#9ca3af] mt-0.5 leading-snug">
                Automatically follows your device&apos;s light or dark appearance
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* Legal, Privacy, Copyright & Platform Transparency */}
      <section className="p-4 sm:p-5 rounded-2xl bg-[#090e1c] border border-[#d4af37]/25 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#d4af37] uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Legal, Privacy &amp; Intellectual Property Notice</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#cbd5e1] leading-relaxed">
          <div className="p-3.5 rounded-xl bg-[#0f172a] border border-[#1e293b] space-y-1">
            <h4 className="font-display font-bold text-[#fbf9f4] text-xs">
              1. Independent Platform &amp; Non-Affiliation
            </h4>
            <p className="text-[11px] text-[#9ca3af]">
              Study Vault Hub is an independent educational study platform founded and created by Soumyadip Rana. It is not affiliated with, endorsed by, or officially connected to NCERT, NTA (NEET / JEE), CBSE, CISCE, WBCHSE, WBJEEB, UPSC, SSC, IBPS, ICAI, or any government or examination authority. All exam names and institutional marks belong to their respective owners and are referenced strictly for syllabus identification.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0f172a] border border-[#1e293b] space-y-1">
            <h4 className="font-display font-bold text-[#fbf9f4] text-xs">
              2. Copyright &amp; Study Materials Policy
            </h4>
            <p className="text-[11px] text-[#9ca3af]">
              All in-app reference handbooks, chapter synopses, formula sheets, mnemonics, and practice questions are original educational materials created for Study Vault Hub. Official NCERT textbook links direct students to the official public NCERT portal (ncert.nic.in) for legitimate academic reference and are never re-hosted or claimed as Study Vault Hub property.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0f172a] border border-[#1e293b] space-y-1">
            <h4 className="font-display font-bold text-[#fbf9f4] text-xs">
              3. Privacy &amp; Data Protection
            </h4>
            <p className="text-[11px] text-[#9ca3af]">
              Study Vault Hub stores only the data necessary to power your study experience (display name, optional account username and cryptographically hashed password, selected study goals, practice/timer progress, and user-submitted community or SVH AI messages). We never sell personal data, collect GPS location, or run third-party advertising trackers. You can log out or permanently delete your account and all associated data above at any time.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0f172a] border border-[#1e293b] space-y-1">
            <h4 className="font-display font-bold text-[#fbf9f4] text-xs">
              4. Community Safety &amp; Content Moderation
            </h4>
            <p className="text-[11px] text-[#9ca3af]">
              Students may only share legitimate academic doubts and study discussions that they have the right to share. Uploading copyrighted third-party textbooks, pirated PDFs, spam, or abusive content is strictly prohibited. Use the in-app Report button on any post, reply, or chat message to flag and hide inappropriate content for administrator moderation.
            </p>
          </div>
        </div>
      </section>

      {/* Official Creator Information */}
      <section className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#0c1428] to-[#060b18] border border-[#d4af37]/30 shadow-lg select-none">
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <div className="space-y-1 flex flex-col items-center justify-center text-center">
            <span className="text-xs sm:text-sm uppercase tracking-widest text-[#d4af37] font-mono font-semibold block whitespace-nowrap">
              Founded &amp; Created by
            </span>
            <h3 className="font-display text-xl sm:text-2xl font-bold text-[#fbf9f4] whitespace-nowrap">
              Soumyadip Rana
            </h3>
          </div>
          <div className="px-3.5 py-1 rounded-full bg-[#131b2e] border border-[#d4af37]/30 text-[11px] font-mono text-[#d4af37] shrink-0">
            Study Vault Hub
          </div>

          {isOwnerAuthenticated && (
            <div className="pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenOwnerAnalytics?.();
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-md hover:brightness-110 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <BarChart3 className="w-4 h-4" />
                <span>Owner Analytics Dashboard</span>
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
});
