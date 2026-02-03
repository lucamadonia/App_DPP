import type {
  ProductGroup,
  ComplianceModuleIcon,
  SustainabilitySection,
  IdentitySection,
  MasterLabelData,
  AssembleMasterLabelParams,
} from '@/types/master-label';
import type { LabelFieldKey } from '@/types/master-label-editor';
import type { Supplier } from '@/types/database';
import {
  CATEGORY_TO_PRODUCT_GROUP,
  CATEGORY_NAME_PATTERNS,
  CERT_PATTERNS,
  PACKAGING_MATERIAL_CODES,
} from './master-label-constants';

// ---------------------------------------------------------------------------
// Product Group Detection
// ---------------------------------------------------------------------------

export function detectProductGroup(category: string): ProductGroup {
  if (!category) return 'general';

  // 1. Exact match from mapping
  const exact = CATEGORY_TO_PRODUCT_GROUP[category];
  if (exact) return exact;

  // 2. Case-insensitive key lookup
  const lowerCategory = category.toLowerCase();
  for (const [key, group] of Object.entries(CATEGORY_TO_PRODUCT_GROUP)) {
    if (key.toLowerCase() === lowerCategory) return group;
  }

  // 3. Regex pattern fallback
  for (const { pattern, group } of CATEGORY_NAME_PATTERNS) {
    if (pattern.test(category)) return group;
  }

  return 'general';
}

// ---------------------------------------------------------------------------
// Compliance Module Builder
// ---------------------------------------------------------------------------

function hasCert(certNames: string[], pattern: RegExp): boolean {
  return certNames.some(name => pattern.test(name));
}

function hasRegistration(registrations: Record<string, string> | undefined, key: string): boolean {
  if (!registrations) return false;
  return !!registrations[key];
}

export function buildComplianceModules(
  group: ProductGroup,
  certNames: string[],
  registrations?: Record<string, string>,
): ComplianceModuleIcon[] {
  const modules: ComplianceModuleIcon[] = [];

  switch (group) {
    case 'electronics':
      modules.push(
        { id: 'ce', symbol: 'CE', label: 'CE Marking', mandatory: true, present: hasCert(certNames, CERT_PATTERNS.ce) },
        { id: 'weee', symbol: 'WEEE', label: 'WEEE', mandatory: true, present: hasCert(certNames, CERT_PATTERNS.weee) || hasRegistration(registrations, 'weeeRegistration') },
        { id: 'rohs', symbol: 'RoHS', label: 'RoHS', mandatory: true, present: hasCert(certNames, CERT_PATTERNS.rohs) },
        { id: 'emc', symbol: 'EMC', label: 'EMC Directive', mandatory: false, present: hasCert(certNames, CERT_PATTERNS.emc) },
        { id: 'red', symbol: 'RED', label: 'Radio Equipment', mandatory: false, present: hasCert(certNames, CERT_PATTERNS.red) },
        { id: 'energy_label', symbol: 'E', label: 'Energy Label', mandatory: false, present: hasCert(certNames, CERT_PATTERNS.energy_label) || hasRegistration(registrations, 'eprelNumber') },
      );
      break;

    case 'toys':
      modules.push(
        { id: 'ce', symbol: 'CE', label: 'CE Marking', mandatory: true, present: hasCert(certNames, CERT_PATTERNS.ce) },
        { id: 'en71', symbol: 'EN71', label: 'EN 71 Safety', mandatory: true, present: hasCert(certNames, CERT_PATTERNS.en71) },
        { id: 'age_warning', symbol: '0-3', label: 'Age Warning', mandatory: false, present: false },
        { id: 'small_parts', symbol: '!', label: 'Small Parts Warning', mandatory: false, present: false },
      );
      break;

    case 'textiles':
      modules.push(
        { id: 'oeko_tex', symbol: 'OT', label: 'OEKO-TEX', mandatory: false, present: hasCert(certNames, CERT_PATTERNS.oeko_tex) },
        { id: 'gots', symbol: 'GOTS', label: 'GOTS', mandatory: false, present: hasCert(certNames, CERT_PATTERNS.gots) },
        { id: 'reach', symbol: 'REACH', label: 'REACH', mandatory: true, present: hasCert(certNames, CERT_PATTERNS.reach) || hasRegistration(registrations, 'reachRegistration') },
        { id: 'care_label', symbol: 'CL', label: 'Care Label', mandatory: true, present: false },
      );
      break;

    case 'household':
      modules.push(
        { id: 'ce', symbol: 'CE', label: 'CE Marking', mandatory: false, present: hasCert(certNames, CERT_PATTERNS.ce) },
        { id: 'food_contact', symbol: 'FC', label: 'Food Contact', mandatory: false, present: hasCert(certNames, CERT_PATTERNS.food_contact) },
        { id: 'reach', symbol: 'REACH', label: 'REACH', mandatory: true, present: hasCert(certNames, CERT_PATTERNS.reach) || hasRegistration(registrations, 'reachRegistration') },
        { id: 'gs', symbol: 'GS', label: 'GS Mark', mandatory: false, present: hasCert(certNames, CERT_PATTERNS.gs) },
      );
      break;

    default: // general
      modules.push(
        { id: 'ce', symbol: 'CE', label: 'CE Marking', mandatory: false, present: hasCert(certNames, CERT_PATTERNS.ce) },
        { id: 'reach', symbol: 'REACH', label: 'REACH', mandatory: false, present: hasCert(certNames, CERT_PATTERNS.reach) || hasRegistration(registrations, 'reachRegistration') },
        { id: 'rohs', symbol: 'RoHS', label: 'RoHS', mandatory: false, present: hasCert(certNames, CERT_PATTERNS.rohs) },
        { id: 'ukca', symbol: 'UKCA', label: 'UKCA', mandatory: false, present: hasCert(certNames, CERT_PATTERNS.ukca) },
      );
      break;
  }

  return modules;
}

