/**
 * Supabase Returns Hub Email Templates Service
 */
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { RhEmailTemplate, RhNotificationEventType } from '@/types/returns-hub';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformEmailTemplate(row: any): RhEmailTemplate {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    eventType: row.event_type,
    enabled: row.enabled ?? true,
    subjectTemplate: row.subject_template,
    bodyTemplate: row.body_template,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const DEFAULT_TEMPLATES: Array<{
  eventType: RhNotificationEventType;
  subjectTemplate: string;
  bodyTemplate: string;
}> = [
  {
    eventType: 'return_confirmed',
    subjectTemplate: 'Return {{returnNumber}} - Confirmation',
    bodyTemplate:
      'Dear {{customerName}},\n\nYour return {{returnNumber}} has been registered.\n\nReason: {{reason}}\n\nWe will process your request and keep you updated.\n\nBest regards',
  },
  {
    eventType: 'return_approved',
    subjectTemplate: 'Return {{returnNumber}} - Approved',
    bodyTemplate:
      'Dear {{customerName}},\n\nYour return {{returnNumber}} has been approved.\n\nPlease ship the item(s) back to us. You can track the status at any time.\n\nBest regards',
  },
  {
    eventType: 'return_rejected',
    subjectTemplate: 'Return {{returnNumber}} - Rejected',
    bodyTemplate:
      'Dear {{customerName}},\n\nUnfortunately, your return {{returnNumber}} has been rejected.\n\nReason: {{reason}}\n\nIf you have any questions, please contact our support team.\n\nBest regards',
  },
  {
    eventType: 'return_shipped',
    subjectTemplate: 'Return {{returnNumber}} - Shipment Update',
    bodyTemplate:
      'Dear {{customerName}},\n\nYour return {{returnNumber}} shipment has been updated.\n\nTracking: {{trackingUrl}}\n\nBest regards',
  },
  {
    eventType: 'refund_completed',
    subjectTemplate: 'Return {{returnNumber}} - Refund Completed',
    bodyTemplate:
      'Dear {{customerName}},\n\nThe refund for your return {{returnNumber}} has been completed.\n\nAmount: {{refundAmount}}\n\nThe amount will be credited to your original payment method.\n\nBest regards',
  },
  {
    eventType: 'ticket_created',
    subjectTemplate: 'Ticket {{ticketNumber}} - {{subject}}',
    bodyTemplate:
      'Dear {{customerName}},\n\nYour support ticket {{ticketNumber}} has been created.\n\nSubject: {{subject}}\n\nOur team will respond as soon as possible.\n\nBest regards',
  },
  {
    eventType: 'ticket_agent_reply',
    subjectTemplate: 'Ticket {{ticketNumber}} - New Reply',
    bodyTemplate:
      'Dear {{customerName}},\n\nThere is a new reply on your support ticket {{ticketNumber}}.\n\nPlease check your ticket for the latest update.\n\nBest regards',
  },
];

export async function getRhEmailTemplates(): Promise<RhEmailTemplate[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('rh_email_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('event_type');

  if (error) {
    console.error('Failed to load email templates:', error);
    return [];
  }

  return (data || []).map((row: any) => transformEmailTemplate(row));
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
  template: Pick<RhEmailTemplate, 'eventType' | 'enabled' | 'subjectTemplate' | 'bodyTemplate'>
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  const { error } = await supabase
    .from('rh_email_templates')
    .upsert(
      {
        tenant_id: tenantId,
        event_type: template.eventType,
        enabled: template.enabled,
        subject_template: template.subjectTemplate,
        body_template: template.bodyTemplate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,event_type' }
    );

  if (error) {
    console.error('Failed to upsert email template:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function seedDefaultEmailTemplates(): Promise<{ success: boolean; count: number; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, count: 0, error: 'No tenant set' };

  let count = 0;
  for (const tmpl of DEFAULT_TEMPLATES) {
    const { error } = await supabase
      .from('rh_email_templates')
      .upsert(
        {
          tenant_id: tenantId,
          event_type: tmpl.eventType,
          enabled: true,
          subject_template: tmpl.subjectTemplate,
          body_template: tmpl.bodyTemplate,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,event_type', ignoreDuplicates: true }
      );

    if (!error) count++;
  }

  return { success: true, count };
}
