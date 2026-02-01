/**
 * AI Compliance Checks Service
 *
 * CRUD for AI-generated compliance analysis results
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type {
  SavedComplianceCheck,
  ComplianceFinding,
  RiskMatrixEntry,
  ActionPlanItem,
  Recommendation,
  RiskLevel,
} from '@/types/compliance-check';

interface SaveComplianceCheckInput {
  productId: string;
  batchId?: string | null;
  overallScore: number;
  riskLevel: RiskLevel;
  executiveSummary: string;
  findings: ComplianceFinding[];
  riskMatrix: RiskMatrixEntry[];
  actionPlan: ActionPlanItem[];
  recommendations: Recommendation[];
  rawResponses?: string[];
  inputDataSnapshot?: Record<string, unknown>;
  modelUsed?: string;
}

function transformRow(row: Record<string, unknown>): SavedComplianceCheck {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    productId: row.product_id as string,
    batchId: (row.batch_id as string) || null,
    overallScore: row.overall_score as number,
    riskLevel: row.risk_level as RiskLevel,
    executiveSummary: row.executive_summary as string,
    findings: (row.findings as ComplianceFinding[]) || [],
    riskMatrix: (row.risk_matrix as RiskMatrixEntry[]) || [],
    actionPlan: (row.action_plan as ActionPlanItem[]) || [],
    recommendations: (row.recommendations as Recommendation[]) || [],
    rawResponses: (row.raw_responses as string[]) || undefined,
    inputDataSnapshot: (row.input_data_snapshot as Record<string, unknown>) || undefined,
    modelUsed: (row.model_used as string) || 'anthropic/claude-sonnet-4',
    createdBy: (row.created_by as string) || undefined,
    createdAt: row.created_at as string,
  };
}

export async function saveComplianceCheck(input: SaveComplianceCheckInput): Promise<SavedComplianceCheck | null> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return null;

  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('ai_compliance_checks')
    .insert({
      tenant_id: tenantId,
      product_id: input.productId,
      batch_id: input.batchId || null,
      overall_score: input.overallScore,
      risk_level: input.riskLevel,
      executive_summary: input.executiveSummary,
      findings: input.findings,
      risk_matrix: input.riskMatrix,
      action_plan: input.actionPlan,
      recommendations: input.recommendations,
      raw_responses: input.rawResponses || null,
      input_data_snapshot: input.inputDataSnapshot || null,
      model_used: input.modelUsed || 'anthropic/claude-sonnet-4',
      created_by: user?.id || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving compliance check:', error);
    return null;
  }

  return transformRow(data);
}

export async function getComplianceChecks(productId: string, batchId?: string | null): Promise<SavedComplianceCheck[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  let query = supabase
    .from('ai_compliance_checks')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  if (batchId) {
    query = query.eq('batch_id', batchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching compliance checks:', error);
    return [];
  }

  return (data || []).map(transformRow);
}

export async function getComplianceCheck(checkId: string): Promise<SavedComplianceCheck | null> {
  const { data, error } = await supabase
    .from('ai_compliance_checks')
    .select('*')
    .eq('id', checkId)
    .single();

  if (error) {
    console.error('Error fetching compliance check:', error);
    return null;
  }

  return transformRow(data);
}

export async function deleteComplianceCheck(checkId: string): Promise<boolean> {
  const { error } = await supabase
    .from('ai_compliance_checks')
    .delete()
    .eq('id', checkId);

  if (error) {
    console.error('Error deleting compliance check:', error);
    return false;
  }

  return true;
}
