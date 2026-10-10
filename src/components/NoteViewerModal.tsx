import React, { useState, useEffect } from 'react';
import { X, Bookmark, CheckCircle2, Copy, FileText, Check, AlertTriangle, ArrowRight } from 'lucide-react';
import { StudyNote } from '../types';

interface NoteViewerModalProps {
  note: StudyNote;
  onClose: () => void;
  isBookmarked: boolean;
  isCompleted: boolean;
  onToggleBookmark: (noteId: string) => void;
  onToggleComplete: (noteId: string) => void;
  onOpenMCQWithSubject?: (subject: string) => void;
}

export const NoteViewerModal: React.FC<NoteViewerModalProps> = React.memo(({
  note,
  onClose,
  isBookmarked,
  isCompleted,
  onToggleBookmark,
  onToggleComplete,
  onOpenMCQWithSubject
}) => {
  const [copiedFormula, setCopiedFormula] = useState<string | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleCopyFormula = (formula: string, label: string) => {
    navigator.clipboard?.writeText?.(`${label}: ${formula}`);
    setCopiedFormula(label);
    setTimeout(() => setCopiedFormula(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overscroll-contain">
      <div className="svh-spring-modal-card w-full max-w-2xl h-[90vh] h-[90dvh] max-h-[780px] bg-[#0c1326] border border-[#d4af37]/35 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-[#f7f4ee]">
        {/* Header bar */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#090e1c] border-b border-[#d4af37]/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#19233c] border border-[#d4af37]/30 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-[#d4af37]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-[#d4af37] font-medium tracking-wide">
                <span>{note.subject}</span>
                <span>·</span>
                <span>{note.category}</span>
              </div>
              <h2 className="font-display text-sm sm:text-base font-semibold text-[#fbf9f4] truncate">
                {note.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Mark as Completed */}
            <button
              type="button"
              onClick={() => onToggleComplete(note.id)}
              className={`min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                isCompleted
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-[#131b2e] border-[#d4af37]/20 text-[#cbd5e1] hover:text-[#fbf9f4]'
              }`}
            >
              <CheckCircle2 className={`w-4 h-4 ${isCompleted ? 'text-emerald-400' : ''}`} />
              <span className="hidden sm:inline">{isCompleted ? 'Completed' : 'Mark Done'}</span>
            </button>

            {/* Bookmark button */}
            <button
              type="button"
              onClick={() => onToggleBookmark(note.id)}
              aria-label="Bookmark Note"
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border transition-colors cursor-pointer ${
                isBookmarked
                  ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]'
                  : 'bg-[#131b2e] border-[#d4af37]/20 text-[#9ca3af] hover:text-[#fbf9f4]'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-[#d4af37]' : ''}`} />
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Note"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#131b2e] border border-[#d4af37]/20 text-[#9ca3af] hover:text-[#fbf9f4] hover:border-red-400/40 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="svh-scroll-container flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Note overview */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#9ca3af]">
              <span>{note.readTime}</span>
              <span>·</span>
              <span className="text-[#d4af37] font-medium">{note.examRelevance}</span>
              <span>·</span>
              <span>{note.lastUpdated}</span>
            </div>
            <p className="text-sm sm:text-base text-[#e2dac9] leading-relaxed">
              {note.content.overview}
            </p>
          </div>

          {/* Key Takeaways */}
          <div className="p-4 rounded-xl bg-[#121c35] border border-[#d4af37]/25 space-y-3">
            <h3 className="text-xs uppercase font-semibold tracking-wider text-[#d4af37]">
              Key Examination Pointers
            </h3>
            <ul className="space-y-2">
              {note.content.keyTakeaways.map((point, index) => (
                <li key={index} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#cbd5e1] leading-relaxed">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37] mt-1.5 shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Formulas / Mechanisms */}
          {note.content.formulasOrMechanisms && note.content.formulasOrMechanisms.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-semibold tracking-wider text-[#d4af37]">
                Master Formulas & Reactions
              </h3>
              <div className="grid gap-3">
                {note.content.formulasOrMechanisms.map((fm, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#090e1c] border border-[#273557] flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#fbf9f4]">{fm.label}</span>
                      <button
                        onClick={() => handleCopyFormula(fm.formula, fm.label)}
                        className="text-[11px] text-[#d4af37] hover:underline flex items-center gap-1"
                      >
                        {copiedFormula === fm.label ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <code className="text-xs sm:text-sm font-mono text-[#fce09b] bg-[#121c35]/80 p-2 rounded-lg border border-[#d4af37]/20 overflow-x-auto">
                      {fm.formula}
                    </code>
                    {fm.note && (
                      <p className="text-[11px] text-[#9ca3af] italic">Note: {fm.note}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exam Trap Alert */}
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-300">Exam Watchout: </span>
              {note.content.examTips}
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="px-4 sm:px-6 py-3 bg-[#090e1c] border-t border-[#d4af37]/20 flex items-center justify-between gap-3">
          <span className="text-xs text-[#9ca3af] hidden sm:inline">
            Status: {isCompleted ? 'Marked as Mastered' : 'Pending Study'}
          </span>
          {onOpenMCQWithSubject && (
            <button
              onClick={() => {
                onClose();
                onOpenMCQWithSubject(note.subject);
              }}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-semibold text-xs sm:text-sm hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>Practice {note.subject} MCQs</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

