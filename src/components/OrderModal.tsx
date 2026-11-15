import React, { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, MessageCircle, X } from 'lucide-react';
import { User } from 'firebase/auth';
import { PublicSettings, WebsiteDesign } from '../types/marketplace';
import {
  buildMessengerOrderUrl,
  buildOrderMessageText,
  formatBdt,
  isMessengerConfigured,
} from '../lib/marketplaceUtils';
import { createOrderRecord } from '../lib/firestoreService';

interface OrderModalProps {
  website: WebsiteDesign | null;
  settings: PublicSettings;
  user: User | null;
  onClose: () => void;
}

export const OrderModal: React.FC<OrderModalProps> = ({
  website,
  settings,
  user,
  onClose,
}) => {
  const [customerName, setCustomerName] = useState(user?.displayName || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderSaved, setOrderSaved] = useState(false);

  useEffect(() => {
    setCustomerName(user?.displayName || '');
    setOrderSaved(false);
    setCopied(false);
  }, [website, user]);

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

  const messengerConfigured = isMessengerConfigured(settings.messengerUrl);
  const messengerHref = buildMessengerOrderUrl(settings.messengerUrl, website);
  const prefilledText = buildOrderMessageText(website);

  const persistOrderIntent = async () => {
    if (orderSaved || submitting) return;
    setSubmitting(true);
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const safeName = customerName.trim() || user?.displayName || 'Messenger Customer';

    try {
      if (user && user.emailVerified) {
        try {
          await createOrderRecord({
            id: orderId,
            userId: user.uid,
            customerName: safeName,
            customerPhone: customerPhone.trim() || undefined,
            customerEmail: user.email || undefined,
            websiteId: website.id,
            websiteName: website.name,
            category: website.category,
            priceBdt: website.sellingPrice,
            channel: 'messenger',
            notes: notes.trim() || undefined,
          });
          setOrderSaved(true);
          return;
        } catch {
          // Fallback to server queue if template wasn't seeded in Firestore yet
        }
      }

      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'order',
          payload: {
            customerName: safeName,
            customerPhone: customerPhone.trim() || undefined,
            customerEmail: user?.email || undefined,
            websiteId: website.id,
            websiteName: website.name,
            category: website.category,
            priceBdt: website.sellingPrice,
            channel: 'messenger',
            notes: notes.trim() || undefined,
          },
        }),
      });
      setOrderSaved(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(prefilledText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              AR Tech Order Checkout
            </p>
            <h3
              id="order-modal-title"
              className="mt-0.5 text-lg font-bold text-slate-950 dark:text-white"
            >
              {website.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close order dialog"
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 p-6">
          {/* Selected Website & Price Summary */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 dark:border-slate-800 dark:bg-slate-950">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {website.category}
              </p>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">
                {website.name}
              </p>
            </div>
            <div className="text-right">
              <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                Selling Price
              </span>
              <span className="font-mono text-xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                {formatBdt(website.sellingPrice)}
              </span>
            </div>
          </div>

          {/* Optional Customer Details for Order Tracking */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Your Name (Optional)
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Tanvir Ahmed"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Phone / WhatsApp (Optional)
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+880 1XXX-XXXXXX"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Custom Requirements (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Domain preference, logo, or language notes..."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          {/* Prefilled Messenger Message Preview */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Prefilled Facebook Messenger Message
              </span>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Message'}</span>
              </button>
            </div>
            <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 font-sans text-xs leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              {prefilledText}
            </pre>
          </div>

          {!messengerConfigured && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
              Facebook Messenger link is currently set to{' '}
              <code className="font-mono font-semibold">{settings.messengerUrl}</code>.
              Configure your real Messenger URL (e.g. <code className="font-mono">https://m.me/yourpage</code>) inside the Admin Dashboard Settings. You can still submit your order below or copy the message.
            </div>
          )}

          {orderSaved && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
              Order request logged for {website.name} ({formatBdt(website.sellingPrice)}).
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={persistOrderIntent}
              disabled={submitting || orderSaved}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              {orderSaved ? 'Order Recorded' : submitting ? 'Saving...' : 'Save Order Inquiry'}
            </button>

            {messengerConfigured && messengerHref ? (
              <a
                href={messengerHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  void persistOrderIntent();
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Order on Messenger ({formatBdt(website.sellingPrice)})</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  await persistOrderIntent();
                  await handleCopyMessage();
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Submit &amp; Copy Order ({formatBdt(website.sellingPrice)})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
