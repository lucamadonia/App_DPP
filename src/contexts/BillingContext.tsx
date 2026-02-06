/**
 * BillingContext
 *
 * Provides tenant billing entitlements throughout the application.
 * Loads on auth, caches with 2min TTL, exposes quota/credit/module checks.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getTenantEntitlements,
  checkQuota as checkQuotaService,
  consumeCredits as consumeCreditsService,
  refundCredits as refundCreditsService,
  invalidateEntitlementCache,
} from '@/services/supabase/billing';
import type {
  TenantEntitlements,
  QuotaCheckResult,
  UsageResourceType,
  ModuleId,
  BillingFeatures,
  BillingContextState,
} from '@/types/billing';
import { RETURNS_HUB_MODULES } from '@/types/billing';
import type { DPPTemplateName } from '@/types/database';

const BillingContext = createContext<BillingContextState | undefined>(undefined);

interface BillingProviderProps {
  children: ReactNode;
}

export function BillingProvider({ children }: BillingProviderProps) {
  const { isAuthenticated, tenantId } = useAuth();
  const [entitlements, setEntitlements] = useState<TenantEntitlements | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEntitlements = useCallback(async (force = false) => {
    if (!isAuthenticated || !tenantId) {
      setEntitlements(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getTenantEntitlements(tenantId, force);
      setEntitlements(data);
    } catch (err) {
      console.error('Failed to load billing entitlements:', err);
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, tenantId]);

  // Load on auth change
  useEffect(() => {
    if (isAuthenticated && tenantId) {
      loadEntitlements();
    } else {
      setEntitlements(null);
    }
  }, [isAuthenticated, tenantId, loadEntitlements]);

  const refreshEntitlements = useCallback(async () => {
    invalidateEntitlementCache();
    await loadEntitlements(true);
  }, [loadEntitlements]);

  const checkQuota = useCallback(async (
    resource: UsageResourceType,
    extra?: { productId?: string },
  ): Promise<QuotaCheckResult> => {
    return checkQuotaService(resource, { ...extra, tenantId: tenantId || undefined });
  }, [tenantId]);

  const consumeCredits = useCallback(async (
    amount: number,
    operation: string,
    metadata?: Record<string, unknown>,
  ) => {
    const result = await consumeCreditsService(amount, operation, metadata);
    if (result.success) {
      // Refresh entitlements to update credit display
      invalidateEntitlementCache();
      await loadEntitlements(true);
    }
    return result;
  }, [loadEntitlements]);

  const refundCredits = useCallback(async (
    amount: number,
    operation: string,
  ) => {
    await refundCreditsService(amount, operation);
    invalidateEntitlementCache();
    await loadEntitlements(true);
  }, [loadEntitlements]);

  const hasModule = useCallback((moduleId: ModuleId): boolean => {
    if (!entitlements) return false;
    return entitlements.modules.has(moduleId);
  }, [entitlements]);

  const hasAnyReturnsHubModule = useCallback((): boolean => {
    if (!entitlements) return false;
    return RETURNS_HUB_MODULES.some(m => entitlements.modules.has(m));
  }, [entitlements]);

  const canUseFeature = useCallback((feature: keyof BillingFeatures): boolean => {
    if (!entitlements) return false;
    return entitlements.features[feature];
  }, [entitlements]);

  const isTemplateAvailable = useCallback((template: DPPTemplateName): boolean => {
    if (!entitlements) return false;
    return entitlements.limits.dppTemplates.includes(template);
  }, [entitlements]);

  const value = useMemo<BillingContextState>(() => ({
    entitlements,
    isLoading,
    error,
    refreshEntitlements,
    checkQuota,
    consumeCredits,
    refundCredits,
    hasModule,
    hasAnyReturnsHubModule,
    canUseFeature,
    isTemplateAvailable,
  }), [
    entitlements, isLoading, error,
    refreshEntitlements, checkQuota, consumeCredits, refundCredits,
    hasModule, hasAnyReturnsHubModule, canUseFeature, isTemplateAvailable,
  ]);

  return (
    <BillingContext.Provider value={value}>
      {children}
    </BillingContext.Provider>
  );
}

export function useBilling(): BillingContextState {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error('useBilling must be used within a BillingProvider');
  }
  return context;
}

/**
 * Safe version that returns null outside BillingProvider.
 * Useful for components that may render in public routes.
 */
export function useBillingOptional(): BillingContextState | null {
  return useContext(BillingContext) ?? null;
}
