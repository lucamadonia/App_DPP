export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type FindingSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type FindingStatus = 'compliant' | 'partial' | 'non_compliant' | 'unknown';
export type FindingCategory = 'ESPR' | 'Battery' | 'PPWR' | 'GPSR' | 'CE' | 'REACH' | 'RoHS' | 'EMC' | 'RED' | 'LVD' | 'Docs' | 'DPP' | 'National' | 'Other';
export type ActionPriority = 'P1' | 'P2' | 'P3';
export type RecommendationType = 'quick_win' | 'improvement' | 'strategic';

export interface RiskMatrixEntry {
  area: string;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  description: string;
  regulation?: string;
}

export interface ComplianceFinding {
  id: string;
  category: FindingCategory;
  title: string;
  severity: FindingSeverity;
  status: FindingStatus;
  regulation: string;
  description: string;
  recommendation: string;
  details?: string;
}

export interface ActionPlanItem {
  id: string;
  priority: ActionPriority;
  title: string;
  description: string;
  responsible: string;
  deadline?: string;
  dependencies?: string[];
  estimatedEffort?: string;
}

export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  impact: string;
}

export interface ComplianceCheckResult {
  overallScore: number;
  riskLevel: RiskLevel;
  executiveSummary: string;
  riskMatrix: RiskMatrixEntry[];
  findings: ComplianceFinding[];
  actionPlan: ActionPlanItem[];
  recommendations: Recommendation[];
}

export interface SavedComplianceCheck {
  id: string;
  tenantId: string;
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
  modelUsed: string;
  createdBy?: string;
  createdAt: string;
}

export interface ComplianceCheckPhase {
  phase: 1 | 2 | 3;
  label: string;
  status: 'pending' | 'streaming' | 'done' | 'error';
}
