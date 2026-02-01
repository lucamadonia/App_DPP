/**
 * AI Compliance Check Prompts
 *
 * 3 sequential prompt builders for comprehensive product compliance analysis.
 * Each prompt targets a different aspect to keep token usage manageable.
 */

import type { OpenRouterMessage } from './types';
import type { Product, ProductBatch, Material, Certification, CarbonFootprint, SupplyChainEntry } from '@/types/product';
import type {
  ComplianceFinding,
  RiskMatrixEntry,
  ActionPlanItem,
  Recommendation,
  FindingCategory,
  FindingSeverity,
  FindingStatus,
  RiskLevel,
  ActionPriority,
  RecommendationType,
} from '@/types/compliance-check';

type Locale = 'en' | 'de';

interface DocumentMeta {
  name: string;
  type?: string;
  category?: string;
  status?: string;
  validUntil?: string;
}

interface ComplianceCheckContext {
  product: Product;
  batch?: ProductBatch | null;
  documents?: DocumentMeta[];
  supplyChain?: SupplyChainEntry[];
}

// ---------------------------------------------------------------------------
// Product data serialization — comprehensive snapshot for AI analysis
// ---------------------------------------------------------------------------

function serializeMaterials(materials: Material[]): string {
  if (!materials || materials.length === 0) return 'No materials recorded.';
  return materials.map(m =>
    `- ${m.name}: ${m.percentage}%${m.recyclable ? ' (recyclable)' : ''}${m.origin ? `, origin: ${m.origin}` : ''}`
  ).join('\n');
}

function serializeCertifications(certs: Certification[]): string {
  if (!certs || certs.length === 0) return 'No certifications recorded.';
  const now = new Date();
  return certs.map(c => {
    const expired = c.validUntil && new Date(c.validUntil) < now;
    return `- ${c.name} (issued by: ${c.issuedBy}, valid until: ${c.validUntil || 'N/A'})${expired ? ' **EXPIRED**' : ''}`;
  }).join('\n');
}

function serializeCarbonFootprint(cf?: CarbonFootprint): string {
  if (!cf) return 'No carbon footprint data.';
  return `Total: ${cf.totalKgCO2} kg CO2, Production: ${cf.productionKgCO2} kg, Transport: ${cf.transportKgCO2} kg, Rating: ${cf.rating}`;
}

function serializeRegistrations(regs?: Record<string, unknown>): string {
  if (!regs || Object.keys(regs).length === 0) return 'No registrations recorded.';
  const entries: string[] = [];
  const regLabels: Record<string, string> = {
    weeeNumber: 'WEEE Registration',
    eprelNumber: 'EPREL',
    reachCompliant: 'REACH Compliance',
    ceMarking: 'CE Marking',
    lucidNumber: 'LUCID (VerpackG)',
    battGNumber: 'BattG Registration',
    scipNumber: 'SCIP Database',
  };
  for (const [key, val] of Object.entries(regs)) {
    if (val !== null && val !== undefined && val !== '') {
      const label = regLabels[key] || key;
      entries.push(`- ${label}: ${typeof val === 'boolean' ? (val ? 'Yes' : 'No') : val}`);
    }
  }
  return entries.length > 0 ? entries.join('\n') : 'No registrations recorded.';
}

function serializeSupplyChain(chain?: SupplyChainEntry[]): string {
  if (!chain || chain.length === 0) return 'No supply chain data.';
  return chain.map(e =>
    `- Step ${e.step}: ${e.description} — ${e.location}, ${e.country}${e.processType ? ` (${e.processType})` : ''}`
  ).join('\n');
}

function serializeDocuments(docs?: DocumentMeta[]): string {
  if (!docs || docs.length === 0) return 'No documents uploaded.';
  return docs.map(d =>
    `- ${d.name}${d.category ? ` [${d.category}]` : ''}${d.status ? ` (${d.status})` : ''}${d.validUntil ? `, valid until: ${d.validUntil}` : ''}`
  ).join('\n');
}

