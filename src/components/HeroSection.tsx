import React from 'react';
import { ArrowRight, Bot, Moon, Sun } from 'lucide-react';
import { HERO_STUDIO_IMAGE } from '../lib/images';
import { formatBdt } from '../lib/marketplaceUtils';

interface HeroSectionProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  totalDesigns: number;
  lowestPrice: number;
  onExploreClick: () => void;
  onOpenAgentClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  theme,
  onToggleTheme,
  totalDesigns,
  lowestPrice,
  onExploreClick,
  onOpenAgentClick,
}) => {
  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-white via-slate-50 to-slate-100/70 dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Subtle architectural accent gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-600/15"
      />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {/* Utility strip for theme + quick mobile navigation */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4 dark:border-slate-800/80">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
            <span>AR Tech Digital Marketplace</span>
            <span aria-hidden="true">·</span>
            <span>AI Website Studio</span>
            <span aria-hidden="true">·</span>
            <span>Dhaka &amp; Global Delivery</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-400" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-slate-600" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2-Column Hero Split */}
        <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="flex flex-col justify-center lg:col-span-7">
            <h1 className="text-balance text-[clamp(2.25rem,4vw,3.5rem)] font-bold leading-[1.15] tracking-tight text-slate-950 dark:text-white">
              AR Tech ওয়েবসাইটে স্বাগতম!
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
              এখানে AI দিয়ে তৈরি Professional Website Design কিনতে পারবেন। আপনার
              ব্যবসার জন্য পছন্দের ওয়েবসাইট বেছে নিন এবং অর্ডার করুন।
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onExploreClick}
                className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <span>Explore Website Designs</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={onOpenAgentClick}
                className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Ask WhatsApp AI Agent</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative h-full min-h-[260px] overflow-hidden rounded-xl border border-slate-200 bg-slate-900 dark:border-slate-800">
              <img
                src={HERO_STUDIO_IMAGE}
                alt="AR Tech website design studio display showcasing modern web architecture"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <p className="text-xs font-medium text-slate-300">
                  Production Templates · Ready for Launch
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {totalDesigns} Verified Website Designs
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4-Column Proof Strip */}
        <div className="mt-12 grid grid-cols-2 gap-6 border-t border-slate-200 pt-8 md:grid-cols-4 dark:border-slate-800">
          <div>
            <p className="font-mono text-2xl font-semibold tabular-nums text-slate-950 dark:text-white">
              {totalDesigns}+
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Ready Website Designs
            </p>
          </div>
          <div>
            <p className="font-mono text-2xl font-semibold tabular-nums text-slate-950 dark:text-white">
              {lowestPrice > 0 ? formatBdt(lowestPrice) : '৳4,500'}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Starting Package Price
            </p>
          </div>
          <div>
            <p className="font-mono text-2xl font-semibold tabular-nums text-slate-950 dark:text-white">
              2–5 Days
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Custom Domain &amp; Launch
            </p>
          </div>
          <div>
            <p className="font-mono text-2xl font-semibold tabular-nums text-slate-950 dark:text-white">
              24/7 AI
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Bengali &amp; English WhatsApp Agent
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
