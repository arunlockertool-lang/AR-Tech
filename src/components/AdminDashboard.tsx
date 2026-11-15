import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Calculator,
  Download,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Moon,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sun,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
} from 'lucide-react';
import { User, signInWithPopup, signOut } from 'firebase/auth';
import { BOOTSTRAP_ADMIN_EMAIL, auth, googleProvider } from '../lib/firebase';
import {
  deleteCategory,
  deleteWebsiteAndCosts,
  fetchAgentLogsAdmin,
  fetchAllWebsitesAdmin,
  fetchCategories,
  fetchCustomersAdmin,
  fetchMessagesAdmin,
  fetchOrdersAdmin,
  fetchPrivateSettingsAdmin,
  fetchPublicSettings,
  fetchWebsiteCostsAdmin,
  saveCategory,
  savePrivateSettings,
  savePublicSettings,
  saveWebsiteWithCosts,
  seedInitialMarketplaceAdmin,
  syncPendingServerEventsToFirestore,
  updateMessageStatusAdmin,
  updateOrderStatusAdmin,
} from '../lib/firestoreService';
import {
  AgentLogRecord,
  CategoryItem,
  CustomerRecord,
  MessageRecord,
  MessageStatus,
  OrderRecord,
  OrderStatus,
  PrivateSettings,
  PublicSettings,
  WebsiteCostBreakdown,
  WebsiteDesign,
} from '../types/marketplace';
import { calculateSellingPrice, formatBdt, slugifyId } from '../lib/marketplaceUtils';
import { DEFAULT_PRIVATE_SETTINGS, DEFAULT_PUBLIC_SETTINGS } from '../lib/seedData';
import { AdminWebsiteModal } from './AdminWebsiteModal';

type AdminTab =
  | 'overview'
  | 'websites'
  | 'pricing'
  | 'categories'
  | 'orders'
  | 'messages'
  | 'settings';

interface AdminDashboardProps {
  user: User | null;
  authReady: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onRefreshStorefront: () => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  authReady,
  theme,
  onToggleTheme,
  onRefreshStorefront,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const [websites, setWebsites] = useState<WebsiteDesign[]>([]);
  const [costsMap, setCostsMap] = useState<Record<string, WebsiteCostBreakdown>>({});
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [agentLogs, setAgentLogs] = useState<AgentLogRecord[]>([]);
  const [publicSettings, setPublicSettings] = useState<PublicSettings>(DEFAULT_PUBLIC_SETTINGS);
  const [privateSettings, setPrivateSettings] = useState<PrivateSettings>(DEFAULT_PRIVATE_SETTINGS);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState<WebsiteDesign | null>(null);

  // Category form state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  // Inline pricing edits
  const [pricingDrafts, setPricingDrafts] = useState<
    Record<string, { domainCost: number; hostingCost: number; otherCosts: number; profitMargin: number }>
  >({});

  const isAdminUser = Boolean(
    user && user.emailVerified && user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()
  );

