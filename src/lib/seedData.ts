import {
  CategoryItem,
  PrivateSettings,
  PublicSettings,
  WEBSITE_CATEGORIES,
  WebsiteCostBreakdown,
  WebsiteDesign,
} from '../types/marketplace';
import { TEMPLATE_CATEGORY_IMAGES } from './images';

const nowIso = '2026-11-15T00:00:00.000Z';

export const DEFAULT_PUBLIC_SETTINGS: PublicSettings = {
  messengerUrl: '[ADD YOUR FACEBOOK MESSENGER LINK]',
  whatsappNumber: '+880 1700-000000',
  agentEnabled: true,
  updatedAt: nowIso,
};

export const DEFAULT_PRIVATE_SETTINGS: PrivateSettings = {
  defaultDomainCost: 1500,
  defaultHostingCost: 2500,
  defaultOtherCosts: 1000,
  defaultProfitMargin: 500,
  n8nWebhookUrl: '',
  whatsappProvider: 'WhatsApp Business Cloud API (Meta)',
  whatsappPhoneNumberId: '',
  ownerNotifyPhone: '+880 1700-000000',
  agentInstructions:
    'You are the official AR Tech AI Sales Consultant. Always respond naturally in the customer’s language (Bengali or English). Recommend only real templates from the AR Tech catalog with their exact BDT prices. Never invent discounts, delivery guarantees, or payment links. Collect customer name, phone/WhatsApp number, and project requirements, and flag complex custom requests for human handoff.',
  autoNotifyOwner: true,
  allowHumanHandoff: true,
  updatedAt: nowIso,
};

export const SEED_CATEGORIES: CategoryItem[] = WEBSITE_CATEGORIES.map((name, index) => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  description: `Curated ${name} templates crafted for speed, mobile responsiveness, and conversion.`,
  order: index + 1,
}));

export interface SeedTemplateEntry {
  website: WebsiteDesign;
  costs: WebsiteCostBreakdown;
}

