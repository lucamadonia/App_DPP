/**
 * Master Label Compliance Checker
 *
 * Evaluates a label design against regulatory requirements based on
 * product group, variant (B2B/B2C), and target market.
 */

import type { LabelDesign, LabelFieldKey } from '@/types/master-label-editor';
import type { MasterLabelData, ProductGroup, LabelVariant } from '@/types/master-label';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ComplianceCheckSeverity = 'critical' | 'warning' | 'info';

export interface ComplianceCheckFixAction {
  type: 'add-field' | 'add-badge' | 'add-pictogram' | 'fix-element';
  fieldKey?: LabelFieldKey;
  badgeId?: string;
  symbol?: string;
  pictogramId?: string;
  elementId?: string;
}

export interface ComplianceCheckItem {
  id: string;
  labelKey: string;
  descriptionKey: string;
  severity: ComplianceCheckSeverity;
  passed: boolean;
  fixAction?: ComplianceCheckFixAction;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasFieldElement(design: LabelDesign, fieldKey: LabelFieldKey): boolean {
  return design.elements.some(
    el => el.type === 'field-value' && el.fieldKey === fieldKey,
  );
}

function hasBadge(design: LabelDesign, badgeId: string): boolean {
  return design.elements.some(
    el => el.type === 'compliance-badge' && el.badgeId === badgeId,
  );
}

function hasPictogram(design: LabelDesign, pictogramId: string): boolean {
  return design.elements.some(
    el => el.type === 'pictogram' && el.pictogramId === pictogramId,
  );
}

function hasQrCode(design: LabelDesign): boolean {
  return design.elements.some(el => el.type === 'qr-code');
}

function getMinFontSize(design: LabelDesign): number {
  let min = Infinity;
  for (const el of design.elements) {
    if ('fontSize' in el && typeof el.fontSize === 'number') {
      if (el.fontSize < min) min = el.fontSize;
    }
  }
  return min === Infinity ? design.baseFontSize : min;
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

export function runComplianceChecks(
  design: LabelDesign,
  data: MasterLabelData,
  productGroup: ProductGroup,
  variant: LabelVariant,
): ComplianceCheckItem[] {
  const checks: ComplianceCheckItem[] = [];

  // 1. CE Marking — mandatory for electronics, toys, household
  if (['electronics', 'toys', 'household'].includes(productGroup)) {
    checks.push({
      id: 'ce-marking',
      labelKey: 'ml.check.ceMarking',
      descriptionKey: 'ml.check.ceMarkingDesc',
      severity: 'critical',
      passed: hasBadge(design, 'ce'),
      fixAction: { type: 'add-badge', badgeId: 'ce', symbol: 'CE' },
    });
  }

  // 2. WEEE Symbol — mandatory for electronics
  if (productGroup === 'electronics') {
    checks.push({
      id: 'weee-symbol',
      labelKey: 'ml.check.weeeSymbol',
      descriptionKey: 'ml.check.weeeSymbolDesc',
      severity: 'critical',
      passed: hasPictogram(design, 'weee-bin') || hasBadge(design, 'weee'),
      fixAction: { type: 'add-pictogram', pictogramId: 'weee-bin' },
    });
  }

  // 3. Manufacturer Name — always required
  checks.push({
    id: 'manufacturer-name',
    labelKey: 'ml.check.manufacturerName',
    descriptionKey: 'ml.check.manufacturerNameDesc',
    severity: 'critical',
    passed: hasFieldElement(design, 'manufacturerName'),
    fixAction: { type: 'add-field', fieldKey: 'manufacturerName' },
  });

  // 4. Manufacturer Address — always required (EU law)
  checks.push({
    id: 'manufacturer-address',
    labelKey: 'ml.check.manufacturerAddress',
    descriptionKey: 'ml.check.manufacturerAddressDesc',
    severity: 'critical',
    passed: hasFieldElement(design, 'manufacturerAddress'),
    fixAction: { type: 'add-field', fieldKey: 'manufacturerAddress' },
  });

  // 5. EU Importer — required when manufacturer is outside EU
  const mfgCountry = data.identity.manufacturer.country || '';
  const euCountries = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PL', 'SE', 'DK', 'FI', 'IE', 'PT', 'GR', 'CZ', 'RO', 'HU', 'BG', 'HR', 'SK', 'SI', 'LT', 'LV', 'EE', 'LU', 'MT', 'CY'];
  const isEuMfg = !mfgCountry || euCountries.includes(mfgCountry.toUpperCase());
  checks.push({
    id: 'eu-importer',
    labelKey: 'ml.check.euImporter',
    descriptionKey: 'ml.check.euImporterDesc',
    severity: isEuMfg ? 'warning' : 'critical',
    passed: hasFieldElement(design, 'importerName') || isEuMfg,
    fixAction: { type: 'add-field', fieldKey: 'importerName' },
  });

  // 6. Batch/Serial Number — traceability
  checks.push({
    id: 'batch-serial',
    labelKey: 'ml.check.batchSerial',
    descriptionKey: 'ml.check.batchSerialDesc',
    severity: 'critical',
    passed: hasFieldElement(design, 'batchNumber') || hasFieldElement(design, 'serialNumber'),
    fixAction: { type: 'add-field', fieldKey: 'batchNumber' },
  });

  // 7. GTIN/EAN
  checks.push({
    id: 'gtin',
    labelKey: 'ml.check.gtin',
    descriptionKey: 'ml.check.gtinDesc',
    severity: 'warning',
    passed: hasFieldElement(design, 'gtin') || design.elements.some(el => el.type === 'barcode'),
    fixAction: { type: 'add-field', fieldKey: 'gtin' },
  });

  // 8. Product Name
  checks.push({
    id: 'product-name',
    labelKey: 'ml.check.productName',
    descriptionKey: 'ml.check.productNameDesc',
    severity: 'warning',
    passed: hasFieldElement(design, 'productName'),
    fixAction: { type: 'add-field', fieldKey: 'productName' },
  });

  // 9. QR Code / DPP Link — ESPR 2024
  checks.push({
    id: 'qr-dpp',
    labelKey: 'ml.check.qrDpp',
    descriptionKey: 'ml.check.qrDppDesc',
    severity: 'critical',
    passed: hasQrCode(design),
    fixAction: undefined, // QR code has no simple "add" — needs palette insert
  });

  // 10. RoHS Badge — electronics
  if (productGroup === 'electronics') {
    checks.push({
      id: 'rohs-badge',
      labelKey: 'ml.check.rohsBadge',
      descriptionKey: 'ml.check.rohsBadgeDesc',
      severity: 'warning',
      passed: hasBadge(design, 'rohs'),
      fixAction: { type: 'add-badge', badgeId: 'rohs', symbol: 'RoHS' },
    });
  }

  // 11. Packaging Material Codes — PPWR
  checks.push({
    id: 'packaging-codes',
    labelKey: 'ml.check.packagingCodes',
    descriptionKey: 'ml.check.packagingCodesDesc',
    severity: 'warning',
    passed: design.elements.some(el => el.type === 'material-code'),
    fixAction: undefined,
  });

  // 12. EPREL Number — for energy products
  if (productGroup === 'electronics') {
    checks.push({
      id: 'eprel',
      labelKey: 'ml.check.eprel',
      descriptionKey: 'ml.check.eprelDesc',
      severity: 'info',
      passed: hasFieldElement(design, 'eprelNumber'),
      fixAction: { type: 'add-field', fieldKey: 'eprelNumber' },
    });
  }

  // 13. Country of Origin — recommended for B2C
  if (variant === 'b2c') {
    checks.push({
      id: 'country-origin',
      labelKey: 'ml.check.countryOrigin',
      descriptionKey: 'ml.check.countryOriginDesc',
      severity: 'info',
      passed: hasFieldElement(design, 'countryOfOrigin') || hasFieldElement(design, 'madeIn'),
      fixAction: { type: 'add-field', fieldKey: 'countryOfOrigin' },
    });
  }

  // 14. Min Font Size — EU regulation 3.4pt/1.2mm
  const minFont = getMinFontSize(design);
  const fontTooSmall = minFont < 3.4;
  if (fontTooSmall) {
    // Find the offending element
    const offender = design.elements.find(el =>
      'fontSize' in el && typeof el.fontSize === 'number' && el.fontSize < 3.4,
    );
    checks.push({
      id: 'min-font-size',
      labelKey: 'ml.check.minFontSize',
      descriptionKey: 'ml.check.minFontSizeDesc',
      severity: 'warning',
      passed: false,
      fixAction: offender ? { type: 'fix-element', elementId: offender.id } : undefined,
    });
  } else {
    checks.push({
      id: 'min-font-size',
      labelKey: 'ml.check.minFontSize',
      descriptionKey: 'ml.check.minFontSizeDesc',
      severity: 'warning',
      passed: true,
    });
  }

  return checks;
}

// ---------------------------------------------------------------------------
// Score calculation
// ---------------------------------------------------------------------------

export function calculateComplianceScore(checks: ComplianceCheckItem[]): number {
  if (checks.length === 0) return 100;

  const weights: Record<ComplianceCheckSeverity, number> = {
    critical: 3,
    warning: 1.5,
    info: 0.5,
  };

  let totalWeight = 0;
  let passedWeight = 0;

  for (const check of checks) {
    const w = weights[check.severity];
    totalWeight += w;
    if (check.passed) passedWeight += w;
  }

  return totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 100;
}
