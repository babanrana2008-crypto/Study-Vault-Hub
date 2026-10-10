import React, { useState, useMemo } from 'react';
import {
  Search,
  BookOpen,
  Bookmark,
  Star,
  ArrowRight,
  BookMarked,
  DownloadCloud,
  ExternalLink,
  Layers,
  GraduationCap
} from 'lucide-react';
import { Book, NCERTBook } from '../types';
import { SAMPLE_BOOKS } from '../data/sampleData';
import { NCERT_BOOKS_COLLECTION, getNCERTBooksByFilter } from '../data/ncertBooksData';
import { NCERTBookModal } from './NCERTBookModal';
import { GlassMetallicSkeleton, useBriefShimmerTransition } from './GlassMetallicSkeleton';
import { useInertialFluidPill } from './InteractiveFluidRippleLayer';

interface BooksSectionProps {
  activeGoal: string;
  activeSubjects: string[];
  onSelectBook: (book: Book) => void;
  isBookmarked: (id: string) => boolean;
  onToggleBookmark: (id: string) => void;
  onPracticeNCERTChapter?: (subject: string, chapterTitle: string, classLevel: string) => void;
}

export const BooksSection: React.FC<BooksSectionProps> = React.memo(({
  activeGoal,
  activeSubjects,
  onSelectBook,
  isBookmarked,
  onToggleBookmark,
  onPracticeNCERTChapter
}) => {
  // Main Tab: 'curated' reference textbooks vs 'ncert' official library
  const [activeTab, setActiveTab] = useState<'curated' | 'ncert'>('curated');

  // Curated books state
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [curatedSearchQuery, setCuratedSearchQuery] = useState('');
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  // NCERT library state
  const [ncertClassFilter, setNcertClassFilter] = useState<string>('All');
  const [ncertStreamFilter, setNcertStreamFilter] = useState<string>('All');
  const [ncertSubjectFilter, setNcertSubjectFilter] = useState<string>('All');
  const [ncertSearchQuery, setNcertSearchQuery] = useState('');
  const [selectedNCERTBook, setSelectedNCERTBook] = useState<NCERTBook | null>(null);

  // Subject tabs for curated books
  const curatedSubjectTabs = useMemo(() => {
    return ['All', ...activeSubjects];
  }, [activeSubjects]);

  const filteredCuratedBooks = useMemo(() => {
    return SAMPLE_BOOKS.filter((b) => {
      const matchesSubject =
        selectedSubject === 'All'
          ? b.targetStreams.includes(activeGoal) || activeSubjects.includes(b.subject)
          : b.subject.toLowerCase() === selectedSubject.toLowerCase();

      const matchesSearch =
        !curatedSearchQuery.trim() ||
        b.title.toLowerCase().includes(curatedSearchQuery.toLowerCase()) ||
        b.author.toLowerCase().includes(curatedSearchQuery.toLowerCase()) ||
        b.description.toLowerCase().includes(curatedSearchQuery.toLowerCase()) ||
        b.subject.toLowerCase().includes(curatedSearchQuery.toLowerCase());

      return matchesSubject && matchesSearch;
    });
  }, [selectedSubject, curatedSearchQuery, activeGoal, activeSubjects]);

  const curatedBooksToDisplay = filteredCuratedBooks.length > 0 ? filteredCuratedBooks : SAMPLE_BOOKS;

  // Filtered NCERT Books
  const filteredNCERTBooks = useMemo(() => {
    return getNCERTBooksByFilter({
      classLevel: ncertClassFilter,
      stream: ncertStreamFilter,
      subject: ncertSubjectFilter,
      searchQuery: ncertSearchQuery
    });
  }, [ncertClassFilter, ncertStreamFilter, ncertSubjectFilter, ncertSearchQuery]);

  const handleDownloadOffline = (book: Book) => {
    setDownloadToast(`Saved "${book.title}" for offline reading cache (${book.downloadSize})`);
    setTimeout(() => setDownloadToast(null), 3000);
  };

  const isBooksShimmering = useBriefShimmerTransition(
    [activeTab, selectedSubject, ncertClassFilter, ncertStreamFilter, ncertSubjectFilter],
    220
  );

  const { containerRef: curatedSubjectTabsRef, pillMetrics: curatedSubPill } =
    useInertialFluidPill<HTMLDivElement>([selectedSubject, activeTab, curatedSubjectTabs.length]);

  const { containerRef: ncertSubjectTabsRef, pillMetrics: ncertSubPill } =
    useInertialFluidPill<HTMLDivElement>([ncertSubjectFilter, activeTab]);

  return (
    <div className="space-y-6 pb-12 max-w-full overflow-x-hidden">
      {/* Title & Introduction */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#d4af37]">
          <BookMarked className="w-3.5 h-3.5" />
          <span className="uppercase tracking-widest font-mono text-[11px]">
            {activeGoal ? `${activeGoal} Vault Library` : 'Academic Repository'}
          </span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#fbf9f4] tracking-tight">
          Books & Official NCERT Vault
        </h1>
        <p className="text-xs sm:text-sm text-[#cbd5e1] max-w-2xl leading-relaxed">
          Access standard high-yield textbooks alongside the official NCERT digital curriculum for Classes 10, 11, and 12.
        </p>
      </div>

      {downloadToast && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between animate-in fade-in duration-150">
          <span>{downloadToast}</span>
          <button onClick={() => setDownloadToast(null)} className="text-emerald-400 font-bold ml-2">
            OK
          </button>
        </div>
      )}

      {/* Main Tab Switcher: Curated Textbooks vs Official NCERT (Inertial Smooth Fluid Pill) */}
      <div className="relative p-1.5 bg-[#090e1c] rounded-2xl border border-[#d4af37]/25 grid grid-cols-2 items-center gap-2 overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-1.5 left-1.5 right-1.5 z-0"
        >
          <div
            style={{
              width: '50%',
              transform: `translate3d(${activeTab === 'curated' ? 0 : 100}%, 0, 0)`,
            }}
            className="svh-inertial-fluid-slider h-full"
          >
            <span className="svh-inertial-fluid-pill-solid block w-full h-full rounded-xl bg-[#d4af37] shadow-sm" />
          </div>
        </div>

        <button
          onClick={() => setActiveTab('curated')}
          className={`relative z-10 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'curated'
              ? 'text-[#080d1a] font-bold'
              : 'text-[#cbd5e1] hover:text-[#fbf9f4]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Curated Reference Books</span>
          <span className="text-[10px] font-mono opacity-80">({curatedBooksToDisplay.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ncert')}
          className={`relative z-10 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'ncert'
              ? 'text-[#080d1a] font-bold'
              : 'text-[#cbd5e1] hover:text-[#fbf9f4]'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Official NCERT Library</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#d4af37]">
            NEW
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CURATED REFERENCE TEXTBOOKS */}
      {/* ========================================================================= */}
      {activeTab === 'curated' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#d4af37] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={curatedSearchQuery}
              onChange={(e) => setCuratedSearchQuery(e.target.value)}
              placeholder="Search textbooks, chapters, or authors..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0f172a] border border-[#d4af37]/25 text-xs sm:text-sm text-[#fbf9f4] placeholder-[#9ca3af] focus:outline-none focus:border-[#d4af37] transition-colors"
            />
          </div>

          {/* Dynamic subject filter tabs with Inertial Smooth Fluid Pill */}
          <div
            ref={curatedSubjectTabsRef}
            className="relative flex items-center gap-1.5 p-1 bg-[#090e1c] rounded-xl border border-[#d4af37]/20 overflow-x-auto no-scrollbar"
          >
            {curatedSubPill.visible && (
              <span
                aria-hidden="true"
                style={{
                  width: `${curatedSubPill.width}px`,
                  height: `${curatedSubPill.height}px`,
                  transform: `translate3d(${curatedSubPill.x}px, ${curatedSubPill.y}px, 0)`,
                }}
                className="svh-inertial-fluid-pill svh-inertial-fluid-pill-solid rounded-lg bg-[#d4af37] shadow-sm"
              />
            )}
            {curatedSubjectTabs.map((sub) => {
              const isActive = selectedSubject === sub;
              return (
                <button
                  key={sub}
                  data-svh-fluid-active={isActive ? 'true' : 'false'}
                  onClick={() => setSelectedSubject(sub)}
                  className={`relative z-10 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'text-[#080d1a] font-bold'
                      : 'text-[#cbd5e1] hover:text-[#fbf9f4]'
                  }`}
                >
                  {sub}
                </button>
              );
            })}
          </div>

          {/* Books Grid */}
          {isBooksShimmering ? (
            <GlassMetallicSkeleton variant="books" count={4} />
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {curatedBooksToDisplay.map((book) => {
              const bookmarked = isBookmarked(book.id);

              return (
                <div
                  key={book.id}
                  className="svh-3d-tilt-card rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 hover:border-[#d4af37]/60 p-4 flex flex-col justify-between transition-all group shadow-md space-y-4"
                >
                  <div className="flex gap-4">
                    {/* Book Cover */}
                    <div className="w-24 sm:w-28 shrink-0 aspect-[3/4] rounded-xl overflow-hidden bg-[#131b2e] border border-[#d4af37]/25 relative group-hover:shadow-md transition-shadow">
                      {book.coverImage ? (
                        <img
                          src={book.coverImage}
                          alt={book.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-b from-[#131d38] via-[#0b1224] to-[#070b16] p-2 flex flex-col justify-between text-center border border-[#d4af37]/20">
                          <div className="text-[9px] uppercase tracking-wider text-[#d4af37] font-mono">
                            {book.subject}
                          </div>
                          <BookOpen className="w-6 h-6 text-[#d4af37] mx-auto my-1" />
                          <div className="text-[10px] font-display font-bold text-[#fbf9f4] line-clamp-2">
                            {book.title}
                          </div>
                          <div className="text-[8px] text-[#9ca3af] truncate">
                            {book.edition}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleBookmark(book.id);
                        }}
                        aria-label="Toggle Bookmark"
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-[#080d1a]/85 backdrop-blur-sm border border-[#d4af37]/30 flex items-center justify-center text-[#9ca3af] hover:text-[#d4af37] transition-colors"
                      >
                        <Bookmark className={`w-3 h-3 ${bookmarked ? 'fill-[#d4af37] text-[#d4af37]' : ''}`} />
                      </button>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#9ca3af] mb-1">
                          <span className="text-[#d4af37] font-semibold">{book.subject}</span>
                          <span aria-hidden="true">·</span>
                          <span>{book.edition}</span>
                        </div>

                        <h3 className="font-display text-sm sm:text-base font-bold text-[#fbf9f4] line-clamp-2 group-hover:text-[#d4af37] transition-colors">
                          {book.title}
                        </h3>
                        <p className="text-xs text-[#9ca3af] truncate mt-0.5">By {book.author}</p>

                        <div className="flex items-center gap-2 mt-2 text-xs text-[#cbd5e1]">
                          <div className="flex items-center gap-1 text-amber-300">
                            <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                            <span className="font-semibold tabular-nums">{book.rating}</span>
                          </div>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{book.totalChapters} Chapters</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{book.pages} pgs</span>
                        </div>

                        <p className="text-xs text-[#cbd5e1] line-clamp-2 mt-2 leading-relaxed">
                          {book.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action bar */}
                  <div className="pt-3 border-t border-[#1e293b] flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleDownloadOffline(book)}
                      className="px-2.5 py-1.5 rounded-lg border border-[#d4af37]/20 bg-[#131b2e] hover:border-[#d4af37] text-xs text-[#cbd5e1] flex items-center gap-1.5 transition-colors"
                      title="Make available offline"
                    >
                      <DownloadCloud className="w-3.5 h-3.5 text-[#d4af37]" />
                      <span className="hidden sm:inline">Offline</span>
                      <span className="text-[10px] text-[#9ca3af]">({book.downloadSize})</span>
                    </button>

                    <button
                      onClick={() => onSelectBook(book)}
                      className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] hover:brightness-110 text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <span>Open Chapters</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DEDICATED OFFICIAL NCERT LIBRARY */}
      {/* ========================================================================= */}
      {activeTab === 'ncert' && (
        <div className="space-y-5">
          {/* NCERT Header Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0d162a] via-[#101c36] to-[#0a1122] border border-[#d4af37]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#d4af37] bg-[#d4af37]/15 px-2.5 py-0.5 rounded-full border border-[#d4af37]/30">
                  NATIONAL COUNCIL OF EDUCATIONAL RESEARCH AND TRAINING
                </span>
              </div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-[#fbf9f4]">
                Official NCERT Digital Library
              </h2>
              <p className="text-xs sm:text-sm text-[#cbd5e1] max-w-2xl leading-relaxed">
                Complete, authentic NCERT textbooks for Classes 10, 11, and 12 across Science, Commerce, and Humanities with direct official portal links, high-yield chapter summaries, and instant question practice!
              </p>
            </div>

            <a
              href="https://ncert.nic.in/textbook.php"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-[#d4af37] text-[#080d1a] hover:brightness-110 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shrink-0 shadow-sm"
            >
              <span>NCERT Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* NCERT Multi-level Filter Controls */}
          <div className="space-y-3 p-3.5 sm:p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#d4af37] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={ncertSearchQuery}
                onChange={(e) => setNcertSearchQuery(e.target.value)}
                placeholder="Search NCERT textbooks, subjects, or chapter titles..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#090e1c] border border-[#d4af37]/25 text-xs sm:text-sm text-[#fbf9f4] placeholder-[#9ca3af] focus:outline-none focus:border-[#d4af37] transition-colors"
              />
            </div>

            {/* Filter Rows: Class & Stream */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Class Filter */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-[#d4af37] uppercase tracking-wider">
                  Class Level
                </span>
                <div className="flex items-center gap-1 p-1 bg-[#090e1c] rounded-xl border border-[#d4af37]/20 overflow-x-auto no-scrollbar">
                  {['All', 'Class 10', 'Class 11', 'Class 12'].map((cls) => (
                    <button
                      key={cls}
                      onClick={() => setNcertClassFilter(cls)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                        ncertClassFilter === cls
                          ? 'bg-[#d4af37] text-[#080d1a] font-bold shadow-sm'
                          : 'text-[#cbd5e1] hover:text-[#fbf9f4]'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stream Filter */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-[#d4af37] uppercase tracking-wider">
                  Academic Stream
                </span>
                <div className="flex items-center gap-1 p-1 bg-[#090e1c] rounded-xl border border-[#d4af37]/20 overflow-x-auto no-scrollbar">
                  {['All', 'Science', 'Commerce', 'Humanities', 'General'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setNcertStreamFilter(st)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                        ncertStreamFilter === st
                          ? 'bg-[#d4af37] text-[#080d1a] font-bold shadow-sm'
                          : 'text-[#cbd5e1] hover:text-[#fbf9f4]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Subject Chips with Inertial Smooth Fluid Pill */}
            <div className="space-y-1 pt-1">
              <span className="text-[11px] font-semibold text-[#d4af37] uppercase tracking-wider">
                Subject Filter
              </span>
              <div
                ref={ncertSubjectTabsRef}
                className="relative flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1"
              >
                {ncertSubPill.visible && (
                  <span
                    aria-hidden="true"
                    style={{
                      width: `${ncertSubPill.width}px`,
                      height: `${ncertSubPill.height}px`,
                      transform: `translate3d(${ncertSubPill.x}px, ${ncertSubPill.y}px, 0)`,
                    }}
                    className="svh-inertial-fluid-pill svh-inertial-fluid-pill-solid rounded-lg bg-[#d4af37] shadow-sm"
                  />
                )}
                {[
                  'All',
                  'Biology',
                  'Physics',
                  'Chemistry',
                  'Mathematics',
                  'Accountancy',
                  'Business Studies',
                  'Economics',
                  'Science',
                  'Social Science',
                  'History',
                  'Political Science',
                  'Computer Science',
                  'English'
                ].map((sub) => {
                  const isActive = ncertSubjectFilter === sub;
                  return (
                    <button
                      key={sub}
                      data-svh-fluid-active={isActive ? 'true' : 'false'}
                      onClick={() => setNcertSubjectFilter(sub)}
                      className={`relative z-10 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border cursor-pointer ${
                        isActive
                          ? 'text-[#080d1a] border-[#d4af37] font-bold'
                          : 'bg-[#090e1c]/60 text-[#cbd5e1] border-[#1e293b] hover:border-[#d4af37]/40 hover:text-white'
                      }`}
                    >
                      {sub}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between text-xs text-[#9ca3af] px-1">
            <span>
              Showing <strong className="text-[#fbf9f4]">{filteredNCERTBooks.length}</strong> official textbooks
            </span>
            <span>Direct NCERT Portal Verified</span>
          </div>

          {/* NCERT Books Grid */}
          {isBooksShimmering ? (
            <GlassMetallicSkeleton variant="notes" count={4} />
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNCERTBooks.map((nBook) => {
              const bookmarked = isBookmarked(nBook.id);

              return (
                <div
                  key={nBook.id}
                  className="svh-3d-tilt-card rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 hover:border-[#d4af37]/60 p-4 sm:p-5 flex flex-col justify-between transition-all group shadow-md space-y-4"
                >
                  <div className="space-y-3">
                    {/* Top Row: Class, Stream, Code & Bookmark */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-[#d4af37]/15 border border-[#d4af37]/35 text-[#d4af37] text-[10px] font-mono font-bold">
                          {nBook.classLevel}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#131b2e] border border-[#d4af37]/20 text-[#cbd5e1] text-[10px] font-medium">
                          {nBook.stream}
                        </span>
                        <span className="text-[10px] font-mono text-[#9ca3af]">
                          Code: {nBook.code}
                        </span>
                      </div>

                      <button
                        onClick={() => onToggleBookmark(nBook.id)}
                        aria-label="Toggle Bookmark"
                        className="p-1.5 rounded-lg bg-[#131b2e] border border-[#d4af37]/25 text-[#9ca3af] hover:text-[#d4af37] transition-colors"
                      >
                        <Bookmark
                          className={`w-3.5 h-3.5 ${
                            bookmarked ? 'fill-[#d4af37] text-[#d4af37]' : ''
                          }`}
                        />
                      </button>
                    </div>

                    {/* Book Title & Subject */}
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold text-[#d4af37] uppercase tracking-wider">
                        {nBook.subject}
                      </div>
                      <h3 className="font-display text-base sm:text-lg font-bold text-[#fbf9f4] group-hover:text-[#d4af37] transition-colors line-clamp-1">
                        {nBook.title}
                      </h3>
                      <p className="text-xs text-[#cbd5e1] line-clamp-2 leading-relaxed">
                        {nBook.description}
                      </p>
                    </div>

                    {/* Stats & Chapters Preview */}
                    <div className="p-2.5 rounded-xl bg-[#090e1c] border border-[#1e293b] flex items-center justify-between text-xs text-[#cbd5e1]">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#d4af37]" />
                        <span>
                          <strong className="text-[#fbf9f4]">{nBook.chapters.length}</strong> Official Chapters
                        </span>
                      </div>
                      <span className="text-[11px] text-[#9ca3af]">
                        NCERT National Curriculum
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-[#1e293b] flex items-center justify-between gap-2">
                    <a
                      href={nBook.officialPortalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-[#131b2e] hover:bg-[#1a253e] border border-[#d4af37]/25 text-xs text-[#cbd5e1] hover:text-white flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3 text-[#d4af37]" />
                      <span>Portal</span>
                    </a>

                    <button
                      onClick={() => setSelectedNCERTBook(nBook)}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] hover:brightness-110 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <span>Open Chapters & Notes</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          )}

          {filteredNCERTBooks.length === 0 && (
            <div className="p-8 text-center rounded-2xl bg-[#0f172a] border border-[#d4af37]/20 space-y-2">
              <BookOpen className="w-8 h-8 text-[#d4af37] mx-auto opacity-60" />
              <h3 className="text-sm font-semibold text-[#fbf9f4]">No textbooks matched your filter</h3>
              <p className="text-xs text-[#9ca3af]">Try clearing the search query or changing class/stream filters.</p>
              <button
                onClick={() => {
                  setNcertClassFilter('All');
                  setNcertStreamFilter('All');
                  setNcertSubjectFilter('All');
                  setNcertSearchQuery('');
                }}
                className="mt-2 px-3 py-1.5 rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#d4af37] text-xs font-semibold"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* NCERT Book Modal */}
      {selectedNCERTBook && (
        <NCERTBookModal
          book={selectedNCERTBook}
          onClose={() => setSelectedNCERTBook(null)}
          isBookmarked={isBookmarked(selectedNCERTBook.id)}
          onToggleBookmark={onToggleBookmark}
          onPracticeChapter={(subject, chapterTitle, classLevel) => {
            if (onPracticeNCERTChapter) {
              onPracticeNCERTChapter(subject, chapterTitle, classLevel);
            }
          }}
        />
      )}

      {/* Academic Source & Copyright Compliance Notice */}
      <div className="p-3.5 rounded-2xl bg-[#090e1c] border border-[#1e293b] text-[11px] text-[#9ca3af] leading-relaxed">
        <strong className="text-[#d4af37]">Academic Content &amp; Attribution Notice:</strong> In-app reference guides and chapter summaries are original educational synopses created by the Study Vault Hub Academic Team. Official NCERT textbook links direct students to the public National Council of Educational Research and Training portal (ncert.nic.in). Study Vault Hub is an independent educational platform and is not affiliated with or endorsed by NCERT or any examination board.
      </div>
    </div>
  );
});
