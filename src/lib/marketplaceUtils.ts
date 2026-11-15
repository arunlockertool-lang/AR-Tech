import { WebsiteDesign } from '../types/marketplace';

export function formatBdt(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `৳${safe.toLocaleString('en-BD')}`;
}

export function calculateSellingPrice(
  domainCost: number,
  hostingCost: number,
  otherCosts: number,
  profitMargin = 500
): number {
  const d = Math.max(0, Number(domainCost) || 0);
  const h = Math.max(0, Number(hostingCost) || 0);
  const o = Math.max(0, Number(otherCosts) || 0);
  const p = Math.max(0, Number(profitMargin) || 0);
  return Math.round(d + h + o + p);
}

export function isMessengerConfigured(url: string | undefined | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.includes('[ADD YOUR FACEBOOK MESSENGER LINK]')) return false;
  return /^https?:\/\/.+/i.test(trimmed);
}

export function buildOrderMessageText(website: Pick<WebsiteDesign, 'name' | 'sellingPrice' | 'category'>): string {
  return [
    'আসসালামু আলাইকুম AR Tech!',
    'আমি নিচের ওয়েবসাইট ডিজাইনটি অর্ডার করতে চাই:',
    `• Website Name: ${website.name}`,
    `• Category: ${website.category}`,
    `• Price: ${formatBdt(website.sellingPrice)} BDT`,
    'দয়া করে পরবর্তী নির্দেশনা দিন।',
  ].join('\n');
}

export function buildMessengerOrderUrl(
  baseMessengerUrl: string | undefined | null,
  website: Pick<WebsiteDesign, 'name' | 'sellingPrice' | 'category'>
): string | null {
  if (!isMessengerConfigured(baseMessengerUrl)) return null;
  const trimmed = baseMessengerUrl!.trim();
  const text = encodeURIComponent(buildOrderMessageText(website));
  const separator = trimmed.includes('?') ? '&' : '?';
  return `${trimmed}${separator}text=${text}`;
}

export function slugifyId(input: string): string {
  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return cleaned || `item-${Date.now()}`;
}
