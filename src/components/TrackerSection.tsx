import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Clock,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Plus,
  Trash2,
  Target,
  Sparkles,
  Calendar,
  Check,
  TrendingUp,
} from 'lucide-react';
import { UserStats, StudyTask, StudySession, AISmartRevisionPlan, AISmartStudyBlock } from '../types';
import { apiFetch } from '../services/nativeApiBridge';
import { GlassMetallicSkeleton } from './GlassMetallicSkeleton';
import { RollingVPCounter } from './RollingVPCounter';
import { triggerConfettiCelebration } from './ConfettiCelebration';

interface TrackerSectionProps {
  activeGoal: string;
  activeSubjects: string[];
  userStats: UserStats;
  onUpdateStats: (newStats: Partial<UserStats>) => void;
  onNavigateToPractice: () => void;
  onOpenFocusMode?: () => void;
}

interface ActiveStopwatchCardProps {
  activeGoal: string;
  activeSubjects: string[];
  totalStudyMinutes: number;
  onLogSession: (params: {
    subject: string;
    topic: string;
    durationMinutes: number;
    studyGoal?: string;
  }) => void;
  onShowToast: (msg: string) => void;
}

const ActiveStopwatchCard: React.FC<ActiveStopwatchCardProps> = React.memo(
  ({
    activeGoal,
    activeSubjects,
    totalStudyMinutes,
    onLogSession,
    onShowToast,
  }) => {
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [timerRunning, setTimerRunning] = useState(false);
    const [timerSubject, setTimerSubject] = useState<string>(
      activeSubjects[0] || 'General'
    );
    const [timerTopic, setTimerTopic] = useState('');
    const [timerGoal, setTimerGoal] = useState('');

    useEffect(() => {
      if (activeSubjects.length > 0 && !activeSubjects.includes(timerSubject)) {
        setTimerSubject(activeSubjects[0]);
      }
    }, [activeSubjects, timerSubject]);

    useEffect(() => {
      if (!timerRunning) {
        if (typeof document !== 'undefined') {
          document.body.classList.remove('svh-inline-timer-active');
        }
        return;
      }
      if (typeof document !== 'undefined') {
        document.body.classList.add('svh-inline-timer-active');
      }
      const interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
      return () => {
        clearInterval(interval);
        if (typeof document !== 'undefined') {
          document.body.classList.remove('svh-inline-timer-active');
        }
      };
    }, [timerRunning]);

    const handleStartTimer = () => setTimerRunning(true);
    const handlePauseTimer = () => setTimerRunning(false);
    const handleResetTimer = () => {
      setTimerRunning(false);
      setTimerSeconds(0);
    };

    const handleLogStudySession = () => {
      if (timerSeconds < 60) {
        onShowToast(
          `Timer ran for ${timerSeconds}s. Complete at least 1 full minute (60s) of real study before logging!`
        );
        return;
      }

      const durationMin = Math.floor(timerSeconds / 60);
      const topicName = timerTopic.trim() || `${timerSubject} Focus`;

      onLogSession({
        subject: timerSubject,
        topic: topicName,
        durationMinutes: durationMin,
        studyGoal: timerGoal.trim() || undefined,
      });

      handleResetTimer();
      setTimerTopic('');
      setTimerGoal('');
    };

    const formatTimerDigits = (totalSecs: number) => {
      const hrs = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;
      if (hrs > 0) {
        return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
      }
      return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
      <section
        className={`svh-shimmer-border-card svh-focus-sharp-block ${
          timerRunning ? 'svh-focus-timer-running' : ''
        } p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0c1428] via-[#090f20] to-[#070b16] border border-[#d4af37]/35 shadow-xl space-y-5 overflow-hidden`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#d4af37] uppercase tracking-wider">
            <Clock className="w-4 h-4 shrink-0" />
            <span>Active Study Session Stopwatch</span>
          </div>
          <div className="text-xs text-[#9ca3af]">
            Total Verified Study Time:{' '}
            <RollingVPCounter
              value={totalStudyMinutes}
              suffix=" min"
              className="font-bold text-[#fbf9f4] tabular-nums"
            />
          </div>
        </div>

        {/* Digital Display Wrapped in Focus Breathing Glow Ring */}
        <div className="text-center py-3 flex flex-col items-center justify-center">
          <div
            className={`svh-focus-breathing-ring-stage ${
              timerRunning ? 'svh-focus-breathing-active' : ''
            }`}
          >
            <div
              aria-hidden="true"
              className="svh-focus-breathing-ring-halo"
            />
            <div
              aria-hidden="true"
              className="svh-focus-breathing-ring-border"
            />
            <div className="relative z-10 px-7 py-4 sm:px-9 sm:py-5 rounded-full">
              <div className="font-mono text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#fbf9f4] tracking-tight tabular-nums">
                {formatTimerDigits(timerSeconds)}
              </div>
            </div>
          </div>
          <span className="text-[11px] text-[#9ca3af] uppercase tracking-widest mt-2.5 block">
            {timerRunning
              ? `Studying ${timerSubject} — Deep Focus Breathing Active`
              : timerSeconds > 0
              ? 'Session paused'
              : 'Ready to begin study'}
          </span>
        </div>

        {/* Dynamic Subject, Topic & Session Goal */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="min-w-0">
            <label className="text-[#9ca3af] block mb-1 truncate">
              Subject ({activeGoal})
            </label>
            <div className="flex items-center gap-1.5 p-1 bg-[#090e1c] rounded-xl border border-[#d4af37]/20 overflow-x-auto no-scrollbar max-w-full">
              {activeSubjects.map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setTimerSubject(sub)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                    timerSubject === sub
                      ? 'bg-[#d4af37] text-[#080d1a] font-bold shadow-sm'
                      : 'text-[#cbd5e1] hover:text-[#fbf9f4]'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <label className="text-[#9ca3af] block mb-1">Chapter / Topic</label>
            <input
              type="text"
              value={timerTopic}
              onChange={(e) => setTimerTopic(e.target.value)}
              placeholder="Enter chapter or topic..."
              className="w-full px-3 py-2 rounded-xl bg-[#090e1c] border border-[#d4af37]/20 text-[#fbf9f4] text-xs placeholder-[#6b7280] focus:border-[#d4af37] focus:outline-none"
            />
          </div>

          <div className="min-w-0">
            <label className="text-[#9ca3af] block mb-1">
              Session Study Goal
            </label>
            <input
              type="text"
              value={timerGoal}
              onChange={(e) => setTimerGoal(e.target.value)}
              placeholder="What is your goal for this session?"
              className="w-full px-3 py-2 rounded-xl bg-[#090e1c] border border-[#d4af37]/20 text-[#fbf9f4] text-xs placeholder-[#6b7280] focus:border-[#d4af37] focus:outline-none"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {!timerRunning ? (
            <button
              onClick={handleStartTimer}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#e5c158] to-[#aa7c11] text-[#080d1a] font-bold text-xs sm:text-sm hover:brightness-110 flex items-center gap-2 shadow-lg shadow-[#d4af37]/20 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current shrink-0" />
              <span>
                {timerSeconds === 0 ? 'Start Study Session' : 'Resume Timer'}
              </span>
            </button>
          ) : (
            <button
              onClick={handlePauseTimer}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#080d1a] font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <Pause className="w-4 h-4 fill-current shrink-0" />
              <span>Pause Timer</span>
            </button>
          )}

          <button
            onClick={handleLogStudySession}
            disabled={timerSeconds === 0}
            className="px-5 py-2.5 rounded-xl bg-[#131b2e] border border-[#d4af37]/30 text-[#fbf9f4] hover:text-[#d4af37] hover:border-[#d4af37] disabled:opacity-40 disabled:pointer-events-none font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Log Real Time to Tracker</span>
          </button>

          {timerSeconds > 0 && (
            <button
              onClick={handleResetTimer}
              className="px-3.5 py-2.5 rounded-xl bg-[#131b2e] border border-[#273557] text-[#9ca3af] hover:text-[#fbf9f4] text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </section>
    );
  }
);

export const TrackerSection: React.FC<TrackerSectionProps> = React.memo(({
  activeGoal,
  activeSubjects,
  userStats,
  onUpdateStats,
  onNavigateToPractice,
  onOpenFocusMode,
}) => {
  const [logToast, setLogToast] = useState<string | null>(null);

  // Smart Daily Planner New Task State
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState('');
  const [newTaskChapter, setNewTaskChapter] = useState('');
  const [newTaskMinutes, setNewTaskMinutes] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');

  // AI Smart Revision Plan & AI Study Planner state
  const [aiPlanDailyHours, setAiPlanDailyHours] = useState<number>(3);
  const [aiPlanDaysCount, setAiPlanDaysCount] = useState<number>(5);
  const [aiPlanFocusInput, setAiPlanFocusInput] = useState<string>('');
  const [isGeneratingAIPlan, setIsGeneratingAIPlan] = useState<boolean>(false);
  const [aiPlanError, setAiPlanError] = useState<string | null>(null);

  const handleGenerateAISmartPlan = async () => {
    if (isGeneratingAIPlan) return;
    setIsGeneratingAIPlan(true);
    setAiPlanError(null);

    try {
      let authToken = '';
      try {
        const raw = localStorage.getItem('study_vault_community_identity_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          authToken = parsed?.authToken || '';
        }
      } catch {
        // ignore
      }

      if (!authToken) {
        const sessRes = await apiFetch('/api/community/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName: userStats.name || 'Student' }),
        });
        if (sessRes.ok) {
          const sessData = await sessRes.json();
          authToken = sessData.authToken || '';
          if (sessData.userId && authToken) {
            localStorage.setItem(
              'study_vault_community_identity_v1',
              JSON.stringify({ userId: sessData.userId, authToken })
            );
          }
        }
      }

      const res = await apiFetch('/api/svh-ai/study-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          goal: activeGoal || 'CBSE Class 12',
          subjects:
            activeSubjects.length > 0
              ? activeSubjects
              : ['Physics', 'Chemistry', 'Mathematics'],
          dailyHours: aiPlanDailyHours,
          daysCount: aiPlanDaysCount,
          focusNotes:
            aiPlanFocusInput.trim() ||
            'High-weightage NCERT chapters, concept clarity, and exam-focused numerical/MCQ mastery',
          studentContext: {
            studentName: userStats.name,
            activeGoal,
            activeSubjects,
            totalStudyMinutes: userStats.totalStudyMinutes,
            questionsAttempted: userStats.questionsAttempted,
            correctAnswers: userStats.correctAnswers,
            completedChaptersCount: userStats.completedChapterIds?.length || 0,
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.error || 'Could not generate AI Smart Revision Plan right now.'
        );
      }

      const data = await res.json();
      const generatedPlan: AISmartRevisionPlan = data.plan;
      if (generatedPlan && Array.isArray(generatedPlan.blocks)) {
        onUpdateStats({
          aiSmartRevisionPlan: generatedPlan,
        });
        setLogToast(
          'AI Smart Revision Plan generated! You can sync any block or the entire schedule into your Daily Planner.'
        );
      }
    } catch (err) {
      setAiPlanError(
        err instanceof Error
          ? err.message
          : 'Failed to generate AI Smart Revision Plan.'
      );
    } finally {
      setIsGeneratingAIPlan(false);
    }
  };

  const handleToggleAIPlanBlock = (blockId: string) => {
    const currentPlan = userStats.aiSmartRevisionPlan;
    if (!currentPlan) return;
    let markedDone = false;
    const updatedBlocks = currentPlan.blocks.map((b) => {
      if (b.id === blockId) {
        markedDone = !b.completed;
        return { ...b, completed: !b.completed };
      }
      return b;
    });
    if (markedDone) {
      triggerConfettiCelebration({ reason: 'milestone' });
    }
    onUpdateStats({
      aiSmartRevisionPlan: {
        ...currentPlan,
        blocks: updatedBlocks,
      },
    });
  };

  const handleAddAIBlockToDailyTasks = (block: AISmartStudyBlock) => {
    const taskTitle = `[${block.dayOrPhase}] ${block.subject}: ${block.chapterOrTopic} (${block.activityType})`;
    const newTask: StudyTask = {
      id: `task_ai_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: taskTitle,
      completed: false,
      category: 'Study',
      subject: block.subject,
      chapter: block.chapterOrTopic,
      targetMinutes: block.durationMinutes,
      priority: block.priority,
    };
    onUpdateStats({
      tasks: [newTask, ...userStats.tasks],
    });
    setLogToast(`Added "${block.chapterOrTopic}" to your Smart Daily Planner!`);
  };

  const handleSyncAllAIBlocksToTasks = () => {
    const currentPlan = userStats.aiSmartRevisionPlan;
    if (!currentPlan || !currentPlan.blocks.length) return;
    const newTasks: StudyTask[] = currentPlan.blocks.map((block, idx) => ({
      id: `task_ai_all_${Date.now()}_${idx}`,
      text: `[${block.dayOrPhase}] ${block.subject}: ${block.chapterOrTopic} (${block.activityType})`,
      completed: Boolean(block.completed),
      category: 'Study',
      subject: block.subject,
      chapter: block.chapterOrTopic,
      targetMinutes: block.durationMinutes,
      priority: block.priority,
    }));
    onUpdateStats({
      tasks: [...newTasks, ...userStats.tasks],
    });
    setLogToast(
      `Synced all ${newTasks.length} AI Revision blocks into your Smart Daily Planner!`
    );
  };
  const [newTaskPriority, setNewTaskPriority] = useState<
    'High' | 'Medium' | 'Normal'
  >('Normal');
  const [showDetailedTaskFields, setShowDetailedTaskFields] = useState(false);

  // Daily goals editor state
  const [editingGoals, setEditingGoals] = useState(false);
  const [goalStudyMinutes, setGoalStudyMinutes] = useState(
    userStats.dailyGoals.studyMinutes
  );
  const [goalQuestions, setGoalQuestions] = useState(
    userStats.dailyGoals.questionCount
  );
  const [goalTasks, setGoalTasks] = useState(userStats.dailyGoals.taskCount);

  const showToastMessage = React.useCallback((msg: string) => {
    setLogToast(msg);
    setTimeout(() => setLogToast(null), 3400);
  }, []);

  const handleLogStopwatchSession = React.useCallback(
    ({
      subject,
      topic,
      durationMinutes,
      studyGoal,
    }: {
      subject: string;
      topic: string;
      durationMinutes: number;
      studyGoal?: string;
    }) => {
      const today = new Date().toISOString().split('T')[0];

      const newSession: StudySession = {
        id: `session-${Date.now()}`,
        subject,
        topic,
        durationMinutes,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        date: today,
        studyGoal,
      };

      const updatedTotalMin = userStats.totalStudyMinutes + durationMinutes;
      const currentSubjectMin = userStats.subjectsStudied[subject] || 0;
      const updatedSubjectsStudied = {
        ...userStats.subjectsStudied,
        [subject]: currentSubjectMin + durationMinutes,
      };

      const updatedTopics = userStats.topicsStudied.includes(topic)
        ? userStats.topicsStudied
        : [topic, ...userStats.topicsStudied];

      onUpdateStats({
        totalStudyMinutes: updatedTotalMin,
        subjectsStudied: updatedSubjectsStudied,
        topicsStudied: updatedTopics,
        studySessions: [newSession, ...userStats.studySessions],
        streak: {
          current: Math.max(1, userStats.streak?.current || 0),
          lastActiveDate: today,
        },
      });

      triggerConfettiCelebration({ reason: 'timer' });
      showToastMessage(
        `Logged ${durationMinutes} min of real study for ${subject} (${topic})!`
      );
    },
    [userStats, onUpdateStats, showToastMessage]
  );

  const handleToggleTask = (taskId: string) => {
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

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const newTask: StudyTask = {
      id: `task-${Date.now()}`,
      text: newTaskText.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
      subject: newTaskSubject.trim() || undefined,
      chapter: newTaskChapter.trim() || undefined,
      targetMinutes:
        newTaskMinutes.trim() && Number(newTaskMinutes) > 0
          ? Math.round(Number(newTaskMinutes))
          : undefined,
      deadline: newTaskDeadline.trim() || undefined,
      priority: newTaskPriority,
    };

    onUpdateStats({
      tasks: [newTask, ...userStats.tasks],
    });
    setNewTaskText('');
    setNewTaskChapter('');
    setNewTaskMinutes('');
    setNewTaskDeadline('');
    setNewTaskPriority('Normal');
  };

  const handleDeleteTask = (taskId: string) => {
    onUpdateStats({
      tasks: userStats.tasks.filter((t) => t.id !== taskId),
    });
  };

  const handleSaveGoals = () => {
    onUpdateStats({
      dailyGoals: {
        studyMinutes: Math.max(15, Number(goalStudyMinutes) || 120),
        questionCount: Math.max(5, Number(goalQuestions) || 20),
        taskCount: Math.max(1, Number(goalTasks) || 3),
      },
    });
    setEditingGoals(false);
  };

  // Progress calculations
  const completedTasksCount = userStats.tasks.filter((t) => t.completed).length;
  const studyMinutesProgress = Math.min(
    100,
    Math.round(
      (userStats.totalStudyMinutes / userStats.dailyGoals.studyMinutes) * 100
    )
  );
  const questionProgress = Math.min(
    100,
    Math.round(
      (userStats.questionsAttempted / userStats.dailyGoals.questionCount) * 100
    )
  );
  const taskProgress = Math.min(
    100,
    Math.round((completedTasksCount / userStats.dailyGoals.taskCount) * 100)
  );

  const studiedSubjectsEntries = Object.entries(
    userStats.subjectsStudied || {}
  ).filter(([, mins]) => mins > 0);

  return (
    <div className="space-y-6 pb-12 max-w-full overflow-x-hidden">
      {/* Title & Introduction */}
      <div className="svh-tracker-sibling-dimmable flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#d4af37]">
            <BarChart3 className="w-3.5 h-3.5 shrink-0" />
            <span className="uppercase tracking-widest font-mono text-[11px]">
              {activeGoal
                ? `${activeGoal} Study Tracker`
                : 'Personal Study Tracker'}
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#fbf9f4] tracking-tight">
            Daily Planner &amp; Focus Tracker
          </h1>
          <p className="text-xs sm:text-sm text-[#cbd5e1] max-w-2xl leading-relaxed">
            Record real study sessions, organize your personal study tasks and deadlines, and track verified progress.
          </p>
        </div>

        {onOpenFocusMode && (
          <button
            onClick={onOpenFocusMode}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:brightness-110 transition-all shrink-0 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current shrink-0" />
            <span>Open Full Focus Mode</span>
          </button>
        )}
      </div>

      {logToast && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between animate-in fade-in duration-150">
          <span>{logToast}</span>
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
        </div>
      )}

      {/* 1. Real-Time Study Timer Card (Isolated 1s tick state) */}
      <ActiveStopwatchCard
        activeGoal={activeGoal}
        activeSubjects={activeSubjects}
        totalStudyMinutes={userStats.totalStudyMinutes}
        onLogSession={handleLogStopwatchSession}
        onShowToast={showToastMessage}
      />

      {/* 2. Today's Targets & Goal Progress */}
      <section className="svh-tracker-sibling-dimmable space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#d4af37]" />
            <h2 className="font-display text-base font-bold text-[#fbf9f4] tracking-tight">
              Daily Targets &amp; Goal Progress
            </h2>
          </div>
          <button
            onClick={() => setEditingGoals(!editingGoals)}
            className="text-xs text-[#d4af37] hover:underline font-medium"
          >
            {editingGoals ? 'Close Goals' : 'Customize Targets'}
          </button>
        </div>

        <div className={`svh-accordion-grid ${editingGoals ? 'svh-accordion-open' : ''}`}>
          <div className="svh-accordion-inner">
            <div className="p-4 rounded-xl bg-[#0f172a] border border-[#d4af37]/30 space-y-3">
              <h3 className="text-xs font-semibold text-[#d4af37] uppercase tracking-wider">
                Set Personal Daily Milestones
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-[#9ca3af] block mb-1">
                    Study Goal (Minutes)
                  </label>
                  <input
                    type="number"
                    value={goalStudyMinutes}
                    onChange={(e) => setGoalStudyMinutes(Number(e.target.value))}
                    min={15}
                    step={15}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#131b2e] border border-[#273557] text-[#fbf9f4] focus:border-[#d4af37] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#9ca3af] block mb-1">
                    Question Goal (Count)
                  </label>
                  <input
                    type="number"
                    value={goalQuestions}
                    onChange={(e) => setGoalQuestions(Number(e.target.value))}
                    min={5}
                    step={5}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#131b2e] border border-[#273557] text-[#fbf9f4] focus:border-[#d4af37] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#9ca3af] block mb-1">
                    Task Goal (Count)
                  </label>
                  <input
                    type="number"
                    value={goalTasks}
                    onChange={(e) => setGoalTasks(Number(e.target.value))}
                    min={1}
                    step={1}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#131b2e] border border-[#273557] text-[#fbf9f4] focus:border-[#d4af37] focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setEditingGoals(false)}
                  className="px-3 py-1 text-xs text-[#9ca3af] hover:text-[#fbf9f4]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveGoals}
                  className="px-3.5 py-1 rounded-lg bg-[#d4af37] text-[#080d1a] font-semibold text-xs hover:brightness-110"
                >
                  Save Targets
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Study Goal */}
          <div className="svh-shimmer-border-card p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#9ca3af]">Study Time Target</span>
              <RollingVPCounter
                value={studyMinutesProgress}
                suffix="%"
                className="text-[#d4af37] font-semibold tabular-nums"
              />
            </div>
            <div className="flex items-baseline gap-1.5">
              <RollingVPCounter
                value={userStats.totalStudyMinutes}
                className="font-display text-2xl font-bold text-[#fbf9f4] tabular-nums"
              />
              <span className="text-xs text-[#9ca3af]">
                / {userStats.dailyGoals.studyMinutes} min
              </span>
            </div>
            <div className="w-full h-2 bg-[#131b2e] rounded-full overflow-hidden border border-[#d4af37]/20">
              <div
                className="svh-animated-progress-fill h-full bg-gradient-to-r from-[#d4af37] to-amber-300"
                style={{ width: `${studyMinutesProgress}%` }}
              />
            </div>
          </div>

          {/* Question Goal */}
          <div className="svh-shimmer-border-card p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#9ca3af]">Question Target</span>
              <RollingVPCounter
                value={questionProgress}
                suffix="%"
                className="text-emerald-400 font-semibold tabular-nums"
              />
            </div>
            <div className="flex items-baseline gap-1.5">
              <RollingVPCounter
                value={userStats.questionsAttempted}
                className="font-display text-2xl font-bold text-[#fbf9f4] tabular-nums"
              />
              <span className="text-xs text-[#9ca3af]">
                / {userStats.dailyGoals.questionCount} solved
              </span>
            </div>
            <div className="w-full h-2 bg-[#131b2e] rounded-full overflow-hidden border border-[#d4af37]/20">
              <div
                className="svh-animated-progress-fill h-full bg-gradient-to-r from-[#d4af37] to-emerald-400"
                style={{ width: `${questionProgress}%` }}
              />
            </div>
          </div>

          {/* Task Goal */}
          <div className="svh-shimmer-border-card p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#9ca3af]">Planner Task Target</span>
              <RollingVPCounter
                value={taskProgress}
                suffix="%"
                className="text-blue-400 font-semibold tabular-nums"
              />
            </div>
            <div className="flex items-baseline gap-1.5">
              <RollingVPCounter
                value={completedTasksCount}
                className="font-display text-2xl font-bold text-[#fbf9f4] tabular-nums"
              />
              <span className="text-xs text-[#9ca3af]">
                / {userStats.dailyGoals.taskCount} tasks
              </span>
            </div>
            <div className="w-full h-2 bg-[#131b2e] rounded-full overflow-hidden border border-[#d4af37]/20">
              <div
                className="svh-animated-progress-fill h-full bg-gradient-to-r from-[#d4af37] to-blue-400"
                style={{ width: `${taskProgress}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2.5 AI Smart Revision Plan & AI Study Planner */}
      <section className="svh-shimmer-border-card svh-tracker-sibling-dimmable p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0d162c] via-[#091122] to-[#060b16] border border-[#d4af37]/35 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#d4af37] uppercase tracking-wider">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>SVH AI Study Planner</span>
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#fbf9f4]">
              AI Smart Revision Plan
            </h2>
            <p className="text-xs text-[#cbd5e1]">
              Generate a personalized, day-by-day revision schedule powered by Google Gemini for{' '}
              <span className="text-[#d4af37] font-semibold">{activeGoal}</span> based on your real study progress.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerateAISmartPlan}
            disabled={isGeneratingAIPlan}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#e5c158] to-[#aa7c11] text-[#080d1a] font-bold text-xs sm:text-sm hover:brightness-110 flex items-center justify-center gap-2 shadow-lg shadow-[#d4af37]/20 transition-all shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isGeneratingAIPlan ? 'animate-spin' : ''}`} />
            <span>
              {isGeneratingAIPlan
                ? 'Generating Smart Plan...'
                : userStats.aiSmartRevisionPlan
                ? 'Regenerate AI Revision Plan'
                : 'Generate AI Revision Plan'}
            </span>
          </button>
        </div>

        {/* Customizer Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-[#080e1c] border border-[#1e293b] text-xs">
          <div>
            <label className="text-[11px] text-[#9ca3af] block mb-1">
              Daily Study Hours
            </label>
            <select
              value={aiPlanDailyHours}
              onChange={(e) => setAiPlanDailyHours(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-[#0f172a] border border-[#d4af37]/25 text-[#fbf9f4] focus:outline-none focus:border-[#d4af37]"
            >
              {[1, 2, 3, 4, 5, 6, 8, 10].map((h) => (
                <option key={h} value={h}>
                  {h} {h === 1 ? 'Hour / Day' : 'Hours / Day'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-[#9ca3af] block mb-1">
              Plan Horizon (Days)
            </label>
            <select
              value={aiPlanDaysCount}
              onChange={(e) => setAiPlanDaysCount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-[#0f172a] border border-[#d4af37]/25 text-[#fbf9f4] focus:outline-none focus:border-[#d4af37]"
            >
              {[3, 5, 7, 10, 14].map((d) => (
                <option key={d} value={d}>
                  {d}-Day Smart Sprint
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="text-[11px] text-[#9ca3af] block mb-1">
              Weak Chapters / Specific Exam Focus (Optional)
            </label>
            <input
              type="text"
              value={aiPlanFocusInput}
              onChange={(e) => setAiPlanFocusInput(e.target.value)}
              placeholder="e.g. Ray Optics, Organic Chemistry Reactions, Integration..."
              className="w-full px-3 py-2 rounded-xl bg-[#0f172a] border border-[#d4af37]/25 text-[#fbf9f4] placeholder-[#6b7280] focus:outline-none focus:border-[#d4af37]"
            />
          </div>
        </div>

        {aiPlanError && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs">
            {aiPlanError}
          </div>
        )}

        {isGeneratingAIPlan && (
          <GlassMetallicSkeleton variant="notes" count={2} />
        )}

        {/* Active AI Smart Revision Plan Display */}
        {userStats.aiSmartRevisionPlan &&
          Array.isArray(userStats.aiSmartRevisionPlan.blocks) &&
          userStats.aiSmartRevisionPlan.blocks.length > 0 && (
            <div className="space-y-3.5 pt-1">
              <div className="p-3.5 rounded-2xl bg-[#0f1930] border border-[#d4af37]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-bold text-sm sm:text-base text-[#fbf9f4]">
                      {userStats.aiSmartRevisionPlan.title}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30">
                      {userStats.aiSmartRevisionPlan.dailyTargetMinutes}m / day
                    </span>
                  </div>
                  <p className="text-xs text-[#cbd5e1]">
                    {userStats.aiSmartRevisionPlan.focusSummary}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSyncAllAIBlocksToTasks}
                  className="px-3.5 py-2 rounded-xl bg-[#131b2e] hover:bg-[#d4af37] text-[#d4af37] hover:text-[#080d1a] border border-[#d4af37]/40 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Sync All to Daily Planner</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {userStats.aiSmartRevisionPlan.blocks.map((block) => (
                  <div
                    key={block.id}
                    className={`svh-shimmer-border-card p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      block.completed
                        ? 'bg-[#091120]/60 border-emerald-500/35 text-[#9ca3af]'
                        : 'bg-[#0a1326] border-[#d4af37]/25 hover:border-[#d4af37]/50 text-[#fbf9f4]'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#131b2e] text-[#d4af37] border border-[#d4af37]/25">
                            {block.dayOrPhase}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#0f172a] text-[#cbd5e1]">
                            {block.subject}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              block.priority === 'High'
                                ? 'bg-amber-950/70 text-amber-300 border border-amber-500/30'
                                : 'bg-[#131b2e] text-[#9ca3af]'
                            }`}
                          >
                            {block.priority}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-[#d4af37]">
                          {block.durationMinutes} min
                        </span>
                      </div>

                      <div>
                        <h4
                          className={`font-display text-xs sm:text-sm font-bold ${
                            block.completed ? 'line-through text-[#6b7280]' : 'text-[#fbf9f4]'
                          }`}
                        >
                          {block.chapterOrTopic}
                        </h4>
                        <p className="text-[11px] text-[#d4af37] font-medium mt-0.5">
                          {block.activityType}
                        </p>
                      </div>

                      <p
                        tabIndex={0}
                        className="svh-ai-snippet-card text-[11px] text-[#cbd5e1] leading-relaxed bg-[#070c18] p-2.5 rounded-xl border border-[#1e293b]"
                      >
                        {block.keyTakeawayOrTip}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#1e293b] text-[11px]">
                      <button
                        type="button"
                        onClick={() => handleToggleAIPlanBlock(block.id)}
                        className={`flex items-center gap-1.5 font-semibold cursor-pointer ${
                          block.completed ? 'text-emerald-400' : 'text-[#cbd5e1] hover:text-[#d4af37]'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{block.completed ? 'Completed' : 'Mark Complete'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddAIBlockToDailyTasks(block)}
                        className="px-2.5 py-1 rounded-lg bg-[#131b2e] hover:bg-[#192540] border border-[#d4af37]/25 text-[#d4af37] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add to Tasks</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
      </section>

      {/* 3. Smart Daily Planner */}
      <section className="svh-tracker-sibling-dimmable space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#d4af37]" />
            <h2 className="font-display text-base font-bold text-[#fbf9f4] tracking-tight">
              Smart Daily Planner
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => setShowDetailedTaskFields(!showDetailedTaskFields)}
              className="text-[#d4af37] hover:underline font-medium"
            >
              {showDetailedTaskFields
                ? 'Simple Task Input'
                : '+ Subject, Chapter & Deadline'}
            </button>
            <span className="text-[#9ca3af]">
              {completedTasksCount} of {userStats.tasks.length} Completed
            </span>
          </div>
        </div>

        <form onSubmit={handleAddTask} className="space-y-2.5">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Create a study task (e.g. Solve 25 Electrostatics MCQs)..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0f172a] border border-[#d4af37]/25 text-xs sm:text-sm text-[#fbf9f4] placeholder-[#9ca3af] focus:border-[#d4af37] focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-[#131b2e] border border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37] hover:text-[#080d1a] font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Task</span>
            </button>
          </div>

          <div className={`svh-accordion-grid ${showDetailedTaskFields ? 'svh-accordion-open' : ''}`}>
            <div className="svh-accordion-inner">
              <div className="p-3.5 rounded-xl bg-[#0f172a] border border-[#d4af37]/25 grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                <div>
                  <label className="text-[11px] text-[#9ca3af] block mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={newTaskSubject}
                    onChange={(e) => setNewTaskSubject(e.target.value)}
                    placeholder="e.g. Physics"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#090e1c] border border-[#d4af37]/20 text-[#fbf9f4]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#9ca3af] block mb-1">
                    Chapter / Topic
                  </label>
                  <input
                    type="text"
                    value={newTaskChapter}
                    onChange={(e) => setNewTaskChapter(e.target.value)}
                    placeholder="e.g. Current Electricity"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#090e1c] border border-[#d4af37]/20 text-[#fbf9f4]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#9ca3af] block mb-1">
                    Target Time (min)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={600}
                    value={newTaskMinutes}
                    onChange={(e) => setNewTaskMinutes(e.target.value)}
                    placeholder="e.g. 45"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#090e1c] border border-[#d4af37]/20 text-[#fbf9f4]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="text-[11px] text-[#9ca3af] block mb-1">
                      Deadline
                    </label>
                    <input
                      type="date"
                      value={newTaskDeadline}
                      onChange={(e) => setNewTaskDeadline(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-[#090e1c] border border-[#d4af37]/20 text-[#fbf9f4]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#9ca3af] block mb-1">
                      Priority
                    </label>
                    <select
                      value={newTaskPriority}
                      onChange={(e) =>
                        setNewTaskPriority(
                          e.target.value as 'High' | 'Medium' | 'Normal'
                        )
                      }
                      className="w-full px-2 py-1.5 rounded-lg bg-[#090e1c] border border-[#d4af37]/20 text-[#fbf9f4]"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Normal">Normal</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>

        <div className="grid gap-2">
          {userStats.tasks.map((task) => (
            <div
              key={task.id}
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                task.completed
                  ? 'bg-[#0f172a]/60 border-emerald-500/30 text-[#9ca3af]'
                  : 'bg-[#0f172a] border-[#d4af37]/20 text-[#fbf9f4]'
              }`}
            >
              <button
                onClick={() => handleToggleTask(task.id)}
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
                  <span
                    className={`text-xs sm:text-sm block ${
                      task.completed ? 'line-through text-[#6b7280]' : ''
                    }`}
                  >
                    {task.text}
                  </span>
                  {(task.subject ||
                    task.chapter ||
                    task.targetMinutes ||
                    task.deadline ||
                    (task.priority && task.priority !== 'Normal')) && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      {task.priority && task.priority !== 'Normal' && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-500/30 font-mono font-bold">
                          {task.priority}
                        </span>
                      )}
                      {task.subject && (
                        <span className="px-2 py-0.5 rounded bg-[#131b2e] text-[#d4af37]">
                          {task.subject}
                        </span>
                      )}
                      {task.chapter && (
                        <span className="text-[#9ca3af]">· {task.chapter}</span>
                      )}
                      {task.targetMinutes && (
                        <span className="text-[#cbd5e1] font-mono">
                          · {task.targetMinutes}m
                        </span>
                      )}
                      {task.deadline && (
                        <span className="text-amber-300 font-mono">
                          · Due {task.deadline}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>

              <button
                onClick={() => handleDeleteTask(task.id)}
                aria-label="Delete Task"
                className="w-7 h-7 rounded-lg text-[#9ca3af] hover:text-rose-400 flex items-center justify-center transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {userStats.tasks.length === 0 && (
            <div className="p-6 rounded-2xl bg-[#0f172a] border border-[#d4af37]/20 text-center space-y-2">
              <p className="text-xs sm:text-sm font-semibold text-[#fbf9f4]">
                No study tasks created yet
              </p>
              <p className="text-xs text-[#9ca3af]">
                Create your first study task above to start planning your daily chapters and deadlines.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 4. Verified Focus Sessions & Subject Allocation */}
      <section className="svh-shimmer-border-card svh-tracker-sibling-dimmable p-4 sm:p-5 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm sm:text-base font-bold text-[#fbf9f4]">
            Logged Focus Time &amp; Subject Allocation
          </h3>
          {onOpenFocusMode && (
            <button
              onClick={onOpenFocusMode}
              className="text-xs text-[#d4af37] hover:underline font-medium"
            >
              + New Focus Session
            </button>
          )}
        </div>

        {studiedSubjectsEntries.length === 0 &&
        userStats.studySessions.length === 0 ? (
          <div className="p-5 rounded-xl bg-[#090e1c] border border-[#d4af37]/20 text-center space-y-2">
            <p className="text-xs sm:text-sm font-semibold text-[#fbf9f4]">
              No focus sessions recorded yet
            </p>
            <p className="text-xs text-[#9ca3af]">
              Start a focus session to record your real study time per subject and chapter.
            </p>
            {onOpenFocusMode && (
              <button
                onClick={onOpenFocusMode}
                className="mt-1 px-4 py-2 rounded-xl bg-[#131b2e] border border-[#d4af37]/30 text-xs font-bold text-[#d4af37] hover:bg-[#d4af37] hover:text-[#080d1a] transition-colors cursor-pointer"
              >
                Start your first focus session
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {studiedSubjectsEntries.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs text-center">
                {studiedSubjectsEntries.map(([sub, minutes]) => (
                  <div
                    key={sub}
                    className="svh-shimmer-border-card p-3 rounded-xl bg-[#131b2e] border border-[#d4af37]/20"
                  >
                    <span className="text-[#d4af37] font-semibold block truncate">
                      {sub}
                    </span>
                    <RollingVPCounter
                      value={minutes}
                      suffix=" min"
                      className="font-display text-lg font-bold text-[#fbf9f4] justify-center mt-0.5"
                    />
                  </div>
                ))}
              </div>
            )}

            {userStats.studySessions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider">
                  Recent Focus Sessions
                </h4>
                {userStats.studySessions.slice(0, 6).map((session) => (
                  <div
                    key={session.id}
                    className="p-3 rounded-xl bg-[#090e1c] border border-[#d4af37]/20 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#d4af37]">
                          {session.subject}
                        </span>
                        <span className="text-[#fbf9f4] font-medium">
                          {session.topic}
                        </span>
                      </div>
                      {session.studyGoal && (
                        <div className="text-[11px] text-[#9ca3af] mt-0.5">
                          Goal: {session.studyGoal}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-emerald-400 block">
                        +{session.durationMinutes} min
                      </span>
                      <span className="text-[10px] text-[#9ca3af]">
                        {session.timestamp}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 5. Practice History Log */}
      <section className="svh-tracker-sibling-dimmable space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-display text-base font-bold text-[#fbf9f4] tracking-tight">
            Practice &amp; Test History
          </h2>
          <button
            onClick={onNavigateToPractice}
            className="text-xs text-[#d4af37] hover:underline font-medium"
          >
            Start Practice →
          </button>
        </div>

        {userStats.practiceHistory.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#0f172a] border border-[#d4af37]/20 text-center space-y-2">
            <TrendingUp className="w-8 h-8 text-[#9ca3af] mx-auto opacity-50" />
            <p className="text-xs sm:text-sm font-semibold text-[#fbf9f4]">
              No practice sessions completed yet
            </p>
            <p className="text-[11px] text-[#9ca3af]">
              Complete practice questions or timed sprints in the Practice section to build your verified accuracy record.
            </p>
            <button
              onClick={onNavigateToPractice}
              className="mt-1 px-4 py-2 rounded-xl bg-[#131b2e] border border-[#d4af37]/30 text-xs font-bold text-[#d4af37] hover:bg-[#d4af37] hover:text-[#080d1a] transition-colors cursor-pointer"
            >
              Start practicing to build your progress
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {userStats.practiceHistory.slice(0, 5).map((entry) => (
              <div
                key={entry.id}
                className="svh-shimmer-border-card svh-3d-tilt-card p-3 rounded-xl bg-[#0f172a] border border-[#d4af37]/20 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-1.5 text-[#9ca3af]">
                    <span className="text-[#d4af37] font-semibold">
                      {entry.subject}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{entry.mode}</span>
                    <span aria-hidden="true">·</span>
                    <span>{entry.date}</span>
                  </div>
                  <div className="text-[#cbd5e1] font-medium mt-0.5">
                    <RollingVPCounter
                      value={entry.totalQuestions}
                      suffix=" Questions Attempted"
                    />
                  </div>
                </div>

                <div className="text-right">
                  <RollingVPCounter
                    value={entry.accuracy}
                    suffix="% Accuracy"
                    className="font-bold text-emerald-400 block tabular-nums"
                  />
                  <span className="text-[11px] text-[#9ca3af]">
                    +{entry.correctCount} / -{entry.wrongCount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
});