function buildProductDataString(ctx: ComplianceCheckContext): string {
  const p = ctx.product;
  const batch = ctx.batch;

  // Merge batch overrides
  const materials = batch?.materialsOverride || p.materials;
  const certifications = batch?.certificationsOverride || p.certifications;
  const carbonFootprint = batch?.carbonFootprintOverride || p.carbonFootprint;
  const recyclability = batch?.recyclabilityOverride || p.recyclability;
  const description = batch?.descriptionOverride || p.description;

  const sections: string[] = [];

  // Core data
  sections.push(`## Product: ${p.name}`);
  sections.push(`- Manufacturer: ${p.manufacturer}`);
  sections.push(`- Category: ${p.category}`);
  sections.push(`- GTIN: ${p.gtin}`);
  if (description) sections.push(`- Description: ${description}`);
  if (p.hsCode) sections.push(`- HS Code: ${p.hsCode}`);
  if (p.countryOfOrigin) sections.push(`- Country of Origin: ${p.countryOfOrigin}`);
  if (p.netWeight) sections.push(`- Net Weight: ${p.netWeight} g`);
  if (p.grossWeight) sections.push(`- Gross Weight: ${p.grossWeight} g`);
  if (p.manufacturerEORI) sections.push(`- EORI: ${p.manufacturerEORI}`);
  if (p.manufacturerVAT) sections.push(`- VAT ID: ${p.manufacturerVAT}`);
  if (p.manufacturerAddress) sections.push(`- Manufacturer Address: ${p.manufacturerAddress}`);

  if (batch) {
    sections.push(`\n## Batch: ${batch.serialNumber}`);
    if (batch.batchNumber) sections.push(`- Batch Number: ${batch.batchNumber}`);
    sections.push(`- Production Date: ${batch.productionDate}`);
    if (batch.expirationDate) sections.push(`- Expiration: ${batch.expirationDate}`);
    if (batch.quantity) sections.push(`- Quantity: ${batch.quantity}`);
  }

  sections.push(`\n## Materials\n${serializeMaterials(materials)}`);
  sections.push(`\n## Certifications\n${serializeCertifications(certifications)}`);
  sections.push(`\n## Registrations\n${serializeRegistrations(p.registrations as Record<string, unknown>)}`);
  sections.push(`\n## Carbon Footprint\n${serializeCarbonFootprint(carbonFootprint)}`);

  sections.push(`\n## Recyclability`);
  if (recyclability) {
    sections.push(`- Recyclable: ${recyclability.recyclablePercentage}%`);
    if (recyclability.disposalMethods?.length) sections.push(`- Methods: ${recyclability.disposalMethods.join(', ')}`);
    if (recyclability.instructions) sections.push(`- Instructions: ${recyclability.instructions}`);
  } else {
    sections.push('No recyclability data.');
  }

  sections.push(`\n## Documents\n${serializeDocuments(ctx.documents)}`);
  sections.push(`\n## Supply Chain\n${serializeSupplyChain(ctx.supplyChain || p.supplyChain)}`);

  return sections.join('\n');
}

// ---------------------------------------------------------------------------
// System prompt (reused across all 3 calls)
// ---------------------------------------------------------------------------

function getComplianceCheckSystemPrompt(locale: Locale): string {
  if (locale === 'de') {
    return `Du bist ein EU-Compliance-Experte und analysierst Produkte auf Konformität mit EU-Verordnungen.

Dein Fachwissen umfasst: ESPR 2024/1781, Batterienverordnung 2023/1542, PPWR 2024/3249, GPSR 2023/988, CE-Richtlinien (LVD, EMC, RED, RoHS, Maschinenverordnung), REACH 1907/2006, nationale Gesetze (ElektroG, BattG, VerpackG/LUCID, AGEC), DPP-Anforderungen, und alle relevanten EN-Normen.

Du analysierst die bereitgestellten Produktdaten systematisch und gibst strukturierte, faktische Ergebnisse zurück. Antworte immer auf Deutsch.`;
  }
  return `You are an EU compliance expert analyzing products for conformity with EU regulations.

Your expertise covers: ESPR 2024/1781, Battery Regulation 2023/1542, PPWR 2024/3249, GPSR 2023/988, CE Directives (LVD, EMC, RED, RoHS, Machinery Regulation), REACH 1907/2006, national laws (ElektroG, BattG, VerpackG/LUCID, AGEC), DPP requirements, and all relevant EN standards.

You analyze the provided product data systematically and return structured, factual results. Always respond in English.`;
}

// ---------------------------------------------------------------------------
// Call 1: Score + Risk Matrix + Executive Summary
// ---------------------------------------------------------------------------

