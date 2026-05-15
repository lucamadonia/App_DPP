/**
 * Warehouse settings — stored at `tenants.settings.warehouse` (JSONB).
 *
 * Currently exposes the per-tenant pick/pack confirmation toggle: each shipment
 * status transition (`draft → picking`, `picking → packed`) can either require
 * a per-item scan/checkbox dialog or skip it entirely. Default is "require both"
 * which preserves the historic behavior.
 */
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { WarehouseSettings } from '@/types/database';

export const DEFAULT_WAREHOUSE_SETTINGS: WarehouseSettings = {
  pickPackConfirm: {
    requireAtPicking: true,
    requireAtPacking: true,
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepMergeSettings(stored: any): WarehouseSettings {
  return {
    ...DEFAULT_WAREHOUSE_SETTINGS,
    ...stored,
    pickPackConfirm: {
      ...DEFAULT_WAREHOUSE_SETTINGS.pickPackConfirm!,
      ...(stored?.pickPackConfirm || {}),
    },
  };
}

export async function getWarehouseSettings(): Promise<WarehouseSettings> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { ...DEFAULT_WAREHOUSE_SETTINGS };

  const { data, error } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  if (error || !data?.settings?.warehouse) {
    return { ...DEFAULT_WAREHOUSE_SETTINGS };
  }

  return deepMergeSettings(data.settings.warehouse);
}

export async function updateWarehouseSettings(
  updates: Partial<WarehouseSettings>,
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const currentSettings = tenant?.settings || {};
  const currentWh: WarehouseSettings = currentSettings.warehouse || DEFAULT_WAREHOUSE_SETTINGS;

  const newSettings = {
    ...currentSettings,
    warehouse: {
      ...currentWh,
      ...updates,
      pickPackConfirm: updates.pickPackConfirm
        ? { ...currentWh.pickPackConfirm, ...updates.pickPackConfirm }
        : currentWh.pickPackConfirm,
    },
  };

  const { error } = await supabase
    .from('tenants')
    .update({ settings: newSettings })
    .eq('id', tenantId);

  if (error) {
    console.error('Failed to update warehouse settings:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
