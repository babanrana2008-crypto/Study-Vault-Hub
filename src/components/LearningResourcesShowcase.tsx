import React from 'react';
import {
  FileText,
  BookOpen,
  GraduationCap,
  CheckCircle2,
  BarChart3,
  Box,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { ActiveSection } from '../types';
import { SAMPLE_BOOKS, SAMPLE_NOTES } from '../data/sampleData';
import { NCERT_BOOKS_COLLECTION } from '../data/ncertBooksData';
import { COMPLETE_SYLLABUS_CHAPTERS } from '../data/syllabusData';

interface LearningResourcesShowcaseProps {
  activeGoal: string;
  onNavigate: (section: ActiveSection) => void;
  onOpenFocusMode: () => void;
}

export const LearningResourcesShowcase: React.FC<LearningResourcesShowcaseProps> = React.memo(
  ({ activeGoal, onNavigate, onOpenFocusMode }) => {
    const totalNcertChapters = NCERT_BOOKS_COLLECTION.reduce(
      (sum, b) => sum + (b.chapters?.length || 0),
      0
    );

    return (
      <section
        aria-label="Learning Resources Directory"
        className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0c1428] via-[#091020] to-[#060b18] border border-[#d4af37]/35 shadow-xl space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#d4af37] uppercase tracking-wider">
              <Layers className="w-4 h-4" />
              <span>Core Learning Ecosystem</span>
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#fbf9f4]">
              Complete Study Resources &amp; Tools
            </h2>
            <p className="text-xs text-[#9ca3af]">
              Direct access to Study Vault Hub&apos;s verified notes, reference books, official NCERT portal links, adaptive question bank, and study tracker.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* 1. High-Yield Notes */}
          <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 hover:border-[#d4af37]/55 flex flex-col justify-between space-y-3 transition-all">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#131b2e] border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37]">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-mono text-[#9ca3af] tabular-nums">
                  {SAMPLE_NOTES.length} Revision Sheets
                </span>
              </div>
              <h3 className="font-display text-sm sm:text-base font-bold text-[#fbf9f4]">
                High-Yield Revision Notes
              </h3>
              <p className="text-xs text-[#cbd5e1] leading-relaxed">
                Concise chapter summaries, reaction mechanisms, formula compendiums, and examiner tips with completion tracking.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('notes')}
              className="w-full py-2 px-3 rounded-xl bg-[#131b2e] hover:bg-[#d4af37] text-[#fbf9f4] hover:text-[#080d1a] border border-[#d4af37]/30 text-xs font-semibold flex items-center justify-between transition-all cursor-pointer"
            >
              <span>Open Revision Notes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 2. Reference Books */}
          <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 hover:border-[#d4af37]/55 flex flex-col justify-between space-y-3 transition-all">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#131b2e] border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37]">
                  <BookOpen className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-mono text-[#9ca3af] tabular-nums">
                  {SAMPLE_BOOKS.length} In-App Handbooks
                </span>
              </div>
              <h3 className="font-display text-sm sm:text-base font-bold text-[#fbf9f4]">
                Curated Reference Books
              </h3>
              <p className="text-xs text-[#cbd5e1] leading-relaxed">
                Original Study Vault Hub subject handbooks covering Biology, Physics, Chemistry, Mathematics, Accountancy, and Economics.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('books')}
              className="w-full py-2 px-3 rounded-xl bg-[#131b2e] hover:bg-[#d4af37] text-[#fbf9f4] hover:text-[#080d1a] border border-[#d4af37]/30 text-xs font-semibold flex items-center justify-between transition-all cursor-pointer"
            >
              <span>Browse Reference Books</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 3. Official NCERT Library */}
          <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 hover:border-[#d4af37]/55 flex flex-col justify-between space-y-3 transition-all">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#131b2e] border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37]">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-mono text-[#9ca3af] tabular-nums">
                  {NCERT_BOOKS_COLLECTION.length} Books · {totalNcertChapters} Chapters
                </span>
              </div>
              <h3 className="font-display text-sm sm:text-base font-bold text-[#fbf9f4]">
                Official NCERT Library
              </h3>
              <p className="text-xs text-[#cbd5e1] leading-relaxed">
                Chapter-by-chapter NCERT key points and direct verified links to official NCERT textbooks (Classes 10, 11 &amp; 12).
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('books')}
              className="w-full py-2 px-3 rounded-xl bg-[#131b2e] hover:bg-[#d4af37] text-[#fbf9f4] hover:text-[#080d1a] border border-[#d4af37]/30 text-xs font-semibold flex items-center justify-between transition-all cursor-pointer"
            >
              <span>Open NCERT Library</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 4. AI Question Practice */}
          <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 hover:border-[#d4af37]/55 flex flex-col justify-between space-y-3 transition-all">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#131b2e] border border-[#d4af37]/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-mono text-[#9ca3af] tabular-nums">
                  {COMPLETE_SYLLABUS_CHAPTERS.length} Syllabus Chapters
                </span>
              </div>
              <h3 className="font-display text-sm sm:text-base font-bold text-[#fbf9f4]">
                AI Question Practice &amp; Sprints
              </h3>
              <p className="text-xs text-[#cbd5e1] leading-relaxed">
                Filter by Class, Subject, Chapter, and Difficulty for instant-feedback Practice Mode or Timed Exam Test Sprints.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('practice')}
              className="w-full py-2 px-3 rounded-xl bg-[#131b2e] hover:bg-[#d4af37] text-[#fbf9f4] hover:text-[#080d1a] border border-[#d4af37]/30 text-xs font-semibold flex items-center justify-between transition-all cursor-pointer"
            >
              <span>Launch Question Practice</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 5. Study Tracker & Focus Mode */}
          <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 hover:border-[#d4af37]/55 flex flex-col justify-between space-y-3 transition-all">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#131b2e] border border-[#d4af37]/30 flex items-center justify-center text-amber-400">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-mono text-[#9ca3af]">
                  Stopwatch · Planner · AI Schedule
                </span>
              </div>
              <h3 className="font-display text-sm sm:text-base font-bold text-[#fbf9f4]">
                Study Tracker &amp; Focus Mode
              </h3>
              <p className="text-xs text-[#cbd5e1] leading-relaxed">
                Track real subject study minutes, manage daily planner tasks, and generate custom Gemini AI revision schedules.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onNavigate('tracker')}
                className="py-2 px-2.5 rounded-xl bg-[#131b2e] hover:bg-[#d4af37] text-[#fbf9f4] hover:text-[#080d1a] border border-[#d4af37]/30 text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <span>Open Tracker</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={onOpenFocusMode}
                className="py-2 px-2.5 rounded-xl bg-[#090e1c] hover:bg-[#131b2e] text-[#d4af37] border border-[#d4af37]/30 text-xs font-semibold flex items-center justify-center transition-all cursor-pointer"
              >
                <span>Focus Mode</span>
              </button>
            </div>
          </div>

          {/* 6. 3D Labs & Spatial Concept Exploration */}
          <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#d4af37]/25 hover:border-[#d4af37]/55 flex flex-col justify-between space-y-3 transition-all">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#131b2e] border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37]">
                  <Box className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-mono text-[#9ca3af]">
                   Blueprints &amp; Diagrams
                </span>
              </div>
              <h3 className="font-display text-sm sm:text-base font-bold text-[#fbf9f4]">
                3D Labs &amp; Visual Concept Blueprints
              </h3>
              <p className="text-xs text-[#cbd5e1] leading-relaxed">
                Explore structural science topics, 3D geometry &amp; vector chapters, and interactive syllabus blueprints for {activeGoal}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('prep')}
              className="w-full py-2 px-3 rounded-xl bg-[#131b2e] hover:bg-[#d4af37] text-[#fbf9f4] hover:text-[#080d1a] border border-[#d4af37]/30 text-xs font-semibold flex items-center justify-between transition-all cursor-pointer"
            >
              <span>Explore Blueprints &amp; Labs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>
    );
  }
);
