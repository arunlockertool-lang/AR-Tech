/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, testFirestoreConnection } from './lib/firebase';
import {
  fetchCategories,
  fetchPublicSettings,
  fetchPublishedWebsites,
} from './lib/firestoreService';
import {
  DEFAULT_PUBLIC_SETTINGS,
  INITIAL_PUBLIC_WEBSITES,
  SEED_CATEGORIES,
} from './lib/seedData';
import { CategoryItem, PublicSettings, WebsiteDesign } from './types/marketplace';
import { AppView, Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { MarketplaceGrid } from './components/MarketplaceGrid';
import { AiDesignsShowcase } from './components/AiDesignsShowcase';
import { WhatsAppAgentSection } from './components/WhatsAppAgentSection';
import { TemplatePreviewModal } from './components/TemplatePreviewModal';
import { OrderModal } from './components/OrderModal';
import { AdminDashboard } from './components/AdminDashboard';
import { Footer } from './components/Footer';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('artech_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const [activeView, setActiveView] = useState<AppView>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname === '/admin' || window.location.hash === '#admin') {
        return 'admin';
      }
    }
    return 'storefront';
  });
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [websites, setWebsites] = useState<WebsiteDesign[]>(INITIAL_PUBLIC_WEBSITES);
  const [categories, setCategories] = useState<CategoryItem[]>(SEED_CATEGORIES);
  const [publicSettings, setPublicSettings] = useState<PublicSettings>(DEFAULT_PUBLIC_SETTINGS);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const [previewWebsite, setPreviewWebsite] = useState<WebsiteDesign | null>(null);
  const [orderWebsite, setOrderWebsite] = useState<WebsiteDesign | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem('artech_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const loadStorefront = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const [dbWebsites, dbCategories, dbSettings] = await Promise.all([
        fetchPublishedWebsites().catch(() => []),
        fetchCategories().catch(() => []),
        fetchPublicSettings().catch(() => DEFAULT_PUBLIC_SETTINGS),
      ]);

      const activeWebsites = dbWebsites.length > 0 ? dbWebsites : INITIAL_PUBLIC_WEBSITES;
      const activeCategories = dbCategories.length > 0 ? dbCategories : SEED_CATEGORIES;

      setWebsites(activeWebsites);
      setCategories(activeCategories);
      setPublicSettings(dbSettings);

      await fetch('/api/n8n/catalog-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalog: activeWebsites.filter((w) => w.published),
        }),
      }).catch(() => {});
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    void testFirestoreConnection();
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    const onHashChange = () => {
      if (window.location.pathname === '/admin' || window.location.hash === '#admin') {
        setActiveView('admin');
      } else {
        setActiveView('storefront');
      }
    };
    window.addEventListener('hashchange', onHashChange);
    void loadStorefront();
    return () => {
      unsub();
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [loadStorefront]);

  const scrollToSection = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const lowestPrice = useMemo(() => {
    const prices = websites.filter((w) => w.published).map((w) => w.sellingPrice);
    return prices.length > 0 ? Math.min(...prices) : 4500;
  }, [websites]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <Navbar
        activeView={activeView}
        onNavigateView={(view) => {
          setActiveView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onScrollToSection={scrollToSection}
      />

      {activeView === 'storefront' ? (
        <main>
          <HeroSection
            theme={theme}
            onToggleTheme={toggleTheme}
            totalDesigns={websites.filter((w) => w.published).length}
            lowestPrice={lowestPrice}
            onExploreClick={() => scrollToSection('marketplace')}
            onOpenAgentClick={() => scrollToSection('whatsapp-ai')}
          />

          <MarketplaceGrid
            websites={websites}
            categories={categories}
            loading={loadingCatalog}
            onPreview={(site) => setPreviewWebsite(site)}
            onOrder={(site) => setOrderWebsite(site)}
          />

          <AiDesignsShowcase
            websites={websites}
            onPreview={(site) => setPreviewWebsite(site)}
            onOrder={(site) => setOrderWebsite(site)}
          />

          <WhatsAppAgentSection
            websites={websites}
            settings={publicSettings}
            user={user}
            onOrderWebsite={(site) => setOrderWebsite(site)}
          />
        </main>
      ) : (
        <AdminDashboard
          user={user}
          authReady={authReady}
          theme={theme}
          onToggleTheme={toggleTheme}
          onRefreshStorefront={loadStorefront}
        />
      )}

      <Footer
        theme={theme}
        onToggleTheme={toggleTheme}
        onNavigateView={(view) => {
          setActiveView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onScrollToSection={scrollToSection}
      />

      <TemplatePreviewModal
        website={previewWebsite}
        onClose={() => setPreviewWebsite(null)}
        onOrder={(site) => setOrderWebsite(site)}
      />

      <OrderModal
        website={orderWebsite}
        settings={publicSettings}
        user={user}
        onClose={() => setOrderWebsite(null)}
      />
    </div>
  );
}