  const loadAdminData = useCallback(async () => {
    if (!user || !isAdminUser) return;
    setLoading(true);
    setErrorNotice(null);
    try {
      await seedInitialMarketplaceAdmin();
      const syncedCount = await syncPendingServerEventsToFirestore(user.uid);
      if (syncedCount > 0) {
        setStatusNotice(`Synced ${syncedCount} new WhatsApp/web leads into Firestore.`);
      }

      const [
        wList,
        cMap,
        catList,
        ordList,
        custList,
        msgList,
        logList,
        pubSet,
        privSet,
      ] = await Promise.all([
        fetchAllWebsitesAdmin(),
        fetchWebsiteCostsAdmin(),
        fetchCategories(),
        fetchOrdersAdmin(),
        fetchCustomersAdmin(),
        fetchMessagesAdmin(),
        fetchAgentLogsAdmin(),
        fetchPublicSettings(),
        fetchPrivateSettingsAdmin(),
      ]);

      setWebsites(wList);
      setCostsMap(cMap);
      setCategories(catList);
      setOrders(ordList);
      setCustomers(custList);
      setMessages(msgList);
      setAgentLogs(logList);
      setPublicSettings(pubSet);
      setPrivateSettings(privSet);

      const drafts: typeof pricingDrafts = {};
      wList.forEach((w) => {
        const c = cMap[w.id];
        drafts[w.id] = {
          domainCost: c?.domainCost ?? privSet.defaultDomainCost,
          hostingCost: c?.hostingCost ?? privSet.defaultHostingCost,
          otherCosts: c?.otherCosts ?? privSet.defaultOtherCosts,
          profitMargin: c?.profitMargin ?? privSet.defaultProfitMargin,
        };
      });
      setPricingDrafts(drafts);

      // Push live published catalog to server n8n webhook cache
      await fetch('/api/n8n/catalog-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalog: wList.filter((w) => w.published),
          agentInstructions: privSet.agentInstructions,
          allowHumanHandoff: privSet.allowHumanHandoff,
        }),
      }).catch(() => {});
    } catch (err) {
      setErrorNotice(err instanceof Error ? err.message : 'Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  }, [user, isAdminUser]);

  useEffect(() => {
    if (authReady && isAdminUser) {
      void loadAdminData();
    }
  }, [authReady, isAdminUser, loadAdminData]);

  const handleGoogleSignIn = async () => {
    setErrorNotice(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setErrorNotice(err instanceof Error ? err.message : 'Google sign-in failed.');
    }
  };

  const handleTogglePublish = async (site: WebsiteDesign) => {
    const cost = costsMap[site.id] || {
      domainCost: privateSettings.defaultDomainCost,
      hostingCost: privateSettings.defaultHostingCost,
      otherCosts: privateSettings.defaultOtherCosts,
      profitMargin: privateSettings.defaultProfitMargin,
    };
    await saveWebsiteWithCosts(
      {
        id: site.id,
        name: site.name,
        category: site.category,
        description: site.description,
        imageUrl: site.imageUrl,
        features: site.features,
        deliveryDays: site.deliveryDays,
        techStack: site.techStack,
        isAiGenerated: site.isAiGenerated,
        published: !site.published,
        featured: site.featured,
      },
      {
        domainCost: cost.domainCost,
        hostingCost: cost.hostingCost,
        otherCosts: cost.otherCosts,
        profitMargin: cost.profitMargin,
      },
      false
    );
    await loadAdminData();
    await onRefreshStorefront();
  };

  const handleDeleteWebsite = async (websiteId: string) => {
    await deleteWebsiteAndCosts(websiteId);
    setStatusNotice('Website design deleted.');
    await loadAdminData();
    await onRefreshStorefront();
  };

  const handleSaveRowPricing = async (site: WebsiteDesign) => {
    const draft = pricingDrafts[site.id];
    if (!draft) return;
    await saveWebsiteWithCosts(
      {
        id: site.id,
        name: site.name,
        category: site.category,
        description: site.description,
        imageUrl: site.imageUrl,
        features: site.features,
        deliveryDays: site.deliveryDays,
        techStack: site.techStack,
        isAiGenerated: site.isAiGenerated,
        published: site.published,
        featured: site.featured,
      },
      draft,
      false
    );
    setStatusNotice(`Updated selling price for ${site.name}.`);
    await loadAdminData();
    await onRefreshStorefront();
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const slug = slugifyId(newCategoryName);
    await saveCategory({
      id: slug,
      name: newCategoryName.trim(),
      slug,
      description: newCategoryDesc.trim() || undefined,
      order: categories.length + 1,
    });
    setNewCategoryName('');
    setNewCategoryDesc('');
    setStatusNotice('Category added.');
    await loadAdminData();
    await onRefreshStorefront();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncing(true);
    setErrorNotice(null);
    try {
      await Promise.all([
        savePublicSettings({
          messengerUrl: publicSettings.messengerUrl.trim() || '[ADD YOUR FACEBOOK MESSENGER LINK]',
          whatsappNumber: publicSettings.whatsappNumber?.trim() || undefined,
          agentEnabled: publicSettings.agentEnabled,
        }),
        savePrivateSettings({
          defaultDomainCost: Number(privateSettings.defaultDomainCost) || 0,
          defaultHostingCost: Number(privateSettings.defaultHostingCost) || 0,
          defaultOtherCosts: Number(privateSettings.defaultOtherCosts) || 0,
          defaultProfitMargin: Number(privateSettings.defaultProfitMargin) || 0,
          n8nWebhookUrl: privateSettings.n8nWebhookUrl?.trim() || undefined,
          whatsappProvider: privateSettings.whatsappProvider?.trim() || undefined,
          whatsappPhoneNumberId: privateSettings.whatsappPhoneNumberId?.trim() || undefined,
          ownerNotifyPhone: privateSettings.ownerNotifyPhone?.trim() || undefined,
          agentInstructions: privateSettings.agentInstructions?.trim() || undefined,
          autoNotifyOwner: privateSettings.autoNotifyOwner,
          allowHumanHandoff: privateSettings.allowHumanHandoff,
        }),
      ]);
      await fetch('/api/n8n/catalog-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalog: websites.filter((w) => w.published),
          agentInstructions: privateSettings.agentInstructions,
          allowHumanHandoff: privateSettings.allowHumanHandoff,
        }),
      }).catch(() => {});
      setStatusNotice('Storefront, Messenger URL, Pricing Defaults & AI Agent settings saved.');
      await onRefreshStorefront();
    } catch (err) {
      setErrorNotice(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSyncing(false);
    }
  };

  const stats = useMemo(() => {
    const totalRevenue = orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((acc, o) => acc + (Number(o.priceBdt) || 0), 0);
    const totalProfit = orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((acc, o) => acc + (costsMap[o.websiteId]?.profitMargin ?? privateSettings.defaultProfitMargin), 0);
    const publishedCount = websites.filter((w) => w.published).length;
    const unreadOrHandoff = messages.filter(
      (m) => m.status === 'unread' || m.status === 'handoff'
    ).length;

    return { totalRevenue, totalProfit, publishedCount, unreadOrHandoff };
  }, [orders, websites, messages, costsMap, privateSettings.defaultProfitMargin]);

  if (!authReady) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-slate-500">
        Verifying Firebase Authentication...
      </div>
    );
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-md px-4 py-20">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-950 dark:text-white">
            AR Tech Admin Console
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Sign in with your verified Google Admin account ({BOOTSTRAP_ADMIN_EMAIL}) to manage website designs, internal pricing margins, orders, and WhatsApp AI settings.
          </p>
          {errorNotice && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {errorNotice}
            </p>
          )}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="mt-6 w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Sign In with Google
          </button>
        </div>
      </section>
    );
  }

  if (!isAdminUser) {
    return (
      <section className="mx-auto max-w-md px-4 py-20">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">
            Admin Access Required
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Signed in as <strong>{user.email}</strong>. This account does not have AR Tech administrator privileges.
          </p>
          <button
            type="button"
            onClick={() => void signOut(auth)}
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </section>
    );
  }

  const navItems: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview & Stats', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'websites', label: 'Templates & AI Studio', icon: <Sparkles className="h-4 w-4" /> },
    { id: 'pricing', label: 'Pricing & Profit', icon: <Calculator className="h-4 w-4" /> },
    { id: 'categories', label: 'Categories', icon: <FolderKanban className="h-4 w-4" /> },
    { id: 'orders', label: 'Orders & Customers', icon: <ShoppingBag className="h-4 w-4" /> },
    { id: 'messages', label: 'Messages & AI Logs', icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'settings', label: 'Messenger & n8n', icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:px-8">
      {/* Admin Sidebar */}
      <aside className="w-full shrink-0 lg:w-64">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 pb-3 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Admin Workspace
            </p>
            <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
              {user.email}
            </p>
          </div>

          <nav className="mt-3 flex flex-row gap-1 overflow-x-auto lg:flex-col">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                  activeTab === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
            <button
              type="button"
              onClick={onToggleTheme}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
            <button
              type="button"
              onClick={() => void signOut(auth)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1 space-y-6">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h1 className="text-lg font-bold text-slate-950 dark:text-white">
              {navItems.find((i) => i.id === activeTab)?.label}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              AR Tech Firestore &amp; n8n Operations Console
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => void loadAdminData()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync &amp; Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingWebsite(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New / AI Design</span>
            </button>
          </div>
        </div>

        {statusNotice && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            {statusNotice}
          </div>
        )}
        {errorNotice && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {errorNotice}
          </div>
        )}

        {/* TAB 1: OVERVIEW & STATS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Order Pipeline Revenue
                </p>
                <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-950 dark:text-white">
                  {formatBdt(stats.totalRevenue)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Projected Net Profit
                </p>
                <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                  {formatBdt(stats.totalProfit)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Published Designs
                </p>
                <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-950 dark:text-white">
                  {stats.publishedCount} / {websites.length}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Open Messages / Handoffs
                </p>
                <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-950 dark:text-white">
                  {stats.unreadOrHandoff}
                </p>
              </div>
            </div>

            {/* Recent Orders Summary */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
                <h2 className="text-sm font-semibold text-slate-950 dark:text-white">
                  Recent Customer Orders ({orders.length})
                </h2>
              </div>
              {orders.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  No orders logged yet. Orders submitted via Messenger checkout or WhatsApp will appear here.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Customer</th>
                        <th className="px-4 py-3 font-semibold">Website Design</th>
                        <th className="px-4 py-3 font-semibold">Channel</th>
                        <th className="px-4 py-3 text-right font-semibold">Price (BDT)</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {orders.slice(0, 6).map((ord) => (
                        <tr key={ord.id}>
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                            {ord.customerName}
                            {ord.customerPhone && (
                              <span className="block font-mono text-[11px] text-slate-500">
                                {ord.customerPhone}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                            {ord.websiteName}
                          </td>
                          <td className="px-4 py-3 capitalize text-slate-600 dark:text-slate-400">
                            {ord.channel}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-slate-950 dark:text-white">
                            {formatBdt(ord.priceBdt)}
                          </td>
                          <td className="px-4 py-3 capitalize text-slate-700 dark:text-slate-300">
                            {ord.status.replace('_', ' ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: TEMPLATES & AI STUDIO */}
        {activeTab === 'websites' && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Design Name</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 text-right font-semibold">Selling Price</th>
                    <th className="px-4 py-3 font-semibold">Visibility</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {websites.map((site) => (
                    <tr key={site.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-950 dark:text-white">
                          {site.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {site.isAiGenerated ? 'AI Generated' : 'Studio Template'} · {site.deliveryDays} Days
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {site.category}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-slate-950 dark:text-white">
                        {formatBdt(site.sellingPrice)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => void handleTogglePublish(site)}
                          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                            site.published
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {site.published ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          <span>{site.published ? 'Published' : 'Unpublished'}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingWebsite(site);
                              setModalOpen(true);
                            }}
                            aria-label={`Edit ${site.name}`}
                            className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteWebsite(site.id)}
                            aria-label={`Delete ${site.name}`}
                            className="rounded-md border border-slate-200 p-1.5 text-red-600 hover:bg-red-50 dark:border-slate-700 dark:text-red-400 dark:hover:bg-red-950/40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PRICING & PROFIT CONTROLS */}
        {activeTab === 'pricing' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-bold text-slate-950 dark:text-white">
                Admin-Controlled Pricing Formula
              </h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Selling Price = Domain Cost + Hosting Cost + Other Costs + Profit Margin (Default ৳500). Internal cost columns are stored strictly in <code className="font-mono">website_costs</code> and are never visible to customers.
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Website</th>
                      <th className="px-3 py-3 font-semibold">Domain (৳)</th>
                      <th className="px-3 py-3 font-semibold">Hosting (৳)</th>
                      <th className="px-3 py-3 font-semibold">Other (৳)</th>
                      <th className="px-3 py-3 font-semibold">Profit (৳)</th>
                      <th className="px-4 py-3 text-right font-semibold">Selling Price</th>
                      <th className="px-4 py-3 text-right font-semibold">Save</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {websites.map((site) => {
                      const d = pricingDrafts[site.id] || {
                        domainCost: 1500,
                        hostingCost: 2500,
                        otherCosts: 1000,
                        profitMargin: 500,
                      };
                      const previewTotal = calculateSellingPrice(
                        d.domainCost,
                        d.hostingCost,
                        d.otherCosts,
                        d.profitMargin
                      );
                      return (
                        <tr key={site.id}>
                          <td className="px-4 py-3 font-medium text-slate-950 dark:text-white">
                            {site.name}
                          </td>
                          {(['domainCost', 'hostingCost', 'otherCosts', 'profitMargin'] as const).map(
                            (field) => (
                              <td key={field} className="px-3 py-2">
                                <input
                                  type="number"
                                  min={0}
                                  value={d[field]}
                                  onChange={(e) =>
                                    setPricingDrafts((prev) => ({
                                      ...prev,
                                      [site.id]: {
                                        ...d,
                                        [field]: Number(e.target.value),
                                      },
                                    }))
                                  }
                                  className="w-24 rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                />
                              </td>
                            )
                          )}
                          <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-blue-600 dark:text-blue-400">
                            {formatBdt(previewTotal)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => void handleSaveRowPricing(site)}
                              className="rounded-md bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700"
                            >
                              Update
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CATEGORIES MANAGER */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <form
              onSubmit={handleAddCategory}
              className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <input
                type="text"
                required
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="New Category Name (e.g. Healthcare Website)"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <input
                type="text"
                value={newCategoryDesc}
                onChange={(e) => setNewCategoryDesc(e.target.value)}
                placeholder="Short description (optional)"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Add Category
              </button>
            </form>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Order</th>
                    <th className="px-4 py-3 font-semibold">Category Name</th>
                    <th className="px-4 py-3 font-semibold">Slug</th>
                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {categories.map((cat) => (
                    <tr key={cat.id}>
                      <td className="px-4 py-3 font-mono tabular-nums text-slate-500">
                        {cat.order}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-950 dark:text-white">
                        {cat.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">{cat.slug}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteCategory(cat.id);
                            await loadAdminData();
                            await onRefreshStorefront();
                          }}
                          className="rounded-md border border-slate-200 p-1.5 text-red-600 hover:bg-red-50 dark:border-slate-700 dark:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: ORDERS & CUSTOMERS */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
                <h2 className="text-sm font-semibold text-slate-950 dark:text-white">
                  All Orders ({orders.length})
                </h2>
              </div>
              {orders.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">No orders yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Customer</th>
                        <th className="px-4 py-3 font-semibold">Template &amp; Category</th>
                        <th className="px-4 py-3 font-semibold">Notes</th>
                        <th className="px-4 py-3 text-right font-semibold">Price</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {orders.map((ord) => (
                        <tr key={ord.id}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-950 dark:text-white">
                              {ord.customerName}
                            </p>
                            <p className="font-mono text-[11px] text-slate-500">
                              {ord.customerPhone || ord.customerEmail || ord.channel}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900 dark:text-slate-200">
                              {ord.websiteName}
                            </p>
                            <p className="text-[11px] text-slate-500">{ord.category}</p>
                          </td>
                          <td className="max-w-xs truncate px-4 py-3 text-slate-600 dark:text-slate-400">
                            {ord.notes || '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-slate-950 dark:text-white">
                            {formatBdt(ord.priceBdt)}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={ord.status}
                              onChange={async (e) => {
                                await updateOrderStatusAdmin(ord.id, e.target.value as OrderStatus);
                                await loadAdminData();
                              }}
                              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            >
                              <option value="pending">Pending</option>
                              <option value="contacted">Contacted</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
                <h2 className="text-sm font-semibold text-slate-950 dark:text-white">
                  Captured Customers &amp; WhatsApp Leads ({customers.length})
                </h2>
              </div>
              {customers.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No captured customer profiles yet. Leads captured by the WhatsApp AI Agent sync here.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Name</th>
                        <th className="px-4 py-3 font-semibold">Phone / Email</th>
                        <th className="px-4 py-3 font-semibold">Requirements</th>
                        <th className="px-4 py-3 font-semibold">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {customers.map((c) => (
                        <tr key={c.id}>
                          <td className="px-4 py-3 font-semibold text-slate-950 dark:text-white">
                            {c.name}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                            {c.phone || c.email || '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                            {c.businessName || '—'}
                          </td>
                          <td className="px-4 py-3 capitalize text-slate-500">{c.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: MESSAGES & AI LOGS */}
        {activeTab === 'messages' && (
          <div className="space-y-6">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
                <h2 className="text-sm font-semibold text-slate-950 dark:text-white">
                  Customer Messages ({messages.length})
                </h2>
              </div>
              {messages.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No customer messages yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {messages.map((msg) => (
                    <div key={msg.id} className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-slate-950 dark:text-white">
                            {msg.senderName}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="font-mono text-slate-500">{msg.senderContact || msg.channel}</span>
                          {msg.recommendedWebsite && (
                            <>
                              <span className="text-slate-400">·</span>
                              <span className="text-blue-600 dark:text-blue-400">
                                Recommended: {msg.recommendedWebsite}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                          {msg.content}
                        </p>
                      </div>
                      <select
                        value={msg.status}
                        onChange={async (e) => {
                          await updateMessageStatusAdmin(msg.id, e.target.value as MessageStatus);
                          await loadAdminData();
                        }}
                        className="shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="unread">Unread</option>
                        <option value="replied">Replied</option>
                        <option value="handoff">Human Handoff</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-sm font-semibold text-slate-950 dark:text-white">
                    WhatsApp AI Agent Logs ({agentLogs.length})
                  </h2>
                </div>
              </div>
              {agentLogs.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No AI Agent interactions logged yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {agentLogs.slice(0, 20).map((log) => (
                    <div key={log.id} className="space-y-1.5 p-4 text-xs">
                      <div className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {log.customerName || 'Visitor'}
                        </span>
                        <span>·</span>
                        <span className="uppercase">{log.language}</span>
                        {log.leadCaptured && (
                          <>
                            <span>·</span>
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                              Lead Captured
                            </span>
                          </>
                        )}
                        {log.needsHumanHandoff && (
                          <>
                            <span>·</span>
                            <span className="font-medium text-amber-600 dark:text-amber-400">
                              Human Handoff
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-slate-700 dark:text-slate-300">
                        <strong>Customer:</strong> {log.customerMessage}
                      </p>
                      <p className="text-slate-600 dark:text-slate-400">
                        <strong>AI Agent:</strong> {log.agentReply}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: MESSENGER, WHATSAPP & n8n SETTINGS */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-base font-bold text-slate-950 dark:text-white">
                Facebook Messenger &amp; Contact Channels
              </h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Every Order Now button opens this Facebook Messenger URL with prefilled Website Name, Price (BDT), and Category.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Facebook Messenger URL
                  </label>
                  <input
                    type="text"
                    value={publicSettings.messengerUrl}
                    onChange={(e) =>
                      setPublicSettings((s) => ({ ...s, messengerUrl: e.target.value }))
                    }
                    placeholder="https://m.me/yourpage"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Official WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={publicSettings.whatsappNumber || ''}
                    onChange={(e) =>
                      setPublicSettings((s) => ({ ...s, whatsappNumber: e.target.value }))
                    }
                    placeholder="+880 1700-000000"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-950 dark:text-white">
                    n8n &amp; WhatsApp AI Agent Configuration
                  </h2>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    Configure WhatsApp Business Cloud API metadata, owner alert phone, and Gemini AI instructions.
                  </p>
                </div>
                <a
                  href="/api/n8n/workflow-blueprint"
                  download="ar-tech-whatsapp-n8n-workflow.json"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export n8n Blueprint</span>
                </a>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    WhatsApp Provider
                  </label>
                  <input
                    type="text"
                    value={privateSettings.whatsappProvider || ''}
                    onChange={(e) =>
                      setPrivateSettings((s) => ({ ...s, whatsappProvider: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    WhatsApp Cloud Phone Number ID
                  </label>
                  <input
                    type="text"
                    value={privateSettings.whatsappPhoneNumberId || ''}
                    onChange={(e) =>
                      setPrivateSettings((s) => ({ ...s, whatsappPhoneNumberId: e.target.value }))
                    }
                    placeholder="e.g. 1059283746123"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    n8n Outbound Webhook URL
                  </label>
                  <input
                    type="url"
                    value={privateSettings.n8nWebhookUrl || ''}
                    onChange={(e) =>
                      setPrivateSettings((s) => ({ ...s, n8nWebhookUrl: e.target.value }))
                    }
                    placeholder="https://your-n8n-instance.com/webhook/artech"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Owner Alert Phone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={privateSettings.ownerNotifyPhone || ''}
                    onChange={(e) =>
                      setPrivateSettings((s) => ({ ...s, ownerNotifyPhone: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  AI Agent System Guidance (Bengali &amp; English Tone)
                </label>
                <textarea
                  rows={3}
                  value={privateSettings.agentInstructions || ''}
                  onChange={(e) =>
                    setPrivateSettings((s) => ({ ...s, agentInstructions: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-6 text-sm text-slate-700 dark:text-slate-300">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={publicSettings.agentEnabled}
                    onChange={(e) =>
                      setPublicSettings((s) => ({ ...s, agentEnabled: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  <span>Enable AI Agent</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={privateSettings.autoNotifyOwner}
                    onChange={(e) =>
                      setPrivateSettings((s) => ({ ...s, autoNotifyOwner: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  <span>Auto-Notify Owner on New Orders &amp; Leads</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={privateSettings.allowHumanHandoff}
                    onChange={(e) =>
                      setPrivateSettings((s) => ({ ...s, allowHumanHandoff: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  <span>Transfer Complex Chats to Human</span>
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-base font-bold text-slate-950 dark:text-white">
                Default Pricing Formula Baseline (BDT)
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Default Domain (৳)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={privateSettings.defaultDomainCost}
                    onChange={(e) =>
                      setPrivateSettings((s) => ({ ...s, defaultDomainCost: Number(e.target.value) }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Default Hosting (৳)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={privateSettings.defaultHostingCost}
                    onChange={(e) =>
                      setPrivateSettings((s) => ({ ...s, defaultHostingCost: Number(e.target.value) }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Default Other (৳)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={privateSettings.defaultOtherCosts}
                    onChange={(e) =>
                      setPrivateSettings((s) => ({ ...s, defaultOtherCosts: Number(e.target.value) }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Default Profit (৳)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={privateSettings.defaultProfitMargin}
                    onChange={(e) =>
                      setPrivateSettings((s) => ({ ...s, defaultProfitMargin: Number(e.target.value) }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={syncing}
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {syncing ? 'Saving Settings...' : 'Save All Admin Settings'}
              </button>
            </div>
          </form>
        )}
      </main>

      <AdminWebsiteModal
        isOpen={modalOpen}
        editingWebsite={editingWebsite}
        editingCosts={editingWebsite ? costsMap[editingWebsite.id] || null : null}
        categories={categories}
        privateSettings={privateSettings}
        onClose={() => setModalOpen(false)}
        onSaved={async () => {
          await loadAdminData();
          await onRefreshStorefront();
        }}
      />
    </div>
  );
};
