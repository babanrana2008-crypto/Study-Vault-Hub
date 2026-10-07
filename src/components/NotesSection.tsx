import React, { useState, useMemo } from 'react';
import { Search, Bookmark, CheckCircle2, Sparkles, ArrowRight, Zap } from 'lucide-react';
import { StudyNote } from '../types';
import { SAMPLE_NOTES } from '../data/sampleData';

interface NotesSectionProps {
  activeGoal: string;
  activeSubjects: string[];
  onSelectNote: (note: StudyNote) => void;
  isBookmarked: (id: string) => boolean;
  onToggleBookmark: (id: string) => void;
  isCompleted: (id: string) => boolean;
  onToggleComplete: (id: string) => void;
  onOpenMCQWithSubject: (subject: string) => void;
}

export const NotesSection: React.FC<NotesSectionProps> = React.memo(({
  activeGoal,
  activeSubjects,
  onSelectNote,
  isBookmarked,
  onToggleBookmark,
  isCompleted,
  onToggleComplete,
  onOpenMCQWithSubject
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyHighWeightage, setOnlyHighWeightage] = useState(false);

  const subjectTabs = useMemo(() => {
    return ['All', ...activeSubjects];
  }, [activeSubjects]);

  const filteredNotes = useMemo(() => {
    return SAMPLE_NOTES.filter((n) => {
      const matchesSubject =
        selectedSubject === 'All'
          ? n.targetStreams.includes(activeGoal) || activeSubjects.includes(n.subject)
          : n.subject.toLowerCase() === selectedSubject.toLowerCase();

      const matchesWeightage = !onlyHighWeightage || n.highWeightage;
      const matchesSearch =
        !searchQuery.trim() ||
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.subject.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSubject && matchesWeightage && matchesSearch;
    });
  }, [selectedSubject, onlyHighWeightage, searchQuery, activeGoal, activeSubjects]);

  const notesToDisplay = filteredNotes.length > 0 ? filteredNotes : SAMPLE_NOTES;

  return (
    <div className="space-y-6 pb-12 max-w-full overflow-x-hidden">
      {/* Title & Introduction */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#d4af37]">
          <Zap className="w-3.5 h-3.5" />
          <span className="uppercase tracking-widest font-mono text-[11px]">
            {activeGoal ? `${activeGoal} Revision` : 'Rapid Revision Compendium'}
          </span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#fbf9f4] tracking-tight">
          High-Yield Revision Notes
        </h1>
        <p className="text-xs sm:text-sm text-[#cbd5e1] max-w-2xl leading-relaxed">
          Dense summary sheets, master formulas, and examiner tips tailored for {activeGoal || 'exam preparation'}.
        </p>
      </div>

      {/* Filter and Search Controls */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#d4af37] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes by concept, theorem, or formula..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0f172a] border border-[#d4af37]/25 text-xs sm:text-sm text-[#fbf9f4] placeholder-[#9ca3af] focus:outline-none focus:border-[#d4af37] transition-colors"
          />
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Dynamic subjects tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#090e1c] rounded-xl border border-[#d4af37]/20 overflow-x-auto no-scrollbar">
            {subjectTabs.map((sub) => {
              const isActive = selectedSubject === sub;
              return (
                <button
                  key={sub}
                  onClick={() => setSelectedSubject(sub)}
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

          {/* High-yield toggle */}
          <button
            onClick={() => setOnlyHighWeightage(!onlyHighWeightage)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              onlyHighWeightage
                ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]'
                : 'bg-[#0f172a] border-[#d4af37]/20 text-[#cbd5e1] hover:border-[#d4af37]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>High-Weightage Only</span>
          </button>
        </div>
      </div>

      {/* Notes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {notesToDisplay.map((note) => {
          const bookmarked = isBookmarked(note.id);
          const completed = isCompleted(note.id);

          return (
            <div
              key={note.id}
              onClick={() => onSelectNote(note)}
              className="rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 hover:border-[#d4af37]/60 p-4 sm:p-5 flex flex-col justify-between transition-all cursor-pointer group shadow-md space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 text-xs text-[#9ca3af]">
                    <span className="text-[#d4af37] font-semibold">{note.subject}</span>
                    <span aria-hidden="true">·</span>
                    <span>{note.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{note.readTime}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleBookmark(note.id);
                      }}
                      aria-label="Bookmark Note"
                      className="w-7 h-7 rounded-lg bg-[#131b2e] border border-[#d4af37]/25 text-[#9ca3af] hover:text-[#d4af37] flex items-center justify-center transition-colors"
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-[#d4af37] text-[#d4af37]' : ''}`} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleComplete(note.id);
                      }}
                      aria-label="Mark Complete"
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${
                        completed
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400'
                          : 'bg-[#131b2e] border-[#d4af37]/25 text-[#9ca3af] hover:text-[#fbf9f4]'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-display text-base font-bold text-[#fbf9f4] group-hover:text-[#d4af37] transition-colors leading-snug">
                  {note.title}
                </h3>

                <p className="text-xs sm:text-sm text-[#cbd5e1] line-clamp-2 mt-2 leading-relaxed">
                  {note.summary}
                </p>

                <div className="mt-3 flex items-center gap-2 text-xs text-amber-300 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{note.examRelevance}</span>
                </div>
              </div>

              {/* Action row */}
              <div className="pt-3 border-t border-[#1e293b] flex items-center justify-between">
                <span className="text-xs text-[#9ca3af]">
                  {completed ? 'Status: Completed' : 'Status: Unread'}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenMCQWithSubject(note.subject);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#131b2e] hover:bg-[#1a2542] text-[11px] text-[#cbd5e1] hover:text-[#d4af37] transition-colors border border-[#d4af37]/20"
                  >
                    Quiz {note.subject}
                  </button>
                  <span className="text-xs text-[#d4af37] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Study</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
