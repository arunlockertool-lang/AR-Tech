import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import type { AgentChatResponse, PendingSyncItem } from './src/types/marketplace.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Server-side Gemini client (API key stays strictly on server)
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Active server-side catalog cache (synced from Firestore by frontend/admin, with default fallback)
interface CatalogEntry {
  id: string;
  name: string;
  category: string;
  sellingPrice: number;
  deliveryDays: number;
  features: string[];
  description: string;
}

let cachedCatalog: CatalogEntry[] = [
  {
    id: 'dhaka-atelier-commerce',
    name: 'Dhaka Atelier Storefront',
    category: 'E-commerce Website',
    sellingPrice: 6500,
    deliveryDays: 4,
    features: ['One-page fast checkout flow', 'Category & size variant filters', 'Order tracking & invoice PDF'],
    description: 'Conversion-focused online fashion & lifestyle storefront.',
  },
  {
    id: 'nexus-agency-pro',
    name: 'Nexus Digital Studio',
    category: 'Agency Website',
    sellingPrice: 6000,
    deliveryDays: 3,
    features: ['Case study metric grid', 'Interactive discovery lead form', 'Dark & Light mode ready'],
    description: 'Architectural corporate agency site with structured case studies.',
  },
  {
    id: 'luna-bistro-dining',
    name: 'Luna & Lime Dining',
    category: 'Restaurant Website',
    sellingPrice: 5500,
    deliveryDays: 3,
    features: ['Interactive menu & chef specials', 'Table reservation request flow', 'Mobile click-to-call & WhatsApp'],
    description: 'Upscale restaurant and cafe showcase.',
  },
  {
    id: 'edupulse-academy',
    name: 'EduPulse LMS & Academy',
    category: 'Education Website',
    sellingPrice: 7000,
    deliveryDays: 5,
    features: ['Course catalog & syllabus tabs', 'Batch schedule & admission form', 'Bilingual Bengali & English support'],
    description: 'Complete coaching center and online course platform.',
  },
  {
    id: 'dashflow-analytics-ui',
    name: 'DashFlow Operations UI',
    category: 'Dashboard UI',
    sellingPrice: 8000,
    deliveryDays: 5,
    features: ['Tabular revenue & order tables', 'Role-based access architecture', 'CSV export & filter controls'],
    description: 'Clean SaaS and internal business operations dashboard.',
  },
];

let cachedAgentInstructions =
  'You are the official AR Tech AI Sales Consultant. Respond warmly and naturally in Bengali or English matching the user.';
let cachedAllowHandoff = true;

// Pending events queue for n8n webhooks and non-logged-in inquiries to sync into Firestore when Admin connects
const pendingSyncQueue: PendingSyncItem[] = [];

