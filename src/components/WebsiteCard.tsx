import React, { useState } from 'react';
import { Check, Eye, MessageCircle } from 'lucide-react';
import { WebsiteDesign } from '../types/marketplace';
import { resolveTemplateImage } from '../lib/images';
import { formatBdt } from '../lib/marketplaceUtils';

interface WebsiteCardProps {
  website: WebsiteDesign;
  onPreview: (website: WebsiteDesign) => void;
  onOrder: (website: WebsiteDesign) => void;
}

export const WebsiteCard: React.FC<WebsiteCardProps> = ({
  website,
  onPreview,
  onOrder,
}) => {
  const [imgError, setImgError] = useState(false);
  const resolvedImage = resolveTemplateImage(website.category, website.imageUrl);

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-transform duration-200 hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      {/* 1. Website Preview Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800">
        {!imgError ? (
          <img
            src={resolvedImage}
            alt={`${website.name} — ${website.category} preview`}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-6 text-center dark:from-slate-800 dark:to-slate-900">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {website.name}
            </span>
            <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {website.category}
            </span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-5">
        {/* Quiet Unboxed Metadata (Zero-Pill Rule) */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>{website.category}</span>
          <span aria-hidden="true">·</span>
          <span>{website.deliveryDays} Days Delivery</span>
          {website.isAiGenerated && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-blue-600 dark:text-blue-400">AI Crafted</span>
            </>
          )}
        </div>

        {/* 2. Website Name */}
        <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
          {website.name}
        </h3>

        {/* 3. Short Description */}
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {website.description}
        </p>

        {/* 4. Website Features */}
        <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-4 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
          {website.features.slice(0, 4).map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {/* 5, 6, 7. Price in BDT directly beside Order Now + Preview button */}
        <div className="mt-auto pt-5">
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => onPreview(website)}
              className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Preview</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Price
                </span>
                <span className="font-mono text-base font-bold tabular-nums text-slate-950 dark:text-white">
                  {formatBdt(website.sellingPrice)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onOrder(website)}
                className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>Order Now</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
