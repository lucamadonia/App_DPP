import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { TransparencyPageConfig, TransparencyProductEntry, TransparencyDesignSettings } from '@/types/transparency';
import { DEFAULT_TRANSPARENCY_DESIGN } from '@/types/transparency';

const defaultConfig: Omit<TransparencyPageConfig, 'tenantId'> = {
  pageTitle: null,
  pageDescription: null,
  heroImageUrl: null,
  products: [],
  design: { ...DEFAULT_TRANSPARENCY_DESIGN },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformRow(row: any): TransparencyPageConfig {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    pageTitle: row.page_title ?? null,
    pageDescription: row.page_description ?? null,
    heroImageUrl: row.hero_image_url ?? null,
    products: (row.products as TransparencyProductEntry[]) ?? [],
    design: row.design
      ? { ...DEFAULT_TRANSPARENCY_DESIGN, ...(row.design as TransparencyDesignSettings) }
      : { ...DEFAULT_TRANSPARENCY_DESIGN },
    updatedAt: row.updated_at,
  };
}

export async function getTransparencyConfig(): Promise<TransparencyPageConfig | null> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return null;

  const { data, error } = await supabase
    .from('transparency_page_config')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) {
    return { ...defaultConfig, tenantId };
  }

  return transformRow(data);
}

export async function saveTransparencyConfig(
  config: TransparencyPageConfig
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant' };

  const payload = {
    tenant_id: tenantId,
    page_title: config.pageTitle,
    page_description: config.pageDescription,
    hero_image_url: config.heroImageUrl,
    products: config.products,
    design: config.design,
    updated_at: new Date().toISOString(),
  };

  if (config.id) {
    const { error } = await supabase
      .from('transparency_page_config')
      .update(payload)
      .eq('id', config.id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  const { error } = await supabase
    .from('transparency_page_config')
    .insert(payload);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