// ---------------------------------------------------------------------------
// Sustainability Section
// ---------------------------------------------------------------------------

export function buildSustainabilitySection(
  materials: Array<{ name: string; type?: 'product' | 'packaging' }>,
  recyclability?: {
    instructions: string;
    packagingInstructions?: string;
    packagingDisposalMethods?: string[];
  },
): SustainabilitySection {
  // Extract packaging material codes
  const packagingMaterials = materials.filter(m => m.type === 'packaging');
  const codes: string[] = [];

  for (const mat of packagingMaterials) {
    const lowerName = mat.name.toLowerCase();
    for (const [pattern, code] of Object.entries(PACKAGING_MATERIAL_CODES)) {
      if (lowerName.includes(pattern)) {
        if (!codes.includes(code)) {
          codes.push(code);
        }
        break;
      }
    }
  }

  const instructions = recyclability?.packagingInstructions
    || recyclability?.instructions
    || '';

  return {
    packagingMaterialCodes: codes,
    recyclingInstructions: instructions,
    volumeOptimized: false,
  };
}

// ---------------------------------------------------------------------------
// Identity Section
// ---------------------------------------------------------------------------

export function formatSupplierAddress(supplier: Supplier): string {
  const parts: string[] = [];
  if (supplier.address) parts.push(supplier.address);
  if (supplier.address_line2) parts.push(supplier.address_line2);

  const cityLine: string[] = [];
  if (supplier.postal_code) cityLine.push(supplier.postal_code);
  if (supplier.city) cityLine.push(supplier.city);
  if (cityLine.length) parts.push(cityLine.join(' '));

  if (supplier.country) parts.push(supplier.country);

  return parts.join(', ');
}

export function buildIdentitySection(
  product: AssembleMasterLabelParams['product'],
  batch: AssembleMasterLabelParams['batch'],
  manufacturerSupplier: Supplier | null,
  importerSupplier: Supplier | null,
): IdentitySection {
  const manufacturerName = manufacturerSupplier?.name || product.manufacturer || '';
  const manufacturerAddress = manufacturerSupplier
    ? formatSupplierAddress(manufacturerSupplier)
    : product.manufacturerAddress || '';

  const batchNumber = batch?.batchNumber || product.batchNumber || '';

  const identity: IdentitySection = {
    productName: product.name,
    modelSku: product.gtin,
    batchNumber,
    manufacturer: {
      name: manufacturerName,
      address: manufacturerAddress,
    },
  };

  if (importerSupplier) {
    identity.importer = {
      name: importerSupplier.name,
      address: formatSupplierAddress(importerSupplier),
    };
  }

  return identity;
}

