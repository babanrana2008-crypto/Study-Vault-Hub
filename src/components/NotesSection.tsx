import React, { useState, useMemo } from 'react';
import { Search, Bookmark, CheckCircle2, Sparkles, ArrowRight, Zap, BookOpen } from 'lucide-react';
import { StudyNote } from '../types';
import { GlassMetallicSkeleton, useBriefShimmerTransition } from './GlassMetallicSkeleton';

interface NotesSectionProps {
  activeGoal: string;
  activeSubjects: string[];
  savedNotes?: StudyNote[];
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
  savedNotes = [],
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
    return savedNotes.filter((n) => {
      const matchesSubject =
        selectedSubject === 'All'
          ? !activeGoal || n.targetStreams.includes(activeGoal) || activeSubjects.includes(n.subject)
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
  }, [savedNotes, selectedSubject, onlyHighWeightage, searchQuery, activeGoal, activeSubjects]);

  const isShimmerLoading = useBriefShimmerTransition(
    [selectedSubject, onlyHighWeightage, activeGoal],
    220
  );

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
                  type="button"
                  onClick={() => setSelectedSubject(sub)}
                  className={`min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center justify-center cursor-pointer ${
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
            type="button"
            onClick={() => setOnlyHighWeightage(!onlyHighWeightage)}
            className={`min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
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

      {/* Subtle Premium Telegram Channel Banner Immediately Before Notes (Light Pastel Sea Green Box) */}
      <div className="svh-telegram-seagreen-banner rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 hover:border-[#d4af37]/60 px-4 py-3.5 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all shadow-md">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <div className="svh-telegram-seagreen-icon w-8 h-8 rounded-lg bg-[#131b2e] border border-[#d4af37]/25 text-[#d4af37] flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <p className="text-xs sm:text-sm text-[#fbf9f4] font-medium leading-snug break-words">
            Join our Telegram channel for premium short notes and handwritten notes
          </p>
        </div>

        <a
          href="https://t.me/svhnotes"
          target="_blank"
          rel="noopener noreferrer"
          className="svh-join-channel-btn min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#e5c158] active:scale-[0.97] text-[#080d1a] text-xs font-bold inline-flex items-center justify-center gap-1.5 shrink-0 transition-all shadow-sm w-full sm:w-auto cursor-pointer"
        >
          <span>Join Channel</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Notes List, Empty State, or Glass-Metallic Skeleton Shimmer Loading */}
      {isShimmerLoading ? (
        <GlassMetallicSkeleton variant="notes" count={4} />
      ) : filteredNotes.length === 0 ? (
        <div className="rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 p-8 sm:p-10 text-center space-y-3 shadow-md">
          <div className="w-12 h-12 rounded-2xl bg-[#131b2e] border border-[#d4af37]/25 text-[#d4af37] flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-base sm:text-lg font-bold text-[#fbf9f4]">
              {savedNotes.length === 0 ? 'No saved revision notes yet' : 'No matching notes found'}
            </h3>
            <p className="text-xs sm:text-sm text-[#9ca3af] max-w-md mx-auto leading-relaxed">
              {savedNotes.length === 0
                ? 'Your saved revision notes and custom study summaries will appear here once added.'
                : 'Try adjusting your subject filter or clearing your search query.'}
            </p>
          </div>
          {(searchQuery.trim() !== '' || selectedSubject !== 'All' || onlyHighWeightage) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedSubject('All');
                setOnlyHighWeightage(false);
              }}
              className="px-4 py-2 rounded-xl bg-[#131b2e] hover:bg-[#1a2542] border border-[#d4af37]/30 text-xs font-semibold text-[#d4af37] transition-colors inline-flex items-center gap-1.5"
            >
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNotes.map((note) => {
            const bookmarked = isBookmarked(note.id);
            const completed = isCompleted(note.id);

            return (
              <div
                key={note.id}
                onClick={() => onSelectNote(note)}
                className="svh-3d-tilt-card rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 hover:border-[#d4af37]/60 p-4 sm:p-5 flex flex-col justify-between transition-all cursor-pointer group shadow-md space-y-4"
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
      )}
    </div>
  );
});
