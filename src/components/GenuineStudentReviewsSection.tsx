import React from 'react';
import { MessageSquareQuote, ShieldCheck, MessagesSquare } from 'lucide-react';
import { ActiveSection } from '../types';

interface GenuineStudentReviewsSectionProps {
  onNavigate?: (section: ActiveSection) => void;
}

/**
 * Genuine Student Reviews Section.
 * Strictly adheres to the non-negotiable authenticity rule:
 * - Never displays fake testimonials, sample users, or fabricated ratings.
 * - Does not add a new database or modify existing backend/Firestore security rules.
 * - Displays an honest, clean empty state when no verified review records exist.
 */
export const GenuineStudentReviewsSection: React.FC<GenuineStudentReviewsSectionProps> = React.memo(
  ({ onNavigate }) => {
    return (
      <section
        aria-label="Student Reviews"
        className="stenciled-card card-corner-stencil p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0c1428] via-[#091020] to-[#060b18] border border-[#d4af37]/35 shadow-xl space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#d4af37] uppercase tracking-wider">
              <MessageSquareQuote className="w-4 h-4" />
              <span>Student Reviews</span>
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#fbf9f4]">
              Verified Student Feedback
            </h2>
            <p className="text-xs text-[#9ca3af]">
              Only genuine, verified reviews submitted by real Study Vault Hub students are displayed here.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#cbd5e1] self-start sm:self-center">
            <ShieldCheck className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
            <span>Zero Fake Testimonials Policy</span>
          </div>
        </div>

        {/* Honest Empty State — Zero fabricated ratings or sample reviews */}
        <div className="p-6 sm:p-7 rounded-2xl bg-[#090e1c] border border-[#d4af37]/25 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#131b2e] border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37] mx-auto">
            <MessageSquareQuote className="w-5 h-5" />
          </div>
          <div className="space-y-1 max-w-lg mx-auto">
            <h3 className="font-display text-sm sm:text-base font-bold text-[#fbf9f4]">
              No verified student reviews have been submitted yet
            </h3>
            <p className="text-xs text-[#9ca3af] leading-relaxed">
              Study Vault Hub never displays fabricated ratings, placeholder quotes, or sample student testimonials. Dedicated review storage is not enabled in the current database schema to preserve existing backend and Firestore security rules.
            </p>
          </div>
          {onNavigate && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => onNavigate('community')}
                className="px-4 py-2 rounded-xl bg-[#131b2e] hover:bg-[#d4af37] text-[#d4af37] hover:text-[#080d1a] border border-[#d4af37]/35 font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <MessagesSquare className="w-3.5 h-3.5" />
                <span>Visit Student Community Discussions</span>
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }
);
