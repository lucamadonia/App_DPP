/**
 * Supabase Returns Hub Email Templates Service
 */
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { RhEmailTemplate, RhNotificationEventType } from '@/types/returns-hub';
import { DEFAULT_TEMPLATES as TEMPLATE_DEFAULTS } from '@/components/returns/email-editor/emailTemplateDefaults';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformEmailTemplate(row: any): RhEmailTemplate {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    eventType: row.event_type,
    enabled: row.enabled ?? true,
    subjectTemplate: row.subject_template,
    bodyTemplate: row.body_template,
    category: row.category || 'returns',
    name: row.name || row.event_type,
    description: row.description || '',
    designConfig: row.design_config || {},
    htmlTemplate: row.html_template || '',
    previewText: row.preview_text || '',
    sortOrder: row.sort_order || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getRhEmailTemplates(): Promise<RhEmailTemplate[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  // Try with sort_order first; fall back if column doesn't exist
  let result = await supabase
    .from('rh_email_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true });

  if (result.error?.code === '42703') {
    // sort_order column missing - fall back to event_type ordering
    result = await supabase
      .from('rh_email_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('event_type', { ascending: true });
  }

  if (result.error) {
    console.error('Failed to load email templates:', result.error);
    return [];
  }

  return (result.data || []).map((row: any) => transformEmailTemplate(row));
}

export async function getRhEmailTemplate(
  eventType: RhNotificationEventType
): Promise<RhEmailTemplate | null> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return null;

  const { data, error } = await supabase
    .from('rh_email_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('event_type', eventType)
    .single();

  if (error || !data) return null;
  return transformEmailTemplate(data);
}

export async function getRhEmailTemplateByTenantId(
  tenantId: string,
  eventType: RhNotificationEventType
): Promise<RhEmailTemplate | null> {
  const { data, error } = await supabase
    .from('rh_email_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('event_type', eventType)
    .single();

  if (error || !data) return null;
  return transformEmailTemplate(data);
}

export async function upsertRhEmailTemplate(
  template: Pick<RhEmailTemplate, 'eventType' | 'enabled' | 'subjectTemplate' | 'bodyTemplate'> & {
    designConfig?: Record<string, unknown>;
    htmlTemplate?: string;
    previewText?: string;
    name?: string;
    description?: string;
    category?: string;
    sortOrder?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: Record<string, any> = {
    tenant_id: tenantId,
    event_type: template.eventType,
    enabled: template.enabled,
    subject_template: template.subjectTemplate,
    body_template: template.bodyTemplate,
    updated_at: new Date().toISOString(),
  };

  if (template.designConfig !== undefined) row.design_config = template.designConfig;
  if (template.htmlTemplate !== undefined) row.html_template = template.htmlTemplate;
  if (template.previewText !== undefined) row.preview_text = template.previewText;
  if (template.name !== undefined) row.name = template.name;
  if (template.description !== undefined) row.description = template.description;
  if (template.category !== undefined) row.category = template.category;
  if (template.sortOrder !== undefined) row.sort_order = template.sortOrder;

  let { error } = await supabase
    .from('rh_email_templates')
    .upsert(row, { onConflict: 'tenant_id,event_type' });

  // If columns don't exist, retry with only base columns
  if (error?.code === '42703') {
    const baseRow = {
      tenant_id: tenantId,
      event_type: template.eventType,
      enabled: template.enabled,
      subject_template: template.subjectTemplate,
      body_template: template.bodyTemplate,
      updated_at: new Date().toISOString(),
    };
    ({ error } = await supabase
      .from('rh_email_templates')
      .upsert(baseRow, { onConflict: 'tenant_id,event_type' }));
  }

  if (error) {
    console.error('Failed to upsert email template:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function seedDefaultEmailTemplates(): Promise<{ success: boolean; count: number; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, count: 0, error: 'No tenant set' };

  // Check if new columns exist by testing one
  const hasNewColumns = await checkColumnExists(tenantId);

  let count = 0;
  for (const tmpl of TEMPLATE_DEFAULTS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row: Record<string, any> = {
      tenant_id: tenantId,
      event_type: tmpl.eventType,
      enabled: true,
      subject_template: tmpl.subjectTemplate,
      body_template: tmpl.bodyTemplate,
      updated_at: new Date().toISOString(),
    };

    // Only include new columns if the migration has been applied
    if (hasNewColumns) {
      row.category = tmpl.category;
      row.name = tmpl.name;
      row.description = tmpl.description;
      row.design_config = tmpl.designConfig as unknown as Record<string, unknown>;
      row.sort_order = tmpl.sortOrder;
    }

    const { error } = await supabase
      .from('rh_email_templates')
      .upsert(row, { onConflict: 'tenant_id,event_type' });

    if (!error) count++;
  }

  return { success: true, count };
}

async function checkColumnExists(tenantId: string): Promise<boolean> {
  const { error } = await supabase
    .from('rh_email_templates')
    .select('sort_order')
    .eq('tenant_id', tenantId)
    .limit(0);
  return !error || error.code !== '42703';
}

export async function resetRhEmailTemplateToDefault(
  eventType: RhNotificationEventType
): Promise<{ success: boolean; error?: string }> {
  const defaultTmpl = TEMPLATE_DEFAULTS.find((t) => t.eventType === eventType);
  if (!defaultTmpl) return { success: false, error: 'No default template found' };

  return upsertRhEmailTemplate({
    eventType: defaultTmpl.eventType,
    enabled: true,
    subjectTemplate: defaultTmpl.subjectTemplate,
    bodyTemplate: defaultTmpl.bodyTemplate,
    designConfig: defaultTmpl.designConfig as unknown as Record<string, unknown>,
    name: defaultTmpl.name,
    description: defaultTmpl.description,
    category: defaultTmpl.category,
    sortOrder: defaultTmpl.sortOrder,
  });
}
