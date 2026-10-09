import React from 'react';
import { MessageCircle, ArrowRight, ExternalLink } from 'lucide-react';

export const OFFICIAL_WHATSAPP_CHANNEL_URL =
  'https://whatsapp.com/channel/0029VbE6ljpHFxP6wdlyW01I';

interface WhatsAppChannelBannerProps {
  isFloatingTopDock?: boolean;
}

export const WhatsAppChannelBanner: React.FC<WhatsAppChannelBannerProps> = React.memo(
  ({ isFloatingTopDock = false }) => {
    return (
      <div
        role="region"
        aria-label="Official WhatsApp Channel"
        className={`w-full max-w-5xl mx-auto px-3.5 sm:px-6 ${
          isFloatingTopDock ? 'pt-3' : 'pt-2.5'
        }`}
      >
        <div className="rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#0c1428] via-[#091122] to-[#060b18] border border-[#d4af37]/30 px-3 sm:px-4 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#131b2e] border border-[#d4af37]/35 flex items-center justify-center text-[#d4af37] shrink-0">
              <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] sm:text-xs font-semibold text-[#fbf9f4] leading-snug truncate">
                Official Study Vault Hub WhatsApp Channel
              </p>
              <p className="text-[10px] sm:text-[11px] text-[#cbd5e1] leading-tight truncate">
                Get verified exam updates, revision notes &amp; study alerts directly on WhatsApp
              </p>
            </div>
          </div>

          <a
            href={OFFICIAL_WHATSAPP_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer external"
            aria-label="Join Official Study Vault Hub WhatsApp Channel"
            className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-[11px] sm:text-xs inline-flex items-center justify-center gap-1.5 shrink-0 hover:brightness-110 active:scale-[0.98] transition-all shadow-sm no-underline cursor-pointer"
          >
            <span className="whitespace-nowrap">Join Channel</span>
            <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 hidden sm:inline" />
            <ExternalLink className="w-3 h-3 shrink-0 sm:hidden" />
          </a>
        </div>
      </div>
    );
  }
);
