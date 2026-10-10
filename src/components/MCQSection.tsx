import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  Award,
  AlertTriangle,
  Lightbulb,
  Check,
  X,
  Flag,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Bookmark,
  Layers,
  Filter,
  Play,
  Loader2
} from 'lucide-react';
import { MCQQuestion, PracticeHistoryEntry, SyllabusChapter } from '../types';
import { SAMPLE_MCQS } from '../data/sampleData';
import {
  EXAM_HIERARCHIES,
  COMPLETE_SYLLABUS_CHAPTERS,
  getClassesForExam,
  getSubjectsForExamAndClass,
  getChaptersForSubjectAndClass
} from '../data/syllabusData';
import {
  generateDynamicQuestions,
  validateAndSanitizeQuestions,
} from '../data/questionGenerator';
import { apiFetch } from '../services/nativeApiBridge';
import { RollingVPCounter } from './RollingVPCounter';
import { triggerConfettiCelebration } from './ConfettiCelebration';

interface MCQSectionProps {
  activeGoal: string;
  activeSubjects: string[];
  initialSubject?: string;
  initialChapter?: string;
  initialClassLevel?: string;
  isBookmarked: (id: string) => boolean;
  onToggleBookmark: (id: string) => void;
  onRecordResult?: (isCorrect: boolean, question: MCQQuestion, chapterId?: string) => void;
  onRecordTestCompleted?: (historyEntry: PracticeHistoryEntry) => void;
}

