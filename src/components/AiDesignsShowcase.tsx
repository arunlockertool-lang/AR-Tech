import React from 'react';
import { Sparkles } from 'lucide-react';
import { WebsiteDesign } from '../types/marketplace';
import { WebsiteCard } from './WebsiteCard';

interface AiDesignsShowcaseProps {
  websites: WebsiteDesign[];
  onPreview: (website: WebsiteDesign) => void;
  onOrder: (website: WebsiteDesign) => void;
}

export const AiDesignsShowcase: React.FC<AiDesignsShowcaseProps> = ({
  websites,
  onPreview,
  onOrder,
}) => {
  const aiDesigns = websites.filter((w) => w.published && w.isAiGenerated);

  return (
    <section
      id="ai-designs"
      className="border-t border-slate-200 bg-white py-14 dark:border-slate-800 dark:bg-slate-900/40"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
              <Sparkles className="h-4 w-4" />
              <span>AI Website Design Studio</span>
            </div>
            <h2 className="mt-2 text-balance text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
              AI-Generated Website Designs
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base dark:text-slate-300">
              Architectures generated with Gemini AI and refined by AR Tech engineers for speed, conversion, and mobile responsiveness.
            </p>
          </div>
        </div>

        {aiDesigns.length === 0 ? (
          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            No published AI-generated designs yet. Admins can generate and publish new designs from the Admin Dashboard.
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {aiDesigns.slice(0, 6).map((site) => (
              <WebsiteCard
                key={site.id}
                website={site}
                onPreview={onPreview}
                onOrder={onOrder}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
