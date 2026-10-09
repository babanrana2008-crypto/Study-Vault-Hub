import React, { useMemo } from 'react';
import {
  GraduationCap,
  BookOpen,
  FileText,
  CheckCircle2,
  Award,
  ArrowRight,
  Compass,
  Layers,
} from 'lucide-react';
import { ActiveSection } from '../types';
import { SAMPLE_BOOKS, SAMPLE_NOTES } from '../data/sampleData';
import { NCERT_BOOKS_COLLECTION } from '../data/ncertBooksData';
import { COMPLETE_SYLLABUS_CHAPTERS } from '../data/syllabusData';

interface LearningPathsSectionProps {
  activeGoal: string;
  onSelectActiveGoal: (goal: string) => void;
  onNavigate: (section: ActiveSection) => void;
}

interface LearningPathCardData {
  id: string;
  title: string;
  subtitle: string;
  goalKey: string;
  classFilter?: string;
  subjects: string[];
  description: string;
  ncertCount: number;
  syllabusChaptersCount: number;
  notesAndBooksCount: number;
}

export const LearningPathsSection: React.FC<LearningPathsSectionProps> = React.memo(
  ({ activeGoal, onSelectActiveGoal, onNavigate }) => {
    const learningPaths = useMemo<LearningPathCardData[]>(() => {
      const countNcertByClass = (cls: string) =>
        NCERT_BOOKS_COLLECTION.filter((b) => b.classLevel === cls).length;

      const countChaptersByClass = (cls: string) =>
        COMPLETE_SYLLABUS_CHAPTERS.filter((c) => c.classLevel === cls).length;

      const countStreamResources = (stream: string, subjects: string[]) => {
        const books = SAMPLE_BOOKS.filter(
          (b) => b.targetStreams.includes(stream) || subjects.includes(b.subject)
        ).length;
        const notes = SAMPLE_NOTES.filter(
          (n) => n.targetStreams.includes(stream) || subjects.includes(n.subject)
        ).length;
        return books + notes;
      };

      return [
        {
          id: 'path-class-10',
          title: 'Class 10 Foundation & Board Path',
          subtitle: 'Secondary Curriculum · Class 10',
          goalKey: 'Class 10 Board',
          classFilter: 'Class 10',
          subjects: ['Science', 'Mathematics', 'Social Science', 'English'],
          description:
            'Structured Class 10 board preparation with official NCERT textbooks, chapter-wise concept notes, and board-pattern MCQ practice.',
          ncertCount: countNcertByClass('Class 10'),
          syllabusChaptersCount: countChaptersByClass('Class 10'),
          notesAndBooksCount: countStreamResources('Class 10 Board', [
            'Science',
            'Mathematics',
            'Social Science',
            'English',
          ]),
        },
        {
          id: 'path-class-11',
          title: 'Class 11 Core Curriculum Path',
          subtitle: 'Higher Secondary Foundation · Class 11',
          goalKey: 'General Study',
          classFilter: 'Class 11',
          subjects: ['Physics', 'Chemistry', 'Biology', 'Mathematics'],
          description:
            'Build strong Class 11 conceptual fundamentals across Mechanics, Thermodynamics, Organic Chemistry, Cell Biology, and Calculus.',
          ncertCount: countNcertByClass('Class 11'),
          syllabusChaptersCount: countChaptersByClass('Class 11'),
          notesAndBooksCount: countStreamResources('NEET', [
            'Physics',
            'Chemistry',
            'Biology',
            'Mathematics',
          ]),
        },
        {
          id: 'path-class-12',
          title: 'Class 12 Board & Stream Mastery',
          subtitle: 'Senior Secondary · Class 12',
          goalKey: 'Class 12 Board',
          classFilter: 'Class 12',
          subjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Accountancy', 'Economics'],
          description:
            'Complete Class 12 syllabus coverage across Science, Commerce, and Humanities with high-weightage derivations, NCERT chapters, and revision sheets.',
          ncertCount: countNcertByClass('Class 12'),
          syllabusChaptersCount: countChaptersByClass('Class 12'),
          notesAndBooksCount: countStreamResources('Class 12 Board', [
            'Physics',
            'Chemistry',
            'Mathematics',
            'Biology',
            'Accountancy',
            'Economics',
          ]),
        },
        {
          id: 'path-boards',
          title: 'Supported Board Examinations',
          subtitle: 'CBSE · ICSE / ISC · State Boards · CUET',
          goalKey: 'Class 12 Board',
          subjects: ['NCERT Theory', 'Board Pattern MCQs', 'Chapter Synopses', 'Marking Blueprints'],
          description:
            'Aligned with NCERT and national board examination frameworks for Class 10 and Class 12 board aspirants, plus CUET domain preparation.',
          ncertCount: NCERT_BOOKS_COLLECTION.length,
          syllabusChaptersCount: COMPLETE_SYLLABUS_CHAPTERS.length,
          notesAndBooksCount: SAMPLE_BOOKS.length + SAMPLE_NOTES.length,
        },
        {
          id: 'path-neet',
          title: 'NEET UG Medical Preparation',
          subtitle: 'Class 11 + Class 12 PCB · NTA Syllabus',
          goalKey: 'NEET',
          subjects: ['Biology', 'Physics', 'Chemistry'],
          description:
            'Line-by-line NCERT Biology mastery, Physics formula sprints, Organic/Inorganic Chemistry mechanisms, and timed NEET mock sprints.',
          ncertCount: NCERT_BOOKS_COLLECTION.filter((b) =>
            ['Biology', 'Physics', 'Chemistry'].includes(b.subject)
          ).length,
          syllabusChaptersCount: COMPLETE_SYLLABUS_CHAPTERS.filter((c) =>
            ['Biology', 'Physics', 'Chemistry'].includes(c.subject)
          ).length,
          notesAndBooksCount: countStreamResources('NEET', ['Biology', 'Physics', 'Chemistry']),
        },
        {
          id: 'path-jee',
          title: 'JEE Main & Advanced Engineering',
          subtitle: 'Class 11 + Class 12 PCM · Analytical Track',
          goalKey: 'JEE Main',
          subjects: ['Physics', 'Chemistry', 'Mathematics'],
          description:
            'Analytical problem solving across Calculus, Coordinate Geometry, Rotational Mechanics, Electrodynamics, and Physical/Organic Chemistry.',
          ncertCount: NCERT_BOOKS_COLLECTION.filter((b) =>
            ['Physics', 'Chemistry', 'Mathematics'].includes(b.subject)
          ).length,
          syllabusChaptersCount: COMPLETE_SYLLABUS_CHAPTERS.filter((c) =>
            ['Physics', 'Chemistry', 'Mathematics'].includes(c.subject)
          ).length,
          notesAndBooksCount: countStreamResources('JEE Main', [
            'Physics',
            'Chemistry',
            'Mathematics',
          ]),
        },
      ];
    }, []);

    const handleActivatePathAndNavigate = (goalKey: string, section: ActiveSection) => {
      onSelectActiveGoal(goalKey);
      onNavigate(section);
    };

    return (
      <section
        aria-label="Structured Learning Paths"
        className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0c1428] via-[#091020] to-[#060b18] border border-[#d4af37]/35 shadow-xl space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#d4af37] uppercase tracking-wider">
              <GraduationCap className="w-4 h-4" />
              <span>Structured Learning Paths</span>
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#fbf9f4]">
              Classes 10, 11, 12 · Board Exams · NEET · JEE
            </h2>
            <p className="text-xs text-[#9ca3af]">
              Select any academic track to switch your active goal or jump directly into verified books, notes, and chapter practice.
            </p>
          </div>
          <div className="text-xs text-[#cbd5e1] font-mono self-start sm:self-center">
            Active Track: <span className="text-[#d4af37] font-bold">{activeGoal}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {learningPaths.map((path) => {
            const isCurrentGoal = activeGoal === path.goalKey;

            return (
              <div
                key={path.id}
                className={`svh-3d-tilt-card p-4 rounded-2xl border flex flex-col justify-between space-y-3.5 transition-all ${
                  isCurrentGoal
                    ? 'bg-[#101c35] border-[#d4af37]/60 shadow-md'
                    : 'bg-[#0f172a] border-[#d4af37]/25 hover:border-[#d4af37]/50'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-mono text-[#d4af37] block">
                        {path.subtitle}
                      </span>
                      <h3 className="font-display text-sm sm:text-base font-bold text-[#fbf9f4] mt-0.5">
                        {path.title}
                      </h3>
                    </div>
                    {isCurrentGoal && (
                      <span className="text-[10px] font-mono font-bold text-[#d4af37] shrink-0">
                        Active
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#cbd5e1] leading-relaxed">
                    {path.description}
                  </p>

                  {/* Unboxed clean metadata line */}
                  <div className="text-[11px] text-[#9ca3af] pt-0.5 flex flex-wrap items-center gap-1.5 tabular-nums">
                    <span className="text-[#d4af37] font-medium">
                      {path.ncertCount} NCERT Books
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{path.syllabusChaptersCount} Syllabus Chapters</span>
                    <span aria-hidden="true">·</span>
                    <span>{path.notesAndBooksCount} Guides &amp; Notes</span>
                  </div>

                  <div className="text-[11px] text-[#cbd5e1] pt-0.5">
                    <span className="text-[#9ca3af]">Subjects: </span>
                    {path.subjects.join(' · ')}
                  </div>
                </div>

                {/* Direct Actions to Existing Verified Sections */}
                <div className="pt-3 border-t border-[#1e293b] grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleActivatePathAndNavigate(path.goalKey, 'books')}
                    className="px-2 py-1.5 rounded-lg bg-[#131b2e] hover:bg-[#d4af37] text-[#cbd5e1] hover:text-[#080d1a] border border-[#d4af37]/25 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <BookOpen className="w-3 h-3 shrink-0" />
                    <span>Books</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleActivatePathAndNavigate(path.goalKey, 'notes')}
                    className="px-2 py-1.5 rounded-lg bg-[#131b2e] hover:bg-[#d4af37] text-[#cbd5e1] hover:text-[#080d1a] border border-[#d4af37]/25 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <FileText className="w-3 h-3 shrink-0" />
                    <span>Notes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleActivatePathAndNavigate(path.goalKey, 'practice')}
                    className="px-2 py-1.5 rounded-lg bg-[#131b2e] hover:bg-[#d4af37] text-[#cbd5e1] hover:text-[#080d1a] border border-[#d4af37]/25 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>Practice</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }
);
