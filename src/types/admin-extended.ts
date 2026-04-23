/**
 * Admin v2 extended types — audit log, tenant notes, feature flags,
 * tenant health, impersonation, and analytics DTOs.
 */

export interface AdminAuditEntry {
  id: string;
  adminId?: string;
  adminEmail: string;
  action: string;
  targetType: 'tenant' | 'user' | 'coupon' | 'credit' | 'subscription' | 'feature_flag' | 'webhook' | 'ticket' | 'note' | 'impersonation';
  targetId?: string;
  targetLabel?: string;
  changes?: Record<string, { before?: unknown; after?: unknown } | unknown>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AdminAuditFilter {
  adminId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface TenantNote {
  id: string;
  tenantId: string;
  authorId?: string;
  authorEmail?: string;
  content: string;
  pinned: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  description?: string;
  enabledGlobally: boolean;
  rolloutPercentage: number;
  enabledForTenants: string[];
  disabledForTenants: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TenantHealth {
  score: number; // 0..100
  factors: {
    tenantStatus?: string;
    noLogin?: boolean;
    daysSinceLogin?: number;
    paymentStatus?: string;
    failedWebhooks7d?: number;
    openTickets?: number;
    [key: string]: unknown;
  };
  updatedAt?: string;
}

export type TenantStatus = 'active' | 'suspended' | 'deleted' | 'trial_expired';

export interface ExtendedAdminTenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: TenantStatus;
  suspendedAt?: string;
  suspendedReason?: string;
  trialEndsAt?: string;
  adminNotes?: string;
  healthScore?: number;
  healthFactors?: TenantHealth['factors'];
  healthUpdatedAt?: string;
  userCount: number;
  productCount: number;
  activeModules: string[];
  mrr?: number;
  createdAt: string;
  lastActivity?: string;
}

export interface ImpersonationSession {
  token: string;
  tenantId: string;
  tenantName: string;
  sessionId: string;
  expiresAt: string;
  startedAt: string;
}

export interface ShopifyWebhookEntry {
  id: string;
  tenantId: string;
  shopDomain: string;
  topic: string;
  status: 'pending' | 'processed' | 'failed' | 'dead_letter';
  attempts: number;
  lastError?: string;
  receivedAt: string;
  processedAt?: string;
}

// Analytics DTOs
export interface CohortCell {
  cohortMonth: string;  // "2026-01"
  monthOffset: number;  // 0 = signup month, 1 = month after, ...
  tenantCount: number;
  activeCount: number;
  retentionPct: number;
}

export interface MrrWaterfallEntry {
  month: string;  // "2026-03"
  startMrr: number;
  newMrr: number;       // from new tenants
  expansionMrr: number; // upgrades
  contractionMrr: number; // downgrades
  churnMrr: number;     // cancellations
  endMrr: number;
}

export interface FeatureAdoption {
  feature: string;
  label: string;
  activeTenants: number;
  totalTenants: number;
  adoptionPct: number;
  trend30d?: number; // delta in %
}

export interface TenantUsageTrend {
  month: string;  // "2026-03"
  products: number;
  batches: number;
  shipments: number;
  returns: number;
  documents: number;
  aiCreditsUsed: number;
}
