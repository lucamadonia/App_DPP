import type { MasterLabelData, LabelValidationResult } from '@/types/master-label';
import type { LabelDesign } from '@/types/master-label-editor';
import { CE_APPLICABLE_GROUPS } from './master-label-constants';

export function validateMasterLabel(data: MasterLabelData): LabelValidationResult[] {
  const results: LabelValidationResult[] = [];

  // ---------------------------------------------------------------------------
  // Check 1 (error): EU Importer / Authorized Representative missing
  // Mandatory for products imported into the EU from 2026
  // ---------------------------------------------------------------------------
  if (!data.identity.importer) {
    results.push({
      field: 'importer',
      message: 'EU Importer or Authorized Representative is missing. Required for EU market since 2026.',
      severity: 'error',
      i18nKey: 'ml.validation.importerMissing',
    });
  }

  // ---------------------------------------------------------------------------
  // Check 2 (error): Batch number missing
  // The label must identify the specific batch it belongs to
  // ---------------------------------------------------------------------------
  if (!data.identity.batchNumber) {
    results.push({
      field: 'batchNumber',
      message: 'Batch number is missing. Select a batch to include on the label.',
      severity: 'error',
      i18nKey: 'ml.validation.batchNumberMissing',
    });
  }

  // ---------------------------------------------------------------------------
  // Check 3 (warning): Target country not set for B2C
  // Consumer warnings must be in the target market language
  // ---------------------------------------------------------------------------
  if (data.variant === 'b2c' && !data.b2cTargetCountry) {
    results.push({
      field: 'targetCountry',
      message: 'Target country not set. B2C labels should specify the target market for language requirements.',
      severity: 'warning',
      i18nKey: 'ml.validation.targetCountryMissing',
    });
  }

  // ---------------------------------------------------------------------------
  // Additional: Manufacturer address completeness
  // ---------------------------------------------------------------------------
  if (!data.identity.manufacturer.address) {
    results.push({
      field: 'manufacturerAddress',
      message: 'Manufacturer address is incomplete. Full postal address is required on product labels.',
      severity: 'warning',
      i18nKey: 'ml.validation.manufacturerAddressMissing',
    });
  }

  // ---------------------------------------------------------------------------
  // Additional: CE marking for applicable product groups
  // ---------------------------------------------------------------------------
  if (CE_APPLICABLE_GROUPS.includes(data.productGroup)) {
    const ceModule = data.compliance.find(m => m.id === 'ce');
    if (ceModule && !ceModule.present) {
      results.push({
        field: 'ceMark',
        message: 'CE marking not detected in certifications. Required for this product group.',
        severity: 'warning',
        i18nKey: 'ml.validation.ceMissing',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Additional: Packaging material codes for PPWR
  // ---------------------------------------------------------------------------
  if (data.sustainability.packagingMaterialCodes.length === 0) {
    results.push({
      field: 'packagingCodes',
      message: 'No packaging material codes detected. PPWR requires packaging material identification.',
      severity: 'info',
      i18nKey: 'ml.validation.packagingCodesMissing',
    });
  }

  // ---------------------------------------------------------------------------
  // Additional: DPP QR data
  // ---------------------------------------------------------------------------
  if (!data.dppQr.qrDataUrl) {
    results.push({
      field: 'qrCode',
      message: 'QR code could not be generated. Check DPP URL configuration.',
      severity: 'error',
      i18nKey: 'ml.validation.qrCodeMissing',
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Editor Design Validation
// ---------------------------------------------------------------------------

export interface DesignValidationResult {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  i18nKey: string;
}

export function validateLabelDesign(design: LabelDesign): DesignValidationResult[] {
  const results: DesignValidationResult[] = [];

  // Check: QR code element required
  const hasQR = design.elements.some(e => e.type === 'qr-code');
  if (!hasQR) {
    results.push({
      field: 'qrCode',
      message: 'QR code element is required for the DPP link.',
      severity: 'error',
      i18nKey: 'ml.validation.qrElementRequired',
    });
  }

  // Check: Product name field recommended
  const hasProductName = design.elements.some(
    e => e.type === 'field-value' && e.fieldKey === 'productName'
  );
  if (!hasProductName) {
    results.push({
      field: 'productName',
      message: 'Product name field is recommended on the label.',
      severity: 'warning',
      i18nKey: 'ml.validation.productNameRecommended',
    });
  }

  // Check: Font size minimum 3.4pt per EU regulation
  for (const element of design.elements) {
    if ('fontSize' in element && typeof element.fontSize === 'number' && element.fontSize < 3.4) {
      results.push({
        field: `element.${element.id}`,
        message: 'Font size below 3.4pt (1.2mm). EU regulation requires minimum 1.2mm text height.',
        severity: 'error',
        i18nKey: 'ml.validation.fontSizeTooSmall',
      });
      break; // One warning is enough
    }
  }

  // Check: Manufacturer/importer fields present (warning)
  const hasManufacturer = design.elements.some(
    e => e.type === 'field-value' && (e.fieldKey === 'manufacturerName' || e.fieldKey === 'manufacturerAddress')
  );
  if (!hasManufacturer) {
    results.push({
      field: 'manufacturer',
      message: 'Manufacturer information is recommended on the label.',
      severity: 'warning',
      i18nKey: 'ml.validation.manufacturerRecommended',
    });
  }

  return results;
}
