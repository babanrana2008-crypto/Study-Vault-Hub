import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  Clock,
  CheckCircle2,
  TrendingUp,
  Brain,
  Target,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Calendar,
} from 'lucide-react';
import { HIGH_YIELD_TOPICS, MNEMONICS_BANK, GOAL_SUBJECTS_MAP } from '../data/sampleData';
import { HighYieldTopic, MnemonicItem } from '../types';

interface ExamPrepSectionProps {
  activeGoal: string;
  activeSubjects: string[];
  onNavigateToPracticeWithSubject: (subject: string) => void;
  onNavigateToNotes: () => void;
  onNavigateToTracker?: () => void;
}

export const ExamPrepSection: React.FC<ExamPrepSectionProps> = React.memo(({
  activeGoal,
  activeSubjects,
  onNavigateToPracticeWithSubject,
  onNavigateToNotes,
  onNavigateToTracker,
}) => {
  // Live Target Exam Clock (Days, Hours, Minutes, Seconds)
  const [timeLeft, setTimeLeft] = useState({
    days: 180,
    hours: 12,
    minutes: 45,
    seconds: 30
  });

  useEffect(() => {
    const targetDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate.getTime() - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeGoal]);

  // Topics checklist state
  const [topics, setTopics] = useState<HighYieldTopic[]>(HIGH_YIELD_TOPICS);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('All');
  const [expandedMnemonic, setExpandedMnemonic] = useState<string | null>(MNEMONICS_BANK[0]?.id || null);

  const subjectFilterOptions = useMemo(() => {
    return ['All', ...activeSubjects];
  }, [activeSubjects]);

  const toggleTopicStatus = (topicId: string) => {
    setTopics((prev) =>
      prev.map((t) => {
        if (t.id === topicId) {
          const nextStatus: HighYieldTopic['status'] =
            t.status === 'Mastered'
              ? 'In Progress'
              : t.status === 'In Progress'
              ? 'To Revise'
              : 'Mastered';
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
  };

  const filteredTopics = useMemo(() => {
    return topics.filter((t) => {
      const matchesSubject =
        selectedSubjectFilter === 'All'
          ? activeSubjects.includes(t.subject) || t.targetStream.includes(activeGoal)
          : t.subject.toLowerCase() === selectedSubjectFilter.toLowerCase();
      return matchesSubject;
    });
  }, [topics, selectedSubjectFilter, activeGoal, activeSubjects]);

  const displayTopics = filteredTopics.length > 0 ? filteredTopics : topics;
  const masteredCount = displayTopics.filter((t) => t.status === 'Mastered').length;
  const progressPercent = Math.round((masteredCount / displayTopics.length) * 100) || 0;

  // Stream-specific blueprint
  const renderBlueprint = () => {
    if (activeGoal === 'JEE Main' || activeGoal === 'JEE Advanced') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 space-y-2">
            <span className="text-purple-400 font-bold uppercase tracking-wider text-xs">Mathematics</span>
            <div className="font-display text-2xl font-bold text-[#fbf9f4]">100 Marks</div>
            <p className="text-xs text-[#cbd5e1]">Calculus, Vectors 3D, Coordinate Geometry, Matrices.</p>
            <button onClick={() => onNavigateToPracticeWithSubject('Mathematics')} className="text-xs text-[#d4af37] hover:underline font-medium block pt-1">
              Practice Math MCQs →
            </button>
          </div>
          <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 space-y-2">
            <span className="text-blue-400 font-bold uppercase tracking-wider text-xs">Physics</span>
            <div className="font-display text-2xl font-bold text-[#fbf9f4]">100 Marks</div>
            <p className="text-xs text-[#cbd5e1]">Mechanics, Electrodynamics, Modern Physics, Optics.</p>
            <button onClick={() => onNavigateToPracticeWithSubject('Physics')} className="text-xs text-[#d4af37] hover:underline font-medium block pt-1">
              Practice Physics MCQs →
            </button>
          </div>
          <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 space-y-2">
            <span className="text-amber-400 font-bold uppercase tracking-wider text-xs">Chemistry</span>
            <div className="font-display text-2xl font-bold text-[#fbf9f4]">100 Marks</div>
            <p className="text-xs text-[#cbd5e1]">Organic mechanisms, Physical kinetics, Periodic trends.</p>
            <button onClick={() => onNavigateToPracticeWithSubject('Chemistry')} className="text-xs text-[#d4af37] hover:underline font-medium block pt-1">
              Practice Chemistry MCQs →
            </button>
          </div>
        </div>
      );
    }

    if (activeGoal === 'Commerce' || activeGoal === 'CA') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 space-y-2">
            <span className="text-emerald-400 font-bold uppercase tracking-wider text-xs">Accountancy</span>
            <div className="font-display text-2xl font-bold text-[#fbf9f4]">Core Domain</div>
            <p className="text-xs text-[#cbd5e1]">Partnership accounts, Share capital, Cash flow statements.</p>
            <button onClick={() => onNavigateToPracticeWithSubject('Accountancy')} className="text-xs text-[#d4af37] hover:underline font-medium block pt-1">
              Practice Accountancy →
            </button>
          </div>
          <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 space-y-2">
            <span className="text-amber-400 font-bold uppercase tracking-wider text-xs">Economics</span>
            <div className="font-display text-2xl font-bold text-[#fbf9f4]">Macro & Indian Econ</div>
            <p className="text-xs text-[#cbd5e1]">National income, Money & banking, Aggregate demand.</p>
            <button onClick={() => onNavigateToPracticeWithSubject('Economics')} className="text-xs text-[#d4af37] hover:underline font-medium block pt-1">
              Practice Economics →
            </button>
          </div>
          <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 space-y-2">
            <span className="text-blue-400 font-bold uppercase tracking-wider text-xs">Business Studies / Law</span>
            <div className="font-display text-2xl font-bold text-[#fbf9f4]">Management & Law</div>
            <p className="text-xs text-[#cbd5e1]">Principles of management, Financial markets, Business law.</p>
            <button onClick={() => onNavigateToPracticeWithSubject('Business Studies')} className="text-xs text-[#d4af37] hover:underline font-medium block pt-1">
              Practice Business Studies →
            </button>
          </div>
        </div>
      );
    }

    if (activeGoal.includes('Board')) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 space-y-2">
            <span className="text-emerald-400 font-bold uppercase tracking-wider text-xs">Core Concepts</span>
            <div className="font-display text-2xl font-bold text-[#fbf9f4]">NCERT Theory</div>
            <p className="text-xs text-[#cbd5e1]">Definitions, Derivations, Diagrams, Exemplar problems.</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 space-y-2">
            <span className="text-amber-400 font-bold uppercase tracking-wider text-xs">Sample Papers</span>
            <div className="font-display text-2xl font-bold text-[#fbf9f4]">Board Pattern</div>
            <p className="text-xs text-[#cbd5e1]">Case-based questions, Assertion-Reason, Long answers.</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 space-y-2">
            <span className="text-blue-400 font-bold uppercase tracking-wider text-xs">Answer Writing</span>
            <div className="font-display text-2xl font-bold text-[#fbf9f4]">Marking Scheme</div>
            <p className="text-xs text-[#cbd5e1]">Step-by-step point presentation, units & formulas.</p>
          </div>
        </div>
      );
    }

    // Default / NEET / General
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {activeSubjects.slice(0, 3).map((sub, idx) => {
          const colors = ['text-emerald-400', 'text-amber-400', 'text-blue-400'];
          return (
            <div key={sub} className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 space-y-2">
              <span className={`${colors[idx % 3]} font-bold uppercase tracking-wider text-xs`}>{sub}</span>
              <div className="font-display text-2xl font-bold text-[#fbf9f4]">High-Yield</div>
              <p className="text-xs text-[#cbd5e1]">Comprehensive subject theory, formulas and practice problems.</p>
              <button
                onClick={() => onNavigateToPracticeWithSubject(sub)}
                className="text-xs text-[#d4af37] hover:underline font-medium block pt-1"
              >
                Practice {sub} →
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title & Introduction */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#d4af37]">
          <Target className="w-3.5 h-3.5" />
          <span className="uppercase tracking-widest font-mono text-[11px]">{activeGoal} Preparation Hub</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#fbf9f4] tracking-tight">
          {activeGoal} Master Blueprint
        </h1>
        <p className="text-xs sm:text-sm text-[#cbd5e1] max-w-2xl leading-relaxed">
          Tactical exam syllabus breakdown, high-weightage chapter matrix, and rapid-recall memory mnemonics.
        </p>
      </div>

      {/* 1. Target Exam Countdown */}
      <section className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0c1428] via-[#090f20] to-[#070b16] border border-[#d4af37]/35 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <span className="text-xs text-[#d4af37] font-semibold tracking-wider uppercase font-mono">
              Target Clock
            </span>
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#fbf9f4]">
              Countdown to {activeGoal}
            </h2>
            <p className="text-xs text-[#9ca3af]">
              Maintain daily study discipline and consistent revision cycles.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center">
            <div className="p-2.5 sm:p-3 rounded-xl bg-[#131b2e] border border-[#d4af37]/25 min-w-[58px]">
              <span className="font-display text-xl sm:text-2xl font-bold text-[#fbf9f4] tabular-nums block">
                {timeLeft.days}
              </span>
              <span className="text-[10px] text-[#9ca3af] uppercase font-medium">Days</span>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl bg-[#131b2e] border border-[#d4af37]/25 min-w-[58px]">
              <span className="font-display text-xl sm:text-2xl font-bold text-[#d4af37] tabular-nums block">
                {timeLeft.hours}
              </span>
              <span className="text-[10px] text-[#9ca3af] uppercase font-medium">Hours</span>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl bg-[#131b2e] border border-[#d4af37]/25 min-w-[58px]">
              <span className="font-display text-xl sm:text-2xl font-bold text-[#fbf9f4] tabular-nums block">
                {timeLeft.minutes}
              </span>
              <span className="text-[10px] text-[#9ca3af] uppercase font-medium">Mins</span>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl bg-[#131b2e] border border-[#d4af37]/25 min-w-[58px]">
              <span className="font-display text-xl sm:text-2xl font-bold text-amber-400 tabular-nums block">
                {timeLeft.seconds}
              </span>
              <span className="text-[10px] text-[#9ca3af] uppercase font-medium">Secs</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Weightage & Structure Blueprint */}
      <section className="space-y-3">
        <h2 className="font-display text-base font-bold text-[#fbf9f4] tracking-tight">
          Subject Allocation & Marks Blueprint
        </h2>
        {renderBlueprint()}
      </section>

      {/* 2.5 AI Smart Revision Plan Banner */}
      {onNavigateToTracker && (
        <section className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0e1932] via-[#0a1326] to-[#080f1e] border border-[#d4af37]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#d4af37]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>SVH AI Study Planner</span>
            </div>
            <h3 className="font-display text-base sm:text-lg font-bold text-[#fbf9f4]">
              Need a Custom {activeGoal} Smart Revision Schedule?
            </h3>
            <p className="text-xs text-[#cbd5e1]">
              Generate a personalized day-by-day revision plan with Google Gemini and sync study blocks directly to your Daily Planner.
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateToTracker}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shrink-0 hover:brightness-110 transition-all cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>Open AI Study Planner →</span>
          </button>
        </section>
      )}

      {/* 3. High-Yield Chapters Matrix */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div>
            <h2 className="font-display text-base font-bold text-[#fbf9f4] tracking-tight">
              High-Weightage Chapters Checklist
            </h2>
            <p className="text-xs text-[#9ca3af]">
              Tap status pill to toggle: Mastered / In Progress / To Revise
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs text-[#9ca3af] block">Readiness</span>
              <span className="text-xs font-bold text-[#d4af37] tabular-nums">
                {masteredCount} of {displayTopics.length} Mastered ({progressPercent}%)
              </span>
            </div>
            <div className="w-20 h-2 bg-[#131b2e] rounded-full overflow-hidden border border-[#d4af37]/20">
              <div
                className="h-full bg-gradient-to-r from-[#d4af37] to-emerald-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-1.5 p-1 bg-[#090e1c] rounded-xl border border-[#d4af37]/20 overflow-x-auto no-scrollbar">
          {subjectFilterOptions.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubjectFilter(sub)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedSubjectFilter === sub
                  ? 'bg-[#d4af37] text-[#080d1a] font-bold shadow-sm'
                  : 'text-[#cbd5e1] hover:text-[#fbf9f4] hover:bg-[#131b2e]'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        {/* Matrix list */}
        <div className="grid gap-2.5">
          {displayTopics.map((item) => {
            const statusColors = {
              Mastered: 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300',
              'In Progress': 'bg-amber-950/70 border-amber-500/50 text-amber-300',
              'To Revise': 'bg-rose-950/70 border-rose-500/50 text-rose-300'
            };

            return (
              <div
                key={item.id}
                className="p-3 sm:p-4 rounded-xl bg-[#0f172a] border border-[#d4af37]/20 hover:border-[#d4af37]/50 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[11px] text-[#9ca3af] mb-0.5">
                    <span className="text-[#d4af37] font-semibold">{item.subject}</span>
                    <span aria-hidden="true">·</span>
                    <span>Approx ~{item.expectedQuestions} Questions</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.weightagePercent}% Weight</span>
                  </div>
                  <h4 className="text-sm font-semibold text-[#fbf9f4] truncate">
                    {item.chapter}
                  </h4>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleTopicStatus(item.id)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-transform active:scale-95 ${
                      statusColors[item.status]
                    }`}
                  >
                    {item.status}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Mnemonics Bank */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-[#d4af37]" />
            <h2 className="font-display text-base font-bold text-[#fbf9f4] tracking-tight">
              Memory Mnemonics & Mental Shortcuts
            </h2>
          </div>
          <span className="text-xs text-[#9ca3af]">Rapid Recall</span>
        </div>

        <div className="grid gap-3">
          {MNEMONICS_BANK.map((m) => {
            const isExpanded = expandedMnemonic === m.id;

            return (
              <div
                key={m.id}
                className="rounded-xl bg-[#0f172a] border border-[#d4af37]/25 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setExpandedMnemonic(isExpanded ? null : m.id)}
                  className="w-full text-left p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-[#131b2e] transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-[#9ca3af] mb-1">
                      <span className="text-[#d4af37] font-semibold">{m.subject}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-[#fce09b] font-bold">{m.acronym}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-[#fbf9f4] truncate">
                      {m.title}
                    </h4>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#d4af37] shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#9ca3af] shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-[#1f293d] space-y-3 animate-in fade-in duration-150">
                    <p className="text-xs sm:text-sm text-[#cbd5e1] leading-relaxed">
                      {m.explanation}
                    </p>

                    <div className="p-3 rounded-lg bg-[#121c35] border border-[#d4af37]/20">
                      <span className="text-[11px] text-[#d4af37] uppercase font-semibold block mb-1">
                        Expansion:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-[#fbf9f4]">
                        {m.standsFor.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-[#d4af37] font-mono text-[10px]">#{idx + 1}</span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
});
