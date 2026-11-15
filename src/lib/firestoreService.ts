import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { OperationType, db, handleFirestoreError } from './firebase';
import { calculateSellingPrice } from './marketplaceUtils';
import {
  DEFAULT_PRIVATE_SETTINGS,
  DEFAULT_PUBLIC_SETTINGS,
  SEED_CATEGORIES,
  SEED_TEMPLATES,
} from './seedData';
import {
  AgentLogRecord,
  CategoryItem,
  ChannelType,
  CustomerRecord,
  MessageRecord,
  MessageStatus,
  OrderRecord,
  OrderStatus,
  PendingSyncItem,
  PrivateSettings,
  PublicSettings,
  WebsiteCostBreakdown,
  WebsiteDesign,
} from '../types/marketplace';

function tsToIso(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

function mapWebsiteDoc(id: string, data: Record<string, unknown>): WebsiteDesign {
  return {
    id,
    name: String(data.name || ''),
    category: String(data.category || ''),
    description: String(data.description || ''),
    imageUrl: String(data.imageUrl || ''),
    features: Array.isArray(data.features) ? data.features.map(String) : [],
    sellingPrice: Number(data.sellingPrice || 0),
    deliveryDays: Number(data.deliveryDays || 3),
    techStack: data.techStack ? String(data.techStack) : undefined,
    isAiGenerated: Boolean(data.isAiGenerated),
    published: Boolean(data.published),
    featured: Boolean(data.featured),
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

export async function fetchPublishedWebsites(): Promise<WebsiteDesign[]> {
  const path = 'websites';
  try {
    const q = query(collection(db, path), where('published', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapWebsiteDoc(d.id, d.data()));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchAllWebsitesAdmin(): Promise<WebsiteDesign[]> {
  const path = 'websites';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((d) => mapWebsiteDoc(d.id, d.data()));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchWebsiteCostsAdmin(): Promise<Record<string, WebsiteCostBreakdown>> {
  const path = 'website_costs';
  try {
    const snap = await getDocs(collection(db, path));
    const map: Record<string, WebsiteCostBreakdown> = {};
    snap.docs.forEach((d) => {
      const data = d.data();
      map[d.id] = {
        websiteId: d.id,
        domainCost: Number(data.domainCost || 0),
        hostingCost: Number(data.hostingCost || 0),
        otherCosts: Number(data.otherCosts || 0),
        profitMargin: Number(data.profitMargin || 500),
        sellingPrice: Number(data.sellingPrice || 0),
        updatedAt: tsToIso(data.updatedAt),
      };
    });
    return map;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchCategories(): Promise<CategoryItem[]> {
  const path = 'categories';
  try {
    const q = query(collection(db, path), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: String(data.name || ''),
        slug: String(data.slug || d.id),
        description: data.description ? String(data.description) : undefined,
        order: Number(data.order || 0),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchPublicSettings(): Promise<PublicSettings> {
  const path = 'settings/public';
  try {
    const snap = await getDoc(doc(db, 'settings', 'public'));
    if (!snap.exists()) return DEFAULT_PUBLIC_SETTINGS;
    const data = snap.data();
    return {
      messengerUrl: String(data.messengerUrl || DEFAULT_PUBLIC_SETTINGS.messengerUrl),
      whatsappNumber: data.whatsappNumber ? String(data.whatsappNumber) : DEFAULT_PUBLIC_SETTINGS.whatsappNumber,
      agentEnabled: Boolean(data.agentEnabled ?? true),
      updatedAt: tsToIso(data.updatedAt),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function fetchPrivateSettingsAdmin(): Promise<PrivateSettings> {
  const path = 'settings/private';
  try {
    const snap = await getDoc(doc(db, 'settings', 'private'));
    if (!snap.exists()) return DEFAULT_PRIVATE_SETTINGS;
    const data = snap.data();
    return {
      defaultDomainCost: Number(data.defaultDomainCost ?? DEFAULT_PRIVATE_SETTINGS.defaultDomainCost),
      defaultHostingCost: Number(data.defaultHostingCost ?? DEFAULT_PRIVATE_SETTINGS.defaultHostingCost),
      defaultOtherCosts: Number(data.defaultOtherCosts ?? DEFAULT_PRIVATE_SETTINGS.defaultOtherCosts),
      defaultProfitMargin: Number(data.defaultProfitMargin ?? DEFAULT_PRIVATE_SETTINGS.defaultProfitMargin),
      n8nWebhookUrl: data.n8nWebhookUrl ? String(data.n8nWebhookUrl) : '',
      whatsappProvider: data.whatsappProvider ? String(data.whatsappProvider) : DEFAULT_PRIVATE_SETTINGS.whatsappProvider,
      whatsappPhoneNumberId: data.whatsappPhoneNumberId ? String(data.whatsappPhoneNumberId) : '',
      ownerNotifyPhone: data.ownerNotifyPhone ? String(data.ownerNotifyPhone) : '',
      agentInstructions: data.agentInstructions ? String(data.agentInstructions) : DEFAULT_PRIVATE_SETTINGS.agentInstructions,
      autoNotifyOwner: Boolean(data.autoNotifyOwner ?? true),
      allowHumanHandoff: Boolean(data.allowHumanHandoff ?? true),
      updatedAt: tsToIso(data.updatedAt),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveWebsiteWithCosts(
  website: Omit<WebsiteDesign, 'createdAt' | 'updatedAt' | 'sellingPrice'>,
  costs: Omit<WebsiteCostBreakdown, 'websiteId' | 'sellingPrice' | 'updatedAt'>,
  isNew: boolean
): Promise<void> {
  const sellingPrice = calculateSellingPrice(
    costs.domainCost,
    costs.hostingCost,
    costs.otherCosts,
    costs.profitMargin
  );
  const path = `websites/${website.id}`;
  try {
    const batch = writeBatch(db);
    const webRef = doc(db, 'websites', website.id);
    const costRef = doc(db, 'website_costs', website.id);

    const safeFeatures = website.features.slice(0, 10).map((f) => f.slice(0, 120));
    if (safeFeatures.length === 0) safeFeatures.push('Responsive Modern Layout');

    if (isNew) {
      batch.set(webRef, {
        id: website.id,
        name: website.name.slice(0, 120),
        category: website.category.slice(0, 80),
        description: website.description.slice(0, 600),
        imageUrl: website.imageUrl.slice(0, 1000),
        features: safeFeatures,
        sellingPrice,
        deliveryDays: Math.max(1, Math.min(365, Math.round(website.deliveryDays || 3))),
        ...(website.techStack ? { techStack: website.techStack.slice(0, 160) } : {}),
        isAiGenerated: Boolean(website.isAiGenerated),
        published: Boolean(website.published),
        featured: Boolean(website.featured),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(costRef, {
        websiteId: website.id,
        domainCost: Number(costs.domainCost) || 0,
        hostingCost: Number(costs.hostingCost) || 0,
        otherCosts: Number(costs.otherCosts) || 0,
        profitMargin: Number(costs.profitMargin) || 0,
        sellingPrice,
        updatedAt: serverTimestamp(),
      });
    } else {
      const existingSnap = await getDoc(webRef);
      const existingCreatedAt = existingSnap.exists() ? existingSnap.data().createdAt : serverTimestamp();
      batch.set(webRef, {
        id: website.id,
        name: website.name.slice(0, 120),
        category: website.category.slice(0, 80),
        description: website.description.slice(0, 600),
        imageUrl: website.imageUrl.slice(0, 1000),
        features: safeFeatures,
        sellingPrice,
        deliveryDays: Math.max(1, Math.min(365, Math.round(website.deliveryDays || 3))),
        ...(website.techStack ? { techStack: website.techStack.slice(0, 160) } : {}),
        isAiGenerated: Boolean(website.isAiGenerated),
        published: Boolean(website.published),
        featured: Boolean(website.featured),
        createdAt: existingCreatedAt,
        updatedAt: serverTimestamp(),
      });
      batch.set(costRef, {
        websiteId: website.id,
        domainCost: Number(costs.domainCost) || 0,
        hostingCost: Number(costs.hostingCost) || 0,
        otherCosts: Number(costs.otherCosts) || 0,
        profitMargin: Number(costs.profitMargin) || 0,
        sellingPrice,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteWebsiteAndCosts(websiteId: string): Promise<void> {
  const path = `websites/${websiteId}`;
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'websites', websiteId));
    batch.delete(doc(db, 'website_costs', websiteId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveCategory(category: CategoryItem): Promise<void> {
  const path = `categories/${category.id}`;
  try {
    await setDoc(doc(db, 'categories', category.id), {
      id: category.id,
      name: category.name.slice(0, 80),
      slug: category.slug.slice(0, 80),
      ...(category.description ? { description: category.description.slice(0, 240) } : {}),
      order: Math.max(0, Math.round(category.order)),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const path = `categories/${categoryId}`;
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function savePublicSettings(settings: Omit<PublicSettings, 'updatedAt'>): Promise<void> {
  const path = 'settings/public';
  try {
    await setDoc(doc(db, 'settings', 'public'), {
      messengerUrl: settings.messengerUrl.slice(0, 500),
      ...(settings.whatsappNumber ? { whatsappNumber: settings.whatsappNumber.slice(0, 40) } : {}),
      agentEnabled: Boolean(settings.agentEnabled),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function savePrivateSettings(settings: Omit<PrivateSettings, 'updatedAt'>): Promise<void> {
  const path = 'settings/private';
  try {
    await setDoc(doc(db, 'settings', 'private'), {
      defaultDomainCost: Number(settings.defaultDomainCost) || 0,
      defaultHostingCost: Number(settings.defaultHostingCost) || 0,
      defaultOtherCosts: Number(settings.defaultOtherCosts) || 0,
      defaultProfitMargin: Number(settings.defaultProfitMargin) || 0,
      ...(settings.n8nWebhookUrl ? { n8nWebhookUrl: settings.n8nWebhookUrl.slice(0, 500) } : {}),
      ...(settings.whatsappProvider ? { whatsappProvider: settings.whatsappProvider.slice(0, 80) } : {}),
      ...(settings.whatsappPhoneNumberId ? { whatsappPhoneNumberId: settings.whatsappPhoneNumberId.slice(0, 120) } : {}),
      ...(settings.ownerNotifyPhone ? { ownerNotifyPhone: settings.ownerNotifyPhone.slice(0, 40) } : {}),
      ...(settings.agentInstructions ? { agentInstructions: settings.agentInstructions.slice(0, 3000) } : {}),
      autoNotifyOwner: Boolean(settings.autoNotifyOwner),
      allowHumanHandoff: Boolean(settings.allowHumanHandoff),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function createOrderRecord(order: {
  id: string;
  userId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  websiteId: string;
  websiteName: string;
  category: string;
  priceBdt: number;
  channel: ChannelType;
  notes?: string;
}): Promise<void> {
  const path = `orders/${order.id}`;
  try {
    await setDoc(doc(db, 'orders', order.id), {
      id: order.id,
      userId: order.userId,
      customerName: order.customerName.slice(0, 120),
      ...(order.customerPhone ? { customerPhone: order.customerPhone.slice(0, 40) } : {}),
      ...(order.customerEmail ? { customerEmail: order.customerEmail.slice(0, 160) } : {}),
      websiteId: order.websiteId,
      websiteName: order.websiteName.slice(0, 120),
      category: order.category.slice(0, 80),
      priceBdt: Number(order.priceBdt) || 0,
      channel: order.channel,
      ...(order.notes ? { notes: order.notes.slice(0, 1000) } : {}),
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateOrderStatusAdmin(orderId: string, status: OrderStatus): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function fetchOrdersAdmin(): Promise<OrderRecord[]> {
  const path = 'orders';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: String(data.userId || ''),
        customerName: String(data.customerName || ''),
        customerPhone: data.customerPhone ? String(data.customerPhone) : undefined,
        customerEmail: data.customerEmail ? String(data.customerEmail) : undefined,
        websiteId: String(data.websiteId || ''),
        websiteName: String(data.websiteName || ''),
        category: String(data.category || ''),
        priceBdt: Number(data.priceBdt || 0),
        channel: (data.channel as ChannelType) || 'web',
        notes: data.notes ? String(data.notes) : undefined,
        status: (data.status as OrderStatus) || 'pending',
        createdAt: tsToIso(data.createdAt),
        updatedAt: tsToIso(data.updatedAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchCustomersAdmin(): Promise<CustomerRecord[]> {
  const path = 'customers';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: String(data.userId || ''),
        name: String(data.name || ''),
        email: data.email ? String(data.email) : undefined,
        phone: data.phone ? String(data.phone) : undefined,
        businessName: data.businessName ? String(data.businessName) : undefined,
        source: (data.source as ChannelType) || 'web',
        createdAt: tsToIso(data.createdAt),
        updatedAt: tsToIso(data.updatedAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchMessagesAdmin(): Promise<MessageRecord[]> {
  const path = 'messages';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: String(data.userId || ''),
        senderName: String(data.senderName || ''),
        senderContact: data.senderContact ? String(data.senderContact) : undefined,
        channel: (data.channel as ChannelType) || 'web',
        content: String(data.content || ''),
        recommendedWebsite: data.recommendedWebsite ? String(data.recommendedWebsite) : undefined,
        status: (data.status as MessageStatus) || 'unread',
        createdAt: tsToIso(data.createdAt),
        updatedAt: tsToIso(data.updatedAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function updateMessageStatusAdmin(messageId: string, status: MessageStatus): Promise<void> {
  const path = `messages/${messageId}`;
  try {
    await updateDoc(doc(db, 'messages', messageId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function fetchAgentLogsAdmin(): Promise<AgentLogRecord[]> {
  const path = 'agent_logs';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: String(data.userId || ''),
        customerName: data.customerName ? String(data.customerName) : undefined,
        customerMessage: String(data.customerMessage || ''),
        agentReply: String(data.agentReply || ''),
        language: (data.language as 'bn' | 'en' | 'mixed') || 'mixed',
        recommendedWebsiteId: data.recommendedWebsiteId ? String(data.recommendedWebsiteId) : undefined,
        needsHumanHandoff: Boolean(data.needsHumanHandoff),
        leadCaptured: Boolean(data.leadCaptured),
        createdAt: tsToIso(data.createdAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createMessageRecord(msg: {
  id: string;
  userId: string;
  senderName: string;
  senderContact?: string;
  channel: ChannelType;
  content: string;
  recommendedWebsite?: string;
}): Promise<void> {
  const path = `messages/${msg.id}`;
  try {
    await setDoc(doc(db, 'messages', msg.id), {
      id: msg.id,
      userId: msg.userId,
      senderName: msg.senderName.slice(0, 120),
      ...(msg.senderContact ? { senderContact: msg.senderContact.slice(0, 160) } : {}),
      channel: msg.channel,
      content: msg.content.slice(0, 2000),
      ...(msg.recommendedWebsite ? { recommendedWebsite: msg.recommendedWebsite.slice(0, 120) } : {}),
      status: 'unread',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function createAgentLogRecord(log: Omit<AgentLogRecord, 'createdAt'>): Promise<void> {
  const path = `agent_logs/${log.id}`;
  try {
    await setDoc(doc(db, 'agent_logs', log.id), {
      id: log.id,
      userId: log.userId,
      ...(log.customerName ? { customerName: log.customerName.slice(0, 120) } : {}),
      customerMessage: log.customerMessage.slice(0, 2000),
      agentReply: log.agentReply.slice(0, 4000),
      language: log.language,
      ...(log.recommendedWebsiteId ? { recommendedWebsiteId: log.recommendedWebsiteId.slice(0, 128) } : {}),
      needsHumanHandoff: Boolean(log.needsHumanHandoff),
      leadCaptured: Boolean(log.leadCaptured),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function seedInitialMarketplaceAdmin(): Promise<boolean> {
  const path = 'websites';
  try {
    const existingWebsites = await getDocs(collection(db, 'websites'));
    if (!existingWebsites.empty) return false;

    const batch = writeBatch(db);
    for (const cat of SEED_CATEGORIES) {
      batch.set(doc(db, 'categories', cat.id), {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        ...(cat.description ? { description: cat.description } : {}),
        order: cat.order,
      });
    }

    for (const entry of SEED_TEMPLATES) {
      batch.set(doc(db, 'websites', entry.website.id), {
        id: entry.website.id,
        name: entry.website.name,
        category: entry.website.category,
        description: entry.website.description,
        imageUrl: entry.website.imageUrl,
        features: entry.website.features,
        sellingPrice: entry.website.sellingPrice,
        deliveryDays: entry.website.deliveryDays,
        ...(entry.website.techStack ? { techStack: entry.website.techStack } : {}),
        isAiGenerated: entry.website.isAiGenerated,
        published: entry.website.published,
        featured: Boolean(entry.website.featured),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'website_costs', entry.costs.websiteId), {
        websiteId: entry.costs.websiteId,
        domainCost: entry.costs.domainCost,
        hostingCost: entry.costs.hostingCost,
        otherCosts: entry.costs.otherCosts,
        profitMargin: entry.costs.profitMargin,
        sellingPrice: entry.costs.sellingPrice,
        updatedAt: serverTimestamp(),
      });
    }

    const pubSnap = await getDoc(doc(db, 'settings', 'public'));
    if (!pubSnap.exists()) {
      batch.set(doc(db, 'settings', 'public'), {
        messengerUrl: DEFAULT_PUBLIC_SETTINGS.messengerUrl,
        whatsappNumber: DEFAULT_PUBLIC_SETTINGS.whatsappNumber,
        agentEnabled: DEFAULT_PUBLIC_SETTINGS.agentEnabled,
        updatedAt: serverTimestamp(),
      });
    }

    const privSnap = await getDoc(doc(db, 'settings', 'private'));
    if (!privSnap.exists()) {
      batch.set(doc(db, 'settings', 'private'), {
        defaultDomainCost: DEFAULT_PRIVATE_SETTINGS.defaultDomainCost,
        defaultHostingCost: DEFAULT_PRIVATE_SETTINGS.defaultHostingCost,
        defaultOtherCosts: DEFAULT_PRIVATE_SETTINGS.defaultOtherCosts,
        defaultProfitMargin: DEFAULT_PRIVATE_SETTINGS.defaultProfitMargin,
        n8nWebhookUrl: DEFAULT_PRIVATE_SETTINGS.n8nWebhookUrl,
        whatsappProvider: DEFAULT_PRIVATE_SETTINGS.whatsappProvider,
        whatsappPhoneNumberId: DEFAULT_PRIVATE_SETTINGS.whatsappPhoneNumberId,
        ownerNotifyPhone: DEFAULT_PRIVATE_SETTINGS.ownerNotifyPhone,
        agentInstructions: DEFAULT_PRIVATE_SETTINGS.agentInstructions,
        autoNotifyOwner: DEFAULT_PRIVATE_SETTINGS.autoNotifyOwner,
        allowHumanHandoff: DEFAULT_PRIVATE_SETTINGS.allowHumanHandoff,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncPendingServerEventsToFirestore(adminUid: string): Promise<number> {
  const res = await fetch('/api/n8n/pending-sync');
  if (!res.ok) return 0;
  const data = (await res.json()) as { items: PendingSyncItem[] };
  if (!data.items || data.items.length === 0) return 0;

  const syncedIds: string[] = [];
  const batch = writeBatch(db);

  for (const item of data.items.slice(0, 40)) {
    const p = item.payload;
    if (item.type === 'message') {
      batch.set(doc(db, 'messages', item.id), {
        id: item.id,
        userId: adminUid,
        senderName: String(p.senderName || 'WhatsApp Visitor').slice(0, 120),
        ...(p.senderContact ? { senderContact: String(p.senderContact).slice(0, 160) } : {}),
        channel: (['web', 'whatsapp', 'messenger'].includes(String(p.channel)) ? String(p.channel) : 'whatsapp'),
        content: String(p.content || 'Inquiry').slice(0, 2000),
        ...(p.recommendedWebsite ? { recommendedWebsite: String(p.recommendedWebsite).slice(0, 120) } : {}),
        status: (['unread', 'replied', 'handoff', 'resolved'].includes(String(p.status)) ? String(p.status) : 'unread'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      syncedIds.push(item.id);
    } else if (item.type === 'customer') {
      batch.set(doc(db, 'customers', item.id), {
        id: item.id,
        userId: adminUid,
        name: String(p.name || 'Prospect').slice(0, 120),
        ...(p.email ? { email: String(p.email).slice(0, 160) } : {}),
        ...(p.phone ? { phone: String(p.phone).slice(0, 40) } : {}),
        ...(p.businessName ? { businessName: String(p.businessName).slice(0, 160) } : {}),
        source: (['web', 'whatsapp', 'messenger'].includes(String(p.source)) ? String(p.source) : 'whatsapp'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      syncedIds.push(item.id);
    } else if (item.type === 'agent_log') {
      batch.set(doc(db, 'agent_logs', item.id), {
        id: item.id,
        userId: adminUid,
        ...(p.customerName ? { customerName: String(p.customerName).slice(0, 120) } : {}),
        customerMessage: String(p.customerMessage || '').slice(0, 2000) || 'Message',
        agentReply: String(p.agentReply || '').slice(0, 4000) || 'Reply',
        language: (['bn', 'en', 'mixed'].includes(String(p.language)) ? String(p.language) : 'mixed'),
        ...(p.recommendedWebsiteId ? { recommendedWebsiteId: String(p.recommendedWebsiteId).slice(0, 128) } : {}),
        needsHumanHandoff: Boolean(p.needsHumanHandoff),
        leadCaptured: Boolean(p.leadCaptured),
        createdAt: serverTimestamp(),
      });
      syncedIds.push(item.id);
    } else if (item.type === 'order') {
      const websiteId = String(p.websiteId || '');
      if (websiteId) {
        const wSnap = await getDoc(doc(db, 'websites', websiteId));
        if (wSnap.exists()) {
          batch.set(doc(db, 'orders', item.id), {
            id: item.id,
            userId: adminUid,
            customerName: String(p.customerName || 'Visitor').slice(0, 120),
            ...(p.customerPhone ? { customerPhone: String(p.customerPhone).slice(0, 40) } : {}),
            ...(p.customerEmail ? { customerEmail: String(p.customerEmail).slice(0, 160) } : {}),
            websiteId,
            websiteName: String(p.websiteName || 'Website').slice(0, 120),
            category: String(p.category || 'Business Website').slice(0, 80),
            priceBdt: Number(p.priceBdt || 0),
            channel: (['messenger', 'whatsapp', 'web'].includes(String(p.channel)) ? String(p.channel) : 'web'),
            ...(p.notes ? { notes: String(p.notes).slice(0, 1000) } : {}),
            status: 'pending',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
      syncedIds.push(item.id);
    }
  }

  if (syncedIds.length > 0) {
    await batch.commit();
    await fetch('/api/n8n/mark-synced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: syncedIds }),
    });
  }
  return syncedIds.length;
}
