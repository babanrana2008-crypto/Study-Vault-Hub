import React, { useState } from 'react';
import {
  ShieldCheck,
  Database,
  Lock,
  FileCheck,
  Trash2,
  Send,
  MessageCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ActiveSection } from '../types';
import { APP_LOGO } from '../data/sampleData';
import { OFFICIAL_WHATSAPP_CHANNEL_URL } from './WhatsAppChannelBanner';

export const OFFICIAL_TELEGRAM_CHANNEL_URL = 'https://t.me/svhnotes';

interface PremiumFooterProps {
  onNavigate: (section: ActiveSection) => void;
}

type PolicySectionKey = 'privacy' | 'data' | 'security' | 'terms' | 'deletion' | null;

export const PremiumFooter: React.FC<PremiumFooterProps> = React.memo(({ onNavigate }) => {
  const [activePolicy, setActivePolicy] = useState<PolicySectionKey>(null);

  const togglePolicy = (key: Exclude<PolicySectionKey, null>) => {
    setActivePolicy((prev) => (prev === key ? null : key));
  };

  return (
    <footer
      aria-label="Platform Footer"
      className="mt-8 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0c1428] via-[#091020] to-[#060b18] border border-[#d4af37]/30 p-5 sm:p-7 space-y-6 shadow-xl"
    >
      {/* Top Row: Brand Identity + Official Community Channels */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#1e293b]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden shrink-0 aspect-square flex items-center justify-center">
            <img
              src={APP_LOGO}
              alt="Study Vault Hub"
              width={44}
              height={44}
              decoding="async"
              className="w-full h-full rounded-full object-contain aspect-square"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="min-w-0">
            <div className="font-display text-sm sm:text-base font-bold text-[#fbf9f4] truncate">
              Study Vault Hub
            </div>
            <div className="text-[11px] text-[#cbd5e1] font-mono truncate">
              Developed by <span className="text-[#d4af37] font-semibold">Soumyadip Rana</span>
            </div>
          </div>
        </div>

        {/* Verified External Channels */}
        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={OFFICIAL_WHATSAPP_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer external"
            className="px-3.5 py-2 rounded-xl bg-[#131b2e] hover:bg-[#d4af37] text-[#fbf9f4] hover:text-[#080d1a] border border-[#d4af37]/35 text-xs font-semibold inline-flex items-center gap-1.5 transition-all no-underline cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
            <span>Official WhatsApp Channel</span>
            <ExternalLink className="w-3 h-3 shrink-0 opacity-80" />
          </a>

          <a
            href={OFFICIAL_TELEGRAM_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer external"
            className="px-3.5 py-2 rounded-xl bg-[#131b2e] hover:bg-[#d4af37] text-[#fbf9f4] hover:text-[#080d1a] border border-[#d4af37]/35 text-xs font-semibold inline-flex items-center gap-1.5 transition-all no-underline cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
            <span>Telegram Community (@svhnotes)</span>
            <ExternalLink className="w-3 h-3 shrink-0 opacity-80" />
          </a>
        </div>
      </div>

      {/* Policy, Security & Account Controls Navigation Strip */}
      <div className="space-y-3">
        <div className="text-[11px] font-mono uppercase tracking-wider text-[#d4af37]">
          Platform Transparency, Policies &amp; Account Controls
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <button
            type="button"
            onClick={() => togglePolicy('privacy')}
            aria-expanded={activePolicy === 'privacy'}
            className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
              activePolicy === 'privacy'
                ? 'bg-[#131b2e] border-[#d4af37] text-[#d4af37]'
                : 'bg-[#0f172a] border-[#d4af37]/25 text-[#fbf9f4] hover:border-[#d4af37]/60'
            }`}
          >
            <span className="flex items-center gap-1.5 truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
              <span className="truncate">Privacy Policy</span>
            </span>
            {activePolicy === 'privacy' ? (
              <ChevronUp className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={() => togglePolicy('data')}
            aria-expanded={activePolicy === 'data'}
            className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
              activePolicy === 'data'
                ? 'bg-[#131b2e] border-[#d4af37] text-[#d4af37]'
                : 'bg-[#0f172a] border-[#d4af37]/25 text-[#fbf9f4] hover:border-[#d4af37]/60'
            }`}
          >
            <span className="flex items-center gap-1.5 truncate">
              <Database className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
              <span className="truncate">Data Collection</span>
            </span>
            {activePolicy === 'data' ? (
              <ChevronUp className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={() => togglePolicy('security')}
            aria-expanded={activePolicy === 'security'}
            className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
              activePolicy === 'security'
                ? 'bg-[#131b2e] border-[#d4af37] text-[#d4af37]'
                : 'bg-[#0f172a] border-[#d4af37]/25 text-[#fbf9f4] hover:border-[#d4af37]/60'
            }`}
          >
            <span className="flex items-center gap-1.5 truncate">
              <Lock className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
              <span className="truncate">Security</span>
            </span>
            {activePolicy === 'security' ? (
              <ChevronUp className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={() => togglePolicy('terms')}
            aria-expanded={activePolicy === 'terms'}
            className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
              activePolicy === 'terms'
                ? 'bg-[#131b2e] border-[#d4af37] text-[#d4af37]'
                : 'bg-[#0f172a] border-[#d4af37]/25 text-[#fbf9f4] hover:border-[#d4af37]/60'
            }`}
          >
            <span className="flex items-center gap-1.5 truncate">
              <FileCheck className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
              <span className="truncate">Terms &amp; Conditions</span>
            </span>
            {activePolicy === 'terms' ? (
              <ChevronUp className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={() => togglePolicy('deletion')}
            aria-expanded={activePolicy === 'deletion'}
            className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between gap-1.5 transition-all cursor-pointer col-span-2 sm:col-span-1 ${
              activePolicy === 'deletion'
                ? 'bg-[#131b2e] border-[#d4af37] text-[#d4af37]'
                : 'bg-[#0f172a] border-[#d4af37]/25 text-[#fbf9f4] hover:border-[#d4af37]/60'
            }`}
          >
            <span className="flex items-center gap-1.5 truncate">
              <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="truncate">Account Deletion</span>
            </span>
            {activePolicy === 'deletion' ? (
              <ChevronUp className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
            )}
          </button>
        </div>

        {/* Expandable Verified Policy Details */}
        {activePolicy === 'privacy' && (
          <div className="p-4 rounded-2xl bg-[#090e1c] border border-[#d4af37]/30 space-y-2 text-xs text-[#cbd5e1] leading-relaxed">
            <h4 className="font-display font-bold text-[#fbf9f4] text-sm">
              Privacy Policy
            </h4>
            <p>
              Study Vault Hub respects student privacy. Your study progress, tasks, bookmarks, and profile settings are used solely to provide your personal study workspace across web and Android. We do not sell personal data, collect precise GPS coordinates, or run third-party advertising networks.
            </p>
          </div>
        )}

        {activePolicy === 'data' && (
          <div className="p-4 rounded-2xl bg-[#090e1c] border border-[#d4af37]/30 space-y-2 text-xs text-[#cbd5e1] leading-relaxed">
            <h4 className="font-display font-bold text-[#fbf9f4] text-sm">
              Data Collection Transparency
            </h4>
            <p>
              Study Vault Hub stores only the data you explicitly create or provide: your display name, optional username, hashed account credentials, selected exam goals, study stopwatch sessions, MCQ practice history, bookmarks, and community or SVH AI study queries.
            </p>
          </div>
        )}

        {activePolicy === 'security' && (
          <div className="p-4 rounded-2xl bg-[#090e1c] border border-[#d4af37]/30 space-y-2 text-xs text-[#cbd5e1] leading-relaxed">
            <h4 className="font-display font-bold text-[#fbf9f4] text-sm">
              Account &amp; Platform Security
            </h4>
            <p>
              Account passwords are never stored in plaintext; credentials and session tokens are cryptographically hashed before storage. Gemini AI queries are processed without exposing server API keys in client bundles, and community posts include built-in reporting and moderation controls.
            </p>
          </div>
        )}

        {activePolicy === 'terms' && (
          <div className="p-4 rounded-2xl bg-[#090e1c] border border-[#d4af37]/30 space-y-2 text-xs text-[#cbd5e1] leading-relaxed">
            <h4 className="font-display font-bold text-[#fbf9f4] text-sm">
              Terms and Conditions
            </h4>
            <p>
              Study Vault Hub is an independent educational platform developed by Soumyadip Rana and is not affiliated with NCERT, NTA, CBSE, CISCE, or any examination authority. All in-app handbooks, notes, and practice questions are original educational aids; official NCERT textbook links open the public NCERT portal (ncert.nic.in). Users must keep community discussions respectful and academic.
            </p>
          </div>
        )}

        {activePolicy === 'deletion' && (
          <div className="p-4 rounded-2xl bg-[#090e1c] border border-[#d4af37]/30 space-y-3 text-xs text-[#cbd5e1] leading-relaxed">
            <h4 className="font-display font-bold text-[#fbf9f4] text-sm">
              Permanent Account Deletion
            </h4>
            <p>
              You can permanently delete your Study Vault Hub account, profile, study tracker records, practice history, bookmarks, and private SVH AI conversations at any time from the Profile section using the verified Delete Account control.
            </p>
            <div>
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="px-3.5 py-2 rounded-xl bg-[#131b2e] hover:bg-[#d4af37] text-[#d4af37] hover:text-[#080d1a] border border-[#d4af37]/35 font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Go to Profile &amp; Account Deletion Controls →</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Legal & Independent Attribution Notice */}
      <div className="pt-4 border-t border-[#1e293b] text-[11px] text-[#9ca3af] text-center leading-relaxed">
        Study Vault Hub is an independent educational study platform developed by Soumyadip Rana and is not affiliated with or endorsed by NCERT, NTA, CBSE, or any examination authority. In-app guides and practice questions are original study resources; official NCERT textbook links open the public NCERT portal (ncert.nic.in).
      </div>
    </footer>
  );
});
