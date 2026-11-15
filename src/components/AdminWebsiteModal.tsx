import React, { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import {
  CategoryItem,
  PrivateSettings,
  WebsiteCostBreakdown,
  WebsiteDesign,
} from '../types/marketplace';
import { calculateSellingPrice, formatBdt, slugifyId } from '../lib/marketplaceUtils';
import { TEMPLATE_CATEGORY_IMAGES } from '../lib/images';
import { saveWebsiteWithCosts } from '../lib/firestoreService';

interface AdminWebsiteModalProps {
  isOpen: boolean;
  editingWebsite: WebsiteDesign | null;
  editingCosts: WebsiteCostBreakdown | null;
  categories: CategoryItem[];
  privateSettings: PrivateSettings;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export const AdminWebsiteModal: React.FC<AdminWebsiteModalProps> = ({
  isOpen,
  editingWebsite,
  editingCosts,
  categories,
  privateSettings,
  onClose,
  onSaved,
}) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState(categories[0]?.name || 'E-commerce Website');
  const [description, setDescription] = useState('');
  const [featuresText, setFeaturesText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [deliveryDays, setDeliveryDays] = useState(3);
  const [techStack, setTechStack] = useState('React, Tailwind CSS, Firebase');
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [published, setPublished] = useState(true);
  const [featured, setFeatured] = useState(false);

  const [domainCost, setDomainCost] = useState(privateSettings.defaultDomainCost);
  const [hostingCost, setHostingCost] = useState(privateSettings.defaultHostingCost);
  const [otherCosts, setOtherCosts] = useState(privateSettings.defaultOtherCosts);
  const [profitMargin, setProfitMargin] = useState(privateSettings.defaultProfitMargin);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setAiPrompt('');
    if (editingWebsite) {
      setName(editingWebsite.name);
      setCategory(editingWebsite.category);
      setDescription(editingWebsite.description);
      setFeaturesText(editingWebsite.features.join('\n'));
      setImageUrl(editingWebsite.imageUrl);
      setDeliveryDays(editingWebsite.deliveryDays);
      setTechStack(editingWebsite.techStack || 'React, Tailwind CSS');
      setIsAiGenerated(editingWebsite.isAiGenerated);
      setPublished(editingWebsite.published);
      setFeatured(Boolean(editingWebsite.featured));
      setDomainCost(editingCosts?.domainCost ?? privateSettings.defaultDomainCost);
      setHostingCost(editingCosts?.hostingCost ?? privateSettings.defaultHostingCost);
      setOtherCosts(editingCosts?.otherCosts ?? privateSettings.defaultOtherCosts);
      setProfitMargin(editingCosts?.profitMargin ?? privateSettings.defaultProfitMargin);
    } else {
      const defaultCat = categories[0]?.name || 'E-commerce Website';
      setName('');
      setCategory(defaultCat);
      setDescription('');
      setFeaturesText(
        'Responsive mobile & desktop layout\nSEO-ready structure\nFast page load optimization\nMessenger & WhatsApp integration'
      );
      setImageUrl(TEMPLATE_CATEGORY_IMAGES[defaultCat] || '');
      setDeliveryDays(3);
      setTechStack('React, Tailwind CSS, Firebase');
      setIsAiGenerated(false);
      setPublished(true);
      setFeatured(false);
      setDomainCost(privateSettings.defaultDomainCost);
      setHostingCost(privateSettings.defaultHostingCost);
      setOtherCosts(privateSettings.defaultOtherCosts);
      setProfitMargin(privateSettings.defaultProfitMargin);
    }
  }, [isOpen, editingWebsite, editingCosts, categories, privateSettings]);

  if (!isOpen) return null;

  const computedSellingPrice = calculateSellingPrice(
    domainCost,
    hostingCost,
    otherCosts,
    profitMargin
  );

  const handleGenerateWithAi = async () => {
    if (!aiPrompt.trim() || generatingAi) return;
    setGeneratingAi(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/generate-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt.trim(), category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI generation failed.');

      if (data.name) setName(String(data.name));
      if (data.category) {
        const matchedCat = categories.find(
          (c) => c.name.toLowerCase() === String(data.category).toLowerCase()
        );
        const finalCat = matchedCat ? matchedCat.name : category;
        setCategory(finalCat);
        if (!imageUrl) setImageUrl(TEMPLATE_CATEGORY_IMAGES[finalCat] || '');
      }
      if (data.description) setDescription(String(data.description));
      if (Array.isArray(data.features)) {
        setFeaturesText(data.features.map(String).join('\n'));
      }
      if (data.deliveryDays) setDeliveryDays(Number(data.deliveryDays) || 3);
      if (data.techStack) setTechStack(String(data.techStack));
      setIsAiGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI design.');
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!name.trim() || !description.trim()) {
      setError('Website name and description are required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const isNew = !editingWebsite;
      const id = editingWebsite ? editingWebsite.id : `${slugifyId(name)}-${Date.now().toString(36)}`;
      const features = featuresText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 10);

      await saveWebsiteWithCosts(
        {
          id,
          name: name.trim(),
          category,
          description: description.trim(),
          imageUrl: imageUrl.trim() || TEMPLATE_CATEGORY_IMAGES[category] || '',
          features: features.length > 0 ? features : ['Responsive Design'],
          deliveryDays: Math.max(1, Math.round(deliveryDays)),
          techStack: techStack.trim() || undefined,
          isAiGenerated,
          published,
          featured,
        },
        {
          domainCost: Number(domainCost) || 0,
          hostingCost: Number(hostingCost) || 0,
          otherCosts: Number(otherCosts) || 0,
          profitMargin: Number(profitMargin) || 0,
        },
        isNew
      );

      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save website.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-950 dark:text-white">
            {editingWebsite ? `Edit: ${editingWebsite.name}` : 'Create / Generate Website Design'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto p-6">
          {/* AI Design Generator Bar */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-blue-800 dark:text-blue-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Website Concept Generator (Gemini Backend)</span>
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. Modern Bangladeshi organic skincare e-commerce with bKash checkout"
                className="flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={handleGenerateWithAi}
                disabled={generatingAi || !aiPrompt.trim()}
                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{generatingAi ? 'Generating...' : 'Generate with AI'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Website Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => {
                  const nextCat = e.target.value;
                  setCategory(nextCat);
                  if (!editingWebsite) {
                    setImageUrl(TEMPLATE_CATEGORY_IMAGES[nextCat] || imageUrl);
                  }
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Short Description
            </label>
            <textarea
              required
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Features (one per line, max 10)
              </label>
              <textarea
                rows={4}
                value={featuresText}
                onChange={(e) => setFeaturesText(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Preview Image URL (or leave default category mockup)
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Delivery Days
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={deliveryDays}
                    onChange={(e) => setDeliveryDays(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Tech Stack
                  </label>
                  <input
                    type="text"
                    value={techStack}
                    onChange={(e) => setTechStack(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Admin-Only Internal Pricing Formula */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-semibold text-slate-950 dark:text-white">
                  Admin Pricing Calculator (Internal Costs Hidden From Customers)
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Formula: Domain Cost + Hosting Cost + Other Costs + Profit Margin = Selling Price
                </p>
              </div>
              <div className="text-right">
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                  Public Selling Price
                </span>
                <span className="font-mono text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400">
                  {formatBdt(computedSellingPrice)}
                </span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  Domain Cost (৳)
                </label>
                <input
                  type="number"
                  min={0}
                  value={domainCost}
                  onChange={(e) => setDomainCost(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  Hosting Cost (৳)
                </label>
                <input
                  type="number"
                  min={0}
                  value={hostingCost}
                  onChange={(e) => setHostingCost(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  Other Costs (৳)
                </label>
                <input
                  type="number"
                  min={0}
                  value={otherCosts}
                  onChange={(e) => setOtherCosts(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  Profit Margin (৳)
                </label>
                <input
                  type="number"
                  min={0}
                  value={profitMargin}
                  onChange={(e) => setProfitMargin(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-slate-700 dark:text-slate-300">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              />
              <span>Published in Marketplace</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={isAiGenerated}
                onChange={(e) => setIsAiGenerated(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              />
              <span>AI-Generated Design</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              />
              <span>Featured</span>
            </label>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving to Firestore...' : editingWebsite ? 'Save Changes' : 'Create Design'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
