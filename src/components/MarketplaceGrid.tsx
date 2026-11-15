import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { CategoryItem, WebsiteDesign } from '../types/marketplace';
import { WebsiteCard } from './WebsiteCard';

interface MarketplaceGridProps {
  websites: WebsiteDesign[];
  categories: CategoryItem[];
  loading: boolean;
  onPreview: (website: WebsiteDesign) => void;
  onOrder: (website: WebsiteDesign) => void;
}

export const MarketplaceGrid: React.FC<MarketplaceGridProps> = ({
  websites,
  categories,
  loading,
  onPreview,
  onOrder,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyAi, setOnlyAi] = useState<boolean>(false);

  const categoryNames = useMemo(() => {
    const names = categories.map((c) => c.name);
    websites.forEach((w) => {
      if (!names.includes(w.category)) names.push(w.category);
    });
    return ['All', ...names];
  }, [categories, websites]);

  const filteredWebsites = useMemo(() => {
    return websites.filter((site) => {
      if (!site.published) return false;
      if (onlyAi && !site.isAiGenerated) return false;
      if (selectedCategory !== 'All' && site.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          site.name.toLowerCase().includes(q) ||
          site.category.toLowerCase().includes(q) ||
          site.description.toLowerCase().includes(q) ||
          site.features.some((f) => f.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [websites, selectedCategory, searchQuery, onlyAi]);

  return (
    <section id="marketplace" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h2 className="text-balance text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
            Website Design Marketplace
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base dark:text-slate-300">
            Select a category below to filter ready-to-launch templates crafted for businesses, educators, restaurants, and online stores.
          </p>
        </div>

        {/* Search & AI Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1 sm:flex-initial">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search designs or features..."
              aria-label="Search website designs"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setOnlyAi(false)}
              className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                !onlyAi
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              All Templates
            </button>
            <button
              type="button"
              onClick={() => setOnlyAi(true)}
              className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                onlyAi
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              AI Generated
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div
        role="tablist"
        aria-label="Website Categories"
        className="mt-6 flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/80 p-1.5 dark:border-slate-800 dark:bg-slate-900/80"
      >
        {categoryNames.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ${
                isActive
                  ? 'bg-white text-slate-950 shadow-xs dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Results Count */}
      <div className="mt-5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>
          Showing <strong className="font-mono text-slate-900 dark:text-white">{filteredWebsites.length}</strong>{' '}
          {filteredWebsites.length === 1 ? 'design' : 'designs'}
          {selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}
        </span>
        {(selectedCategory !== 'All' || searchQuery || onlyAi) && (
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('All');
              setSearchQuery('');
              setOnlyAi(false);
            }}
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-[430px] animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : filteredWebsites.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-base font-semibold text-slate-900 dark:text-white">
            No matching website designs found
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Try clearing your search or selecting a different category filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('All');
              setSearchQuery('');
              setOnlyAi(false);
            }}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Show All Designs
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredWebsites.map((site) => (
            <WebsiteCard
              key={site.id}
              website={site}
              onPreview={onPreview}
              onOrder={onOrder}
            />
          ))}
        </div>
      )}
    </section>
  );
};
