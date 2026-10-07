import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Bookmark,
  ExternalLink,
  CheckCircle2,
  Share2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  Play
} from 'lucide-react';
import { NCERTBook, NCERTChapterRef } from '../types';

interface NCERTBookModalProps {
  book: NCERTBook;
  onClose: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  onPracticeChapter?: (subject: string, chapterTitle: string, classLevel: string) => void;
}

export const NCERTBookModal: React.FC<NCERTBookModalProps> = ({
  book,
  onClose,
  isBookmarked,
  onToggleBookmark,
  onPracticeChapter
}) => {
  const [expandedChapterIndex, setExpandedChapterIndex] = useState<number | null>(0);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const handleShare = () => {
    navigator.clipboard?.writeText(
      `Check out ${book.title} on Study Vault Hub - Official NCERT Portal: ${book.officialPortalUrl}`
    );
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const toggleChapter = (index: number) => {
    setExpandedChapterIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[90vh] bg-[#090e1c] border border-[#d4af37]/30 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 bg-[#0f172a] border-b border-[#d4af37]/20 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-[#d4af37]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] sm:text-xs text-[#9ca3af]">
                <span className="text-[#d4af37] font-semibold">{book.classLevel}</span>
                <span aria-hidden="true">·</span>
                <span>{book.stream}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[#d4af37]">{book.code}</span>
              </div>
              <h2 className="font-display text-base sm:text-lg font-bold text-[#fbf9f4] truncate">
                {book.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onToggleBookmark(book.id)}
              aria-label="Bookmark Textbook"
              className={`p-2 rounded-xl border border-[#d4af37]/25 text-[#9ca3af] hover:text-[#d4af37] bg-[#131b2e] transition-colors ${
                isBookmarked ? 'text-[#d4af37] border-[#d4af37]' : ''
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-[#d4af37]' : ''}`} />
            </button>
            <button
              onClick={handleShare}
              aria-label="Share Link"
              className="p-2 rounded-xl border border-[#d4af37]/25 text-[#9ca3af] hover:text-[#d4af37] bg-[#131b2e] transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              aria-label="Close Modal"
              className="p-2 rounded-xl border border-[#d4af37]/25 text-[#9ca3af] hover:text-white bg-[#131b2e] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Copy toast feedback */}
        {copyFeedback && (
          <div className="bg-emerald-950/90 text-emerald-300 text-xs px-4 py-2 border-b border-emerald-500/30 flex items-center justify-between shrink-0">
            <span>Link copied to clipboard!</span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-[#fbf9f4]">
          {/* Official Textbook Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#101b33] via-[#0d162b] to-[#070b16] border border-[#d4af37]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/30 text-[10px] font-mono text-[#d4af37]">
                <Sparkles className="w-3 h-3" />
                <span>OFFICIAL NCERT TEXTBOOK REPOSITORY</span>
              </div>
              <p className="text-xs sm:text-sm text-[#cbd5e1] leading-relaxed max-w-xl">
                {book.description}
              </p>
              <div className="text-[11px] text-[#9ca3af]">
                Edition: <span className="text-[#fbf9f4]">{book.edition}</span>
              </div>
            </div>

            <a
              href={book.officialPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-[#d4af37]/15 hover:bg-[#d4af37]/25 border border-[#d4af37]/40 text-xs text-[#d4af37] font-semibold flex items-center justify-center gap-1.5 transition-all shrink-0"
            >
              <span>NCERT Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Chapters Section Header */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm sm:text-base font-bold text-[#fbf9f4] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#d4af37]" />
                <span>Chapters & High-Yield Syllabus Index</span>
              </h3>
              <span className="text-xs font-mono text-[#d4af37] bg-[#d4af37]/10 px-2.5 py-0.5 rounded-full border border-[#d4af37]/25">
                {book.chapters.length} Chapters Indexed
              </span>
            </div>

            {/* Chapters Accordion List */}
            <div className="space-y-2.5">
              {book.chapters.map((chap: NCERTChapterRef, idx: number) => {
                const isExpanded = expandedChapterIndex === idx;

                return (
                  <div
                    key={chap.code || idx}
                    className={`rounded-2xl border transition-all ${
                      isExpanded
                        ? 'bg-[#0f172a] border-[#d4af37]/50 shadow-md'
                        : 'bg-[#0b1222] border-[#1e293b] hover:border-[#d4af37]/30'
                    }`}
                  >
                    <div
                      onClick={() => toggleChapter(idx)}
                      className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-[#131b2e] border border-[#d4af37]/25 text-[#d4af37] font-mono text-xs font-bold flex items-center justify-center shrink-0">
                          {chap.chapterNumber}
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-semibold text-[#fbf9f4] truncate">
                            {chap.title}
                          </h4>
                          <span className="text-[10px] font-mono text-[#9ca3af]">
                            Ref Code: {chap.code}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-[#d4af37]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#9ca3af]" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-3.5 pb-4 sm:px-4 sm:pb-4 pt-1 border-t border-[#1e293b]/70 space-y-3.5 text-xs text-[#cbd5e1] animate-in fade-in duration-150">
                        {chap.summary && (
                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-[#d4af37] uppercase tracking-wider">
                              Chapter Overview
                            </span>
                            <p className="leading-relaxed bg-[#131b2e]/60 p-2.5 rounded-xl border border-[#d4af37]/15">
                              {chap.summary}
                            </p>
                          </div>
                        )}

                        {chap.keyPoints && chap.keyPoints.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-semibold text-[#d4af37] uppercase tracking-wider">
                              High-Yield Concepts & Exam Pointers
                            </span>
                            <ul className="space-y-1">
                              {chap.keyPoints.map((pt, pIdx) => (
                                <li key={pIdx} className="flex items-start gap-2">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                  <span className="leading-relaxed">{pt}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Direct Chapter Actions */}
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          <a
                            href={chap.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-[#131b2e] hover:bg-[#1a253f] border border-[#d4af37]/25 text-xs text-[#cbd5e1] hover:text-white flex items-center gap-1.5 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3 text-[#d4af37]" />
                            <span>Read Official NCERT PDF</span>
                          </a>

                          {onPracticeChapter && (
                            <button
                              onClick={() => {
                                onPracticeChapter(book.subject, chap.title, book.classLevel);
                                onClose();
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b88c1b] text-[#080d1a] hover:brightness-110 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                            >
                              <Play className="w-3 h-3 fill-[#080d1a]" />
                              <span>Practice Chapter Questions</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="p-3.5 sm:p-4 bg-[#0f172a] border-t border-[#d4af37]/20 flex items-center justify-between gap-3 shrink-0 text-xs text-[#9ca3af]">
          <span>Official portal data from National Council of Educational Research & Training</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#131b2e] hover:bg-[#1c2742] text-[#fbf9f4] border border-[#d4af37]/25 font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
