/**
 * Billing & Credits System Types
 *
 * Modular type definitions for the Trackbliss billing system:
 * - Plan tiers (free / pro / enterprise)
 * - Add-on module subscriptions
 * - AI credit system (monthly + purchased)
 * - Usage tracking & quotas
 * - Stripe integration types
 */

import type { DPPTemplateName } from './database';

// ============================================
// PLAN & MODULE DEFINITIONS
// ============================================

export type BillingPlan = 'free' | 'pro' | 'enterprise';

export type BillingInterval = 'monthly' | 'yearly';

export type ModuleId =
  | 'returns_hub_starter'
  | 'returns_hub_professional'
  | 'returns_hub_business'
  | 'supplier_portal'
  | 'customer_portal'
  | 'custom_domain';

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'trialing'
  | 'paused';

export type ModuleSubscriptionStatus = 'active' | 'canceled' | 'past_due';

// ============================================
// PLAN LIMITS
// ============================================

export interface PlanLimits {
  maxProducts: number;
  maxBatchesPerProduct: number;
  maxDocuments: number;
  maxStorageBytes: number;
  maxAdminUsers: number;
  maxSupplyChainPerProduct: number;
  monthlyAICredits: number;
  dppTemplates: DPPTemplateName[];
  visibilityTiers: ('consumer' | 'customs' | 'internal')[];
}

export interface ModuleLimits {
  maxReturnsPerMonth: number;
  maxWorkflowRules: number;
  maxEmailTemplates: number;
  ticketsEnabled: boolean;
  webhooksEnabled: boolean;
  apiAccess: 'none' | 'read' | 'readwrite';
}

// ============================================
// FEATURE FLAGS (derived from plan + modules)
// ============================================

export interface BillingFeatures {
  customBranding: boolean;
  dppDesignCustomization: boolean;
  qrCodeBranding: boolean;
  whiteLabel: boolean;
  complianceFull: boolean;
  checklistFull: boolean;
  customCSS: boolean;
}

// ============================================
// CREDIT SYSTEM
// ============================================

export interface CreditBalance {
  monthlyAllowance: number;
  monthlyUsed: number;
  monthlyResetAt: string | null;
  purchasedBalance: number;
  totalAvailable: number;
}

export type CreditTransactionType =
  | 'plan_allowance'
  | 'purchase'
  | 'consume'
  | 'refund'
  | 'monthly_reset'
  | 'plan_change';

export type CreditSource = 'monthly' | 'purchased';

export interface CreditTransaction {
  id: string;
  tenantId: string;
  type: CreditTransactionType;
  amount: number;
  balanceAfter: number;
  source: CreditSource;
  description: string | null;
  metadata: Record<string, unknown>;
  userId: string | null;
  createdAt: string;
}

// Credit costs per AI operation
export const AI_CREDIT_COSTS = {
  compliance_check: 3,       // Full 3-phase analysis
  overall_assessment: 1,
  action_plan: 1,
  additional_requirements: 1,
  chat_message: 1,
  pdf_report: 0,             // Client-side, no cost
} as const;

export type AICreditOperation = keyof typeof AI_CREDIT_COSTS;

// ============================================
// CREDIT PACKS (one-time purchase)
// ============================================

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  priceEur: number;
  pricePerCredit: number;
  stripePriceId?: string;
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: 'small', name: 'Small', credits: 50, priceEur: 9, pricePerCredit: 0.18 },
  { id: 'medium', name: 'Medium', credits: 200, priceEur: 29, pricePerCredit: 0.145 },
  { id: 'large', name: 'Large', credits: 500, priceEur: 59, pricePerCredit: 0.118 },
];

// ============================================
// USAGE TRACKING
// ============================================

export type UsageResourceType =
  | 'product'
  | 'batch'
  | 'document'
  | 'storage_bytes'
  | 'supply_chain_entry'
  | 'admin_user'
  | 'ai_credit'
  | 'return'
  | 'ticket'
  | 'supplier_invitation'
  | 'workflow_rule'
  | 'email_template';

export type UsageAction = 'create' | 'delete' | 'consume';

