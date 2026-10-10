import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  BookOpen,
  FileText,
  CheckCircle2,
  Award,
  Sparkles,
  Flame,
  ArrowRight,
  Bookmark,
  Clock,
  Target,
  BarChart3,
  Check,
  AlertCircle,
  ChevronDown,
  Calendar,
  Plus,
  Trash2,
  Play,
  Edit3,
  X,
  Compass,
  Trophy,
  Sunrise,
  Sunset,
  Sun,
  Moon,
} from 'lucide-react';
import {
  ActiveSection,
  Book,
  StudyNote,
  MCQQuestion,
  UserStats,
  StudyTask,
  ExamCountdownConfig,
  ThemePreference,
} from '../types';
import {
  SAMPLE_BOOKS,
  SAMPLE_MCQS,
  APP_LOGO,
  GOAL_SUBJECTS_MAP,
  PRESET_GOALS,
} from '../data/sampleData';
import { PWAInstallButton } from './PWAInstallButton';
import { calculateUserVPBreakdown } from '../utils/vpPoints';
import { VaultPointsPopup, VaultModalTab } from './VaultPointsPopup';
import { RollingVPCounter } from './RollingVPCounter';
import { HomeAmbientAnimation } from './HomeAmbientAnimation';
import { StudentImpactDashboard } from './StudentImpactDashboard';
import { LearningPathsSection } from './LearningPathsSection';
import { LearningResourcesShowcase } from './LearningResourcesShowcase';
import { GenuineStudentReviewsSection } from './GenuineStudentReviewsSection';
import { StudyVaultHubAnniversaryBanner } from './StudyVaultHubAnniversaryBanner';

interface HomeSectionProps {
  userStats: UserStats;
  onUpdateStats: (newPartial: Partial<UserStats>) => void;
  onNavigate: (section: ActiveSection) => void;
  onSelectBook: (book: Book) => void;
  onSelectNote: (note: StudyNote) => void;
  isBookmarked: (id: string) => boolean;
  onToggleBookmark: (id: string) => void;
  onRecordMCQAnswer?: (isCorrect: boolean, question: MCQQuestion) => void;
  onSelectActiveGoal: (goal: string) => void;
  onOpenGoalsManager: () => void;
  onOpenFocusMode: () => void;
  resolvedTheme?: 'light' | 'dark';
  onChangeTheme?: (theme: ThemePreference) => void;
}

