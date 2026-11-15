export const WEBSITE_CATEGORIES = [
  'E-commerce Website',
  'Portfolio Website',
  'Business Website',
  'Education Website',
  'Restaurant Website',
  'Agency Website',
  'Blog Website',
  'Landing Page',
  'Personal Website',
  'Dashboard UI',
] as const;

export type WebsiteCategoryName = (typeof WEBSITE_CATEGORIES)[number] | string;

export interface WebsiteDesign {
  id: string;
  name: string;
  category: WebsiteCategoryName;
  description: string;
  imageUrl: string;
  features: string[];
  sellingPrice: number;
  deliveryDays: number;
  techStack?: string;
  isAiGenerated: boolean;
  published: boolean;
  featured?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteCostBreakdown {
  websiteId: string;
  domainCost: number;
  hostingCost: number;
  otherCosts: number;
  profitMargin: number;
  sellingPrice: number;
  updatedAt: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  order: number;
}

export type OrderStatus = 'pending' | 'contacted' | 'in_progress' | 'completed' | 'cancelled';
export type ChannelType = 'messenger' | 'whatsapp' | 'web';

export interface OrderRecord {
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
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerRecord {
  id: string;
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  businessName?: string;
  source: ChannelType;
  createdAt: string;
  updatedAt: string;
}

export type MessageStatus = 'unread' | 'replied' | 'handoff' | 'resolved';

export interface MessageRecord {
  id: string;
  userId: string;
  senderName: string;
  senderContact?: string;
  channel: ChannelType;
  content: string;
  recommendedWebsite?: string;
  status: MessageStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PublicSettings {
  messengerUrl: string;
  whatsappNumber?: string;
  agentEnabled: boolean;
  updatedAt: string;
}

export interface PrivateSettings {
  defaultDomainCost: number;
  defaultHostingCost: number;
  defaultOtherCosts: number;
  defaultProfitMargin: number;
  n8nWebhookUrl?: string;
  whatsappProvider?: string;
  whatsappPhoneNumberId?: string;
  ownerNotifyPhone?: string;
  agentInstructions?: string;
  autoNotifyOwner: boolean;
  allowHumanHandoff: boolean;
  updatedAt: string;
}

export interface AgentLogRecord {
  id: string;
  userId: string;
  customerName?: string;
  customerMessage: string;
  agentReply: string;
  language: 'bn' | 'en' | 'mixed';
  recommendedWebsiteId?: string;
  needsHumanHandoff: boolean;
  leadCaptured: boolean;
  createdAt: string;
}

export interface AgentChatResponse {
  reply: string;
  language: 'bn' | 'en' | 'mixed';
  recommendedWebsiteId: string | null;
  recommendedWebsiteName: string | null;
  extractedName: string | null;
  extractedPhone: string | null;
  extractedRequirements: string | null;
  leadCaptured: boolean;
  needsHumanHandoff: boolean;
  handoffReason: string | null;
  ownerNotificationSummary: string | null;
}

export interface PendingSyncItem {
  id: string;
  type: 'order' | 'message' | 'agent_log' | 'customer';
  payload: Record<string, unknown>;
  createdAt: string;
}
