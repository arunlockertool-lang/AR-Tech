import React from 'react';

export type AppView = 'storefront' | 'admin';

interface NavbarProps {
  activeView: AppView;
  onNavigateView: (view: AppView) => void;
  onScrollToSection: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onNavigateView,
  onScrollToSection,
}) => {
  const handleNavClick = (sectionId: string) => {
    if (activeView !== 'storefront') {
      onNavigateView('storefront');
      setTimeout(() => onScrollToSection(sectionId), 60);
    } else {
      onScrollToSection(sectionId);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => {
            onNavigateView('storefront');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="whitespace-nowrap shrink-0 text-left text-xl font-bold tracking-tight text-slate-900 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 dark:text-white"
        >
          AR Tech
        </button>

        {/* Zone 2: 4 concise single-line text links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex dark:text-slate-300"
        >
          <button
            type="button"
            onClick={() => handleNavClick('marketplace')}
            className="whitespace-nowrap shrink-0 transition-colors hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 dark:hover:text-white"
          >
            Marketplace
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('ai-designs')}
            className="whitespace-nowrap shrink-0 transition-colors hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 dark:hover:text-white"
          >
            AI Designs
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('whatsapp-ai')}
            className="whitespace-nowrap shrink-0 transition-colors hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 dark:hover:text-white"
          >
            WhatsApp AI
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => {
              if (activeView === 'admin') {
                onNavigateView('storefront');
              } else {
                handleNavClick('marketplace');
              }
            }}
            className="whitespace-nowrap shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            {activeView === 'admin' ? 'View Marketplace' : 'Browse Designs'}
          </button>
        </div>
      </div>
    </header>
  );
};
