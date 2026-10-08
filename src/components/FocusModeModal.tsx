import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Play,
  Pause,
  Square,
  RotateCcw,
  X,
  Target,
  BookOpen,
  CheckCircle2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { StudySession, StudyTask } from '../types';
import { SAMPLE_BOOKS } from '../data/sampleData';
import { NCERT_BOOKS_COLLECTION } from '../data/ncertBooksData';

interface FocusModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeGoal: string;
  activeSubjects: string[];
  pendingTasks: StudyTask[];
  onSaveRealSession: (
    session: StudySession,
    completedTaskId?: string
  ) => void;
}

const PRESET_DURATIONS = [25, 45, 60, 90];

export const FocusModeModal: React.FC<FocusModeModalProps> = ({
  isOpen,
  onClose,
  activeGoal,
  activeSubjects,
  pendingTasks,
  onSaveRealSession,
}) => {
  const subjectChoices = useMemo(() => {
    const list = [...activeSubjects, 'Physics', 'Chemistry', 'Biology', 'Mathematics', 'General'];
    return Array.from(new Set(list.filter(Boolean)));
  }, [activeSubjects]);

  const [selectedSubject, setSelectedSubject] = useState<string>(
    subjectChoices[0] || 'General'
  );
  const [customSubject, setCustomSubject] = useState<string>('');
  const [chapterOrTopic, setChapterOrTopic] = useState<string>('');
  const [studyGoalText, setStudyGoalText] = useState<string>('');
  const [linkedTaskId, setLinkedTaskId] = useState<string>('');
  const [markLinkedTaskDone, setMarkLinkedTaskDone] = useState<boolean>(false);

  // Duration configuration: countdown minutes vs open stopwatch
  const [mode, setMode] = useState<'countdown' | 'stopwatch'>('countdown');
  const [targetMinutes, setTargetMinutes] = useState<number>(25);
  const [customMinutesInput, setCustomMinutesInput] = useState<string>('');

  // Real active session state (starts only when user explicitly clicks Start)
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [isSavingSession, setIsSavingSession] = useState<boolean>(false);

  useEffect(() => {
    if (activeSubjects.length > 0 && !subjectChoices.includes(selectedSubject)) {
      setSelectedSubject(activeSubjects[0]);
    }
  }, [activeSubjects, subjectChoices, selectedSubject]);

  // Real-time 1-second tick ONLY when session is actively running AND app tab/window is visible
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isRunning) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isRunning, onClose]);

  // Suggest real chapter names from library for the selected subject
  const suggestedChapters = useMemo(() => {
    const effectiveSub = (customSubject.trim() || selectedSubject).toLowerCase();
    const chapters: string[] = [];
    for (const b of SAMPLE_BOOKS) {
      if (b.subject.toLowerCase().includes(effectiveSub)) {
        for (const ch of b.chapters) {
          chapters.push(ch.title);
        }
      }
    }
    for (const nb of NCERT_BOOKS_COLLECTION) {
      if (nb.subject.toLowerCase().includes(effectiveSub)) {
        for (const ch of nb.chapters.slice(0, 6)) {
          chapters.push(ch.title);
        }
      }
    }
    return Array.from(new Set(chapters)).slice(0, 8);
  }, [selectedSubject, customSubject]);

  if (!isOpen) return null;

  const effectiveTargetMinutes =
    customMinutesInput.trim() && Number(customMinutesInput) > 0
      ? Math.min(360, Math.max(1, Math.round(Number(customMinutesInput))))
      : targetMinutes;

  const totalTargetSeconds = effectiveTargetMinutes * 60;
  const remainingSeconds =
    mode === 'countdown'
      ? Math.max(0, totalTargetSeconds - elapsedSeconds)
      : elapsedSeconds;

  const progressPercent =
    mode === 'countdown' && totalTargetSeconds > 0
      ? Math.min(100, Math.round((elapsedSeconds / totalTargetSeconds) * 100))
      : 0;

  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const realElapsedMinutes = Math.floor(elapsedSeconds / 60);

  const handleStartSession = () => {
    const finalSubject = customSubject.trim() || selectedSubject;
    if (!finalSubject) {
      setStatusNotice('Please select or enter a subject before starting.');
      return;
    }
    setStatusNotice(null);
    setHasStarted(true);
    setIsRunning(true);
  };

  const handlePauseSession = () => {
    setIsRunning(false);
  };

  const handleResumeSession = () => {
    setIsRunning(true);
  };

  const handleResetSession = () => {
    setIsRunning(false);
    setHasStarted(false);
    setElapsedSeconds(0);
    setStatusNotice(null);
  };

  const handleEndAndSaveSession = () => {
    if (isSavingSession) return;
    setIsRunning(false);
    if (elapsedSeconds < 60) {
      setStatusNotice(
        `You have studied for ${elapsedSeconds} seconds. Complete at least 1 full minute (60s) of real focus time to log this session to your records.`
      );
      return;
    }

    setIsSavingSession(true);
    const finalSubject = (customSubject.trim() || selectedSubject || 'General').trim();
    const finalTopic =
      chapterOrTopic.trim() ||
      studyGoalText.trim() ||
      `${finalSubject} Focus Session`;

    const newSession: StudySession = {
      id: `focus-${Date.now()}`,
      subject: finalSubject,
      topic: finalTopic,
      durationMinutes: realElapsedMinutes,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      date: new Date().toISOString().split('T')[0],
      studyGoal: studyGoalText.trim() || undefined,
      targetDurationMinutes: mode === 'countdown' ? effectiveTargetMinutes : undefined,
    };

    onSaveRealSession(
      newSession,
      markLinkedTaskDone && linkedTaskId ? linkedTaskId : undefined
    );

    // Reset state & close
    setHasStarted(false);
    setElapsedSeconds(0);
    setStatusNotice(null);
    setIsSavingSession(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-5 overflow-y-auto overscroll-contain">
      <div className="w-full max-w-2xl max-h-[94vh] max-h-[94dvh] rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#0b1326] via-[#091020] to-[#060b18] border-2 border-[#d4af37]/45 shadow-2xl overflow-hidden my-auto flex flex-col">
        {/* Top Bar */}
        <div className="px-5 py-4 bg-[#0d172c] border-b border-[#d4af37]/25 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#131b2e] border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-[#fbf9f4]">
                Premium Study Focus Mode
              </h2>
              <p className="text-[11px] text-[#cbd5e1]">
                100% real-time session recording — only actual elapsed focus time is saved
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (isRunning) setIsRunning(false);
              onClose();
            }}
            className="w-8 h-8 rounded-lg bg-[#131b2e] text-[#cbd5e1] hover:text-white flex items-center justify-center"
            title="Close Focus Mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 max-h-[85vh] overflow-y-auto">
          {statusNotice && (
            <div className="p-3.5 rounded-xl bg-amber-950/70 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{statusNotice}</span>
            </div>
          )}

          {/* Setup Controls (Editable before starting or while paused) */}
          {!hasStarted ? (
            <div className="space-y-4">
              {/* 1. Subject Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#d4af37] uppercase tracking-wider block">
                  1. Choose Subject
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {subjectChoices.map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => {
                        setSelectedSubject(sub);
                        setCustomSubject('');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        selectedSubject === sub && !customSubject.trim()
                          ? 'bg-[#d4af37] text-[#080d1a] border-[#d4af37] shadow-sm font-bold'
                          : 'bg-[#0f172a] text-[#cbd5e1] border-[#d4af37]/25 hover:border-[#d4af37]/60'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="Or type a custom subject name..."
                  className="w-full mt-1.5 px-3.5 py-2 rounded-xl bg-[#090e1c] border border-[#d4af37]/25 text-xs text-[#fbf9f4] placeholder-[#9ca3af] focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              {/* 2. Chapter / Topic */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#d4af37] uppercase tracking-wider block">
                  2. Chapter or Topic
                </label>
                <input
                  type="text"
                  value={chapterOrTopic}
                  onChange={(e) => setChapterOrTopic(e.target.value)}
                  placeholder="Enter the exact chapter, unit, or concept you are studying..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#090e1c] border border-[#d4af37]/25 text-xs sm:text-sm text-[#fbf9f4] placeholder-[#9ca3af] focus:outline-none focus:border-[#d4af37]"
                />
                {suggestedChapters.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                    <span className="text-[10px] text-[#9ca3af] shrink-0">Chapters:</span>
                    {suggestedChapters.map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setChapterOrTopic(ch)}
                        className="px-2 py-0.5 rounded-md bg-[#131b2e] border border-[#d4af37]/20 text-[10px] text-[#cbd5e1] hover:text-[#d4af37] whitespace-nowrap"
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Session Duration & Timer Mode */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#d4af37] uppercase tracking-wider">
                    3. Session Duration &amp; Mode
                  </label>
                  <div className="flex items-center gap-1 bg-[#090e1c] p-1 rounded-lg border border-[#d4af37]/20 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setMode('countdown')}
                      className={`px-2.5 py-1 rounded-md font-semibold ${
                        mode === 'countdown'
                          ? 'bg-[#d4af37] text-[#080d1a]'
                          : 'text-[#cbd5e1]'
                      }`}
                    >
                      Target Countdown
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('stopwatch')}
                      className={`px-2.5 py-1 rounded-md font-semibold ${
                        mode === 'stopwatch'
                          ? 'bg-[#d4af37] text-[#080d1a]'
                          : 'text-[#cbd5e1]'
                      }`}
                    >
                      Open Stopwatch
                    </button>
                  </div>
                </div>

                {mode === 'countdown' && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {PRESET_DURATIONS.map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => {
                          setTargetMinutes(mins);
                          setCustomMinutesInput('');
                        }}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          targetMinutes === mins && !customMinutesInput.trim()
                            ? 'bg-[#d4af37] text-[#080d1a] border-[#d4af37]'
                            : 'bg-[#0f172a] text-[#fbf9f4] border-[#d4af37]/25 hover:border-[#d4af37]/60'
                        }`}
                      >
                        {mins} min
                      </button>
                    ))}
                    <input
                      type="number"
                      min={1}
                      max={360}
                      value={customMinutesInput}
                      onChange={(e) => setCustomMinutesInput(e.target.value)}
                      placeholder="Custom (m)"
                      className="py-2 px-3 rounded-xl bg-[#090e1c] border border-[#d4af37]/30 text-xs text-[#fbf9f4] placeholder-[#9ca3af] focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                )}
              </div>

              {/* 4. Session Study Goal & Optional Planner Task Link */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#d4af37] uppercase tracking-wider block">
                  4. Session Study Goal (Optional)
                </label>
                <input
                  type="text"
                  value={studyGoalText}
                  onChange={(e) => setStudyGoalText(e.target.value)}
                  placeholder="What is your target outcome for this session? (e.g. Finish 15 numericals)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#090e1c] border border-[#d4af37]/25 text-xs sm:text-sm text-[#fbf9f4] placeholder-[#9ca3af] focus:outline-none focus:border-[#d4af37]"
                />

                {pendingTasks.length > 0 && (
                  <div className="pt-1">
                    <label className="text-[11px] text-[#9ca3af] block mb-1">
                      Or link one of your pending Daily Planner tasks:
                    </label>
                    <select
                      value={linkedTaskId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setLinkedTaskId(id);
                        const found = pendingTasks.find((t) => t.id === id);
                        if (found) {
                          if (!studyGoalText.trim()) setStudyGoalText(found.text);
                          if (found.subject) setSelectedSubject(found.subject);
                          if (found.chapter && !chapterOrTopic.trim()) setChapterOrTopic(found.chapter);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-[#090e1c] border border-[#d4af37]/25 text-xs text-[#fbf9f4]"
                    >
                      <option value="">-- None selected --</option>
                      {pendingTasks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.text} {t.subject ? `(${t.subject})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Active Session Metadata Summary */
            <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/30 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-[#d4af37]/20 text-[#d4af37] text-xs font-bold">
                    {customSubject.trim() || selectedSubject}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-[#fbf9f4]">
                    {chapterOrTopic.trim() || 'Focused Study Session'}
                  </span>
                </div>
                {studyGoalText.trim() && (
                  <p className="text-xs text-[#cbd5e1]">
                    Goal: <span className="text-[#d4af37]">{studyGoalText}</span>
                  </p>
                )}
              </div>

              <div className="text-right text-xs text-[#9ca3af]">
                <span>Real Elapsed Time: </span>
                <strong className="text-emerald-400 font-mono">
                  {realElapsedMinutes} min ({elapsedSeconds}s)
                </strong>
              </div>
            </div>
          )}

          {/* Central Timer Display */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#080e1d] border border-[#d4af37]/30 text-center space-y-4">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#d4af37]">
                {!hasStarted
                  ? mode === 'countdown'
                    ? `Target Session: ${effectiveTargetMinutes} Minutes`
                    : 'Open Stopwatch Mode'
                  : isRunning
                  ? 'Focus Session in Progress — Recording Real Time'
                  : 'Focus Session Paused'}
              </span>
              <div className="font-mono text-5xl sm:text-6xl font-extrabold text-[#fbf9f4] tracking-tight tabular-nums py-1">
                {formatTime(remainingSeconds)}
              </div>
              {hasStarted && mode === 'countdown' && (
                <div className="max-w-md mx-auto space-y-1 pt-2">
                  <div className="w-full h-2 bg-[#131b2e] rounded-full overflow-hidden border border-[#d4af37]/20">
                    <div
                      className="h-full bg-gradient-to-r from-[#d4af37] to-emerald-400 transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-[#9ca3af]">
                    <span>Elapsed: {formatTime(elapsedSeconds)}</span>
                    <span>{progressPercent}% of target</span>
                  </div>
                </div>
              )}
            </div>

            {hasStarted && linkedTaskId && (
              <label className="inline-flex items-center gap-2 text-xs text-[#cbd5e1] cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={markLinkedTaskDone}
                  onChange={(e) => setMarkLinkedTaskDone(e.target.checked)}
                  className="rounded border-[#d4af37]"
                />
                <span>Mark linked Daily Planner task as completed when saving</span>
              </label>
            )}

            {/* Session Controls */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {!hasStarted ? (
                <button
                  type="button"
                  onClick={handleStartSession}
                  className="px-7 py-3 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#e5c158] to-[#aa7c11] text-[#080d1a] font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-[#d4af37]/25 hover:brightness-110 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Focus Session</span>
                </button>
              ) : (
                <>
                  {isRunning ? (
                    <button
                      type="button"
                      onClick={handlePauseSession}
                      className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#080d1a] font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Pause</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResumeSession}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-xs sm:text-sm flex items-center gap-2 hover:brightness-110 transition-all cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Resume</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleEndAndSaveSession}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>End &amp; Save Real Time ({realElapsedMinutes}m)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetSession}
                    className="px-4 py-2.5 rounded-xl bg-[#131b2e] border border-[#d4af37]/25 text-xs text-[#9ca3af] hover:text-[#fbf9f4] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Discard / Reset</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