export interface UsageLog {
  id: string;
  tenantId: string;
  resourceType: UsageResourceType;
  action: UsageAction;
  resourceId: string | null;
  quantity: number;
  metadata: Record<string, unknown>;
  userId: string | null;
  createdAt: string;
}

// ============================================
// QUOTA CHECK RESULT
// ============================================

export interface QuotaCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  resource: string;
}

// ============================================
// SUBSCRIPTIONS (Stripe mirror)
// ============================================

export interface BillingSubscription {
  id: string;
  tenantId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  plan: BillingPlan;
  status: SubscriptionStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface BillingModuleSubscription {
  id: string;
  tenantId: string;
  moduleId: ModuleId;
  stripeSubscriptionItemId: string | null;
  status: ModuleSubscriptionStatus;
  activatedAt: string;
  canceledAt: string | null;
}

// ============================================
// INVOICES (Stripe mirror)
// ============================================

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

export interface BillingInvoice {
  id: string;
  tenantId: string;
  stripeInvoiceId: string;
  stripeInvoiceUrl: string | null;
  stripePdfUrl: string | null;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: InvoiceStatus;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
}

// ============================================
// TENANT ENTITLEMENTS (computed, cached)
// ============================================

export interface TenantEntitlements {
  plan: BillingPlan;
  status: SubscriptionStatus;
  modules: Set<ModuleId>;
  limits: PlanLimits & Partial<ModuleLimits>;
  credits: CreditBalance;
  features: BillingFeatures;
  subscription: BillingSubscription | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}

// ============================================
// PLAN CONFIGURATION (static)
// ============================================

const FREE_TEMPLATES: DPPTemplateName[] = ['modern', 'minimal', 'compact'];
const ALL_TEMPLATES: DPPTemplateName[] = [
  'modern', 'classic', 'compact', 'minimal', 'technical',
  'eco-friendly', 'premium', 'government', 'retail', 'scientific', 'accessible',
];

export const PLAN_CONFIGS: Record<BillingPlan, {
  limits: PlanLimits;
  features: BillingFeatures;
  priceMonthly: number;
  priceYearly: number;
}> = {
  free: {
    limits: {
      maxProducts: 5,
      maxBatchesPerProduct: 3,
      maxDocuments: 10,
      maxStorageBytes: 100 * 1024 * 1024, // 100 MB
      maxAdminUsers: 1,
      maxSupplyChainPerProduct: 5,
      monthlyAICredits: 3,
      dppTemplates: FREE_TEMPLATES,
      visibilityTiers: ['consumer'],
    },
    features: {
      customBranding: false,
      dppDesignCustomization: false,
      qrCodeBranding: false,
      whiteLabel: false,
      complianceFull: false,
      checklistFull: false,
      customCSS: false,
    },
    priceMonthly: 0,
    priceYearly: 0,
  },
  pro: {
    limits: {
      maxProducts: 50,
      maxBatchesPerProduct: 20,
      maxDocuments: 200,
      maxStorageBytes: 2 * 1024 * 1024 * 1024, // 2 GB
      maxAdminUsers: 5,
      maxSupplyChainPerProduct: 50,
      monthlyAICredits: 25,
      dppTemplates: ALL_TEMPLATES,
      visibilityTiers: ['consumer', 'customs'],
    },
    features: {
      customBranding: true,
      dppDesignCustomization: true,
      qrCodeBranding: true,
      whiteLabel: false,
      complianceFull: true,
      checklistFull: true,
      customCSS: false,
    },
    priceMonthly: 49,
    priceYearly: 468,
  },
  enterprise: {
    limits: {
      maxProducts: Infinity,
      maxBatchesPerProduct: Infinity,
      maxDocuments: Infinity,
      maxStorageBytes: 20 * 1024 * 1024 * 1024, // 20 GB
      maxAdminUsers: 25,
      maxSupplyChainPerProduct: Infinity,
      monthlyAICredits: 100,
      dppTemplates: ALL_TEMPLATES,
      visibilityTiers: ['consumer', 'customs', 'internal'],
    },
    features: {
      customBranding: true,
      dppDesignCustomization: true,
      qrCodeBranding: true,
      whiteLabel: true,
      complianceFull: true,
      checklistFull: true,
      customCSS: true,
    },
    priceMonthly: 149,
    priceYearly: 1428,
  },
};

// ============================================
// MODULE CONFIGURATION (static)
// ============================================

export const MODULE_CONFIGS: Record<ModuleId, {
  name: string;
  priceMonthly: number;
  requiresPlan: BillingPlan;
  requiresModule?: ModuleId[];
  limits?: Partial<ModuleLimits>;
}> = {
  returns_hub_starter: {
    name: 'Returns Hub Starter',
    priceMonthly: 29,
    requiresPlan: 'pro',
    limits: {
      maxReturnsPerMonth: 50,
      maxWorkflowRules: 0,
      maxEmailTemplates: 5,
      ticketsEnabled: false,
      webhooksEnabled: false,
      apiAccess: 'none',
    },
  },
  returns_hub_professional: {
    name: 'Returns Hub Professional',
    priceMonthly: 69,
    requiresPlan: 'pro',
    limits: {
      maxReturnsPerMonth: 300,
      maxWorkflowRules: 5,
      maxEmailTemplates: Infinity,
      ticketsEnabled: true,
      webhooksEnabled: false,
      apiAccess: 'read',
    },
  },
  returns_hub_business: {
    name: 'Returns Hub Business',
    priceMonthly: 149,
    requiresPlan: 'enterprise',
    limits: {
      maxReturnsPerMonth: Infinity,
      maxWorkflowRules: Infinity,
      maxEmailTemplates: Infinity,
      ticketsEnabled: true,
      webhooksEnabled: true,
      apiAccess: 'readwrite',
    },
  },
  supplier_portal: {
    name: 'Supplier Portal',
    priceMonthly: 19,
    requiresPlan: 'pro',
  },
  customer_portal: {
    name: 'Customer Portal',
    priceMonthly: 29,
    requiresPlan: 'pro',
    requiresModule: ['returns_hub_starter'],
  },
  custom_domain: {
    name: 'Custom Domain / White-Label',
    priceMonthly: 19,
    requiresPlan: 'pro',
  },
};

// ============================================
// RETURNS HUB MODULE HELPERS
// ============================================

/** All returns hub module IDs in tier order */
export const RETURNS_HUB_MODULES: ModuleId[] = [
  'returns_hub_starter',
  'returns_hub_professional',
  'returns_hub_business',
];

/** Check if a module is any returns hub tier */
export function isReturnsHubModule(moduleId: ModuleId): boolean {
  return RETURNS_HUB_MODULES.includes(moduleId);
}

/** Get the active returns hub tier from a set of modules */
export function getActiveReturnsHubTier(modules: Set<ModuleId>): ModuleId | null {
  // Return highest tier
  for (let i = RETURNS_HUB_MODULES.length - 1; i >= 0; i--) {
    if (modules.has(RETURNS_HUB_MODULES[i])) return RETURNS_HUB_MODULES[i];
  }
  return null;
}

/** Check if any returns hub module is active */
export function hasAnyReturnsHub(modules: Set<ModuleId>): boolean {
  return getActiveReturnsHubTier(modules) !== null;
}

// ============================================
// CHECKOUT TYPES
// ============================================

export type CheckoutMode = 'subscription' | 'payment';

export interface CheckoutRequest {
  mode: CheckoutMode;
  priceId: string;
  quantity?: number;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

export interface PortalSessionResult {
  url: string;
}

// ============================================
// BILLING CONTEXT STATE
// ============================================

export interface BillingContextState {
  entitlements: TenantEntitlements | null;
  isLoading: boolean;
  error: string | null;
  refreshEntitlements: () => Promise<void>;
  checkQuota: (resource: UsageResourceType, extra?: { productId?: string }) => Promise<QuotaCheckResult>;
  consumeCredits: (amount: number, operation: string, metadata?: Record<string, unknown>) => Promise<{ success: boolean; remaining: number }>;
  refundCredits: (amount: number, operation: string) => Promise<void>;
  hasModule: (moduleId: ModuleId) => boolean;
  hasAnyReturnsHubModule: () => boolean;
  canUseFeature: (feature: keyof BillingFeatures) => boolean;
  isTemplateAvailable: (template: DPPTemplateName) => boolean;
}