export const MCQSection: React.FC<MCQSectionProps> = React.memo(({
  activeGoal,
  activeSubjects,
  initialSubject = 'All',
  initialChapter,
  initialClassLevel,
  isBookmarked,
  onToggleBookmark,
  onRecordResult,
  onRecordTestCompleted
}) => {
  // Mode: Practice (instant feedback) vs Test (timed exam sprint)
  const [mode, setMode] = useState<'practice' | 'test'>('practice');

  // Multi-tier Syllabus Hierarchy Selector
  const [selectedExam, setSelectedExam] = useState<string>(activeGoal || 'NEET');
  const availableClasses = useMemo(() => getClassesForExam(selectedExam), [selectedExam]);
  const [selectedClass, setSelectedClass] = useState<string>(initialClassLevel || availableClasses[0] || 'Class 12');

  // Update selectedClass if availableClasses changes
  useEffect(() => {
    if (!availableClasses.includes(selectedClass)) {
      setSelectedClass(availableClasses[0] || 'Class 12');
    }
  }, [availableClasses, selectedClass]);

  const availableSubjects = useMemo(() => {
    return getSubjectsForExamAndClass(selectedExam, selectedClass);
  }, [selectedExam, selectedClass]);

  const [selectedSubject, setSelectedSubject] = useState<string>(() => {
    if (initialSubject && initialSubject !== 'All') return initialSubject;
    return availableSubjects[0] || 'Physics';
  });

  // Keep subject in sync if not available in new class/exam
  useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.includes(selectedSubject)) {
      setSelectedSubject(availableSubjects[0]);
    }
  }, [availableSubjects, selectedSubject]);

  const availableChapters = useMemo(() => {
    return getChaptersForSubjectAndClass(selectedSubject, selectedClass);
  }, [selectedSubject, selectedClass]);

  const [selectedChapterId, setSelectedChapterId] = useState<string>(() => {
    if (initialChapter) {
      const match = availableChapters.find((c) => c.name.toLowerCase().includes(initialChapter.toLowerCase()));
      if (match) return match.id;
    }
    return availableChapters[0]?.id || '';
  });

  useEffect(() => {
    if (availableChapters.length > 0) {
      const exists = availableChapters.some((c) => c.id === selectedChapterId);
      if (!exists) {
        setSelectedChapterId(availableChapters[0].id);
      }
    }
  }, [availableChapters, selectedChapterId]);

  const activeChapterObj = useMemo(() => {
    return availableChapters.find((c) => c.id === selectedChapterId) || availableChapters[0];
  }, [availableChapters, selectedChapterId]);

  // Selected Topic in Chapter
  const [selectedTopicName, setSelectedTopicName] = useState<string>('All Topics');

  // Difficulty & Question Count
  const [selectedDifficulty, setSelectedDifficulty] = useState<'Easy' | 'Moderate' | 'Hard'>('Moderate');
  const [selectedCount, setSelectedCount] = useState<number>(10);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(true);

  // Active Questions Pool (Automatically aligned with selected Exam, Class, Subject, Chapter, Topic, Difficulty & Count)
  const [customGeneratedQuestions, setCustomGeneratedQuestions] = useState<MCQQuestion[] | null>(null);
  const [generationFeedback, setGenerationFeedback] = useState<string | null>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState<boolean>(false);

  // Clear custom AI override whenever the student switches hierarchy filters so questions immediately reflect the new selection
  useEffect(() => {
    setCustomGeneratedQuestions(null);
    setCurrentPracticeIndex(0);
    setShowHint(false);
  }, [selectedExam, selectedClass, selectedSubject, selectedChapterId, selectedTopicName, selectedDifficulty, selectedCount]);

  // Build current validated & de-duplicated questions array tailored to active filters
  const questions: MCQQuestion[] = useMemo(() => {
    if (customGeneratedQuestions && customGeneratedQuestions.length > 0) {
      const validatedCustom = validateAndSanitizeQuestions(customGeneratedQuestions);
      if (validatedCustom.length > 0) return validatedCustom;
    }

    const chapterName = activeChapterObj?.name || selectedSubject;
    const dynamicPool = generateDynamicQuestions({
      exam: selectedExam,
      classLevel: selectedClass,
      subject: selectedSubject,
      chapterName,
      topicName: selectedTopicName === 'All Topics' ? undefined : selectedTopicName,
      difficulty: selectedDifficulty,
      count: selectedCount,
    });

    if (dynamicPool.length > 0) {
      return dynamicPool;
    }

    // Final safety fallback to sample MCQs filtered by selectedSubject, strictly validated
    const validatedSamples = validateAndSanitizeQuestions(SAMPLE_MCQS);
    const subMatch = validatedSamples.filter((q) => q.subject.toLowerCase() === selectedSubject.toLowerCase());
    return subMatch.length > 0 ? subMatch : validatedSamples;
  }, [
    customGeneratedQuestions,
    activeChapterObj,
    selectedExam,
    selectedClass,
    selectedSubject,
    selectedTopicName,
    selectedDifficulty,
    selectedCount,
  ]);

  // Practice Mode State
  const [currentPracticeIndex, setCurrentPracticeIndex] = useState(0);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<string, number>>({});
  const [showHint, setShowHint] = useState(false);

  // Timed Test Mode State
  const [testActive, setTestActive] = useState(false);
  const [testTimeLeft, setTestTimeLeft] = useState(300); // 5 minutes default
  const [testAnswers, setTestAnswers] = useState<Record<string, number>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [testCompleted, setTestCompleted] = useState(false);
  const [testCurrentIndex, setTestCurrentIndex] = useState(0);

  const handleCompleteTest = React.useCallback(() => {
    setTestCompleted((prevCompleted) => {
      if (prevCompleted) return prevCompleted;
      let correctCount = 0;
      let wrongCount = 0;

      questions.forEach((q) => {
        const ans = testAnswers[q.id];
        if (ans !== undefined) {
          if (ans === q.correctIndex) {
            correctCount++;
          } else {
            wrongCount++;
          }
        }
      });

      const totalScore = correctCount * 4 - wrongCount * 1;
      const attempted = correctCount + wrongCount;
      const accuracy = attempted > 0 ? Math.round((correctCount / attempted) * 100) : 0;

      if (onRecordTestCompleted && attempted > 0) {
        const historyEntry: PracticeHistoryEntry = {
          id: `test-${Date.now()}`,
          date: new Date().toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          subject: selectedSubject,
          mode: 'Timed Test',
          totalQuestions: attempted,
          correctCount,
          wrongCount,
          score: totalScore,
          accuracy
        };
        onRecordTestCompleted(historyEntry);
      }
      triggerConfettiCelebration({ reason: 'test' });
      return true;
    });
  }, [questions, testAnswers, onRecordTestCompleted, selectedSubject]);

  // Timer effect for test mode (stable 1-second tick without re-creating interval every second)
  useEffect(() => {
    if (!testActive || testCompleted) return;
    const timer = setInterval(() => {
      setTestTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [testActive, testCompleted]);

  useEffect(() => {
    if (testActive && !testCompleted && testTimeLeft === 0) {
      handleCompleteTest();
    }
  }, [testActive, testCompleted, testTimeLeft, handleCompleteTest]);

  // Handle Dynamic & AI-Enhanced Question Generation
  const handleGenerateQuestions = useCallback(async () => {
    const chapterName = activeChapterObj?.name || selectedSubject;
    const topicParam = selectedTopicName === 'All Topics' ? undefined : selectedTopicName;

    // 1. Immediately build verified curriculum-aligned questions so the UI is instant
    const verifiedCurriculumPool = generateDynamicQuestions({
      exam: selectedExam,
      classLevel: selectedClass,
      subject: selectedSubject,
      chapterName,
      topicName: topicParam,
      difficulty: selectedDifficulty,
      count: selectedCount,
    });

    setCustomGeneratedQuestions(verifiedCurriculumPool);
    setCurrentPracticeIndex(0);
    setPracticeAnswers({});
    setShowHint(false);
    setTestAnswers({});
    setTestCompleted(false);
    setTestActive(false);

    // 2. Also attempt fresh AI synthesis via /api/mcq/generate and merge/validate
    setIsGeneratingQuiz(true);
    try {
      const response = await apiFetch('/api/mcq/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam: selectedExam,
          classLevel: selectedClass,
          subject: selectedSubject,
          chapterName,
          topicName: topicParam,
          difficulty: selectedDifficulty,
          count: selectedCount,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.questions)) {
          const validatedAi = validateAndSanitizeQuestions(data.questions as MCQQuestion[]);
          if (validatedAi.length > 0) {
            // Combine AI-generated questions with curriculum questions to reach exact requested count without duplicates
            const combined = validateAndSanitizeQuestions([...validatedAi, ...verifiedCurriculumPool]).slice(
              0,
              selectedCount
            );
            setCustomGeneratedQuestions(combined);
            setGenerationFeedback(
              `Generated ${combined.length} verified questions for ${chapterName} (${selectedDifficulty})`
            );
            setIsGeneratingQuiz(false);
            setTimeout(() => setGenerationFeedback(null), 4000);
            return;
          }
        }
      }
    } catch {
      // Fallback gracefully to verifiedCurriculumPool already set
    }

    setIsGeneratingQuiz(false);
    setGenerationFeedback(
      `Loaded ${verifiedCurriculumPool.length} verified questions for ${chapterName} (${selectedDifficulty})`
    );
    setTimeout(() => setGenerationFeedback(null), 4000);
  }, [
    activeChapterObj,
    selectedSubject,
    selectedTopicName,
    selectedExam,
    selectedClass,
    selectedDifficulty,
    selectedCount,
  ]);

  const activeQuestion = questions[currentPracticeIndex] || questions[0];

  // Practice handlers
  const handleSelectPracticeOption = (optionIndex: number) => {
    if (!activeQuestion) return;
    const isNew = practiceAnswers[activeQuestion.id] === undefined;
    setPracticeAnswers((prev) => ({
      ...prev,
      [activeQuestion.id]: optionIndex
    }));

    if (isNew && onRecordResult) {
      const isCorrect = optionIndex === activeQuestion.correctIndex;
      onRecordResult(isCorrect, activeQuestion, activeChapterObj?.id);
    }
  };

  const handleNextPractice = () => {
    setShowHint(false);
    setCurrentPracticeIndex((prev) => (prev + 1) % questions.length);
  };

  const handlePrevPractice = () => {
    setShowHint(false);
    setCurrentPracticeIndex((prev) => (prev - 1 + questions.length) % questions.length);
  };

  // Timed Test handlers
  const startTimedTest = () => {
    setTestAnswers({});
    setFlaggedQuestions({});
    setTestTimeLeft(Math.max(120, questions.length * 60)); // 60 seconds per question
    setTestCurrentIndex(0);
    setTestCompleted(false);
    setTestActive(true);
  };

  const handleSelectTestOption = (optionIndex: number) => {
    const q = questions[testCurrentIndex];
    if (!q || testCompleted) return;
    setTestAnswers((prev) => ({
      ...prev,
      [q.id]: optionIndex
    }));
  };

  // Sync incoming navigation props (e.g. from Notes "Quiz Subject" or NCERT "Practice Chapter")
  useEffect(() => {
    if (initialClassLevel && availableClasses.includes(initialClassLevel)) {
      setSelectedClass(initialClassLevel);
    }
  }, [initialClassLevel, availableClasses]);

  useEffect(() => {
    if (initialSubject && initialSubject !== 'All') {
      setSelectedSubject(initialSubject);
      setCustomGeneratedQuestions(null);
      setCurrentPracticeIndex(0);
    }
  }, [initialSubject]);

  useEffect(() => {
    if (initialChapter && availableChapters.length > 0) {
      const match = availableChapters.find((c) =>
        c.name.toLowerCase().includes(initialChapter.toLowerCase())
      );
      if (match) {
        setSelectedChapterId(match.id);
      }
    }
  }, [initialChapter, availableChapters]);

  const toggleFlagQuestion = (qId: string) => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  const calculateTestScore = () => {
    let correctCount = 0;
    let wrongCount = 0;
    let unattemptedCount = 0;

    questions.forEach((q) => {
      const ans = testAnswers[q.id];
      if (ans === undefined) {
        unattemptedCount++;
      } else if (ans === q.correctIndex) {
        correctCount++;
      } else {
        wrongCount++;
      }
    });

    const totalScore = correctCount * 4 - wrongCount * 1;
    const maxScore = questions.length * 4;
    const accuracy =
      correctCount + wrongCount > 0 ? Math.round((correctCount / (correctCount + wrongCount)) * 100) : 0;

    return { correctCount, wrongCount, unattemptedCount, totalScore, maxScore, accuracy };
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="space-y-6 pb-12 max-w-full overflow-x-hidden">
      {/* Title & Introduction */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#d4af37]">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span className="uppercase tracking-widest font-mono text-[11px]">
            {selectedExam} Syllabus Practice Engine
          </span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#fbf9f4] tracking-tight">
          Question Practice & AI Generator
        </h1>
        <p className="text-xs sm:text-sm text-[#cbd5e1] max-w-2xl leading-relaxed">
          Drill down by Exam, Class, Subject, Chapter, and Topic. Practice with instant explanations or simulate actual exam conditions.
        </p>
      </div>

      {generationFeedback && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>{generationFeedback}</span>
          </div>
          <button onClick={() => setGenerationFeedback(null)} className="text-emerald-400 font-bold ml-2">
            OK
          </button>
        </div>
      )}

      {/* Mode Switcher with Inertial Smooth Fluid Pill */}
      <div className="flex items-center justify-between gap-3 p-1.5 bg-[#090e1c] rounded-2xl border border-[#d4af37]/25 overflow-hidden">
        <div className="relative grid grid-cols-2 gap-1 w-full">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 right-0 z-0"
          >
            <div
              style={{
                width: '50%',
                transform: `translate3d(${mode === 'practice' ? 0 : 100}%, 0, 0)`,
              }}
              className="svh-inertial-fluid-slider h-full pr-0.5"
            >
              <span className="svh-inertial-fluid-pill-solid block w-full h-full rounded-xl bg-[#d4af37] shadow-sm" />
            </div>
          </div>

          <button
            onClick={() => {
              window.requestAnimationFrame(() => {
                setMode('practice');
                setTestActive(false);
              });
            }}
            className={`relative z-10 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'practice'
                ? 'text-[#080d1a] font-bold'
                : 'text-[#cbd5e1] hover:text-[#fbf9f4]'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Practice Mode (Instant Feedback)</span>
          </button>
          <button
            onClick={() => {
              window.requestAnimationFrame(() => {
                setMode('test');
              });
            }}
            className={`relative z-10 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'test'
                ? 'text-[#080d1a] font-bold'
                : 'text-[#cbd5e1] hover:text-[#fbf9f4]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Timed Test Mode (Exam Sprint)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SYLLABUS DRILL-DOWN SELECTOR PANEL (Exam -> Class -> Subject -> Chapter -> Topic) */}
      {/* ========================================================================= */}
      {!testActive && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0f172a] border border-[#d4af37]/30 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#fbf9f4]">
              <Filter className="w-4 h-4 text-[#d4af37]" />
              <span>Syllabus Hierarchy Filter & AI Generator</span>
            </div>
            <button
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className="text-xs text-[#d4af37] hover:underline font-mono"
            >
              {isFilterPanelOpen ? 'Collapse Filter' : 'Expand Filter'}
            </button>
          </div>

          <div className={`svh-accordion-grid ${isFilterPanelOpen ? 'svh-accordion-open' : ''}`}>
            <div className="svh-accordion-inner">
              <div className="space-y-3.5 pt-1">
                {/* Row 1: Exam / Board and Class Level */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#d4af37] uppercase tracking-wider block">
                      1. Target Exam / Board
                    </label>
                    <select
                      value={selectedExam}
                      onChange={(e) => {
                        setSelectedExam(e.target.value);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-[#090e1c] border border-[#d4af37]/25 text-xs sm:text-sm text-[#fbf9f4] focus:outline-none focus:border-[#d4af37]"
                    >
                      {EXAM_HIERARCHIES.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#d4af37] uppercase tracking-wider block">
                      2. Class / Standard
                    </label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#090e1c] border border-[#d4af37]/25 text-xs sm:text-sm text-[#fbf9f4] focus:outline-none focus:border-[#d4af37]"
                    >
                      {availableClasses.map((cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Subject and Chapter */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#d4af37] uppercase tracking-wider block">
                      3. Subject
                    </label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#090e1c] border border-[#d4af37]/25 text-xs sm:text-sm text-[#fbf9f4] focus:outline-none focus:border-[#d4af37]"
                    >
                      {availableSubjects.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#d4af37] uppercase tracking-wider block">
                      4. Chapter ({availableChapters.length} available)
                    </label>
                    <select
                      value={selectedChapterId}
                      onChange={(e) => {
                        setSelectedChapterId(e.target.value);
                        setSelectedTopicName('All Topics');
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-[#090e1c] border border-[#d4af37]/25 text-xs sm:text-sm text-[#fbf9f4] focus:outline-none focus:border-[#d4af37]"
                    >
                      {availableChapters.map((chap) => (
                        <option key={chap.id} value={chap.id}>
                          {chap.number}. {chap.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 3: Topic in Chapter */}
                {activeChapterObj && activeChapterObj.topics.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#d4af37] uppercase tracking-wider block">
                      5. Topic Focus
                    </label>
                    <select
                      value={selectedTopicName}
                      onChange={(e) => setSelectedTopicName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#090e1c] border border-[#d4af37]/25 text-xs sm:text-sm text-[#fbf9f4] focus:outline-none focus:border-[#d4af37]"
                    >
                      <option value="All Topics">All Topics in this Chapter</option>
                      {activeChapterObj.topics.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name} {t.highYield ? '⭐ (High Yield)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Row 4: Difficulty, Question Count & Generate Button */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#1e293b]">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[#9ca3af]">Difficulty:</span>
                      {(['Easy', 'Moderate', 'Hard'] as const).map((diff) => (
                        <button
                          key={diff}
                          onClick={() => setSelectedDifficulty(diff)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                            selectedDifficulty === diff
                              ? 'bg-[#d4af37] text-[#080d1a] border-[#d4af37]'
                              : 'bg-[#090e1c] text-[#cbd5e1] border-[#1e293b] hover:border-[#d4af37]/40'
                          }`}
                        >
                          {diff}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[#9ca3af]">Count:</span>
                      {[5, 10, 15, 20].map((num) => (
                        <button
                          key={num}
                          onClick={() => setSelectedCount(num)}
                          className={`px-2 py-1 rounded-lg text-xs font-mono font-semibold transition-all border ${
                            selectedCount === num
                              ? 'bg-[#d4af37] text-[#080d1a] border-[#d4af37]'
                              : 'bg-[#090e1c] text-[#cbd5e1] border-[#1e293b] hover:border-[#d4af37]/40'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateQuestions}
                    disabled={isGeneratingQuiz}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b88c1b] text-[#080d1a] hover:brightness-110 disabled:opacity-75 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all ml-auto"
                  >
                    {isGeneratingQuiz ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#080d1a]" />
                    ) : (
                      <Sparkles className="w-4 h-4 fill-[#080d1a]" />
                    )}
                    <span>{isGeneratingQuiz ? 'Synthesizing Chapter Quiz...' : 'Generate Custom Chapter Quiz'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MODE 1: PRACTICE MODE -------------------- */}
      {mode === 'practice' && activeQuestion && (
        <div className="space-y-4">
          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#0f172a] border border-[#d4af37]/30 shadow-xl space-y-5">
            {/* Top metadata */}
            <div className="flex items-center justify-between gap-2 text-xs border-b border-[#1f2c4c] pb-3 flex-wrap">
              <div className="flex items-center gap-2 text-[#9ca3af]">
                <span className="text-[#d4af37] font-semibold">{activeQuestion.subject}</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#fbf9f4] font-medium truncate max-w-[200px]">{activeQuestion.topic}</span>
                <span aria-hidden="true">·</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#131b2e] border border-[#d4af37]/20 text-amber-300">
                  {activeQuestion.difficulty}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleBookmark(activeQuestion.id)}
                  aria-label="Bookmark Question"
                  className="w-8 h-8 rounded-lg bg-[#131b2e] border border-[#d4af37]/25 text-[#9ca3af] hover:text-[#d4af37] flex items-center justify-center transition-colors"
                >
                  <Bookmark
                    className={`w-4 h-4 ${
                      isBookmarked(activeQuestion.id) ? 'fill-[#d4af37] text-[#d4af37]' : ''
                    }`}
                  />
                </button>
                <span className="text-xs text-[#cbd5e1] tabular-nums font-mono">
                  {currentPracticeIndex + 1} / {questions.length}
                </span>
              </div>
            </div>

            {/* Question Text */}
            <div className="space-y-2">
              <h2 className="text-sm sm:text-base md:text-lg font-medium text-[#fbf9f4] leading-relaxed">
                {activeQuestion.question}
              </h2>
            </div>

            {/* Options */}
            <div className="grid gap-2.5">
              {activeQuestion.options.map((opt, idx) => {
                const userSelected = practiceAnswers[activeQuestion.id] === idx;
                const hasAnswered = practiceAnswers[activeQuestion.id] !== undefined;
                const isCorrect = idx === activeQuestion.correctIndex;

                let optClass = 'bg-[#131b2e] border-[#d4af37]/20 text-[#cbd5e1] hover:border-[#d4af37]';

                if (hasAnswered) {
                  if (isCorrect) {
                    optClass = 'bg-emerald-950/70 border-emerald-500 text-emerald-200';
                  } else if (userSelected && !isCorrect) {
                    optClass = 'bg-rose-950/70 border-rose-500 text-rose-200';
                  } else {
                    optClass = 'bg-[#131b2e]/50 border-[#1f293d] text-[#6b7280] opacity-60';
                  }
                } else if (userSelected) {
                  optClass = 'bg-[#d4af37]/20 border-[#d4af37] text-[#fbf9f4]';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectPracticeOption(idx)}
                    disabled={hasAnswered}
                    className={`p-3.5 rounded-xl border text-left text-xs sm:text-sm font-medium transition-all flex items-start gap-3 ${optClass}`}
                  >
                    <span className="w-6 h-6 rounded-lg bg-[#090e1c] border border-[#d4af37]/25 text-[#d4af37] text-xs font-mono font-bold flex items-center justify-center shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="flex-1 mt-0.5 leading-relaxed">{opt}</span>
                    {hasAnswered && isCorrect && <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />}
                    {hasAnswered && userSelected && !isCorrect && (
                      <X className="w-4 h-4 text-rose-400 shrink-0 mt-1" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Hint & Solution Box */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="px-3 py-1.5 rounded-lg bg-[#131b2e] hover:bg-[#1a253f] border border-[#d4af37]/20 text-xs text-amber-300 flex items-center gap-1.5 transition-colors"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
                  <span>{showHint ? 'Hide Hint' : 'View Conceptual Hint'}</span>
                </button>

                {practiceAnswers[activeQuestion.id] !== undefined && (
                  <span className="text-xs font-mono text-[#d4af37] inline-flex items-center gap-2">
                    {practiceAnswers[activeQuestion.id] === activeQuestion.correctIndex ? (
                      <>
                        <span className="text-emerald-400 font-bold">Correct (+4 Marks)</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#d4af37] font-bold text-[10px]">
                          +4 VP
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-rose-400 font-bold">Incorrect (-1 Mark)</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#d4af37] font-bold text-[10px]">
                          +1 VP
                        </span>
                      </>
                    )}
                  </span>
                )}
              </div>

              {showHint && activeQuestion.hint && (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 leading-relaxed animate-in fade-in duration-150">
                  <strong className="text-amber-400">Hint: </strong>
                  {activeQuestion.hint}
                </div>
              )}

              {practiceAnswers[activeQuestion.id] !== undefined && (
                <div className="p-4 rounded-xl bg-[#0b1222] border border-[#d4af37]/25 space-y-2 text-xs text-[#cbd5e1] leading-relaxed animate-in fade-in duration-200">
                  <div className="flex items-center gap-1.5 font-bold text-[#d4af37]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Step-by-Step Academic Explanation</span>
                  </div>
                  <p>{activeQuestion.explanation}</p>
                </div>
              )}
            </div>

            {/* Pagination / Nav buttons */}
            <div className="pt-3 border-t border-[#1f2c4c] flex items-center justify-between gap-3">
              <button
                onClick={handlePrevPractice}
                className="px-3.5 py-2 rounded-xl bg-[#131b2e] hover:bg-[#1a253f] border border-[#d4af37]/20 text-xs sm:text-sm text-[#cbd5e1] hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <button
                onClick={handleNextPractice}
                className="px-4 py-2 rounded-xl bg-[#d4af37] text-[#080d1a] hover:brightness-110 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <span>Next Question</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MODE 2: TIMED TEST SPRINT -------------------- */}
      {mode === 'test' && (
        <div className="space-y-4">
          {!testActive && !testCompleted && (
            <div className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-[#0f172a] border border-[#d4af37]/30 text-center space-y-5 shadow-xl">
              <Clock className="w-12 h-12 text-[#d4af37] mx-auto" />
              <div className="space-y-2">
                <h2 className="font-display text-xl sm:text-2xl font-bold text-[#fbf9f4]">
                  {selectedExam} Timed Exam Simulation
                </h2>
                <p className="text-xs sm:text-sm text-[#cbd5e1] max-w-md mx-auto leading-relaxed">
                  Test your real exam temperament under timed constraints with negative marking (+4 correct, -1 incorrect).
                </p>
              </div>

              <div className="flex items-center justify-center gap-4 text-xs font-mono text-[#cbd5e1]">
                <div className="p-2.5 rounded-xl bg-[#131b2e] border border-[#d4af37]/20">
                  <span className="text-[#d4af37] font-bold block">{questions.length}</span> Questions
                </div>
                <div className="p-2.5 rounded-xl bg-[#131b2e] border border-[#d4af37]/20">
                  <span className="text-[#d4af37] font-bold block">{Math.round(questions.length * 1.5)} mins</span> Duration
                </div>
                <div className="p-2.5 rounded-xl bg-[#131b2e] border border-[#d4af37]/20">
                  <span className="text-[#d4af37] font-bold block">+4 / -1</span> Marking
                </div>
              </div>

              <button
                onClick={startTimedTest}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] hover:brightness-110 font-bold text-sm sm:text-base transition-all shadow-md inline-flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-[#080d1a]" />
                <span>Start Timed Test Sprint</span>
              </button>
            </div>
          )}

          {testActive && !testCompleted && (
            <div className="space-y-4">
              {/* Test Top Nav with Timer */}
              <div className="p-3.5 rounded-2xl bg-[#0f172a] border border-[#d4af37]/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-[#d4af37] font-bold">
                    Q {testCurrentIndex + 1} of {questions.length}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm font-mono font-bold text-amber-300 bg-[#131b2e] px-3 py-1 rounded-xl border border-amber-500/30">
                  <Clock className="w-4 h-4 text-amber-300" />
                  <span>{formatTimer(testTimeLeft)}</span>
                </div>

                <button
                  onClick={handleCompleteTest}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors"
                >
                  Submit Test
                </button>
              </div>

              {/* Active Test Question Card */}
              {questions[testCurrentIndex] && (
                <div className="p-4 sm:p-6 rounded-2xl bg-[#0f172a] border border-[#d4af37]/30 space-y-5">
                  <div className="flex items-center justify-between text-xs text-[#9ca3af] border-b border-[#1f2c4c] pb-3">
                    <span>{questions[testCurrentIndex].subject}</span>
                    <button
                      onClick={() => toggleFlagQuestion(questions[testCurrentIndex].id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                        flaggedQuestions[questions[testCurrentIndex].id]
                          ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                          : 'bg-[#131b2e] border-[#1e293b] text-[#9ca3af] hover:text-white'
                      }`}
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>{flaggedQuestions[questions[testCurrentIndex].id] ? 'Flagged' : 'Flag'}</span>
                    </button>
                  </div>

                  <h3 className="text-sm sm:text-base font-medium text-[#fbf9f4] leading-relaxed">
                    {questions[testCurrentIndex].question}
                  </h3>

                  {/* Options */}
                  <div className="grid gap-2.5">
                    {questions[testCurrentIndex].options.map((opt, idx) => {
                      const isSelected = testAnswers[questions[testCurrentIndex].id] === idx;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelectTestOption(idx)}
                          className={`p-3.5 rounded-xl border text-left text-xs sm:text-sm font-medium transition-all flex items-start gap-3 ${
                            isSelected
                              ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#fbf9f4]'
                              : 'bg-[#131b2e] border-[#1e293b] text-[#cbd5e1] hover:border-[#d4af37]/40'
                          }`}
                        >
                          <span className="w-6 h-6 rounded-lg bg-[#090e1c] border border-[#d4af37]/25 text-[#d4af37] text-xs font-mono font-bold flex items-center justify-center shrink-0">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="flex-1 mt-0.5 leading-relaxed">{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Navigation buttons */}
                  <div className="pt-3 border-t border-[#1f2c4c] flex items-center justify-between gap-3">
                    <button
                      onClick={() => setTestCurrentIndex((prev) => Math.max(0, prev - 1))}
                      disabled={testCurrentIndex === 0}
                      className="px-3.5 py-2 rounded-xl bg-[#131b2e] hover:bg-[#1a253f] border border-[#d4af37]/20 text-xs text-[#cbd5e1] disabled:opacity-40"
                    >
                      Previous
                    </button>

                    <button
                      onClick={() =>
                        setTestCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))
                      }
                      disabled={testCurrentIndex === questions.length - 1}
                      className="px-4 py-2 rounded-xl bg-[#d4af37] text-[#080d1a] hover:brightness-110 text-xs font-bold disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Test Completed Score Card */}
          {testCompleted && (
            <div className="svh-shimmer-border-card p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-[#0f172a] border border-[#d4af37]/30 space-y-6 shadow-xl">
              {(() => {
                const scoreData = calculateTestScore();
                return (
                  <div className="space-y-6 text-center">
                    <Award className="w-12 h-12 text-[#d4af37] mx-auto" />
                    <div>
                      <h2 className="font-display text-2xl font-bold text-[#fbf9f4]">
                        Test Sprint Results
                      </h2>
                      <p className="text-xs sm:text-sm text-[#cbd5e1] mt-1">
                        Performance summary for {selectedSubject} ({selectedExam})
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
                      <div className="svh-shimmer-border-card p-3 rounded-xl bg-[#131b2e] border border-[#d4af37]/25">
                        <span className="text-xs text-[#9ca3af] block">Score</span>
                        <span className="text-xl font-bold text-[#d4af37] font-mono tabular-nums">
                          <RollingVPCounter
                            value={scoreData.totalScore}
                            allowNegative
                          />{' '}
                          / {scoreData.maxScore}
                        </span>
                      </div>
                      <div className="svh-shimmer-border-card p-3 rounded-xl bg-[#131b2e] border border-[#d4af37]/25">
                        <span className="text-xs text-[#9ca3af] block">Accuracy</span>
                        <RollingVPCounter
                          value={scoreData.accuracy}
                          suffix="%"
                          className="text-xl font-bold text-emerald-400 font-mono justify-center"
                        />
                      </div>
                      <div className="svh-shimmer-border-card p-3 rounded-xl bg-[#131b2e] border border-[#d4af37]/25">
                        <span className="text-xs text-[#9ca3af] block">Correct</span>
                        <RollingVPCounter
                          value={scoreData.correctCount}
                          className="text-xl font-bold text-emerald-300 font-mono justify-center"
                        />
                      </div>
                      <div className="svh-shimmer-border-card p-3 rounded-xl bg-[#131b2e] border border-[#d4af37]/25">
                        <span className="text-xs text-[#9ca3af] block">Incorrect</span>
                        <RollingVPCounter
                          value={scoreData.wrongCount}
                          className="text-xl font-bold text-rose-400 font-mono justify-center"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-center gap-3">
                      <button
                        onClick={startTimedTest}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-xs sm:text-sm hover:brightness-110 transition-all flex items-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Retake Test Sprint</span>
                      </button>
                      <button
                        onClick={() => {
                          setMode('practice');
                          setTestCompleted(false);
                          setTestActive(false);
                        }}
                        className="px-5 py-2.5 rounded-xl bg-[#131b2e] text-[#fbf9f4] border border-[#d4af37]/25 font-semibold text-xs sm:text-sm hover:bg-[#1a253f] transition-all"
                      >
                        Review in Practice Mode
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
