import React from 'react';
import { AppView } from './Navbar';

interface FooterProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onNavigateView: (view: AppView) => void;
  onScrollToSection: (sectionId: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  theme,
  onToggleTheme,
  onNavigateView,
  onScrollToSection,
}) => {
  const handleLink = (sectionId: string) => {
    onNavigateView('storefront');
    setTimeout(() => onScrollToSection(sectionId), 60);
  };

  return (
    <footer className="border-t border-slate-200 bg-white py-10 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-4 sm:px-6 md:flex-row md:items-center lg:px-8">
        <div>
          <p className="text-base font-bold tracking-tight text-slate-950 dark:text-white">
            AR Tech
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            AI Website Design Marketplace &amp; Digital Automation Studio
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-400">
          <button
            type="button"
            onClick={() => handleLink('marketplace')}
            className="hover:text-slate-950 dark:hover:text-white"
          >
            Marketplace
          </button>
          <button
            type="button"
            onClick={() => handleLink('ai-designs')}
            className="hover:text-slate-950 dark:hover:text-white"
          >
            AI Designs
          </button>
          <button
            type="button"
            onClick={() => handleLink('whatsapp-ai')}
            className="hover:text-slate-950 dark:hover:text-white"
          >
            WhatsApp AI Agent
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            className="hover:text-slate-950 dark:hover:text-white"
          >
            {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          </button>
        </nav>

        <p className="text-xs text-slate-500 dark:text-slate-500">
          © {new Date().getFullYear()} AR Tech. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