// ---------------------------------------------------------------------------
// QR Code + DPP URL helpers
// ---------------------------------------------------------------------------

export async function generateQRDataUrl(dppUrl: string): Promise<string> {
  const QRCode = await import('qrcode');
  return QRCode.toDataURL(dppUrl, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 200,
  });
}

export function buildDppUrl(
  gtin: string,
  serialNumber: string,
  qrSettings?: { resolverFormat?: string; customBaseUrl?: string },
): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  if (qrSettings?.customBaseUrl) {
    return `${qrSettings.customBaseUrl}/01/${gtin}/21/${serialNumber}`;
  }

  if (qrSettings?.resolverFormat === 'gs1') {
    return `${baseUrl}/01/${gtin}/21/${serialNumber}`;
  }

  return `${baseUrl}/p/${gtin}/${serialNumber}`;
}

// ---------------------------------------------------------------------------
// Full Assembly
// ---------------------------------------------------------------------------

export function assembleMasterLabelData(params: AssembleMasterLabelParams): MasterLabelData {
  const { product, batch, manufacturerSupplier, importerSupplier, variant, targetCountry, dppUrl, qrDataUrl } = params;

  const productGroup = detectProductGroup(product.category);

  // Merge materials and certifications with batch overrides
  const materials = batch?.materialsOverride || product.materials || [];
  const certifications = batch?.certificationsOverride || product.certifications || [];
  const recyclability = batch?.recyclabilityOverride || product.recyclability;
  const certNames = certifications.map(c => c.name);

  const identity = buildIdentitySection(product, batch, manufacturerSupplier, importerSupplier);
  const compliance = buildComplianceModules(productGroup, certNames, product.registrations);
  const sustainability = buildSustainabilitySection(materials, recyclability);

  const data: MasterLabelData = {
    variant,
    productGroup,
    identity,
    dppQr: {
      qrDataUrl,
      labelText: 'Digital Product Passport',
      dppUrl,
    },
    compliance,
    sustainability,
  };

  if (variant === 'b2b') {
    data.b2bQuantity = batch?.quantity;
    data.b2bGrossWeight = batch?.grossWeight ?? product.grossWeight;
  }

  if (variant === 'b2c') {
    data.b2cTargetCountry = targetCountry;
    data.b2cDisposalHint = recyclability?.instructions || '';
  }

  return data;
}

// ---------------------------------------------------------------------------
// Field Value Resolution (for visual editor)
// ---------------------------------------------------------------------------

/**
 * Resolves an auto-populated field key to its string value from assembled label data.
 * Used by both the canvas preview and the PDF renderer.
 */
export function resolveFieldValue(fieldKey: LabelFieldKey, data: MasterLabelData): string {
  switch (fieldKey) {
    case 'productName':
      return data.identity.productName || '';
    case 'gtin':
      return data.identity.modelSku || '';
    case 'batchNumber':
      return data.identity.batchNumber || '';
    case 'serialNumber':
      return data.identity.batchNumber || ''; // serial often same context
    case 'manufacturerName':
      return data.identity.manufacturer.name || '';
    case 'manufacturerAddress':
      return data.identity.manufacturer.address || '';
    case 'importerName':
      return data.identity.importer?.name || '';
    case 'importerAddress':
      return data.identity.importer?.address || '';
    case 'countryOfOrigin':
      return data.b2cTargetCountry || '';
    case 'category':
      return data.productGroup || '';
    case 'grossWeight':
      return data.b2bGrossWeight != null ? `${(data.b2bGrossWeight / 1000).toFixed(2)} kg` : '';
    case 'netWeight':
      return ''; // not available in MasterLabelData currently
    case 'hsCode':
      return ''; // not available in MasterLabelData currently
    case 'quantity':
      return data.b2bQuantity != null ? `${data.b2bQuantity}` : '';
    case 'eprelNumber':
      return ''; // would need registrations passed through
    case 'weeeNumber':
      return ''; // would need registrations passed through
    case 'madeIn':
      return data.b2cTargetCountry || '';
    default:
      return '';
  }
}
