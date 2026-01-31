/**
 * Supabase Compliance Service
 *
 * Aggregates real compliance data from documents, checklists, certifications, registrations
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';

export interface ComplianceWarning {
  type: 'expiring_document' | 'expired_document' | 'missing_document' | 'incomplete_checklist' | 'expired_certificate';
  severity: 'high' | 'medium' | 'low';
  message: string;
  entityId?: string;
  entityName?: string;
  dueDate?: string;
}

export interface ComplianceScore {
  productId: string;
  productName: string;
  overallScore: number;
  documentScore: number;
  checklistScore: number;
  certificateScore: number;
  registrationScore: number;
  warnings: ComplianceWarning[];
}

export interface ComplianceOverview {
  overallRate: number;
  compliant: number;
  pending: number;
  nonCompliant: number;
  warnings: ComplianceWarning[];
  totalProducts: number;
}

export async function getComplianceOverview(): Promise<ComplianceOverview> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { overallRate: 0, compliant: 0, pending: 0, nonCompliant: 0, warnings: [], totalProducts: 0 };
  }

  const warnings: ComplianceWarning[] = [];
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Get products
  const { data: products } = await supabase
    .from('products')
    .select('id, name, certifications, registrations')
    .eq('tenant_id', tenantId);

  if (!products || products.length === 0) {
    return { overallRate: 100, compliant: 0, pending: 0, nonCompliant: 0, warnings: [], totalProducts: 0 };
  }

  // Get documents
  const { data: documents } = await supabase
    .from('documents')
    .select('id, name, product_id, valid_until, status, category')
    .eq('tenant_id', tenantId);

  // Get checklist progress
  const { data: checklistProgress } = await supabase
    .from('checklist_progress')
    .select('id, product_id, status, checklist_item_id')
    .eq('tenant_id', tenantId);

  // Check documents for expiring/expired
  if (documents) {
    for (const doc of documents) {
      if (doc.valid_until) {
        const validDate = new Date(doc.valid_until);
        if (validDate < now) {
          warnings.push({
            type: 'expired_document',
            severity: 'high',
            message: `Document "${doc.name}" has expired`,
            entityId: doc.id,
            entityName: doc.name,
            dueDate: doc.valid_until,
          });
        } else if (validDate < thirtyDaysFromNow) {
          warnings.push({
            type: 'expiring_document',
            severity: 'medium',
            message: `Document "${doc.name}" expires soon`,
            entityId: doc.id,
            entityName: doc.name,
            dueDate: doc.valid_until,
          });
        }
      }
    }
  }

  // Check certifications for expiring/expired
  for (const product of products) {
    const certs = product.certifications as Array<{ name: string; validUntil: string }> || [];
    for (const cert of certs) {
      if (cert.validUntil) {
        const validDate = new Date(cert.validUntil);
        if (validDate < now) {
          warnings.push({
            type: 'expired_certificate',
            severity: 'high',
            message: `Certificate "${cert.name}" for "${product.name}" has expired`,
            entityId: product.id,
            entityName: cert.name,
            dueDate: cert.validUntil,
          });
        } else if (validDate < thirtyDaysFromNow) {
          warnings.push({
            type: 'expired_certificate',
            severity: 'medium',
            message: `Certificate "${cert.name}" for "${product.name}" expires soon`,
            entityId: product.id,
            entityName: cert.name,
            dueDate: cert.validUntil,
          });
        }
      }
    }
  }

  // Calculate per-product compliance
  let compliant = 0;
  let pending = 0;
  let nonCompliant = 0;

  for (const product of products) {
    const productDocs = (documents || []).filter(d => d.product_id === product.id);
    const productChecks = (checklistProgress || []).filter(c => c.product_id === product.id);
    const hasExpiredDocs = productDocs.some(d => d.status === 'expired');
    const hasAllChecksDone = productChecks.length === 0 ||
      productChecks.every(c => c.status === 'completed' || c.status === 'not_applicable');

    if (hasExpiredDocs) {
      nonCompliant++;
    } else if (!hasAllChecksDone || productDocs.some(d => d.status === 'expiring')) {
      pending++;
    } else {
      compliant++;
    }
  }

  const totalProducts = products.length;
  const overallRate = totalProducts > 0
    ? Math.round(((compliant + pending * 0.5) / totalProducts) * 100)
    : 100;

  return {
    overallRate,
    compliant,
    pending,
    nonCompliant,
    warnings: warnings.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }),
    totalProducts,
  };
}

export async function getComplianceScores(): Promise<ComplianceScore[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const { data: products } = await supabase
    .from('products')
    .select('id, name, certifications, registrations')
    .eq('tenant_id', tenantId);

  if (!products) return [];

  const { data: documents } = await supabase
    .from('documents')
    .select('id, name, product_id, valid_until, status, category')
    .eq('tenant_id', tenantId);

  const { data: checklistProgress } = await supabase
    .from('checklist_progress')
    .select('id, product_id, status')
    .eq('tenant_id', tenantId);

  const now = new Date();
  const scores: ComplianceScore[] = [];

  for (const product of products) {
    const productDocs = (documents || []).filter(d => d.product_id === product.id);
    const productChecks = (checklistProgress || []).filter(c => c.product_id === product.id);
    const certs = product.certifications as Array<{ name: string; validUntil: string }> || [];
    const regs = product.registrations as Record<string, unknown> || {};
    const productWarnings: ComplianceWarning[] = [];

    // Document score
    const validDocs = productDocs.filter(d => d.status === 'valid').length;
    const documentScore = productDocs.length > 0
      ? Math.round((validDocs / productDocs.length) * 100)
      : 100;

    // Checklist score
    const completedChecks = productChecks.filter(c => c.status === 'completed' || c.status === 'not_applicable').length;
    const checklistScore = productChecks.length > 0
      ? Math.round((completedChecks / productChecks.length) * 100)
      : 100;

    // Certificate score
    const validCerts = certs.filter(c => !c.validUntil || new Date(c.validUntil) > now).length;
    const certificateScore = certs.length > 0
      ? Math.round((validCerts / certs.length) * 100)
      : 100;

    // Registration score (count filled fields)
    const regKeys = Object.keys(regs).filter(k => regs[k] !== null && regs[k] !== undefined && regs[k] !== '');
    const registrationScore = regKeys.length > 0 ? Math.min(100, regKeys.length * 20) : 0;

    const overallScore = Math.round(
      (documentScore * 0.3 + checklistScore * 0.3 + certificateScore * 0.25 + registrationScore * 0.15)
    );

    scores.push({
      productId: product.id,
      productName: product.name,
      overallScore,
      documentScore,
      checklistScore,
      certificateScore,
      registrationScore,
      warnings: productWarnings,
    });
  }

  return scores;
}
