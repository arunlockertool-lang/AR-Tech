import React, { useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Download,
  Send,
  UserCheck,
  Webhook,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { AgentChatResponse, PublicSettings, WebsiteDesign } from '../types/marketplace';
import { formatBdt } from '../lib/marketplaceUtils';
import { createAgentLogRecord, createMessageRecord } from '../lib/firestoreService';

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  meta?: AgentChatResponse;
}

interface WhatsAppAgentSectionProps {
  websites: WebsiteDesign[];
  settings: PublicSettings;
  user: User | null;
  onOrderWebsite: (website: WebsiteDesign) => void;
}

const QUICK_PROMPTS = [
  'আমার একটা E-commerce ওয়েবসাইট লাগবে, দাম কত?',
  'Which template do you recommend for a restaurant?',
  'আমার কাস্টম ERP ওয়েবসাইট লাগবে, মানুষের সাথে কথা বলতে চাই।',
];

export const WhatsAppAgentSection: React.FC<WhatsAppAgentSectionProps> = ({
  websites,
  settings,
  user,
  onOrderWebsite,
}) => {
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'আসসালামু আলাইকুম! আমি AR Tech WhatsApp AI Agent। বাংলা বা ইংরেজিতে আপনার ব্যবসার প্রয়োজন বলুন—আমি সঠিক ওয়েবসাইট ডিজাইন ও আসল BDT প্রাইস জানিয়ে দিচ্ছি।',
    },
  ]);
  const [input, setInput] = useState('');
  const [customerName, setCustomerName] = useState(user?.displayName || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publishedCatalog = websites.filter((w) => w.published);

  const sendMessage = async (textToSend?: string) => {
    const messageText = (textToSend ?? input).trim();
    if (!messageText || sending) return;

    setError(null);
    if (!textToSend) setInput('');

    const userTurn: ChatTurn = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: messageText,
    };
    const nextTurns = [...turns, userTurn];
    setTurns(nextTurns);
    setSending(true);

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          history: nextTurns.map((t) => ({ role: t.role, text: t.text })),
          catalog: publishedCatalog.map((w) => ({
            id: w.id,
            name: w.name,
            category: w.category,
            sellingPrice: w.sellingPrice,
            deliveryDays: w.deliveryDays,
            features: w.features,
            description: w.description,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'AI Agent failed to respond.');
      }

      const agentData = data as AgentChatResponse;
      const assistantTurn: ChatTurn = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        text: agentData.reply,
        meta: agentData,
      };
      setTurns((prev) => [...prev, assistantTurn]);

      if (user && user.emailVerified) {
        const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        void createAgentLogRecord({
          id: logId,
          userId: user.uid,
          customerName: agentData.extractedName || customerName.trim() || user.displayName || 'Customer',
          customerMessage: messageText,
          agentReply: agentData.reply,
          language: agentData.language,
          recommendedWebsiteId: agentData.recommendedWebsiteId || undefined,
          needsHumanHandoff: agentData.needsHumanHandoff,
          leadCaptured: agentData.leadCaptured,
        }).catch(() => {});

        if (agentData.leadCaptured || agentData.needsHumanHandoff) {
          const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          void createMessageRecord({
            id: msgId,
            userId: user.uid,
            senderName: agentData.extractedName || customerName.trim() || user.displayName || 'Web Visitor',
            senderContact: agentData.extractedPhone || customerPhone.trim() || user.email || undefined,
            channel: 'whatsapp',
            content: messageText,
            recommendedWebsite: agentData.recommendedWebsiteName || undefined,
          }).catch(() => {});
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach AI Agent.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section
      id="whatsapp-ai"
      className="border-t border-slate-200 bg-slate-50 py-14 dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
          {/* Left Column: n8n + WhatsApp Cloud API Architecture */}
          <div className="lg:col-span-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
              <Webhook className="h-4 w-4" />
              <span>n8n + WhatsApp Business Cloud API</span>
            </div>
            <h2 className="mt-2 text-balance text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
              Bilingual WhatsApp AI Sales Agent
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
              AR Tech connects official WhatsApp Business Cloud API messages through n8n to our server-side Gemini AI backend. Every response is strictly grounded in real Firestore catalog prices.
            </p>

            <div className="mt-6 space-y-3 border-t border-slate-200 pt-6 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-300">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                <span>Understands Bengali &amp; English naturally without hallucinating prices or delivery dates.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                <span>Collects customer requirements and contact details into Firestore leads &amp; messages.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                <span>Automatically triggers owner notifications and hands off complex requests to a human specialist.</span>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                Production n8n Webhook Endpoint
              </p>
              <code className="mt-1.5 block overflow-x-auto rounded-lg bg-slate-100 px-3 py-2 font-mono text-xs text-slate-800 dark:bg-slate-950 dark:text-slate-200">
                POST /api/n8n/whatsapp-webhook
              </code>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a
                  href="/api/n8n/workflow-blueprint"
                  download="ar-tech-whatsapp-n8n-workflow.json"
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download n8n Workflow JSON</span>
                </a>
                {settings.whatsappNumber && (
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    WA: {settings.whatsappNumber}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Live Grounded Bilingual AI Agent Simulator */}
          <div className="lg:col-span-7">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
                      Live WhatsApp AI Agent Test Console
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Grounded in {publishedCatalog.length} active templates
                    </p>
                  </div>
                </div>
              </div>

              {/* Optional Lead Info */}
              <div className="grid grid-cols-1 gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-950">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Your Name (optional)"
                  aria-label="Customer name"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="WhatsApp Number (optional)"
                  aria-label="WhatsApp phone number"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Chat History */}
              <div className="h-[340px] space-y-4 overflow-y-auto p-5">
                {turns.map((turn) => {
                  const recommendedSite = turn.meta?.recommendedWebsiteId
                    ? publishedCatalog.find((w) => w.id === turn.meta?.recommendedWebsiteId)
                    : undefined;

                  return (
                    <div
                      key={turn.id}
                      className={`flex flex-col ${
                        turn.role === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          turn.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'border border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{turn.text}</p>

                        {recommendedSite && (
                          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                            <div>
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                {recommendedSite.category}
                              </p>
                              <p className="text-xs font-bold text-slate-950 dark:text-white">
                                {recommendedSite.name}
                              </p>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <span className="font-mono text-xs font-bold tabular-nums text-slate-950 dark:text-white">
                                {formatBdt(recommendedSite.sellingPrice)}
                              </span>
                              <button
                                type="button"
                                onClick={() => onOrderWebsite(recommendedSite)}
                                className="whitespace-nowrap rounded-md bg-blue-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700"
                              >
                                Order Now
                              </button>
                            </div>
                          </div>
                        )}

                        {turn.meta && (turn.meta.leadCaptured || turn.meta.needsHumanHandoff) && (
                          <div className="mt-2.5 flex flex-wrap items-center gap-3 border-t border-slate-200/80 pt-2 text-[11px] dark:border-slate-800">
                            {turn.meta.leadCaptured && (
                              <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                                <UserCheck className="h-3.5 w-3.5" />
                                Lead Captured &amp; Owner Notified
                              </span>
                            )}
                            {turn.meta.needsHumanHandoff && (
                              <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Escalated to Human Specialist
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {sending && (
                  <div className="flex items-start">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                      AR Tech AI Agent is checking live catalog prices...
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Prompts */}
              <div className="flex flex-wrap gap-2 border-t border-slate-200 bg-slate-50/70 px-5 py-2.5 dark:border-slate-800 dark:bg-slate-950/70">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={sending}
                    onClick={() => void sendMessage(q)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-left text-xs text-slate-700 transition-colors hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {error && (
                <div className="border-t border-red-200 bg-red-50 px-5 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </div>
              )}

              {/* Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendMessage();
                }}
                className="flex items-center gap-2 border-t border-slate-200 p-4 dark:border-slate-800"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="বাংলা বা ইংরেজিতে প্রশ্ন লিখুন..."
                  disabled={sending || !settings.agentEnabled}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim() || !settings.agentEnabled}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
