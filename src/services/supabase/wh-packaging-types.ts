/**
 * Warehouse Packaging Types Service
 *
 * CRUD for wh_packaging_types (Umverpackungen: Kartons, Versandumschläge).
 * All operations are tenant-scoped via getCurrentTenantId().
 * Stock operations (receipts, adjustments, tracking) live in wh-shipments.ts
 * (recordPackagingReceipt, adjustPackagingStock, updatePackagingTracking).
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { LucidMaterial, MaterialSplitEntry } from '@/types/compliance';

export interface WhPackagingType {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  tareWeightGrams: number;
  innerLengthCm?: number;
  innerWidthCm?: number;
  innerHeightCm?: number;
  maxLoadGrams?: number;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  stockTracked: boolean;
  stockOnHand: number;
  stockThreshold: number;
  lastRestockedAt?: string;
  primaryMaterial?: LucidMaterial;
  materialSplit?: MaterialSplitEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface WhPackagingTypeInput {
  name: string;
  description?: string | null;
  tareWeightGrams: number;
  innerLengthCm?: number | null;
  innerWidthCm?: number | null;
  innerHeightCm?: number | null;
  maxLoadGrams?: number | null;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  stockTracked: boolean;
  stockThreshold: number;
  primaryMaterial?: LucidMaterial | null;
  materialSplit?: MaterialSplitEntry[] | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformPackagingType(row: any): WhPackagingType {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description ?? undefined,
    tareWeightGrams: row.tare_weight_grams ?? 0,
    innerLengthCm: row.inner_length_cm != null ? Number(row.inner_length_cm) : undefined,
    innerWidthCm: row.inner_width_cm != null ? Number(row.inner_width_cm) : undefined,
    innerHeightCm: row.inner_height_cm != null ? Number(row.inner_height_cm) : undefined,
    maxLoadGrams: row.max_load_grams ?? undefined,
    isActive: row.is_active ?? true,
    isDefault: row.is_default ?? false,
    sortOrder: row.sort_order ?? 0,
    stockTracked: row.stock_tracked ?? false,
    stockOnHand: row.stock_on_hand ?? 0,
    stockThreshold: row.stock_threshold ?? 10,
    lastRestockedAt: row.last_restocked_at ?? undefined,
    primaryMaterial: (row.primary_material as LucidMaterial) ?? undefined,
    materialSplit: (row.material_split as MaterialSplitEntry[]) ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDbPayload(input: WhPackagingTypeInput): Record<string, unknown> {
  return {
    name: input.name,
    description: input.description ?? null,
    tare_weight_grams: input.tareWeightGrams,
    inner_length_cm: input.innerLengthCm ?? null,
    inner_width_cm: input.innerWidthCm ?? null,
    inner_height_cm: input.innerHeightCm ?? null,
    max_load_grams: input.maxLoadGrams ?? null,
    is_active: input.isActive,
    is_default: input.isDefault,
    sort_order: input.sortOrder,
    stock_tracked: input.stockTracked,
    stock_threshold: input.stockThreshold,
    primary_material: input.primaryMaterial ?? null,
    material_split: input.materialSplit ?? null,
  };
}

async function requireTenantId(): Promise<string> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant found');
  return tenantId;
}

/** Clears is_default on all packaging types of the tenant. */
async function clearDefaultPackagingType(tenantId: string): Promise<void> {
  const { error } = await supabase
    .from('wh_packaging_types')
    .update({ is_default: false })
    .eq('tenant_id', tenantId);
  if (error) throw new Error(`Failed to clear default packaging type: ${error.message}`);
}

/** All packaging types of the current tenant, ordered by sort_order. */
export async function getPackagingTypes(): Promise<WhPackagingType[]> {
  const tenantId = await requireTenantId();
  const { data, error } = await supabase
    .from('wh_packaging_types')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(`Failed to load packaging types: ${error.message}`);
  return (data || []).map(transformPackagingType);
}

export async function createPackagingType(input: WhPackagingTypeInput): Promise<WhPackagingType> {
  const tenantId = await requireTenantId();
  if (input.isDefault) await clearDefaultPackagingType(tenantId);
  const { data, error } = await supabase
    .from('wh_packaging_types')
    .insert({ tenant_id: tenantId, ...toDbPayload(input) })
    .select('*')
    .single();
  if (error) throw new Error(`Failed to create packaging type: ${error.message}`);
  return transformPackagingType(data);
}

export async function updatePackagingType(id: string, input: WhPackagingTypeInput): Promise<WhPackagingType> {
  const tenantId = await requireTenantId();
  if (input.isDefault) await clearDefaultPackagingType(tenantId);
  const { data, error } = await supabase
    .from('wh_packaging_types')
    .update(toDbPayload(input))
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select('*')
    .single();
  if (error) throw new Error(`Failed to update packaging type: ${error.message}`);
  return transformPackagingType(data);
}

export async function deletePackagingType(id: string): Promise<void> {
  const tenantId = await requireTenantId();
  const { error } = await supabase
    .from('wh_packaging_types')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);
  if (error) throw new Error(`Failed to delete packaging type: ${error.message}`);
}

export async function setPackagingTypeActive(id: string, isActive: boolean): Promise<void> {
  const tenantId = await requireTenantId();
  const { error } = await supabase
    .from('wh_packaging_types')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('tenant_id', tenantId);
  if (error) throw new Error(`Failed to toggle packaging type: ${error.message}`);
}
