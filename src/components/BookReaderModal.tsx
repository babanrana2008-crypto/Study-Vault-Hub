import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Bookmark, BookOpen, CheckCircle, Share2, Sparkles } from 'lucide-react';
import { Book } from '../types';

interface BookReaderModalProps {
  book: Book;
  onClose: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (bookId: string) => void;
}

export const BookReaderModal: React.FC<BookReaderModalProps> = ({
  book,
  onClose,
  isBookmarked,
  onToggleBookmark
}) => {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [copiedShare, setCopiedShare] = useState(false);

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

  const currentChapter = book.chapters[currentChapterIndex] || book.chapters[0];

  const handleShare = () => {
    navigator.clipboard?.writeText?.(
      `Study Vault Hub - ${book.title} (Chapter ${currentChapter?.number}: ${currentChapter?.title})`
    );
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const textSizes = {
    sm: 'text-sm leading-relaxed',
    base: 'text-base leading-relaxed',
    lg: 'text-lg leading-relaxed'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl h-[92vh] max-h-[820px] bg-[#0c1326] border border-[#d4af37]/30 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-[#f7f4ee]">
        {/* Header bar */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#090e1c] border-b border-[#d4af37]/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#19233c] border border-[#d4af37]/30 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-[#d4af37]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[#d4af37] font-medium tracking-wide truncate">
                {book.subject} · {book.edition}
              </p>
              <h2 className="font-display text-sm sm:text-base font-semibold text-[#fbf9f4] truncate">
                {book.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Font size picker */}
            <div className="hidden sm:flex items-center bg-[#131b2e] rounded-lg p-0.5 border border-[#d4af37]/20 text-xs">
              <button
                onClick={() => setFontSize('sm')}
                className={`px-2 py-1 rounded ${fontSize === 'sm' ? 'bg-[#d4af37]/20 text-[#d4af37] font-semibold' : 'text-[#9ca3af]'}`}
              >
                A-
              </button>
              <button
                onClick={() => setFontSize('base')}
                className={`px-2 py-1 rounded ${fontSize === 'base' ? 'bg-[#d4af37]/20 text-[#d4af37] font-semibold' : 'text-[#9ca3af]'}`}
              >
                A
              </button>
              <button
                onClick={() => setFontSize('lg')}
                className={`px-2 py-1 rounded ${fontSize === 'lg' ? 'bg-[#d4af37]/20 text-[#d4af37] font-semibold' : 'text-[#9ca3af]'}`}
              >
                A+
              </button>
            </div>

            <button
              onClick={() => onToggleBookmark(book.id)}
              aria-label="Bookmark Book"
              className={`min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border transition-colors ${
                isBookmarked
                  ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]'
                  : 'bg-[#131b2e] border-[#d4af37]/20 text-[#9ca3af] hover:text-[#fbf9f4]'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-[#d4af37]' : ''}`} />
            </button>

            <button
              onClick={handleShare}
              aria-label="Share Reference"
              className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg bg-[#131b2e] border border-[#d4af37]/20 text-[#9ca3af] hover:text-[#fbf9f4] transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              aria-label="Close Reader"
              className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg bg-[#131b2e] border border-[#d4af37]/20 text-[#9ca3af] hover:text-[#fbf9f4] hover:border-red-400/40 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {copiedShare && (
          <div className="bg-[#d4af37]/15 border-b border-[#d4af37]/30 text-[#d4af37] text-xs py-1.5 px-4 text-center">
            Copied chapter reference to clipboard
          </div>
        )}

        {/* Chapter selector tabs */}
        <div className="px-4 py-2 bg-[#0d162d] border-b border-[#1f2c4c] flex items-center gap-2 overflow-x-auto no-scrollbar">
          {book.chapters.map((ch, idx) => (
            <button
              key={ch.id}
              onClick={() => setCurrentChapterIndex(idx)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentChapterIndex === idx
                  ? 'bg-[#d4af37] text-[#080d1a] shadow-sm font-semibold'
                  : 'bg-[#151f38] text-[#cbd5e1] hover:bg-[#1a2745]'
              }`}
            >
              Ch {ch.number}: {ch.title.split(':')[0]}
            </button>
          ))}
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
          {/* Chapter header */}
          <div className="border-b border-[#d4af37]/20 pb-4">
            <div className="flex items-center gap-2 text-xs text-[#d4af37] font-medium uppercase tracking-wider mb-1">
              <span>Chapter {currentChapter?.number}</span>
              <span>·</span>
              <span>{currentChapter?.pageRange}</span>
              <span>·</span>
              <span>{book.level}</span>
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-[#fbf9f4]">
              {currentChapter?.title}
            </h1>
            <p className="text-xs text-[#9ca3af] mt-1">Author: {book.author}</p>
          </div>

          {/* Overview prose */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase font-semibold tracking-wider text-[#d4af37]">
              Curriculum Core & Synopsis
            </h3>
            <p className={`${textSizes[fontSize]} text-[#e2dac9]`}>
              {currentChapter?.summary}
            </p>
          </div>

          {/* High-yield key concepts */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#121c35] border border-[#d4af37]/25 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#fbf9f4]">
              <Sparkles className="w-4 h-4 text-[#d4af37]" />
              <span>High-Yield NEET Exam Invariants</span>
            </div>
            <ul className="space-y-2.5">
              {currentChapter?.keyConcepts.map((concept, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm text-[#cbd5e1]">
                  <CheckCircle className="w-4 h-4 text-[#d4af37] mt-0.5 shrink-0" />
                  <span>{concept}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Study strategy box */}
          <div className="p-4 rounded-xl bg-[#090e1c] border border-[#273557] text-xs sm:text-sm text-[#9ca3af] leading-relaxed">
            <span className="font-semibold text-[#d4af37]">Revision Strategy: </span>
            Read through NCERT highlighted terminology, solve back-of-chapter exemplar problems, and verify formulas in our NEET Portal.
          </div>
        </div>

        {/* Footer controls */}
        <div className="px-4 sm:px-6 py-3 bg-[#090e1c] border-t border-[#d4af37]/20 flex items-center justify-between">
          <button
            onClick={() => setCurrentChapterIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentChapterIndex === 0}
            className="px-3 py-1.5 rounded-lg border border-[#d4af37]/20 text-xs font-medium text-[#cbd5e1] hover:text-[#fbf9f4] hover:border-[#d4af37] disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous Chapter
          </button>

          <span className="text-xs text-[#9ca3af]">
            Chapter {currentChapterIndex + 1} of {book.chapters.length}
          </span>

          <button
            onClick={() => setCurrentChapterIndex((prev) => Math.min(book.chapters.length - 1, prev + 1))}
            disabled={currentChapterIndex === book.chapters.length - 1}
            className="px-3 py-1.5 rounded-lg border border-[#d4af37]/20 text-xs font-medium text-[#cbd5e1] hover:text-[#fbf9f4] hover:border-[#d4af37] disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1"
          >
            Next Chapter
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