function enqueueSyncItem(type: PendingSyncItem['type'], payload: Record<string, unknown>) {
  const id = `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  pendingSyncQueue.push({
    id,
    type,
    payload,
    createdAt: new Date().toISOString(),
  });
  if (pendingSyncQueue.length > 200) {
    pendingSyncQueue.shift();
  }
  return id;
}

async function runGroundedAgent(params: {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; text: string }>;
  customerName?: string;
  customerPhone?: string;
  catalog?: CatalogEntry[];
  agentInstructions?: string;
  allowHumanHandoff?: boolean;
}): Promise<AgentChatResponse> {
  const ai = getGeminiClient();
  const activeCatalog = params.catalog && params.catalog.length > 0 ? params.catalog : cachedCatalog;
  const instructions = params.agentInstructions || cachedAgentInstructions;
  const allowHandoff = params.allowHumanHandoff ?? cachedAllowHandoff;

  const catalogContext = activeCatalog
    .map(
      (item) =>
        `- ID: ${item.id} | Name: ${item.name} | Category: ${item.category} | Selling Price: ৳${item.sellingPrice} BDT | Typical Build Time: ${item.deliveryDays} days | Features: ${item.features.join(', ')}`
    )
    .join('\n');

  const historyLines = (params.history || [])
    .slice(-8)
    .map((h) => `${h.role === 'user' ? 'Customer' : 'AR Tech Agent'}: ${h.text}`)
    .join('\n');

  const systemInstruction = `
You are the AR Tech WhatsApp & Marketplace AI Sales Agent.
Custom Admin Guidance: ${instructions}

STRICT FACTUAL GROUNDING RULES (NEVER VIOLATE):
1. ONLY quote prices, package names, and features that explicitly exist in the REAL AR TECH CATALOG below.
2. NEVER invent website prices, hidden discounts, unverified features, guaranteed delivery dates, or payment confirmations.
3. NEVER reveal internal costs (domain cost, hosting cost, profit margin). Only quote the Selling Price in BDT (৳).
4. Understand and reply naturally in Bengali (বাংলা) or English, matching the language the customer uses.
5. Ask politely for the customer's name, phone/WhatsApp number, and business requirements if not yet provided.
6. ${allowHandoff ? 'If the customer asks for complex custom enterprise software, payment verification, refunds, or explicitly requests a human manager, set needsHumanHandoff to true and explain politely that an AR Tech specialist will take over.' : 'Handle inquiries directly and concisely.'}

REAL AR TECH CATALOG (ONLY SOURCE OF TRUTH):
${catalogContext}
`.trim();

  const prompt = `
Known Customer Name: ${params.customerName || 'Unknown'}
Known Customer Contact: ${params.customerPhone || 'Unknown'}
Recent Conversation:
${historyLines || 'None'}

Latest Customer Message:
${params.message}
`.trim();

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: {
            type: Type.STRING,
            description: 'Natural Bengali or English reply strictly grounded in the real catalog.',
          },
          language: {
            type: Type.STRING,
            description: 'One of bn, en, or mixed.',
          },
          recommendedWebsiteId: {
            type: Type.STRING,
            description: 'Exact ID of the recommended website from the catalog, or empty string if none.',
          },
          recommendedWebsiteName: {
            type: Type.STRING,
            description: 'Exact name of the recommended website from the catalog, or empty string if none.',
          },
          extractedName: {
            type: Type.STRING,
            description: 'Customer name if mentioned, otherwise empty string.',
          },
          extractedPhone: {
            type: Type.STRING,
            description: 'Customer phone/WhatsApp number if mentioned, otherwise empty string.',
          },
          extractedRequirements: {
            type: Type.STRING,
            description: 'Summary of customer project requirements, or empty string.',
          },
          leadCaptured: {
            type: Type.BOOLEAN,
            description: 'True if customer shared contact details or clear purchase intent.',
          },
          needsHumanHandoff: {
            type: Type.BOOLEAN,
            description: 'True if conversation requires human specialist escalation.',
          },
          handoffReason: {
            type: Type.STRING,
            description: 'Reason for human escalation if needsHumanHandoff is true, else empty string.',
          },
          ownerNotificationSummary: {
            type: Type.STRING,
            description: 'Short owner alert summary if leadCaptured or needsHumanHandoff is true, else empty string.',
          },
        },
        required: [
          'reply',
          'language',
          'leadCaptured',
          'needsHumanHandoff',
        ],
      },
    },
  });

  const raw = (response.text || '{}').trim();
  const parsed = JSON.parse(raw) as Partial<AgentChatResponse>;

  const lang = parsed.language === 'bn' || parsed.language === 'en' ? parsed.language : 'mixed';
  const matchedSite = activeCatalog.find((c) => c.id === parsed.recommendedWebsiteId);

  return {
    reply: parsed.reply || 'ধন্যবাদ! AR Tech-এ যোগাযোগ করার জন্য স্বাগতম। আপনি কোন ধরনের ওয়েবসাইট খুঁজছেন জানাবেন কি?',
    language: lang,
    recommendedWebsiteId: matchedSite ? matchedSite.id : null,
    recommendedWebsiteName: matchedSite ? matchedSite.name : null,
    extractedName: parsed.extractedName || params.customerName || null,
    extractedPhone: parsed.extractedPhone || params.customerPhone || null,
    extractedRequirements: parsed.extractedRequirements || null,
    leadCaptured: Boolean(parsed.leadCaptured),
    needsHumanHandoff: Boolean(parsed.needsHumanHandoff),
    handoffReason: parsed.handoffReason || null,
    ownerNotificationSummary: parsed.ownerNotificationSummary || null,
  };
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'ar-tech-api', timestamp: new Date().toISOString() });
});

// Downloadable single-file standalone index.html
app.get('/download/index.html', (_req, res) => {
  const standalonePath = path.resolve(__dirname, 'standalone', 'index.html');
  res.setHeader('Content-Disposition', 'attachment; filename="index.html"');
  res.sendFile(standalonePath);
});

// Sync live Firestore published catalog & instructions into server cache
app.post('/api/n8n/catalog-sync', (req, res) => {
  const { catalog, agentInstructions, allowHumanHandoff } = req.body || {};
  if (Array.isArray(catalog) && catalog.length > 0) {
    cachedCatalog = catalog.map((c: CatalogEntry) => ({
      id: String(c.id),
      name: String(c.name),
      category: String(c.category),
      sellingPrice: Number(c.sellingPrice) || 0,
      deliveryDays: Number(c.deliveryDays) || 3,
      features: Array.isArray(c.features) ? c.features.map(String) : [],
      description: String(c.description || ''),
    }));
  }
  if (typeof agentInstructions === 'string' && agentInstructions.trim()) {
    cachedAgentInstructions = agentInstructions.trim();
  }
  if (typeof allowHumanHandoff === 'boolean') {
    cachedAllowHandoff = allowHumanHandoff;
  }
  res.json({ ok: true, count: cachedCatalog.length });
});

// Interactive Website & WhatsApp AI Agent Chat Endpoint
app.post('/api/agent/chat', async (req, res) => {
  try {
    const { message, history, customerName, customerPhone, catalog, agentInstructions, allowHumanHandoff } = req.body || {};
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message text is required.' });
      return;
    }

    const result = await runGroundedAgent({
      message: message.slice(0, 2000),
      history,
      customerName,
      customerPhone,
      catalog,
      agentInstructions,
      allowHumanHandoff,
    });

    enqueueSyncItem('agent_log', {
      customerName: result.extractedName || customerName || 'Web Visitor',
      customerMessage: message.slice(0, 2000),
      agentReply: result.reply,
      language: result.language,
      recommendedWebsiteId: result.recommendedWebsiteId || undefined,
      needsHumanHandoff: result.needsHumanHandoff,
      leadCaptured: result.leadCaptured,
    });

    if (result.leadCaptured || result.needsHumanHandoff) {
      enqueueSyncItem('message', {
        senderName: result.extractedName || customerName || 'AI Agent Lead',
        senderContact: result.extractedPhone || customerPhone || 'Web Simulator',
        channel: 'whatsapp',
        content: `[AI Agent] ${message}${result.extractedRequirements ? ` | Req: ${result.extractedRequirements}` : ''}`,
        recommendedWebsite: result.recommendedWebsiteName || undefined,
        status: result.needsHumanHandoff ? 'handoff' : 'unread',
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Agent chat error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to process AI Agent message.',
    });
  }
});

// Production n8n + WhatsApp Business Cloud API Webhook Endpoint
app.post('/api/n8n/whatsapp-webhook', async (req, res) => {
  try {
    const expectedToken = process.env.N8N_WEBHOOK_TOKEN;
    if (expectedToken && req.headers['x-artech-webhook-token'] !== expectedToken) {
      res.status(401).json({ error: 'Invalid webhook token.' });
      return;
    }

    // Supports direct n8n JSON payload OR raw Meta WhatsApp Cloud API webhook payload
    const body = req.body || {};
    const waEntry = body?.entry?.[0]?.changes?.[0]?.value;
    const waMessage = waEntry?.messages?.[0];
    const waContact = waEntry?.contacts?.[0];

    const from = String(body.from || waMessage?.from || 'unknown');
    const customerName = String(body.customerName || waContact?.profile?.name || 'WhatsApp Customer');
    const message = String(body.message || waMessage?.text?.body || '');

    if (!message.trim()) {
      res.status(400).json({ error: 'Incoming WhatsApp message text is required.' });
      return;
    }

    const result = await runGroundedAgent({
      message: message.slice(0, 2000),
      history: Array.isArray(body.history) ? body.history : [],
      customerName,
      customerPhone: from,
    });

    enqueueSyncItem('agent_log', {
      customerName: result.extractedName || customerName,
      customerMessage: message.slice(0, 2000),
      agentReply: result.reply,
      language: result.language,
      recommendedWebsiteId: result.recommendedWebsiteId || undefined,
      needsHumanHandoff: result.needsHumanHandoff,
      leadCaptured: result.leadCaptured,
    });

    enqueueSyncItem('message', {
      senderName: result.extractedName || customerName,
      senderContact: result.extractedPhone || from,
      channel: 'whatsapp',
      content: message.slice(0, 2000),
      recommendedWebsite: result.recommendedWebsiteName || undefined,
      status: result.needsHumanHandoff ? 'handoff' : 'replied',
    });

    if (result.leadCaptured) {
      enqueueSyncItem('customer', {
        name: result.extractedName || customerName,
        phone: result.extractedPhone || from,
        businessName: result.extractedRequirements || undefined,
        source: 'whatsapp',
      });
    }

    res.json({
      ok: true,
      to: from,
      reply: result.reply,
      language: result.language,
      recommendedWebsiteId: result.recommendedWebsiteId,
      recommendedWebsiteName: result.recommendedWebsiteName,
      leadCaptured: result.leadCaptured,
      needsHumanHandoff: result.needsHumanHandoff,
      handoffReason: result.handoffReason,
      notifyOwner: result.leadCaptured || result.needsHumanHandoff,
      ownerNotificationText:
        result.ownerNotificationSummary ||
        `New WhatsApp inquiry from ${customerName} (${from}): ${message.slice(0, 120)}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('n8n WhatsApp webhook error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to process WhatsApp webhook.',
    });
  }
});

