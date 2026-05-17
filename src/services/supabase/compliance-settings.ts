/**
 * Compliance module settings — stored at `tenants.settings.compliance` (JSONB).
 * Two sub-trees: ear (Stiftung Elektro-Altgeräte-Register) and lucid
 * (Zentrale Stelle Verpackungsregister). Deep-merge with defaults.
 */
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type {
  ComplianceSettings,
  ComplianceEarSettings,
  ComplianceLucidSettings,
} from '@/types/compliance';

export const DEFAULT_EAR_SETTINGS: ComplianceEarSettings = {
  enabled: false,
  weeeNumber: '',
  stiftungEarBrand: '',
  contactEmails: [],
  autoReminders: true,
  autoGenerateOnMonthEnd: true,
};

export const DEFAULT_LUCID_SETTINGS: ComplianceLucidSettings = {
  enabled: false,
  lucidNumber: '',
  distributorRole: 'manufacturer',
  dualSystem: undefined,
  contactEmails: [],
  autoReminders: true,
  autoGenerateOnMonthEnd: true,
};

export const DEFAULT_COMPLIANCE_SETTINGS: ComplianceSettings = {
  ear: DEFAULT_EAR_SETTINGS,
  lucid: DEFAULT_LUCID_SETTINGS,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepMerge(stored: any): ComplianceSettings {
  return {
    ear: { ...DEFAULT_EAR_SETTINGS, ...(stored?.ear || {}) },
    lucid: { ...DEFAULT_LUCID_SETTINGS, ...(stored?.lucid || {}) },
  };
}

export async function getComplianceSettings(): Promise<ComplianceSettings> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { ...DEFAULT_COMPLIANCE_SETTINGS };
  const { data, error } = await supabase
    .from('tenants').select('settings').eq('id', tenantId).single();
  if (error || !data?.settings?.compliance) return { ...DEFAULT_COMPLIANCE_SETTINGS };
  return deepMerge(data.settings.compliance);
}

export async function updateComplianceSettings(
  updates: Partial<ComplianceSettings>,
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  const { data: tenant } = await supabase
    .from('tenants').select('settings').eq('id', tenantId).single();
  const currentSettings = tenant?.settings || {};
  const currentCompliance: ComplianceSettings =
    currentSettings.compliance || DEFAULT_COMPLIANCE_SETTINGS;

  const newSettings = {
    ...currentSettings,
    compliance: {
      ear: updates.ear
        ? { ...DEFAULT_EAR_SETTINGS, ...currentCompliance.ear, ...updates.ear }
        : currentCompliance.ear,
      lucid: updates.lucid
        ? { ...DEFAULT_LUCID_SETTINGS, ...currentCompliance.lucid, ...updates.lucid }
        : currentCompliance.lucid,
    },
  };

  const { error } = await supabase.from('tenants').update({ settings: newSettings }).eq('id', tenantId);
  if (error) {
    console.error('Failed to update compliance settings:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}