export function buildScoreAndRiskMessages(ctx: ComplianceCheckContext, locale: Locale = 'de'): OpenRouterMessage[] {
  const productData = buildProductDataString(ctx);

  const userPrompt = locale === 'de'
    ? `Analysiere die folgenden Produktdaten und erstelle:

${productData}

---

Gib dein Ergebnis in exakt diesem Format zurück:

SCORE: [0-100]
RISK_LEVEL: [low|medium|high|critical]

EXECUTIVE_SUMMARY:
[3-5 Sätze Zusammenfassung der Compliance-Situation. Identifiziere die wichtigsten Stärken und Schwächen.]

RISK_MATRIX:
[Erstelle 6-10 Einträge. Jeder Eintrag auf einer eigenen Zeile im Format:]
RISK: [Bereich] | [low|medium|high] | [low|medium|high] | [Beschreibung] | [Verordnung/Norm]

Bewertungsregeln:
- Score 90-100: Alle wesentlichen Anforderungen erfüllt, aktuelle Zertifikate, vollständige Dokumentation
- Score 70-89: Überwiegend konform, einzelne Lücken
- Score 50-69: Signifikante Lücken, fehlende Zertifikate oder abgelaufene Dokumente
- Score 30-49: Schwerwiegende Mängel in mehreren Bereichen
- Score 0-29: Grundlegende Compliance-Anforderungen nicht erfüllt
- Fehlende Daten = niedrigerer Score (Prinzip: was nicht dokumentiert ist, gilt als nicht konform)`
    : `Analyze the following product data and create:

${productData}

---

Return your result in exactly this format:

SCORE: [0-100]
RISK_LEVEL: [low|medium|high|critical]

EXECUTIVE_SUMMARY:
[3-5 sentences summarizing the compliance situation. Identify key strengths and weaknesses.]

RISK_MATRIX:
[Create 6-10 entries. Each entry on its own line in the format:]
RISK: [Area] | [low|medium|high] | [low|medium|high] | [Description] | [Regulation/Standard]

Scoring rules:
- Score 90-100: All essential requirements met, current certificates, complete documentation
- Score 70-89: Mostly compliant, individual gaps
- Score 50-69: Significant gaps, missing certificates or expired documents
- Score 30-49: Serious deficiencies in multiple areas
- Score 0-29: Basic compliance requirements not met
- Missing data = lower score (principle: what is not documented is considered non-compliant)`;

  return [
    { role: 'system', content: getComplianceCheckSystemPrompt(locale) },
    { role: 'user', content: userPrompt },
  ];
}

// ---------------------------------------------------------------------------
// Call 2: Detailed Findings
// ---------------------------------------------------------------------------

export function buildFindingsMessages(
  ctx: ComplianceCheckContext,
  executiveSummary: string,
  locale: Locale = 'de'
): OpenRouterMessage[] {
  const productData = buildProductDataString(ctx);

  const userPrompt = locale === 'de'
    ? `Basierend auf dieser Produktanalyse und der vorherigen Zusammenfassung, erstelle detaillierte Findings:

${productData}

Vorherige Zusammenfassung: ${executiveSummary}

---

Erstelle 8-15 detaillierte Findings. Jedes Finding auf eigener Zeile im Format:

FINDING: [Kategorie] | [Titel] | [info|low|medium|high|critical] | [compliant|partial|non_compliant|unknown] | [Verordnung/Norm] | [Beschreibung] | [Empfehlung]

Kategorien: ESPR, Battery, PPWR, GPSR, CE, REACH, RoHS, EMC, RED, LVD, Docs, DPP, National, Other

Prüfe systematisch:
1. ESPR/DPP-Anforderungen (Datenträger, Unique ID, Materialpass)
2. CE-Konformität (anwendbare Richtlinien basierend auf Produktkategorie)
3. REACH/RoHS (Stoffbeschränkungen, SVHC, SCIP)
4. Batterienverordnung (falls relevant)
5. PPWR/Verpackung (falls relevant)
6. GPSR (Allgemeine Produktsicherheit)
7. Dokumentation (Vollständigkeit, Aktualität)
8. Registrierungen (WEEE, EPREL, LUCID, etc.)
9. Nationale Anforderungen (DE, FR, etc.)
10. Supply Chain Due Diligence`
    : `Based on this product analysis and the previous summary, create detailed findings:

${productData}

Previous summary: ${executiveSummary}

---

Create 8-15 detailed findings. Each finding on its own line in the format:

FINDING: [Category] | [Title] | [info|low|medium|high|critical] | [compliant|partial|non_compliant|unknown] | [Regulation/Standard] | [Description] | [Recommendation]

Categories: ESPR, Battery, PPWR, GPSR, CE, REACH, RoHS, EMC, RED, LVD, Docs, DPP, National, Other

Check systematically:
1. ESPR/DPP requirements (data carrier, unique ID, material passport)
2. CE conformity (applicable directives based on product category)
3. REACH/RoHS (substance restrictions, SVHC, SCIP)
4. Battery Regulation (if relevant)
5. PPWR/Packaging (if relevant)
6. GPSR (General Product Safety)
7. Documentation (completeness, currency)
8. Registrations (WEEE, EPREL, LUCID, etc.)
9. National requirements (DE, FR, etc.)
10. Supply Chain Due Diligence`;

  return [
    { role: 'system', content: getComplianceCheckSystemPrompt(locale) },
    { role: 'user', content: userPrompt },
  ];
}