// Admin sync endpoints for pending n8n / visitor events
app.get('/api/n8n/pending-sync', (_req, res) => {
  res.json({ items: pendingSyncQueue });
});

app.post('/api/n8n/mark-synced', (req, res) => {
  const { ids } = req.body || {};
  if (Array.isArray(ids)) {
    const idSet = new Set(ids.map(String));
    for (let i = pendingSyncQueue.length - 1; i >= 0; i--) {
      if (idSet.has(pendingSyncQueue[i].id)) {
        pendingSyncQueue.splice(i, 1);
      }
    }
  }
  res.json({ ok: true, remaining: pendingSyncQueue.length });
});

// Visitor lead/order fallback capture
app.post('/api/leads', (req, res) => {
  const { type, payload } = req.body || {};
  if (!type || !payload) {
    res.status(400).json({ error: 'Invalid lead payload.' });
    return;
  }
  const id = enqueueSyncItem(type, payload);
  res.json({ ok: true, id });
});

// Downloadable n8n Workflow JSON Blueprint
app.get('/api/n8n/workflow-blueprint', (req, res) => {
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const workflow = {
    name: 'AR Tech - WhatsApp AI Sales Agent (Gemini + n8n)',
    nodes: [
      {
        parameters: { updates: ['messages'] },
        id: 'whatsapp-trigger',
        name: 'WhatsApp Business Cloud Trigger',
        type: 'n8n-nodes-base.whatsAppTrigger',
        typeVersion: 1,
        position: [240, 300],
      },
      {
        parameters: {
          method: 'POST',
          url: `${baseUrl}/api/n8n/whatsapp-webhook`,
          sendHeaders: true,
          headerParameters: {
            parameters: [{ name: 'Content-Type', value: 'application/json' }],
          },
          sendBody: true,
          specifyBody: 'json',
          jsonBody:
            '={{ { "from": $json.messages[0].from, "customerName": $json.contacts[0].profile.name, "message": $json.messages[0].text.body } }}',
        },
        id: 'artech-ai-agent',
        name: 'AR Tech Grounded AI Agent',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4,
        position: [520, 300],
      },
      {
        parameters: {
          operation: 'send',
          recipientPhoneNumber: '={{ $json.to }}',
          textBody: '={{ $json.reply }}',
        },
        id: 'whatsapp-reply',
        name: 'Send WhatsApp Customer Reply',
        type: 'n8n-nodes-base.whatsApp',
        typeVersion: 1,
        position: [800, 220],
      },
      {
        parameters: {
          conditions: {
            boolean: [{ value1: '={{ $json.notifyOwner }}', value2: true }],
          },
        },
        id: 'check-notify-owner',
        name: 'Lead or Human Handoff?',
        type: 'n8n-nodes-base.if',
        typeVersion: 1,
        position: [800, 420],
      },
      {
        parameters: {
          operation: 'send',
          recipientPhoneNumber: '={{ $env.ARTECH_OWNER_WHATSAPP }}',
          textBody: '={{ "AR Tech Alert: " + $json.ownerNotificationText }}',
        },
        id: 'notify-owner',
        name: 'Notify AR Tech Owner',
        type: 'n8n-nodes-base.whatsApp',
        typeVersion: 1,
        position: [1080, 420],
      },
    ],
    connections: {
      'WhatsApp Business Cloud Trigger': {
        main: [[{ node: 'AR Tech Grounded AI Agent', type: 'main', index: 0 }]],
      },
      'AR Tech Grounded AI Agent': {
        main: [
          [
            { node: 'Send WhatsApp Customer Reply', type: 'main', index: 0 },
            { node: 'Lead or Human Handoff?', type: 'main', index: 0 },
          ],
        ],
      },
      'Lead or Human Handoff?': {
        main: [[{ node: 'Notify AR Tech Owner', type: 'main', index: 0 }]],
      },
    },
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="ar-tech-whatsapp-n8n-workflow.json"');
  res.send(JSON.stringify(workflow, null, 2));
});

// AI Website Design Generator (Server-side Gemini API)
app.post('/api/ai/generate-design', async (req, res) => {
  try {
    const { prompt, category } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Design prompt is required.' });
      return;
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Create a professional, conversion-focused website template specification for AR Tech Marketplace.
Requested Category: ${category || 'Business Website'}
Client Niche / Brief: ${prompt.slice(0, 600)}`,
      config: {
        systemInstruction:
          'You are a Principal UI/UX Architect at AR Tech. Generate concise, realistic commercial website template metadata in clean English (with optional Bengali business fit). Return strict JSON.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: 'Concise, memorable template name (2-5 words).' },
            category: { type: Type.STRING, description: 'Matching category name.' },
            description: { type: Type.STRING, description: 'Clear 2-sentence commercial description (max 240 chars).' },
            features: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '4 concise, practical website features.',
            },
            deliveryDays: { type: Type.INTEGER, description: 'Realistic delivery days (2 to 10).' },
            techStack: { type: Type.STRING, description: 'e.g. React, Tailwind CSS, Firebase' },
          },
          required: ['name', 'category', 'description', 'features', 'deliveryDays', 'techStack'],
        },
      },
    });

    const parsed = JSON.parse((response.text || '{}').trim());
    res.json(parsed);
  } catch (error) {
    console.error('AI design generation error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate AI website design.',
    });
  }
});

async function startServer() {
  const httpServer = http.createServer(app);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server: httpServer },
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`AR Tech server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