function makeSeedEntry(
  id: string,
  name: string,
  category: string,
  description: string,
  features: string[],
  domainCost: number,
  hostingCost: number,
  otherCosts: number,
  profitMargin: number,
  deliveryDays: number,
  techStack: string,
  isAiGenerated: boolean,
  featured = false
): SeedTemplateEntry {
  const sellingPrice = domainCost + hostingCost + otherCosts + profitMargin;
  return {
    website: {
      id,
      name,
      category,
      description,
      imageUrl: TEMPLATE_CATEGORY_IMAGES[category] || TEMPLATE_CATEGORY_IMAGES['Agency Website'],
      features,
      sellingPrice,
      deliveryDays,
      techStack,
      isAiGenerated,
      published: true,
      featured,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    costs: {
      websiteId: id,
      domainCost,
      hostingCost,
      otherCosts,
      profitMargin,
      sellingPrice,
      updatedAt: nowIso,
    },
  };
}

export const SEED_TEMPLATES: SeedTemplateEntry[] = [
  makeSeedEntry(
    'dhaka-atelier-commerce',
    'Dhaka Atelier Storefront',
    'E-commerce Website',
    'Conversion-focused online fashion & lifestyle storefront with bKash/Nagad checkout readiness, instant cart drawer, and mobile-first product filtering.',
    [
      'One-page fast checkout flow',
      'Category & size variant filters',
      'Order tracking & invoice PDF',
      'SEO & OpenGraph product cards',
    ],
    1500,
    2500,
    2000,
    500,
    4,
    'React, Tailwind CSS, Firebase',
    true,
    true
  ),
  makeSeedEntry(
    'nexus-agency-pro',
    'Nexus Digital Studio',
    'Agency Website',
    'Architectural corporate agency site with structured case studies, interactive service estimator, and client lead capture.',
    [
      'Case study metric grid',
      'Interactive discovery lead form',
      'Dark & Light mode ready',
      'Sub-second Vite bundle',
    ],
    1500,
    2500,
    1500,
    500,
    3,
    'Next.js / React, Motion, Tailwind',
    true,
    true
  ),
  makeSeedEntry(
    'luna-bistro-dining',
    'Luna & Lime Dining',
    'Restaurant Website',
    'Upscale restaurant and cafe showcase featuring seasonal menu sections, table reservation workflow, and Google Maps integration.',
    [
      'Interactive menu & chef specials',
      'Table reservation request flow',
      'Mobile click-to-call & WhatsApp',
      'Editorial food photography layout',
    ],
    1500,
    2000,
    1500,
    500,
    3,
    'React, Tailwind CSS, Express',
    false,
    true
  ),
  makeSeedEntry(
    'edupulse-academy',
    'EduPulse LMS & Academy',
    'Education Website',
    'Complete coaching center and online course platform with syllabus breakdown, instructor profiles, and student admission inquiry.',
    [
      'Course catalog & syllabus tabs',
      'Batch schedule & admission form',
      'Student testimonial proof strip',
      'Bilingual Bengali & English support',
    ],
    1500,
    2500,
    2500,
    500,
    5,
    'React, TypeScript, Firestore',
    true,
    false
  ),
  makeSeedEntry(
    'dashflow-analytics-ui',
    'DashFlow Operations UI',
    'Dashboard UI',
    'Clean SaaS and internal business operations dashboard featuring tabular financial ledgers, role-based access, and live KPI metrics.',
    [
      'Tabular revenue & order tables',
      'Role-based access architecture',
      'CSV export & filter controls',
      'Dark mode precision theme',
    ],
    1500,
    3000,
    3000,
    500,
    5,
    'React, TypeScript, Tailwind CSS',
    true,
    true
  ),
  makeSeedEntry(
    'monolith-portfolio',
    'Monolith Creative Folio',
    'Portfolio Website',
    'Editorial portfolio tailored for designers, photographers, and architects with high-resolution gallery lightbox and project brief form.',
    [
      'Masonry & grid project showcase',
      'Client testimonial cards',
      'Direct Messenger inquiry link',
      'Optimized image loading',
    ],
    1500,
    2000,
    1000,
    500,
    2,
    'React, Motion, Tailwind CSS',
    false,
    false
  ),
  makeSeedEntry(
    'veritas-corporate-biz',
    'Veritas Corporate Group',
    'Business Website',
    'Trustworthy corporate presence for trading houses, consultancy firms, and logistics providers with multi-service breakdown.',
    [
      'Executive team & company profile',
      'B2B quotation request form',
      'Downloadable company brochure',
      'WCAG AA accessible contrast',
    ],
    1500,
    2500,
    1500,
    500,
    3,
    'React, TypeScript, Tailwind CSS',
    false,
    false
  ),
  makeSeedEntry(
    'bangla-chronicle-blog',
    'Chronicle Editorial Magazine',
    'Blog Website',
    'Fast, distraction-free publishing and news magazine theme with Bengali typography optimization, topic filters, and newsletter signup.',
    [
      'Crisp Hind Siliguri Bengali type',
      'Topic & author archive pages',
      'Reading progress & share bar',
      'Ad-ready clean sidebar slots',
    ],
    1500,
    2000,
    1000,
    500,
    3,
    'React, Tailwind CSS, Markdown',
    false,
    false
  ),
  makeSeedEntry(
    'velocity-product-launch',
    'Velocity Launch Funnel',
    'Landing Page',
    'High-converting single-page product drop and campaign landing page engineered for Facebook & Google Ads traffic.',
    [
      'Hero focal CTA & offer timer-free clarity',
      'Feature-to-outcome comparison',
      'FAQ accordion & Messenger CTA',
      'Pixel & analytics event hooks',
    ],
    1500,
    1800,
    700,
    500,
    2,
    'React, Vite, Tailwind CSS',
    false,
    false
  ),
  makeSeedEntry(
    'rahman-personal-brand',
    'Founder Personal Brand',
    'Personal Website',
    'Sleek personal bio, speaking engagements, and consulting booking page for founders, doctors, and educators.',
    [
      'Interactive appointment request',
      'Press & media highlights',
      'Social & WhatsApp quick connect',
      'Lightweight mobile layout',
    ],
    1500,
    1800,
    700,
    500,
    2,
    'React, Tailwind CSS',
    false,
    false
  ),
];

export const INITIAL_PUBLIC_WEBSITES: WebsiteDesign[] = SEED_TEMPLATES.map((t) => t.website);
export const INITIAL_WEBSITE_COSTS: WebsiteCostBreakdown[] = SEED_TEMPLATES.map((t) => t.costs);
