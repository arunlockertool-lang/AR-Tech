import React, { useEffect, useState } from 'react';
import { Check, Laptop, MessageCircle, Smartphone, X } from 'lucide-react';
import { WebsiteDesign } from '../types/marketplace';
import { resolveTemplateImage } from '../lib/images';
import { formatBdt } from '../lib/marketplaceUtils';

interface TemplatePreviewModalProps {
  website: WebsiteDesign | null;
  onClose: () => void;
  onOrder: (website: WebsiteDesign) => void;
}

export const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  website,
  onClose,
  onOrder,
}) => {
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (website) {
      window.addEventListener('keydown', onKeyDown);
    }
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [website, onClose]);

  if (!website) return null;

  const imageUrl = resolveTemplateImage(website.category, website.imageUrl);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {website.category} · {website.deliveryDays} Days Delivery
              {website.techStack ? ` · ${website.techStack}` : ''}
            </p>
            <h3
              id="preview-modal-title"
              className="mt-0.5 text-lg font-bold text-slate-950 dark:text-white"
            >
              {website.name}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setViewport('desktop')}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  viewport === 'desktop'
                    ? 'bg-white text-slate-950 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Laptop className="h-3.5 w-3.5" />
                <span>Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setViewport('mobile')}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  viewport === 'mobile'
                    ? 'bg-white text-slate-950 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Mobile</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 lg:grid-cols-12">
          {/* Interactive Viewport Frame */}
          <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-100 p-4 lg:col-span-7 dark:border-slate-800 dark:bg-slate-950">
            <div
              className={`overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm transition-all duration-200 dark:border-slate-700 dark:bg-slate-900 ${
                viewport === 'mobile' ? 'w-[300px]' : 'w-full'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                <span className="truncate font-mono">
                  https://preview.artech.bd/{website.id}
                </span>
                <span>{viewport === 'desktop' ? '1440px' : '390px'}</span>
              </div>
              <img
                src={imageUrl}
                alt={`${website.name} live preview`}
                referrerPolicy="no-referrer"
                className={`w-full object-cover ${
                  viewport === 'mobile' ? 'aspect-[3/4]' : 'aspect-[4/3]'
                }`}
              />
            </div>
          </div>

          {/* Details & Purchase Module */}
          <div className="flex flex-col justify-between lg:col-span-5">
            <div>
              <h4 className="text-sm font-semibold text-slate-950 dark:text-white">
                Design Overview
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {website.description}
              </p>

              <h4 className="mt-6 text-sm font-semibold text-slate-950 dark:text-white">
                Included Features
              </h4>
              <ul className="mt-3 space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
                {website.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 border-t border-slate-200 pt-5 dark:border-slate-800">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    Complete Package Price
                  </span>
                  <span className="font-mono text-2xl font-bold tabular-nums text-slate-950 dark:text-white">
                    {formatBdt(website.sellingPrice)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOrder(website);
                  }}
                  className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Order Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
