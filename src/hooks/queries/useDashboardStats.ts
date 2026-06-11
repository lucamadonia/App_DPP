import { useQuery } from '@tanstack/react-query';
import { getReturnStats } from '@/services/supabase/returns';
import { getTicketStats } from '@/services/supabase/rh-tickets';
import { getWarehouseStats, getStockMovementTrend } from '@/services/supabase/wh-stock';
import { getShipmentStats } from '@/services/supabase/wh-shipments';
import { getHealthSummary } from '@/services/supabase/commerce-channels';
import { getMegaDashboardSnapshot } from '@/services/supabase/commerce-orders';
import { getTenantCRMKPIs } from '@/services/supabase/crm-analytics';
import { getReviewStats } from '@/services/supabase/feedback-reviews';
import { getUsageSummary } from '@/services/supabase/billing';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  returns: () => [...dashboardKeys.all, 'returns'] as const,
  warehouse: () => [...dashboardKeys.all, 'warehouse'] as const,
  commerceHealth: () => [...dashboardKeys.all, 'commerce-health'] as const,
  commerceSnapshot: () => [...dashboardKeys.all, 'commerce-snapshot'] as const,
  crm: () => [...dashboardKeys.all, 'crm'] as const,
  reviews: () => [...dashboardKeys.all, 'reviews'] as const,
  usage: () => [...dashboardKeys.all, 'usage'] as const,
};

/** Returns Hub + ticket stats bundled into a single widget query. */
export function useReturnsModuleStats(enabled: boolean) {
  return useQuery({
    queryKey: dashboardKeys.returns(),
    queryFn: async () => {
      const [returns, tickets] = await Promise.all([getReturnStats(), getTicketStats()]);
      return { returns, tickets };
    },
    enabled,
    staleTime: 2 * 60_000,
  });
}

/** Stock, low-stock alerts, 7-day movement trend and shipment counters. */
export function useWarehouseModuleStats(enabled: boolean) {
  return useQuery({
    queryKey: dashboardKeys.warehouse(),
    queryFn: async () => {
      const [stock, trend, shipments] = await Promise.all([
        getWarehouseStats(),
        getStockMovementTrend(7),
        getShipmentStats(),
      ]);
      return { stock, trend, shipments };
    },
    enabled,
    staleTime: 2 * 60_000,
  });
}

/** Cheap channel-health summary (1 query) — renders immediately. */
export function useCommerceHealth(enabled: boolean) {
  return useQuery({
    queryKey: dashboardKeys.commerceHealth(),
    queryFn: getHealthSummary,
    enabled,
    staleTime: 60_000,
  });
}

/**
 * Expensive mega snapshot (7+ queries). Callers must additionally gate
 * `enabled` on viewport visibility so it never blocks initial paint.
 */
export function useCommerceSnapshot(enabled: boolean) {
  return useQuery({
    queryKey: dashboardKeys.commerceSnapshot(),
    queryFn: () => getMegaDashboardSnapshot(),
    enabled,
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useCrmModuleStats(enabled: boolean) {
  return useQuery({
    queryKey: dashboardKeys.crm(),
    queryFn: getTenantCRMKPIs,
    enabled,
  });
}

export function useFeedbackModuleStats(enabled: boolean) {
  return useQuery({
    queryKey: dashboardKeys.reviews(),
    queryFn: getReviewStats,
    enabled,
  });
}

/** Resource quota usage; matches the 2-minute entitlement cache in billing.ts. */
export function useUsageSummary() {
  return useQuery({
    queryKey: dashboardKeys.usage(),
    queryFn: getUsageSummary,
    staleTime: 2 * 60_000,
  });
}
