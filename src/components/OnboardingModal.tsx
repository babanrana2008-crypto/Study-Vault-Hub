import React, { useState, useEffect } from 'react';
import {
  Check,
  Plus,
  ArrowRight,
  UserPlus,
  LogIn,
  Lock,
  User,
  AtSign,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { APP_LOGO, PRESET_GOALS } from '../data/sampleData';
import { UserStats } from '../types';
import { apiFetch } from '../services/nativeApiBridge';

const IDENTITY_STORAGE_KEY = 'study_vault_community_identity_v1';
const ANON_DEVICE_STORAGE_KEY = 'study_vault_anon_device_id_v1';

interface OnboardingModalProps {
  currentStats?: UserStats;
  initialMode?: 'register' | 'login';
  onAuthSuccess: (payload: {
    userId: string;
    username: string;
    role: 'student' | 'owner';
    isOwner: boolean;
    authToken: string;
    userStats: Partial<UserStats>;
  }) => void;
  onClose?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  currentStats,
  initialMode = 'register',
  onAuthSuccess,
  onClose,
}) => {
  const [mode, setMode] = useState<'register' | 'login'>(initialMode);

  // Registration fields: Name -> Username -> Password -> Confirm Password -> Select Goal/Exam -> Join
  const [name, setName] = useState(currentStats?.name || '');
  const [username, setUsername] = useState(currentStats?.username || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>(
    currentStats?.selectedGoals && currentStats.selectedGoals.length > 0
      ? currentStats.selectedGoals
      : []
  );
  const [customGoalInput, setCustomGoalInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Login fields: Username + Password
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSubmitting, onClose]);

  const toggleGoal = (goal: string) => {
    setSelectedGoals((prev) => {
      if (prev.includes(goal)) {
        return prev.filter((g) => g !== goal);
      } else {
        return [...prev, goal];
      }
    });
    setError(null);
  };

  const handleAddCustomGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customGoalInput.trim();
    if (!trimmed) return;
    if (!selectedGoals.includes(trimmed)) {
      setSelectedGoals((prev) => [...prev, trimmed]);
    }
    setCustomGoalInput('');
    setShowCustomInput(false);
    setError(null);
  };

  const getStoredAuthHeader = (): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const rawId = localStorage.getItem(IDENTITY_STORAGE_KEY);
      if (rawId) {
        const parsed = JSON.parse(rawId);
        if (parsed?.authToken) {
          headers.Authorization = `Bearer ${parsed.authToken}`;
        }
      }
    } catch {
      // ignore
    }
    return headers;
  };

  const getDeviceId = (): string => {
    try {
      let devId = localStorage.getItem(ANON_DEVICE_STORAGE_KEY);
      if (!devId) {
        devId = `dev_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
        localStorage.setItem(ANON_DEVICE_STORAGE_KEY, devId);
      }
      return devId;
    } catch {
      return 'dev_default';
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    const trimmedName = name.trim();
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_.@-]/g, '');

    if (!trimmedName) {
      setError('Please enter your name to personalize your Study Vault.');
      return;
    }
    if (!cleanUsername || cleanUsername.length < 3) {
      setError(
        'Please choose a unique username (at least 3 characters: letters, numbers, underscores, dots, or hyphens).'
      );
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Password and Confirm Password do not match.');
      return;
    }
    if (selectedGoals.length === 0) {
      setError('Please select at least one study goal or exam.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: getStoredAuthHeader(),
        body: JSON.stringify({
          name: trimmedName,
          username: cleanUsername,
          password,
          confirmPassword,
          selectedGoals,
          activeGoal: selectedGoals[0],
          deviceId: getDeviceId(),
          userStats: currentStats || {},
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not create account. Please try again.');
      }

      onAuthSuccess({
        userId: data.userId,
        username: data.username || cleanUsername,
        role: 'student',
        isOwner: false,
        authToken: data.authToken,
        userStats: {
          ...(data.userStats || {}),
          userId: data.userId,
          username: data.username || cleanUsername,
          role: 'student',
          name: data.displayName || trimmedName,
          selectedGoals,
          activeGoal: selectedGoals[0],
          hasCompletedSetup: true,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    const cleanUsername = loginUsername.trim().toLowerCase().replace(/[^a-z0-9_.@-]/g, '');
    if (!cleanUsername) {
      setError('Please enter your username.');
      return;
    }
    if (!loginPassword) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: getStoredAuthHeader(),
        body: JSON.stringify({
          username: cleanUsername,
          password: loginPassword,
          deviceId: getDeviceId(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error || 'Invalid username or password. Please check your credentials.'
        );
      }

      const resolvedRole: 'student' | 'owner' = data.role === 'owner' ? 'owner' : 'student';
      const resolvedIsOwner = Boolean(data.isOwner && resolvedRole === 'owner');

      onAuthSuccess({
        userId: data.userId,
        username: data.username || cleanUsername,
        role: resolvedRole,
        isOwner: resolvedIsOwner,
        authToken: data.authToken,
        userStats: {
          ...(data.userStats || {}),
          userId: data.userId,
          username: data.username || cleanUsername,
          role: resolvedRole,
          name: data.displayName || data.userStats?.name || 'Student',
          profilePhotoUrl:
            data.profilePhotoUrl !== undefined
              ? data.profilePhotoUrl
              : data.userStats?.profilePhotoUrl || null,
          svhAiButtonPosition:
            data.svhAiButtonPosition !== undefined
              ? data.svhAiButtonPosition
              : data.userStats?.svhAiButtonPosition || null,
          hasCompletedSetup: true,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0c1428] border border-[#d4af37]/40 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-[#fbf9f4]">
        {/* Brand Banner */}
        <div className="p-4 sm:p-5 bg-gradient-to-b from-[#131d36] to-[#0c1428] border-b border-[#d4af37]/25 text-center space-y-2.5 shrink-0 relative">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 px-2.5 py-1 rounded-lg bg-[#131b2e] border border-[#d4af37]/25 text-xs text-[#cbd5e1] hover:text-white cursor-pointer"
            >
              Close
            </button>
          )}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden mx-auto aspect-square flex items-center justify-center">
            <img
              src={APP_LOGO}
              alt="Study Vault Hub"
              className="w-full h-full rounded-full object-contain aspect-square"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="space-y-1">
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#fbf9f4]">
              Welcome to <span className="gold-gradient-text">Study Vault Hub</span>
            </h1>
            <div className="flex flex-col items-center justify-center text-center pt-0.5 leading-snug">
              <span className="text-[11px] text-[#cbd5e1] font-mono tracking-wide whitespace-nowrap">
                Founded &amp; Created by
              </span>
              <span className="text-sm font-display font-bold text-[#d4af37] tracking-wide whitespace-nowrap">
                Soumyadip Rana
              </span>
            </div>
          </div>

          {/* Mode Switcher: Create Account vs Existing User Login */}
          <div className="grid grid-cols-2 gap-2 pt-1 max-w-xs mx-auto">
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                mode === 'register'
                  ? 'bg-[#d4af37] text-[#080d1a] border-[#d4af37] shadow-sm'
                  : 'bg-[#131b2e] text-[#cbd5e1] border-[#d4af37]/25 hover:border-[#d4af37]/60'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>New Account</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                mode === 'login'
                  ? 'bg-[#d4af37] text-[#080d1a] border-[#d4af37] shadow-sm'
                  : 'bg-[#131b2e] text-[#cbd5e1] border-[#d4af37]/25 hover:border-[#d4af37]/60'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Existing Login</span>
            </button>
          </div>
        </div>

        {mode === 'register' ? (
          /* ================================================================= */
          /* FIRST-TIME USER FLOW: Name -> Username -> Password -> Confirm ->  */
          /* Select Goal/Exam -> Complete Profile -> Join                      */
          /* ================================================================= */
          <form
            onSubmit={handleRegisterSubmit}
            className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5"
          >
            {error && (
              <div className="p-3 rounded-xl bg-rose-950/75 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 1. Student Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#d4af37] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>1. Full Name / Display Name</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. Rahul Sharma, Priya Patel..."
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl bg-[#080d1a] border border-[#d4af37]/30 text-sm text-[#fbf9f4] placeholder-[#6b7280] focus:border-[#d4af37] focus:outline-none"
              />
            </div>

            {/* 2. Unique Username */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#d4af37] flex items-center gap-1.5">
                  <AtSign className="w-3.5 h-3.5" />
                  <span>2. Unique Username</span>
                </label>
                <span className="text-[10px] text-[#9ca3af]">Used for cross-device login</span>
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.@-]/g, ''));
                  setError(null);
                }}
                placeholder="e.g. rahul_neet2026"
                autoComplete="username"
                className="w-full px-4 py-2.5 rounded-xl bg-[#080d1a] border border-[#d4af37]/30 text-sm font-mono text-[#fbf9f4] placeholder-[#6b7280] focus:border-[#d4af37] focus:outline-none"
              />
            </div>

            {/* 3. Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#d4af37] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>3. Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="Min 6 characters"
                    autoComplete="new-password"
                    className="w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-[#080d1a] border border-[#d4af37]/30 text-sm text-[#fbf9f4] placeholder-[#6b7280] focus:border-[#d4af37] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#fbf9f4]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#d4af37] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>4. Confirm Password</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#080d1a] border border-[#d4af37]/30 text-sm text-[#fbf9f4] placeholder-[#6b7280] focus:border-[#d4af37] focus:outline-none"
                />
              </div>
            </div>

            {/* 5. Select Study Goals (Multiple Choice) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#d4af37] block">
                  5. Select your study goal(s) / exam(s)
                </label>
                <span className="text-[11px] text-[#9ca3af]">Multiple allowed</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {PRESET_GOALS.map((goal) => {
                  const isSelected = selectedGoals.includes(goal);
                  return (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => toggleGoal(goal)}
                      className={`p-2.5 sm:p-3 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between min-h-[44px] cursor-pointer ${
                        isSelected
                          ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#fbf9f4] font-semibold shadow-sm'
                          : 'bg-[#131b2e] border-[#d4af37]/15 text-[#cbd5e1] hover:border-[#d4af37]/40'
                      }`}
                    >
                      <span>{goal}</span>
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ml-1.5 transition-colors ${
                          isSelected
                            ? 'bg-[#d4af37] border-[#d4af37] text-[#080d1a]'
                            : 'border-[#4b5563] bg-transparent'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Exam / Goal Button or Input */}
              {!showCustomInput ? (
                <button
                  type="button"
                  onClick={() => setShowCustomInput(true)}
                  className="w-full p-2.5 rounded-xl border border-dashed border-[#d4af37]/35 text-xs text-[#d4af37] hover:bg-[#131b2e] flex items-center justify-center gap-1.5 transition-colors font-medium cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Custom Exam / Study Goal</span>
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-[#080d1a] border border-[#d4af37]/40 space-y-2">
                  <span className="text-[11px] text-[#d4af37] font-semibold block">
                    Custom Exam or Goal Name
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customGoalInput}
                      onChange={(e) => setCustomGoalInput(e.target.value)}
                      placeholder="e.g. UPSC, SAT, State CET, GATE..."
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#131b2e] border border-[#273557] text-xs text-[#fbf9f4] focus:border-[#d4af37] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomGoal}
                      className="px-3 py-1.5 rounded-lg bg-[#d4af37] text-[#080d1a] font-bold text-xs cursor-pointer"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomInput(false)}
                      className="px-2 py-1.5 text-xs text-[#9ca3af] hover:text-[#fbf9f4]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Selected Summary */}
              {selectedGoals.length > 0 && (
                <div className="pt-1">
                  <span className="text-[11px] text-[#9ca3af] block mb-1.5">
                    Selected ({selectedGoals.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedGoals.map((g) => (
                      <span
                        key={g}
                        className="px-2.5 py-1 rounded-lg bg-[#d4af37]/15 border border-[#d4af37]/30 text-xs font-medium text-[#fce09b] flex items-center gap-1.5"
                      >
                        <span>{g}</span>
                        <button
                          type="button"
                          onClick={() => toggleGoal(g)}
                          className="text-[#9ca3af] hover:text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Submit CTA */}
            <div className="pt-1 space-y-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#e5c158] to-[#aa7c11] text-[#080d1a] font-bold text-sm hover:brightness-110 shadow-lg shadow-[#d4af37]/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Secure Account...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Profile &amp; Join Study Vault Hub</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <p className="text-[10px] text-center text-[#9ca3af]">
                No email or phone number required · Log in from any phone, tablet, or computer
              </p>
            </div>
          </form>
        ) : (
          /* ================================================================= */
          /* EXISTING USER LOGIN FLOW: Username + Password -> Existing Account */
          /* ================================================================= */
          <form
            onSubmit={handleLoginSubmit}
            className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5"
          >
            {error && (
              <div className="p-3 rounded-xl bg-rose-950/75 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-[#131b2e] border border-[#d4af37]/25 text-xs text-[#cbd5e1] leading-relaxed">
              Sign in with your existing Study Vault Hub <strong className="text-[#fbf9f4]">Username</strong> and <strong className="text-[#fbf9f4]">Password</strong> to restore your profile, study tracker, goals, practice history, and saved data across devices.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#d4af37] flex items-center gap-1.5">
                <AtSign className="w-3.5 h-3.5" />
                <span>Username</span>
              </label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => {
                  setLoginUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.@-]/g, ''));
                  setError(null);
                }}
                placeholder="Enter your username..."
                autoFocus
                autoComplete="username"
                className="w-full px-4 py-3 rounded-xl bg-[#080d1a] border border-[#d4af37]/30 text-sm font-mono text-[#fbf9f4] placeholder-[#6b7280] focus:border-[#d4af37] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#d4af37] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter your password..."
                  autoComplete="current-password"
                  className="w-full pl-4 pr-10 py-3 rounded-xl bg-[#080d1a] border border-[#d4af37]/30 text-sm text-[#fbf9f4] placeholder-[#6b7280] focus:border-[#d4af37] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#fbf9f4]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2 space-y-2.5">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#e5c158] to-[#aa7c11] text-[#080d1a] font-bold text-sm hover:brightness-110 shadow-lg shadow-[#d4af37]/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Login</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-[#9ca3af]">
                Don&apos;t have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className="text-[#d4af37] font-semibold hover:underline cursor-pointer"
                >
                  Create a new account
                </button>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