// ---------------------------------------------------------------------------
// Call 3: Action Plan + Recommendations
// ---------------------------------------------------------------------------

export function buildActionPlanMessages(
  ctx: ComplianceCheckContext,
  executiveSummary: string,
  findingsSummary: string,
  locale: Locale = 'de'
): OpenRouterMessage[] {
  const productData = buildProductDataString(ctx);

  const userPrompt = locale === 'de'
    ? `Basierend auf der Produktanalyse und den identifizierten Findings, erstelle einen Aktionsplan und strategische Empfehlungen:

${productData}

Zusammenfassung: ${executiveSummary}
Findings: ${findingsSummary}

---

Erstelle einen priorisierten Aktionsplan (6-12 Punkte) und 3-5 strategische Empfehlungen.

AKTIONSPLAN:
ACTION: [P1|P2|P3] | [Titel] | [Beschreibung] | [Verantwortlich] | [Frist falls regulatorisch] | [Abhängigkeiten] | [Geschätzter Aufwand]

P1 = sofort (regulatorische Pflicht, Verkaufsverbot droht)
P2 = kurzfristig (wichtig für Compliance-Verbesserung)
P3 = mittelfristig (Optimierung, freiwillige Verbesserung)

EMPFEHLUNGEN:
RECOMMENDATION: [quick_win|improvement|strategic] | [Titel] | [Beschreibung] | [Auswirkung]`
    : `Based on the product analysis and identified findings, create an action plan and strategic recommendations:

${productData}

Summary: ${executiveSummary}
Findings: ${findingsSummary}

---

Create a prioritized action plan (6-12 items) and 3-5 strategic recommendations.

ACTION_PLAN:
ACTION: [P1|P2|P3] | [Title] | [Description] | [Responsible] | [Deadline if regulatory] | [Dependencies] | [Estimated Effort]

P1 = immediate (regulatory obligation, sales ban risk)
P2 = short-term (important for compliance improvement)
P3 = medium-term (optimization, voluntary improvement)

RECOMMENDATIONS:
RECOMMENDATION: [quick_win|improvement|strategic] | [Title] | [Description] | [Impact]`;

  return [
    { role: 'system', content: getComplianceCheckSystemPrompt(locale) },
    { role: 'user', content: userPrompt },
  ];
}

// ---------------------------------------------------------------------------
// Response parsers
// ---------------------------------------------------------------------------

