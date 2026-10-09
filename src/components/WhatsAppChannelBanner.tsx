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
        <div className="svh-whatsapp-sweet-rose-banner rounded-2xl border px-4 sm:px-5 py-3.5 sm:py-4 flex flex-col gap-2.5 sm:gap-3 shadow-sm">
          {/* Top Row: Message bubble icon (left) + Main full text (right), breaking cleanly over multiple lines if needed */}
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 w-full">
            <div className="svh-whatsapp-sweet-rose-icon w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <MessageCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-bold text-[#fbf9f4] leading-snug break-words whitespace-normal">
                Official Study Vault Hub WhatsApp Channel
              </p>
            </div>
          </div>

          {/* Middle Row: Full subtitle text breaking cleanly over multiple lines below the title */}
          <div className="w-full min-w-0">
            <p className="text-[11px] sm:text-xs text-[#cbd5e1] leading-relaxed break-words whitespace-normal">
              Get verified exam updates, revision notes, and study alerts directly on WhatsApp
            </p>
          </div>

          {/* Bottom Row: Entire "Join Channel" button aligned below the text lines */}
          <div className="w-full flex items-center justify-start sm:justify-start pt-0.5">
            <a
              href={OFFICIAL_WHATSAPP_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer external"
              aria-label="Join Official Study Vault Hub WhatsApp Channel"
              className="svh-join-channel-btn min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#080d1a] font-bold text-xs inline-flex items-center justify-center gap-1.5 shrink-0 hover:brightness-110 active:scale-[0.97] transition-all shadow-sm no-underline cursor-pointer"
            >
              <span className="whitespace-nowrap">Join Channel</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
              <ExternalLink className="w-3.5 h-3.5 shrink-0 sm:hidden" />
            </a>
          </div>
        </div>
      </div>
    );
  }
);