export const HomeSection: React.FC<HomeSectionProps> = React.memo(({
  userStats,
  onUpdateStats,
  onNavigate,
  onSelectBook,
  isBookmarked,
  onToggleBookmark,
  onRecordMCQAnswer,
  onSelectActiveGoal,
  onOpenGoalsManager,
  onOpenFocusMode,
  resolvedTheme = 'light',
  onChangeTheme,
}) => {
  const [goalDropdownOpen, setGoalDropdownOpen] = useState(false);
  const [isVpPopupOpen, setIsVpPopupOpen] = useState(false);
  const [vpPopupTab, setVpPopupTab] = useState<VaultModalTab>('vp');
  const handleCloseVpPopup = useCallback(() => setIsVpPopupOpen(false), []);

  // Real-time local device hour for dynamic time greeting
  const [currentHour, setCurrentHour] = useState<number>(() => new Date().getHours());
  useEffect(() => {
    const updateHour = () => setCurrentHour(new Date().getHours());
    const interval = setInterval(updateHour, 60000);
    return () => clearInterval(interval);
  }, []);

  const dynamicGreeting = useMemo(() => {
    if (currentHour >= 5 && currentHour < 12) {
      return {
        label: 'Good Morning',
        period: 'morning' as const,
      };
    }
    if (currentHour >= 12 && currentHour < 17) {
      return {
        label: 'Good Afternoon',
        period: 'afternoon' as const,
      };
    }
    if (currentHour >= 17 && currentHour < 21) {
      return {
        label: 'Good Evening',
        period: 'evening' as const,
      };
    }
    return {
      label: 'Good Night',
      period: 'night' as const,
    };
  }, [currentHour]);

  const vpBreakdown = useMemo(() => {
    return calculateUserVPBreakdown(userStats);
  }, [userStats]);

  // Exam Countdown Editor State
  const [isEditingCountdown, setIsEditingCountdown] = useState(false);
  const [examNameInput, setExamNameInput] = useState(
    userStats.examCountdown?.examName || userStats.activeGoal || ''
  );
  const [examDateInput, setExamDateInput] = useState(
    userStats.examCountdown?.examDate || ''
  );
  const [examNoteInput, setExamNoteInput] = useState(
    userStats.examCountdown?.targetNote || ''
  );
  const [countdownError, setCountdownError] = useState<string | null>(null);

  // Smart Daily Planner Composer State
  const [isPlannerFormOpen, setIsPlannerFormOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskSubject, setTaskSubject] = useState('');
  const [taskChapter, setTaskChapter] = useState('');
  const [taskTargetMin, setTaskTargetMin] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskPriority, setTaskPriority] = useState<'High' | 'Medium' | 'Normal'>('Normal');

  // Active goal subjects
  const hasExplicitGoal = Boolean(
    userStats.activeGoal || userStats.selectedGoals.length > 0
  );
  const activeGoal =
    userStats.activeGoal || userStats.selectedGoals[0] || 'General Study';
  const subjectsForActiveGoal = GOAL_SUBJECTS_MAP[activeGoal] || [
    'Core Sciences',
    'Mathematics',
    'General Studies',
  ];

  // Filter materials matching active goal
  const goalFilteredBooks = SAMPLE_BOOKS.filter(
    (b) =>
      b.targetStreams.includes(activeGoal) ||
      subjectsForActiveGoal.includes(b.subject)
  );
  const displayBooks =
    goalFilteredBooks.length > 0 ? goalFilteredBooks : SAMPLE_BOOKS;

  const goalFilteredMCQs = SAMPLE_MCQS.filter(
    (q) =>
      q.targetStreams.includes(activeGoal) ||
      subjectsForActiveGoal.includes(q.subject)
  );
  const dailyQuestion: MCQQuestion = goalFilteredMCQs[0] || SAMPLE_MCQS[0];

  // Daily question widget state
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);

  const handleSelectOption = (index: number) => {
    if (isAnswerSubmitted) return;
    setSelectedAnswer(index);
  };

  const handleSubmitDailyAnswer = () => {
    if (selectedAnswer === null || isAnswerSubmitted) return;
    setIsAnswerSubmitted(true);
    const isCorrect = selectedAnswer === dailyQuestion.correctIndex;
    if (onRecordMCQAnswer) {
      onRecordMCQAnswer(isCorrect, dailyQuestion);
    }
  };

  const handleResetDailyAnswer = () => {
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
  };

  // Real Exam Countdown Calculation (ONLY from user's real configured exam date)
  const countdownData = useMemo(() => {
    const cfg = userStats.examCountdown;
    if (!cfg || !cfg.examName?.trim() || !cfg.examDate?.trim()) {
      return null;
    }
    const targetTime = new Date(`${cfg.examDate}T09:00:00`).getTime();
    if (isNaN(targetTime)) return null;
    const nowTime = Date.now();
    const diffMs = targetTime - nowTime;
    const totalDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const totalHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
    const weeks = Math.max(0, Math.floor(Math.max(0, totalDays) / 7));
    const remDays = Math.max(0, totalDays) % 7;

    return {
      examName: cfg.examName,
      examDate: cfg.examDate,
      targetNote: cfg.targetNote,
      totalDays,
      totalHours,
      weeks,
      remDays,
      isPast: totalDays < 0,
      isToday: totalDays === 0,
      formattedDate: new Date(`${cfg.examDate}T00:00:00`).toLocaleDateString(
        undefined,
        {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }
      ),
    };
  }, [userStats.examCountdown]);

  const handleOpenCountdownEditor = () => {
    setExamNameInput(
      userStats.examCountdown?.examName ||
        userStats.activeGoal ||
        userStats.selectedGoals[0] ||
        ''
    );
    setExamDateInput(userStats.examCountdown?.examDate || '');
    setExamNoteInput(userStats.examCountdown?.targetNote || '');
    setCountdownError(null);
    setIsEditingCountdown(true);
  };

  const handleSaveExamCountdown = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examNameInput.trim()) {
      setCountdownError('Please enter or select your exam name.');
      return;
    }
    if (!examDateInput.trim()) {
      setCountdownError('Please select your actual exam date.');
      return;
    }

    const updatedConfig: ExamCountdownConfig = {
      examName: examNameInput.trim(),
      examDate: examDateInput.trim(),
      targetNote: examNoteInput.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    onUpdateStats({
      examCountdown: updatedConfig,
      ...(userStats.activeGoal ? {} : { activeGoal: examNameInput.trim() }),
    });
    setIsEditingCountdown(false);
    setCountdownError(null);
  };

  const handleClearCountdown = () => {
    onUpdateStats({ examCountdown: null });
    setIsEditingCountdown(false);
  };

  // Smart Daily Planner Handlers
  const handleCreatePlannerTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const newTask: StudyTask = {
      id: `task-${Date.now()}`,
      text: taskTitle.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
      subject: taskSubject.trim() || undefined,
      chapter: taskChapter.trim() || undefined,
      targetMinutes:
        taskTargetMin.trim() && Number(taskTargetMin) > 0
          ? Math.round(Number(taskTargetMin))
          : undefined,
      deadline: taskDeadline.trim() || undefined,
      priority: taskPriority,
    };

    onUpdateStats({
      tasks: [newTask, ...userStats.tasks],
    });

    setTaskTitle('');
    setTaskChapter('');
    setTaskTargetMin('');
    setTaskDeadline('');
    setTaskPriority('Normal');
    setIsPlannerFormOpen(false);
  };

  const handleToggleTaskComplete = (taskId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const updatedTasks = userStats.tasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    const newlyCompleted = updatedTasks.find((t) => t.id === taskId)?.completed;
    onUpdateStats({
      tasks: updatedTasks,
      ...(newlyCompleted
        ? {
            streak: {
              current: Math.max(1, userStats.streak?.current || 0),
              lastActiveDate: today,
            },
          }
        : {}),
    });
  };

  const handleDeleteTask = (taskId: string) => {
    onUpdateStats({
      tasks: userStats.tasks.filter((t) => t.id !== taskId),
    });
  };

  // Real-Data-Only Smart Suggestions (ONLY generated when real practice/study data exists)
  const realDataSuggestions = useMemo(() => {
    const suggestions: Array<{
      title: string;
      subject: string;
      chapter?: string;
      reason: string;
      targetMinutes: number;
    }> = [];

    if (userStats.questionsAttempted >= 3) {
      if (userStats.chapterProgress) {
        for (const [chap, prog] of Object.entries(userStats.chapterProgress)) {
          if (prog.questionsSolved >= 2 && prog.accuracy < 60) {
            suggestions.push({
              title: `Revise & practice ${chap}`,
              subject: subjectsForActiveGoal[0] || 'Core Subject',
              chapter: chap,
              reason: `Based on your real practice accuracy (${prog.accuracy}% across ${prog.questionsSolved} questions)`,
              targetMinutes: 45,
            });
          }
        }
      }
      for (const entry of userStats.practiceHistory) {
        if (entry.totalQuestions >= 2 && entry.accuracy < 60) {
          suggestions.push({
            title: `Review weak concepts in ${entry.subject}`,
            subject: entry.subject,
            reason: `Based on your ${entry.date} ${entry.mode} score (${entry.accuracy}% accuracy)`,
            targetMinutes: 40,
          });
        }
      }
    }

    return suggestions.slice(0, 2);
  }, [
    userStats.questionsAttempted,
    userStats.chapterProgress,
    userStats.practiceHistory,
    subjectsForActiveGoal,
  ]);

  // Real Activity & Command Center Metrics (Strictly 100% genuine user data)
  const completedTasksCount = userStats.tasks.filter((t) => t.completed).length;
  const totalTasksCount = userStats.tasks.length;
  const verifiedAccuracy =
    userStats.questionsAttempted > 0
      ? Number(
          ((userStats.correctAnswers / userStats.questionsAttempted) * 100).toFixed(
            1
          )
        )
      : null;
  const realRevisionItemsCount =
    userStats.completedNoteIds.length + userStats.bookmarkedItemIds.length;
  const realStreakDays = Math.max(
    0,
    Number(userStats.streak?.current ?? userStats.streakDays) || 0
  );

  const hasAnyRealActivity =
    userStats.totalStudyMinutes > 0 ||
    userStats.questionsAttempted > 0 ||
    userStats.tasks.length > 0 ||
    userStats.studySessions.length > 0 ||
    realRevisionItemsCount > 0;

  return (
    <div className="relative space-y-6 pb-12 max-w-full overflow-x-hidden">
      {/* Subtle Ambient Flowing Waves & Floating Bubbles Behind Home Content */}
      <HomeAmbientAnimation variant="home" />

      <div className="relative z-10 space-y-6">
      {/* ===================================================================== */}
      {/* 0. OFFICIAL STUDY VAULT HUB ANNIVERSARY BANNER (15 OCT, 2026+ IST)    */}
      {/* ===================================================================== */}
      <StudyVaultHubAnniversaryBanner />

      {/* ===================================================================== */}
      {/* 1. HERO BRANDING & WELCOME SECTION                                    */}
      {/* ===================================================================== */}
      <section className="svh-card-glow relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#d4af37]/35 bg-gradient-to-br from-[#0c1428] via-[#090f20] to-[#060b18] shadow-xl">
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 p-4 sm:p-7 space-y-5">
          {/* Top Brand & Real Streak */}
          <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-3 min-w-0">
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
              <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full overflow-hidden shrink-0 aspect-square flex items-center justify-center">
                <img
                  src={APP_LOGO}
                  alt="Study Vault Hub Logo"
                  width={56}
                  height={56}
                  decoding="async"
                  className="w-full h-full rounded-full object-contain aspect-square"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col items-start text-left min-w-0 flex-1">
                <h1 className="font-display text-[15px] sm:text-xl font-bold tracking-tight text-[#fbf9f4] leading-tight whitespace-normal break-words max-w-full">
                  Study Vault Hub
                </h1>
                <div className="flex flex-col items-start justify-center text-left mt-0.5 leading-snug min-w-0 max-w-full">
                  <span className="text-[10px] sm:text-xs text-[#cbd5e1] font-mono tracking-wide whitespace-normal break-words max-w-full">
                    Developed by
                  </span>
                  <span className="text-xs sm:text-base font-display font-bold text-[#d4af37] tracking-wide whitespace-normal break-words max-w-full">
                    Soumyadip Rana
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setVpPopupTab('vp');
                  setIsVpPopupOpen(true);
                }}
                aria-expanded={isVpPopupOpen && vpPopupTab === 'vp'}
                aria-haspopup="dialog"
                aria-label="Open VP Points Details"
                title="Tap to view your real VP Points balance and how you earn VP"
                className={`svh-badge-shimmer inline-flex w-fit items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full bg-[#131b2e] hover:bg-[#19243d] border ${
                  isVpPopupOpen && vpPopupTab === 'vp'
                    ? 'border-[#d4af37] ring-2 ring-[#d4af37]/30'
                    : 'border-[#d4af37]/40 hover:border-[#d4af37]'
                } text-[10px] sm:text-xs font-semibold text-[#fbf9f4] shrink-0 transition-all cursor-pointer shadow-sm`}
              >
                <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#d4af37] shrink-0" />
                <span className="text-[#cbd5e1] font-medium whitespace-nowrap">VP Points</span>
                <RollingVPCounter
                  value={Math.max(0, Number(vpBreakdown.totalVP) || 0)}
                  suffix=" VP"
                  className="text-[#d4af37] font-mono font-bold tabular-nums whitespace-nowrap"
                />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setVpPopupTab('streak');
                  setIsVpPopupOpen(true);
                }}
                aria-expanded={isVpPopupOpen && vpPopupTab === 'streak'}
                aria-haspopup="dialog"
                aria-label="Open Study Streak Details"
                title="Tap to view your Daily Study Streak & VP rules"
                className={`inline-flex w-fit items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full bg-[#131b2e] hover:bg-[#19243d] border ${
                  isVpPopupOpen && vpPopupTab === 'streak'
                    ? 'border-[#d4af37] ring-2 ring-[#d4af37]/30'
                    : 'border-[#d4af37]/30 hover:border-[#d4af37]'
                } text-[10px] sm:text-xs font-semibold text-[#fbf9f4] shrink-0 transition-all cursor-pointer shadow-sm`}
              >
                <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 fill-amber-400 shrink-0 svh-live-streak-flame" />
                <span className="text-amber-300 tabular-nums whitespace-nowrap">
                  {realStreakDays > 0 ? `${realStreakDays}d Streak` : '0d (No streak yet)'}
                </span>
              </button>
            </div>
          </div>

          {/* Dynamic Time-Based Greeting with Animated Time Icon & Animated Sun-to-Moon Theme Switch */}
          <div className="space-y-1.5 min-w-0 max-w-full">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-[#fbf9f4] break-words leading-snug flex flex-wrap items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl border shrink-0 ${
                    dynamicGreeting.period === 'morning'
                      ? 'bg-amber-500/15 border-amber-400/40 text-amber-400 svh-greeting-icon-morning'
                      : dynamicGreeting.period === 'afternoon'
                      ? 'bg-amber-500/15 border-amber-400/45 text-amber-400 svh-greeting-icon-afternoon'
                      : dynamicGreeting.period === 'evening'
                      ? 'bg-orange-500/15 border-orange-400/40 text-orange-400 svh-greeting-icon-evening'
                      : 'bg-indigo-500/15 border-indigo-400/40 text-indigo-300 svh-greeting-icon-night'
                  }`}
                >
                  {dynamicGreeting.period === 'morning' && (
                    <Sunrise className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                  )}
                  {dynamicGreeting.period === 'afternoon' && (
                    <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                  )}
                  {dynamicGreeting.period === 'evening' && (
                    <Sunset className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
                  )}
                  {dynamicGreeting.period === 'night' && (
                    <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-300" />
                  )}
                </span>
                <span className="break-words">
                  {dynamicGreeting.label},{' '}
                  <span className="gold-gradient-text break-words">
                    {userStats.name || 'Scholar'}
                  </span>
                </span>
              </h2>

              {onChangeTheme && (
                <button
                  type="button"
                  onClick={() => onChangeTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                  aria-label={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
                  title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
                  className="svh-theme-switch-btn inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#131b2e] hover:bg-[#19243d] border border-[#d4af37]/35 hover:border-[#d4af37] text-[11px] font-semibold text-[#fbf9f4] shrink-0 cursor-pointer shadow-xs"
                >
                  <span className="relative w-4 h-4 inline-flex items-center justify-center overflow-hidden">
                    <Sun
                      className={`w-4 h-4 text-amber-400 svh-theme-switch-icon ${
                        resolvedTheme === 'light'
                          ? 'svh-theme-icon-active'
                          : 'svh-theme-icon-inactive'
                      }`}
                    />
                    <Moon
                      className={`w-4 h-4 text-[#d4af37] svh-theme-switch-icon ${
                        resolvedTheme === 'dark'
                          ? 'svh-theme-icon-active'
                          : 'svh-theme-icon-inactive'
                      }`}
                    />
                  </span>
                  <span className="whitespace-nowrap">
                    {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
                  </span>
                </button>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#cbd5e1] leading-relaxed break-words">
              {hasExplicitGoal ? (
                <>
                  Your personalized workspace for{' '}
                  <span className="text-[#d4af37] font-semibold">{activeGoal}</span>.
                  Every countdown, study session, task, and metric is driven 100% by your real activity.
                </>
              ) : (
                <>
                  Select your exam goal, set your real exam countdown, create study tasks, and start a focus session to build your personal progress.
                </>
              )}
            </p>
          </div>

          {/* Dedicated Install App Button */}
          <PWAInstallButton />

          {/* ACTIVE GOAL SELECTOR BAR */}
          <div className="pt-2 border-t border-[#d4af37]/20 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#9ca3af] font-medium">Active Goal:</span>
              {userStats.selectedGoals.length > 0 ? (
                <div className="relative">
                  <button
                    onClick={() => setGoalDropdownOpen(!goalDropdownOpen)}
                    className="px-3 py-1.5 rounded-xl bg-[#131b2e] border border-[#d4af37]/40 text-[#fbf9f4] hover:border-[#d4af37] text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
                  >
                    <span className="text-[#d4af37]">{activeGoal}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#9ca3af]" />
                  </button>

                  {goalDropdownOpen && (
                    <div className="svh-popup-card absolute left-0 top-full mt-1.5 w-48 bg-[#0c1428] border border-[#d4af37]/40 rounded-xl shadow-2xl py-1.5 z-40">
                      <div className="px-3 py-1 text-[10px] text-[#9ca3af] uppercase font-mono border-b border-[#1f293d]">
                        Switch Active Goal
                      </div>
                      {userStats.selectedGoals.map((goal) => (
                        <button
                          key={goal}
                          onClick={() => {
                            onSelectActiveGoal(goal);
                            setGoalDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between ${
                            goal === activeGoal
                              ? 'bg-[#d4af37]/20 text-[#d4af37] font-semibold'
                              : 'text-[#cbd5e1] hover:bg-[#131b2e]'
                          }`}
                        >
                          <span>{goal}</span>
                          {goal === activeGoal && (
                            <Check className="w-3.5 h-3.5 text-[#d4af37]" />
                          )}
                        </button>
                      ))}
                      <div className="border-t border-[#1f293d] mt-1 pt-1">
                        <button
                          onClick={() => {
                            setGoalDropdownOpen(false);
                            onOpenGoalsManager();
                          }}
                          className="w-full text-left px-3 py-1.5 text-[11px] text-[#d4af37] hover:underline"
                        >
                          + Add or Change Goals
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={onOpenGoalsManager}
                  className="px-3 py-1.5 rounded-xl bg-[#131b2e] border border-[#d4af37]/30 text-xs text-[#d4af37] font-medium hover:underline"
                >
                  Set your exam →
                </button>
              )}
            </div>

            {hasExplicitGoal && (
              <div className="flex flex-wrap items-center gap-1.5 min-w-0 max-w-full">
                {subjectsForActiveGoal.map((sub) => (
                  <span
                    key={sub}
                    className="px-2.5 py-1 rounded-lg bg-[#131b2e]/85 border border-[#d4af37]/25 text-[10px] sm:text-[11px] font-medium text-[#cbd5e1] break-words leading-tight"
                  >
                    {sub}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 2. HOME EXAM COUNTDOWN + PREMIUM STUDY FOCUS MODE BAR                 */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* HOME EXAM COUNTDOWN (7 cols) */}
        <section className="svh-3d-tilt-card lg:col-span-7 p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0c1428] via-[#0a1122] to-[#060b18] border border-[#d4af37]/35 shadow-lg flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#d4af37] uppercase tracking-wider">
              <Calendar className="w-4 h-4" />
              <span>Exam Countdown</span>
            </div>

            {countdownData && !isEditingCountdown && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenCountdownEditor}
                  className="px-2.5 py-1 rounded-lg bg-[#131b2e] border border-[#d4af37]/30 text-[11px] text-[#fbf9f4] hover:text-[#d4af37] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit Date</span>
                </button>
                <button
                  onClick={handleClearCountdown}
                  className="px-2 py-1 rounded-lg bg-[#131b2e] text-[11px] text-[#9ca3af] hover:text-rose-300 transition-colors cursor-pointer"
                  title="Clear exam countdown"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {isEditingCountdown ? (
            <form onSubmit={handleSaveExamCountdown} className="space-y-3 pt-1">
              {countdownError && (
                <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs">
                  {countdownError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#d4af37] block mb-1">
                    Select or Enter Your Exam / Goal
                  </label>
                  <input
                    type="text"
                    list="svh-exam-presets"
                    value={examNameInput}
                    onChange={(e) => setExamNameInput(e.target.value)}
                    placeholder="e.g. NEET, JEE Main, Class 12 Board..."
                    className="w-full px-3 py-2 rounded-xl bg-[#090e1c] border border-[#d4af37]/30 text-xs sm:text-sm text-[#fbf9f4] placeholder-[#9ca3af] focus:outline-none focus:border-[#d4af37]"
                  />
                  <datalist id="svh-exam-presets">
                    {Array.from(
                      new Set([...userStats.selectedGoals, ...PRESET_GOALS])
                    ).map((g) => (
                      <option key={g} value={g} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#d4af37] block mb-1">
                    Your Actual Exam Date
                  </label>
                  <input
                    type="date"
                    value={examDateInput}
                    onChange={(e) => setExamDateInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#090e1c] border border-[#d4af37]/30 text-xs sm:text-sm text-[#fbf9f4] focus:outline-none focus:border-[#d4af37]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-[#9ca3af] block mb-1">
                  Personal Target Note (Optional)
                </label>
                <input
                  type="text"
                  value={examNoteInput}
                  onChange={(e) => setExamNoteInput(e.target.value)}
                  placeholder="e.g. Complete full NCERT revision 2 weeks prior"
                  className="w-full px-3 py-2 rounded-xl bg-[#090e1c] border border-[#d4af37]/25 text-xs text-[#fbf9f4] placeholder-[#9ca3af] focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingCountdown(false)}
                  className="px-3.5 py-2 rounded-xl bg-[#131b2e] text-xs text-[#cbd5e1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-xs cursor-pointer"
                >
                  Save Exam Countdown
                </button>
              </div>
            </form>
          ) : countdownData ? (
            /* Real Calculated Exam Countdown Display */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg sm:text-xl font-bold text-[#fbf9f4]">
                    {countdownData.examName}
                  </h3>
                  <p className="text-xs text-[#cbd5e1] mt-0.5">
                    Exam Date: <span className="text-[#d4af37] font-semibold">{countdownData.formattedDate}</span>
                  </p>
                  {countdownData.targetNote && (
                    <p className="text-[11px] text-[#9ca3af] mt-1">
                      Target: {countdownData.targetNote}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="px-4 py-2.5 rounded-2xl bg-[#090e1c] border border-[#d4af37]/40 text-center min-w-[92px]">
                    <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#d4af37] tabular-nums block leading-none">
                      {countdownData.isPast
                        ? 'Passed'
                        : countdownData.isToday
                        ? 'Today!'
                        : countdownData.totalDays}
                    </span>
                    {!countdownData.isPast && !countdownData.isToday && (
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#cbd5e1] mt-1 block">
                        {countdownData.totalDays === 1 ? 'Day Left' : 'Days Left'}
                      </span>
                    )}
                  </div>

                  {!countdownData.isPast && !countdownData.isToday && (
                    <div className="px-3.5 py-2.5 rounded-2xl bg-[#0f172a] border border-[#d4af37]/20 text-xs text-[#cbd5e1] space-y-0.5">
                      <div className="font-mono font-semibold text-[#fbf9f4]">
                        {countdownData.weeks}w {countdownData.remDays}d
                      </div>
                      <div className="text-[10px] text-[#9ca3af]">
                        ~{countdownData.totalHours.toLocaleString()} hrs remaining
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Clean Empty State — Never assumes or pre-fills an exam date */
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-display text-base sm:text-lg font-bold text-[#fbf9f4]">
                  No exam countdown configured yet
                </h3>
                <p className="text-xs text-[#9ca3af] max-w-md leading-relaxed">
                  Select your target exam and enter your actual exam date to track your real remaining preparation days.
                </p>
              </div>
              <button
                onClick={handleOpenCountdownEditor}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shrink-0 hover:brightness-110 transition-all shadow-md cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>Set your exam</span>
              </button>
            </div>
          )}
        </section>

        {/* PREMIUM STUDY FOCUS MODE LAUNCHER (5 cols) */}
        <section className="svh-3d-tilt-card lg:col-span-5 p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0c1428] via-[#0a1122] to-[#060b18] border border-[#d4af37]/35 shadow-lg flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#d4af37] uppercase tracking-wider">
              <Clock className="w-4 h-4" />
              <span>Premium Study Focus Mode</span>
            </div>
            {userStats.studySessions.length > 0 && (
              <span className="text-[11px] font-mono text-emerald-400">
                {userStats.studySessions.length}{' '}
                {userStats.studySessions.length === 1 ? 'session' : 'sessions'} logged
              </span>
            )}
          </div>

          <div className="space-y-1">
            <h3 className="font-display text-base sm:text-lg font-bold text-[#fbf9f4]">
              {userStats.totalStudyMinutes > 0
                ? `${userStats.totalStudyMinutes} min of verified focus time`
                : 'Ready for deep, distraction-free study'}
            </h3>
            <p className="text-xs text-[#9ca3af] leading-relaxed">
              Choose your subject, chapter, duration, and study goal. Only real elapsed study time is recorded.
            </p>
          </div>

          <div className="pt-1 flex items-center justify-between gap-3">
            <button
              onClick={onOpenFocusMode}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#e5c158] to-[#aa7c11] text-[#080d1a] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-md cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {userStats.studySessions.length === 0
                  ? 'Start your first focus session'
                  : 'Start Focus Session'}
              </span>
            </button>
          </div>
        </section>
      </div>

      {/* ===================================================================== */}
      {/* 3. STUDENT COMMAND CENTER (100% REAL USER DATA ONLY)                  */}
      {/* ===================================================================== */}
      <section className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0c1428] via-[#091020] to-[#060b18] border border-[#d4af37]/35 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#d4af37] uppercase tracking-wider">
              <Compass className="w-4 h-4" />
              <span>Student Command Center</span>
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#fbf9f4]">
              Verified Academic Telemetry
            </h2>
          </div>
          <button
            onClick={() => onNavigate('tracker')}
            className="text-xs text-[#d4af37] hover:underline font-medium self-start sm:self-center"
          >
            Open Full Tracker →
          </button>
        </div>

        {!hasAnyRealActivity ? (
          /* Clean Empty State for New User — No fake stats or 0-based dummy cards */
          <div className="p-6 sm:p-8 rounded-2xl bg-[#090e1c] border border-[#d4af37]/25 text-center space-y-4">
            <div className="space-y-1 max-w-xl mx-auto">
              <h3 className="font-display text-base sm:text-lg font-bold text-[#fbf9f4]">
                Your Command Center is ready to track your real progress
              </h3>
              <p className="text-xs sm:text-sm text-[#9ca3af] leading-relaxed">
                No study sessions, tasks, or practice questions have been recorded yet. Begin any activity below to populate your personal Command Center with genuine metrics.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2">
              <button
                onClick={handleOpenCountdownEditor}
                className="p-3.5 rounded-xl bg-[#0f172a] hover:bg-[#131b2e] border border-[#d4af37]/30 hover:border-[#d4af37] text-left transition-all cursor-pointer space-y-1"
              >
                <Calendar className="w-4 h-4 text-[#d4af37]" />
                <div className="font-display text-xs font-bold text-[#fbf9f4]">
                  Set your exam
                </div>
                <p className="text-[11px] text-[#9ca3af]">
                  Configure your real target exam &amp; date
                </p>
              </button>

              <button
                onClick={() => setIsPlannerFormOpen(true)}
                className="p-3.5 rounded-xl bg-[#0f172a] hover:bg-[#131b2e] border border-[#d4af37]/30 hover:border-[#d4af37] text-left transition-all cursor-pointer space-y-1"
              >
                <Plus className="w-4 h-4 text-[#d4af37]" />
                <div className="font-display text-xs font-bold text-[#fbf9f4]">
                  Create your first study task
                </div>
                <p className="text-[11px] text-[#9ca3af]">
                  Plan chapters, deadlines &amp; study targets
                </p>
              </button>

              <button
                onClick={onOpenFocusMode}
                className="p-3.5 rounded-xl bg-[#0f172a] hover:bg-[#131b2e] border border-[#d4af37]/30 hover:border-[#d4af37] text-left transition-all cursor-pointer space-y-1"
              >
                <Play className="w-4 h-4 text-emerald-400" />
                <div className="font-display text-xs font-bold text-[#fbf9f4]">
                  Start your first focus session
                </div>
                <p className="text-[11px] text-[#9ca3af]">
                  Record real subject &amp; topic focus time
                </p>
              </button>

              <button
                onClick={() => onNavigate('practice')}
                className="p-3.5 rounded-xl bg-[#0f172a] hover:bg-[#131b2e] border border-[#d4af37]/30 hover:border-[#d4af37] text-left transition-all cursor-pointer space-y-1"
              >
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                <div className="font-display text-xs font-bold text-[#fbf9f4]">
                  Start practicing to build your progress
                </div>
                <p className="text-[11px] text-[#9ca3af]">
                  Solve real MCQs to measure accuracy
                </p>
              </button>
            </div>
          </div>
        ) : (
          /* Real User Telemetry Cards (Only shown once genuine activity exists) */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Actual Study Time */}
            <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 flex flex-col justify-between space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9ca3af] font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#d4af37]" />
                  Actual Study Time
                </span>
                {userStats.studySessions.length > 0 && (
                  <span className="text-[10px] font-mono text-[#d4af37]">
                    {userStats.studySessions.length} sessions
                  </span>
                )}
              </div>

              {userStats.totalStudyMinutes > 0 ? (
                <div className="space-y-1.5">
                  <div className="font-display text-2xl font-bold text-[#fbf9f4] tabular-nums">
                    {userStats.totalStudyMinutes} min
                  </div>
                  <p className="text-[11px] text-[#9ca3af]">
                    Daily target: {userStats.dailyGoals.studyMinutes} min
                  </p>
                  <div className="w-full h-1.5 bg-[#131b2e] rounded-full overflow-hidden border border-[#d4af37]/20">
                    <div
                      className="svh-animated-progress-fill h-full bg-gradient-to-r from-[#d4af37] to-amber-300"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            (userStats.totalStudyMinutes /
                              Math.max(1, userStats.dailyGoals.studyMinutes)) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={onOpenFocusMode}
                  className="text-left text-xs text-[#d4af37] font-semibold hover:underline pt-1 cursor-pointer"
                >
                  Start your first focus session →
                </button>
              )}
            </div>

            {/* 2. Practice & Verified Accuracy */}
            <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 flex flex-col justify-between space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9ca3af] font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Practice &amp; Accuracy
                </span>
                {verifiedAccuracy !== null && (
                  <span className="text-xs font-bold text-emerald-400 tabular-nums">
                    {verifiedAccuracy}%
                  </span>
                )}
              </div>

              {userStats.questionsAttempted > 0 ? (
                <div className="space-y-1.5">
                  <div className="font-display text-2xl font-bold text-[#fbf9f4] tabular-nums">
                    {userStats.questionsAttempted} Solved
                  </div>
                  <p className="text-[11px] text-[#9ca3af]">
                    {userStats.correctAnswers} correct · {userStats.incorrectAnswers} incorrect
                  </p>
                  <div className="w-full h-1.5 bg-[#131b2e] rounded-full overflow-hidden border border-[#d4af37]/20">
                    <div
                      className="svh-animated-progress-fill h-full bg-gradient-to-r from-[#d4af37] to-emerald-400"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            (userStats.questionsAttempted /
                              Math.max(1, userStats.dailyGoals.questionCount)) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => onNavigate('practice')}
                  className="text-left text-xs text-[#d4af37] font-semibold hover:underline pt-1 cursor-pointer"
                >
                  Start practicing to build your progress →
                </button>
              )}
            </div>

            {/* 3. Completed Tasks */}
            <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 flex flex-col justify-between space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9ca3af] font-medium flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  Planner Tasks
                </span>
              </div>

              {totalTasksCount > 0 ? (
                <div className="space-y-1.5">
                  <div className="font-display text-2xl font-bold text-[#fbf9f4] tabular-nums">
                    {completedTasksCount} / {totalTasksCount}
                  </div>
                  <p className="text-[11px] text-[#9ca3af]">
                    {totalTasksCount - completedTasksCount} pending in your planner
                  </p>
                  <div className="w-full h-1.5 bg-[#131b2e] rounded-full overflow-hidden border border-[#d4af37]/20">
                    <div
                      className="svh-animated-progress-fill h-full bg-gradient-to-r from-[#d4af37] to-blue-400"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            (completedTasksCount / Math.max(1, totalTasksCount)) * 100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsPlannerFormOpen(true)}
                  className="text-left text-xs text-[#d4af37] font-semibold hover:underline pt-1 cursor-pointer"
                >
                  Create your first study task →
                </button>
              )}
            </div>

            {/* 4. Revision Items & Streak */}
            <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 flex flex-col justify-between space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9ca3af] font-medium flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400 svh-live-streak-flame" />
                  Revision &amp; Streak
                </span>
                <span className="text-xs font-bold text-amber-300 tabular-nums">
                  {realStreakDays > 0 ? `${realStreakDays}d streak` : '0d'}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="font-display text-2xl font-bold text-[#fbf9f4] tabular-nums">
                  {userStats.completedNoteIds.length} Notes Revised
                </div>
                <p className="text-[11px] text-[#9ca3af]">
                  {userStats.bookmarkedItemIds.length} saved items in vault
                </p>
                <div className="w-full h-1.5 bg-[#131b2e] rounded-full overflow-hidden border border-[#d4af37]/20">
                  <div
                    className="svh-animated-progress-fill h-full bg-gradient-to-r from-amber-500 to-emerald-400"
                    style={{
                      width: `${
                        realStreakDays === 0
                          ? 0
                          : realStreakDays % 5 === 0
                          ? 100
                          : Math.round(((realStreakDays % 5) / 5) * 100)
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* 4. SMART DAILY PLANNER (USER-CONTROLLED TASKS, SUBJECTS, DEADLINES)   */}
      {/* ===================================================================== */}
      <section className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0c1428] via-[#091020] to-[#060b18] border border-[#d4af37]/35 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#d4af37] uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" />
              <span>Smart Daily Planner</span>
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#fbf9f4]">
              Your Personal Study Tasks &amp; Deadlines
            </h2>
          </div>

          <button
            onClick={() => setIsPlannerFormOpen(!isPlannerFormOpen)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-xs flex items-center gap-1.5 self-start sm:self-center hover:brightness-110 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isPlannerFormOpen ? 'Close Task Creator' : 'New Study Task'}</span>
          </button>
        </div>

        {/* Create Task Form (Seamless Accordion Slide-Down) */}
        <div className={`svh-accordion-grid ${isPlannerFormOpen ? 'svh-accordion-open' : ''}`}>
          <div className="svh-accordion-inner">
          <form
            onSubmit={handleCreatePlannerTask}
            className="p-4 rounded-2xl bg-[#090e1c] border border-[#d4af37]/35 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-[#d4af37] block mb-1">
                  Task Title / Study Objective *
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="What do you plan to study or complete?"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#0f172a] border border-[#d4af37]/30 text-xs sm:text-sm text-[#fbf9f4] placeholder-[#9ca3af] focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#9ca3af] block mb-1">
                  Subject (Optional)
                </label>
                <input
                  type="text"
                  list="svh-planner-subjects"
                  value={taskSubject}
                  onChange={(e) => setTaskSubject(e.target.value)}
                  placeholder="e.g. Physics, Biology..."
                  className="w-full px-3 py-2 rounded-xl bg-[#0f172a] border border-[#d4af37]/25 text-xs text-[#fbf9f4] placeholder-[#9ca3af]"
                />
                <datalist id="svh-planner-subjects">
                  {subjectsForActiveGoal.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="text-[11px] text-[#9ca3af] block mb-1">
                  Chapter / Topic (Optional)
                </label>
                <input
                  type="text"
                  value={taskChapter}
                  onChange={(e) => setTaskChapter(e.target.value)}
                  placeholder="e.g. Rotational Motion"
                  className="w-full px-3 py-2 rounded-xl bg-[#0f172a] border border-[#d4af37]/25 text-xs text-[#fbf9f4] placeholder-[#9ca3af]"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#9ca3af] block mb-1">
                  Target Time (Minutes)
                </label>
                <input
                  type="number"
                  min={5}
                  max={600}
                  value={taskTargetMin}
                  onChange={(e) => setTaskTargetMin(e.target.value)}
                  placeholder="e.g. 45"
                  className="w-full px-3 py-2 rounded-xl bg-[#0f172a] border border-[#d4af37]/25 text-xs text-[#fbf9f4] placeholder-[#9ca3af]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-[#9ca3af] block mb-1">
                    Deadline Date
                  </label>
                  <input
                    type="date"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-[#0f172a] border border-[#d4af37]/25 text-xs text-[#fbf9f4]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#9ca3af] block mb-1">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) =>
                      setTaskPriority(
                        e.target.value as 'High' | 'Medium' | 'Normal'
                      )
                    }
                    className="w-full px-2.5 py-2 rounded-xl bg-[#0f172a] border border-[#d4af37]/25 text-xs text-[#fbf9f4]"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Normal">Normal</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsPlannerFormOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-[#131b2e] text-xs text-[#cbd5e1]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#d4af37] text-[#080d1a] font-bold text-xs cursor-pointer"
              >
                Add to Daily Planner
              </button>
            </div>
          </form>
          </div>
        </div>

        {/* Real-Data-Only Smart Suggestions (Only shown if real weak-topic data exists) */}
        {realDataSuggestions.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-[#090e1c] border border-[#d4af37]/30 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#d4af37]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Suggested from your real practice performance:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {realDataSuggestions.map((sug, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-[#0f172a] border border-[#d4af37]/20 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-[#fbf9f4] truncate">
                      {sug.title}
                    </div>
                    <div className="text-[10px] text-[#9ca3af] truncate">
                      {sug.reason}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const newTask: StudyTask = {
                        id: `task-${Date.now()}-${idx}`,
                        text: sug.title,
                        completed: false,
                        createdAt: new Date().toISOString(),
                        subject: sug.subject,
                        chapter: sug.chapter,
                        targetMinutes: sug.targetMinutes,
                        priority: 'High',
                      };
                      onUpdateStats({ tasks: [newTask, ...userStats.tasks] });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#131b2e] hover:bg-[#d4af37] text-[#d4af37] hover:text-[#080d1a] font-bold text-[11px] shrink-0 transition-colors cursor-pointer"
                  >
                    + Add Task
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tasks List or Clean Empty State */}
        {userStats.tasks.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#090e1c] border border-[#d4af37]/20 text-center space-y-3">
            <div className="space-y-1">
              <h3 className="font-display text-sm sm:text-base font-bold text-[#fbf9f4]">
                No tasks in your Smart Daily Planner yet
              </h3>
              <p className="text-xs text-[#9ca3af] max-w-md mx-auto">
                Add your own study tasks, chapters, target durations, and deadlines. Nothing is pre-filled or auto-completed.
              </p>
            </div>
            <button
              onClick={() => setIsPlannerFormOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#131b2e] hover:bg-[#d4af37] text-[#d4af37] hover:text-[#080d1a] border border-[#d4af37]/35 font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create your first study task</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {userStats.tasks.slice(0, 6).map((task) => (
              <div
                key={task.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                  task.completed
                    ? 'bg-[#0f172a]/60 border-emerald-500/30 text-[#9ca3af]'
                    : 'bg-[#0f172a] border-[#d4af37]/25 text-[#fbf9f4]'
                }`}
              >
                <button
                  onClick={() => handleToggleTaskComplete(task.id)}
                  className="flex items-start gap-3 text-left flex-1 min-w-0 cursor-pointer"
                >
                  <div
                    className={`w-5 h-5 mt-0.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                      task.completed
                        ? 'bg-emerald-500 border-emerald-500 text-[#080d1a]'
                        : 'border-[#d4af37]/40 bg-[#090e1c]'
                    }`}
                  >
                    {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div
                      className={`text-xs sm:text-sm font-medium ${
                        task.completed ? 'line-through text-[#6b7280]' : 'text-[#fbf9f4]'
                      }`}
                    >
                      {task.text}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      {task.priority && task.priority !== 'Normal' && (
                        <span
                          className={`px-1.5 py-0.5 rounded font-mono font-bold ${
                            task.priority === 'High'
                              ? 'bg-rose-950/70 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-950/70 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {task.priority}
                        </span>
                      )}
                      {task.subject && (
                        <span className="px-2 py-0.5 rounded bg-[#131b2e] text-[#d4af37] border border-[#d4af37]/20">
                          {task.subject}
                        </span>
                      )}
                      {task.chapter && (
                        <span className="text-[#9ca3af]">· {task.chapter}</span>
                      )}
                      {task.targetMinutes && (
                        <span className="text-[#cbd5e1] font-mono">
                          · {task.targetMinutes}m target
                        </span>
                      )}
                      {task.deadline && (
                        <span className="text-amber-300 font-mono">
                          · Due {task.deadline}
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleDeleteTask(task.id)}
                  aria-label="Delete Task"
                  className="p-1.5 rounded-lg text-[#9ca3af] hover:text-rose-400 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* 5. QUICK ACCESS BUTTONS                                               */}
      {/* ===================================================================== */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-display text-base font-bold text-[#fbf9f4] tracking-tight">
            Quick Access
          </h2>
          <span className="text-xs text-[#9ca3af]">Curated for {activeGoal}</span>
        </div>

        {/* Quick Access Grid — Responsive min-h-[6rem] instead of fixed h-24 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={() => onNavigate('books')}
            className="svh-3d-tilt-card p-3.5 rounded-xl bg-[#0f172a] border border-[#d4af37]/25 hover:border-[#d4af37] text-left transition-all active:scale-[0.98] group flex flex-col justify-between gap-2.5 min-h-[6rem] h-auto"
          >
            <div className="w-8 h-8 rounded-lg bg-[#19233c] border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37] group-hover:scale-110 transition-transform shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-xs sm:text-sm font-semibold text-[#fbf9f4] group-hover:text-[#d4af37] transition-colors break-words leading-snug">
                Books &amp; NCERT
              </h3>
              <p className="text-[10px] text-[#9ca3af] break-words mt-0.5">NCERT &amp; References</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('notes')}
            className="svh-3d-tilt-card p-3.5 rounded-xl bg-[#0f172a] border border-[#d4af37]/25 hover:border-[#d4af37] text-left transition-all active:scale-[0.98] group flex flex-col justify-between gap-2.5 min-h-[6rem] h-auto"
          >
            <div className="w-8 h-8 rounded-lg bg-[#19233c] border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37] group-hover:scale-110 transition-transform shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-xs sm:text-sm font-semibold text-[#fbf9f4] group-hover:text-[#d4af37] transition-colors break-words leading-snug">
                Notes
              </h3>
              <p className="text-[10px] text-[#9ca3af] break-words mt-0.5">High-Yield Summaries</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('practice')}
            className="svh-3d-tilt-card p-3.5 rounded-xl bg-[#0f172a] border border-[#d4af37]/25 hover:border-[#d4af37] text-left transition-all active:scale-[0.98] group flex flex-col justify-between gap-2.5 min-h-[6rem] h-auto"
          >
            <div className="w-8 h-8 rounded-lg bg-[#19233c] border border-[#d4af37]/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-xs sm:text-sm font-semibold text-[#fbf9f4] group-hover:text-[#d4af37] transition-colors break-words leading-snug">
                Question Practice
              </h3>
              <p className="text-[10px] text-[#9ca3af] break-words mt-0.5">MCQs &amp; Sprints</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('tracker')}
            className="svh-3d-tilt-card p-3.5 rounded-xl bg-[#0f172a] border border-[#d4af37]/25 hover:border-[#d4af37] text-left transition-all active:scale-[0.98] group flex flex-col justify-between gap-2.5 min-h-[6rem] h-auto"
          >
            <div className="w-8 h-8 rounded-lg bg-[#19233c] border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37] group-hover:scale-110 transition-transform shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-xs sm:text-sm font-semibold text-[#fbf9f4] group-hover:text-[#d4af37] transition-colors break-words leading-snug">
                Study Tracker
              </h3>
              <p className="text-[10px] text-[#9ca3af] break-words mt-0.5">Timer &amp; Daily Tasks</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('prep')}
            className="svh-3d-tilt-card p-3.5 rounded-xl bg-[#0f172a] border border-[#d4af37]/25 hover:border-[#d4af37] text-left transition-all active:scale-[0.98] group flex flex-col justify-between gap-2.5 min-h-[6rem] h-auto col-span-2 sm:col-span-1"
          >
            <div className="w-8 h-8 rounded-lg bg-[#19233c] border border-[#d4af37]/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-xs sm:text-sm font-semibold text-[#fbf9f4] group-hover:text-[#d4af37] transition-colors break-words leading-snug">
                {activeGoal} Prep
              </h3>
              <p className="text-[10px] text-[#9ca3af] break-words mt-0.5">Blueprint &amp; Matrix</p>
            </div>
          </button>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 6. STUDY MATERIALS FOR ACTIVE GOAL                                    */}
      {/* ===================================================================== */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-display text-base font-bold text-[#fbf9f4] tracking-tight">
            Materials for {activeGoal}
          </h2>
          <button
            onClick={() => onNavigate('books')}
            className="text-xs text-[#d4af37] hover:underline flex items-center gap-1 font-medium"
          >
            <span>View All Books</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-2 px-2 snap-x snap-mandatory">
          {displayBooks.slice(0, 4).map((book) => {
            const bookmarked = isBookmarked(book.id);
            return (
              <div
                key={book.id}
                className="svh-3d-tilt-card w-[260px] sm:w-[280px] shrink-0 snap-start rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 hover:border-[#d4af37]/60 p-3.5 flex flex-col justify-between transition-all group shadow-md"
              >
                <div>
                  <div className="relative aspect-[16/9] rounded-xl overflow-hidden mb-3 bg-[#131b2e] border border-[#d4af37]/20 flex items-center justify-center">
                    {book.coverImage ? (
                      <img
                        src={book.coverImage}
                        alt={book.title}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#121c35] to-[#090e1c] flex flex-col items-center justify-center p-3 text-center">
                        <BookOpen className="w-8 h-8 text-[#d4af37] mb-1" />
                        <span className="text-[11px] font-display font-semibold text-[#fbf9f4] line-clamp-1">
                          {book.title}
                        </span>
                        <span className="text-[10px] text-[#d4af37]">{book.subject}</span>
                      </div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleBookmark(book.id);
                      }}
                      aria-label="Bookmark"
                      className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-[#080d1a]/85 backdrop-blur-sm border border-[#d4af37]/30 flex items-center justify-center text-[#9ca3af] hover:text-[#d4af37] transition-colors"
                    >
                      <Bookmark
                        className={`w-3.5 h-3.5 ${
                          bookmarked ? 'fill-[#d4af37] text-[#d4af37]' : ''
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-[#9ca3af] mb-1">
                    <span className="text-[#d4af37] font-medium">{book.subject}</span>
                    <span aria-hidden="true">·</span>
                    <span>{book.edition}</span>
                  </div>

                  <h3 className="font-display text-sm font-semibold text-[#fbf9f4] line-clamp-1 group-hover:text-[#d4af37] transition-colors">
                    {book.title}
                  </h3>
                  <p className="text-xs text-[#cbd5e1] line-clamp-2 mt-1">
                    {book.description}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-[#1e293b] flex items-center justify-between">
                  <span className="text-[11px] text-[#9ca3af]">
                    {book.chapters.length} Chapters Active
                  </span>
                  <button
                    onClick={() => onSelectBook(book)}
                    className="px-3 py-1.5 rounded-lg bg-[#19233c] hover:bg-[#d4af37] text-[#cbd5e1] hover:text-[#080d1a] text-xs font-semibold transition-all flex items-center gap-1"
                  >
                    <span>Read Book</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 7. ADAPTIVE QUESTION PRACTICE WIDGET                                  */}
      {/* ===================================================================== */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-bold text-[#fbf9f4] tracking-tight">
              Practice Question ({activeGoal})
            </h2>
          </div>
          <button
            onClick={() => onNavigate('practice')}
            className="text-xs text-[#d4af37] hover:underline flex items-center gap-1 font-medium"
          >
            <span>Open Practice Engine</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#0f172a] border border-[#d4af37]/30 shadow-lg space-y-4">
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-[#9ca3af]">
              <span className="text-[#d4af37] font-semibold">
                {dailyQuestion.subject}
              </span>
              <span aria-hidden="true">·</span>
              <span>{dailyQuestion.topic}</span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-300 font-medium">{dailyQuestion.year}</span>
            </div>
            <div className="text-[11px] text-[#9ca3af]">{activeGoal} Question</div>
          </div>

          <p className="text-sm sm:text-base font-medium text-[#fbf9f4] leading-relaxed">
            {dailyQuestion.question}
          </p>

          <div className="grid gap-2.5">
            {dailyQuestion.options.map((opt, idx) => {
              const isSelected = selectedAnswer === idx;
              const isCorrect = idx === dailyQuestion.correctIndex;
              let optionStyle =
                'bg-[#131b2e] border-[#d4af37]/20 text-[#cbd5e1] hover:border-[#d4af37]/50';

              if (isAnswerSubmitted) {
                if (isCorrect) {
                  optionStyle =
                    'bg-emerald-950/60 border-emerald-500 text-emerald-200';
                } else if (isSelected && !isCorrect) {
                  optionStyle = 'bg-rose-950/60 border-rose-500 text-rose-200';
                } else {
                  optionStyle =
                    'bg-[#131b2e]/60 border-[#1f293d] text-[#6b7280] opacity-60';
                }
              } else if (isSelected) {
                optionStyle =
                  'bg-[#d4af37]/20 border-[#d4af37] text-[#fbf9f4] shadow-sm';
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  className={`w-full text-left p-3 rounded-xl border transition-all text-xs sm:text-sm flex items-center justify-between min-h-[44px] ${optionStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-[#080d1a] border border-[#d4af37]/30 flex items-center justify-center font-mono text-xs font-semibold text-[#d4af37] shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{opt}</span>
                  </div>

                  {isAnswerSubmitted && isCorrect && (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  {isAnswerSubmitted && isSelected && !isCorrect && (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {!isAnswerSubmitted ? (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-[#9ca3af]">
                Select an answer and submit
              </span>
              <button
                onClick={handleSubmitDailyAnswer}
                disabled={selectedAnswer === null}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-semibold text-xs sm:text-sm hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-sm"
              >
                Submit &amp; Record
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-[#1f293d] space-y-3 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-xl bg-[#131b2e] border border-[#d4af37]/30 text-xs sm:text-sm space-y-1">
                <div className="font-semibold text-[#d4af37] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {selectedAnswer === dailyQuestion.correctIndex
                      ? 'Correct! Marks recorded'
                      : 'Incorrect answer logged'}
                  </span>
                </div>
                <p className="text-[#cbd5e1] leading-relaxed pt-1">
                  {dailyQuestion.explanation}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={handleResetDailyAnswer}
                  className="text-xs text-[#9ca3af] hover:text-[#fbf9f4] underline"
                >
                  Try Again
                </button>
                <button
                  onClick={() => onNavigate('practice')}
                  className="px-3.5 py-1.5 rounded-lg bg-[#19233c] hover:bg-[#d4af37] text-[#fbf9f4] hover:text-[#080d1a] text-xs font-semibold transition-all flex items-center gap-1"
                >
                  <span>Practice More {activeGoal} Questions</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 8. STUDENT IMPACT DASHBOARD (100% VERIFIED REAL TELEMETRY)            */}
      {/* ===================================================================== */}
      <StudentImpactDashboard userStats={userStats} />

      {/* ===================================================================== */}
      {/* 9. STRUCTURED LEARNING PATHS (CLASSES 10, 11, 12, BOARDS, NEET, JEE)  */}
      {/* ===================================================================== */}
      <LearningPathsSection
        activeGoal={activeGoal}
        onSelectActiveGoal={onSelectActiveGoal}
        onNavigate={onNavigate}
      />

      {/* ===================================================================== */}
      {/* 10. EXISTING LEARNING RESOURCES SHOWCASE                              */}
      {/* ===================================================================== */}
      <LearningResourcesShowcase
        activeGoal={activeGoal}
        onNavigate={onNavigate}
        onOpenFocusMode={onOpenFocusMode}
      />

      {/* ===================================================================== */}
      {/* 11. GENUINE STUDENT REVIEWS SECTION                                   */}
      {/* ===================================================================== */}
      <GenuineStudentReviewsSection onNavigate={onNavigate} />

      {/* Independent Platform & Academic Attribution Notice */}
      <footer className="px-4 py-3 rounded-2xl bg-[#090e1c] border border-[#1e293b] text-[11px] text-[#9ca3af] text-center leading-relaxed">
        Study Vault Hub is an independent educational study platform developed by Soumyadip Rana and is not affiliated with or endorsed by NCERT, NTA, CBSE, or any examination authority. In-app guides and practice questions are original study resources; official NCERT textbook links open the public NCERT portal (ncert.nic.in).
      </footer>
      </div>

      {/* ===================================================================== */}
      {/* VIEWPORT-CENTERED VP POINTS & STREAK DETAILS MODAL                    */}
      {/* ===================================================================== */}
      <VaultPointsPopup
        isOpen={isVpPopupOpen}
        onClose={handleCloseVpPopup}
        userStats={userStats}
        initialTab={vpPopupTab}
      />
    </div>
  );
});