export function parseScoreResponse(text: string): {
  score: number;
  riskLevel: RiskLevel;
  summary: string;
  riskMatrix: RiskMatrixEntry[];
} {
  // Parse score
  const scoreMatch = text.match(/SCORE:\s*(\d+)/);
  const score = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10))) : 50;

  // Parse risk level
  const riskMatch = text.match(/RISK_LEVEL:\s*(low|medium|high|critical)/i);
  const riskLevel = (riskMatch ? riskMatch[1].toLowerCase() : deriveRiskLevel(score)) as RiskLevel;

  // Parse executive summary
  const summaryMatch = text.match(/EXECUTIVE_SUMMARY:\s*\n?([\s\S]*?)(?=\n\s*RISK_MATRIX:|$)/);
  const summary = summaryMatch ? summaryMatch[1].trim() : text.substring(0, 500);

  // Parse risk matrix
  const riskMatrix: RiskMatrixEntry[] = [];
  const riskEntries = text.matchAll(/RISK:\s*([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|?(.*)/g);
  for (const match of riskEntries) {
    riskMatrix.push({
      area: match[1].trim(),
      likelihood: normalizeRiskValue(match[2].trim()),
      impact: normalizeRiskValue(match[3].trim()),
      description: match[4].trim(),
      regulation: match[5]?.trim() || undefined,
    });
  }

  return { score, riskLevel, summary, riskMatrix };
}

export function parseFindingsResponse(text: string): ComplianceFinding[] {
  const findings: ComplianceFinding[] = [];
  const findingEntries = text.matchAll(/FINDING:\s*([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|?([\s\S]*?)(?=\nFINDING:|$)/g);

  let idx = 0;
  for (const match of findingEntries) {
    findings.push({
      id: `f-${idx++}`,
      category: normalizeCategory(match[1].trim()),
      title: match[2].trim(),
      severity: normalizeSeverity(match[3].trim()),
      status: normalizeStatus(match[4].trim()),
      regulation: match[5].trim(),
      description: match[6].trim(),
      recommendation: match[7]?.trim() || '',
    });
  }

  return findings;
}

export function parseActionPlanResponse(text: string): {
  actionPlan: ActionPlanItem[];
  recommendations: Recommendation[];
} {
  const actionPlan: ActionPlanItem[] = [];
  const actionEntries = text.matchAll(/ACTION:\s*([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|?([^|]*)\|?([^|]*)\|?(.*)/g);

  let idx = 0;
  for (const match of actionEntries) {
    actionPlan.push({
      id: `a-${idx++}`,
      priority: normalizePriority(match[1].trim()),
      title: match[2].trim(),
      description: match[3].trim(),
      responsible: match[4].trim(),
      deadline: match[5]?.trim() || undefined,
      dependencies: match[6]?.trim() ? match[6].trim().split(',').map(s => s.trim()) : undefined,
      estimatedEffort: match[7]?.trim() || undefined,
    });
  }

  const recommendations: Recommendation[] = [];
  const recEntries = text.matchAll(/RECOMMENDATION:\s*([^|]+)\|([^|]+)\|([^|]+)\|?(.*)/g);

  idx = 0;
  for (const match of recEntries) {
    recommendations.push({
      id: `r-${idx++}`,
      type: normalizeRecType(match[1].trim()),
      title: match[2].trim(),
      description: match[3].trim(),
      impact: match[4]?.trim() || '',
    });
  }

  return { actionPlan, recommendations };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveRiskLevel(score: number): RiskLevel {
  if (score >= 81) return 'low';
  if (score >= 61) return 'medium';
  if (score >= 41) return 'high';
  return 'critical';
}

function normalizeRiskValue(val: string): 'low' | 'medium' | 'high' {
  const v = val.toLowerCase();
  if (v.includes('high') || v.includes('hoch')) return 'high';
  if (v.includes('medium') || v.includes('mittel')) return 'medium';
  return 'low';
}

function normalizeCategory(val: string): FindingCategory {
  const v = val.toUpperCase().replace(/\s/g, '');
  const map: Record<string, FindingCategory> = {
    ESPR: 'ESPR', BATTERY: 'Battery', BATTERIE: 'Battery', PPWR: 'PPWR',
    GPSR: 'GPSR', CE: 'CE', REACH: 'REACH', ROHS: 'RoHS', EMC: 'EMC',
    EMV: 'EMC', RED: 'RED', LVD: 'LVD', DOCS: 'Docs', DOKUMENTE: 'Docs',
    DOCUMENTATION: 'Docs', DPP: 'DPP', NATIONAL: 'National',
  };
  return map[v] || 'Other';
}

function normalizeSeverity(val: string): FindingSeverity {
  const v = val.toLowerCase();
  if (v.includes('critical') || v.includes('kritisch')) return 'critical';
  if (v.includes('high') || v.includes('hoch')) return 'high';
  if (v.includes('medium') || v.includes('mittel')) return 'medium';
  if (v.includes('low') || v.includes('niedrig')) return 'low';
  return 'info';
}

function normalizeStatus(val: string): FindingStatus {
  const v = val.toLowerCase().replace(/[_\s-]/g, '');
  if (v.includes('compliant') || v.includes('konform') || v === 'ok') return 'compliant';
  if (v.includes('partial') || v.includes('teilweise')) return 'partial';
  if (v.includes('noncompliant') || v.includes('nichtkonform')) return 'non_compliant';
  return 'unknown';
}

function normalizePriority(val: string): ActionPriority {
  const v = val.toUpperCase().replace(/\s/g, '');
  if (v.includes('P1') || v.includes('1') || v.includes('SOFORT') || v.includes('IMMEDIATE')) return 'P1';
  if (v.includes('P2') || v.includes('2') || v.includes('KURZFRISTIG') || v.includes('SHORT')) return 'P2';
  return 'P3';
}

function normalizeRecType(val: string): RecommendationType {
  const v = val.toLowerCase().replace(/[_\s-]/g, '');
  if (v.includes('quick') || v.includes('schnell')) return 'quick_win';
  if (v.includes('strategic') || v.includes('strateg')) return 'strategic';
  return 'improvement';
}

// Re-export for convenience
export { buildProductDataString };
export type { ComplianceCheckContext, DocumentMeta };
