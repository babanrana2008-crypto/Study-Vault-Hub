import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, BookOpen, FileText, CheckCircle2, ArrowRight, GraduationCap } from 'lucide-react';
import { SAMPLE_BOOKS, SAMPLE_NOTES, SAMPLE_MCQS } from '../data/sampleData';
import { NCERT_BOOKS_COLLECTION } from '../data/ncertBooksData';
import { ActiveSection, Book, StudyNote, MCQQuestion, NCERTBook } from '../types';

interface SearchModalProps {
  onClose: () => void;
  onSelectBook: (book: Book) => void;
  onSelectNote: (note: StudyNote) => void;
  onNavigateToMCQ: (questionId?: string) => void;
  onNavigate: (section: ActiveSection) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  onClose,
  onSelectBook,
  onSelectNote,
  onNavigateToMCQ,
  onNavigate
}) => {
  const [query, setQuery] = useState('');

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

  const searchResults = useMemo(() => {
    if (!query.trim()) {
      return {
        books: SAMPLE_BOOKS.slice(0, 2),
        ncert: NCERT_BOOKS_COLLECTION.slice(0, 2),
        notes: SAMPLE_NOTES.slice(0, 2),
        questions: SAMPLE_MCQS.slice(0, 2)
      };
    }
    const q = query.toLowerCase();
    const books = SAMPLE_BOOKS.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.subject.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.chapters.some((c) => c.title.toLowerCase().includes(q))
    );
    const ncert = NCERT_BOOKS_COLLECTION.filter(
      (nb) =>
        nb.title.toLowerCase().includes(q) ||
        nb.subject.toLowerCase().includes(q) ||
        nb.classLevel.toLowerCase().includes(q) ||
        nb.stream.toLowerCase().includes(q) ||
        nb.chapters.some((c) => c.title.toLowerCase().includes(q))
    );
    const notes = SAMPLE_NOTES.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.subject.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q) ||
        n.content.overview.toLowerCase().includes(q)
    );
    const questions = SAMPLE_MCQS.filter(
      (m) =>
        m.question.toLowerCase().includes(q) ||
        m.topic.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q)
    );
    return { books, ncert, notes, questions };
  }, [query]);

  const hasAnyResults =
    searchResults.books.length > 0 ||
    searchResults.ncert.length > 0 ||
    searchResults.notes.length > 0 ||
    searchResults.questions.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 pt-8 sm:pt-16 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 overscroll-contain">
      <div className="w-full max-w-xl bg-[#0c1326] border border-[#d4af37]/35 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-[#f7f4ee] max-h-[85vh] max-h-[85dvh]">
        {/* Search Input Bar */}
        <div className="p-3.5 sm:p-4 bg-[#090e1c] border-b border-[#d4af37]/20 flex items-center gap-3">
          <Search className="w-5 h-5 text-[#d4af37] shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search books, formulas, high-yield notes, MCQs..."
            autoFocus
            className="w-full bg-transparent text-sm sm:text-base text-[#fbf9f4] placeholder-[#9ca3af] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-[#9ca3af] hover:text-[#fbf9f4] px-1.5 py-0.5 rounded"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#131b2e] border border-[#d4af37]/20 text-[#9ca3af] hover:text-[#fbf9f4] flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick query chips */}
        <div className="px-4 py-2 bg-[#090e1c]/60 border-b border-[#1b253f] flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
          <span className="text-[#9ca3af] shrink-0">Try:</span>
          {['Endocrine', 'Lens Maker', 'Bond Order', 'Lysosome', 'Genetics', 'Organic'].map((keyword) => (
            <button
              key={keyword}
              onClick={() => setQuery(keyword)}
              className="px-2 py-1 rounded bg-[#131b2e] text-[#cbd5e1] hover:text-[#d4af37] hover:bg-[#1a2542] shrink-0 transition-colors"
            >
              {keyword}
            </button>
          ))}
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {!hasAnyResults ? (
            <div className="text-center py-10 space-y-2">
              <p className="text-sm text-[#cbd5e1]">No study items matching "{query}"</p>
              <p className="text-xs text-[#9ca3af]">Try searching for terms like "Physics", "Cell", "Reactions", or "NEET".</p>
            </div>
          ) : (
            <>
              {/* Books */}
              {searchResults.books.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#d4af37] uppercase tracking-wider">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Curated Books ({searchResults.books.length})</span>
                  </div>
                  <div className="grid gap-2">
                    {searchResults.books.map((book) => (
                      <button
                        key={book.id}
                        onClick={() => {
                          onClose();
                          onSelectBook(book);
                        }}
                        className="w-full text-left p-3 rounded-xl bg-[#121c35] border border-[#d4af37]/20 hover:border-[#d4af37] transition-all flex items-center justify-between group"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs text-[#d4af37] font-medium">{book.subject} · {book.edition}</p>
                          <h4 className="text-sm font-semibold text-[#fbf9f4] truncate group-hover:text-[#d4af37]">
                            {book.title}
                          </h4>
                          <p className="text-xs text-[#9ca3af] truncate">{book.description}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#9ca3af] group-hover:text-[#d4af37] shrink-0 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* NCERT Books */}
              {searchResults.ncert && searchResults.ncert.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#d4af37] uppercase tracking-wider">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Official NCERT Textbooks ({searchResults.ncert.length})</span>
                  </div>
                  <div className="grid gap-2">
                    {searchResults.ncert.map((nBook) => (
                      <button
                        key={nBook.id}
                        onClick={() => {
                          onClose();
                          onNavigate('books');
                        }}
                        className="w-full text-left p-3 rounded-xl bg-[#121c35] border border-[#d4af37]/25 hover:border-[#d4af37] transition-all flex items-center justify-between group"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs text-[#d4af37] font-medium">
                            {nBook.classLevel} · {nBook.subject} ({nBook.stream})
                          </p>
                          <h4 className="text-sm font-semibold text-[#fbf9f4] truncate group-hover:text-[#d4af37]">
                            {nBook.title}
                          </h4>
                          <p className="text-xs text-[#9ca3af] truncate">
                            {nBook.chapters.length} Official Chapters · Code: {nBook.code}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#9ca3af] group-hover:text-[#d4af37] shrink-0 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {searchResults.notes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#d4af37] uppercase tracking-wider">
                    <FileText className="w-3.5 h-3.5" />
                    <span>High-Yield Notes ({searchResults.notes.length})</span>
                  </div>
                  <div className="grid gap-2">
                    {searchResults.notes.map((note) => (
                      <button
                        key={note.id}
                        onClick={() => {
                          onClose();
                          onSelectNote(note);
                        }}
                        className="w-full text-left p-3 rounded-xl bg-[#121c35] border border-[#d4af37]/20 hover:border-[#d4af37] transition-all flex items-center justify-between group"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs text-[#d4af37] font-medium">{note.subject} · {note.readTime}</p>
                          <h4 className="text-sm font-semibold text-[#fbf9f4] truncate group-hover:text-[#d4af37]">
                            {note.title}
                          </h4>
                          <p className="text-xs text-[#9ca3af] truncate">{note.summary}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#9ca3af] group-hover:text-[#d4af37] shrink-0 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Questions */}
              {searchResults.questions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#d4af37] uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>MCQ Questions ({searchResults.questions.length})</span>
                  </div>
                  <div className="grid gap-2">
                    {searchResults.questions.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => {
                          onClose();
                          onNavigateToMCQ(q.id);
                        }}
                        className="w-full text-left p-3 rounded-xl bg-[#121c35] border border-[#d4af37]/20 hover:border-[#d4af37] transition-all flex items-center justify-between group"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs text-[#d4af37] font-medium">{q.subject} · {q.topic} ({q.difficulty})</p>
                          <h4 className="text-xs sm:text-sm font-medium text-[#fbf9f4] line-clamp-2 group-hover:text-[#d4af37]">
                            {q.question}
                          </h4>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#9ca3af] group-hover:text-[#d4af37] shrink-0 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
