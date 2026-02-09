/**
 * Master Label Editor Defaults
 *
 * Factory functions for default sections, elements, and 5 built-in templates.
 */

import type {
  LabelDesign,
  LabelSection,
  LabelSectionId,
  LabelElement,
  LabelElementType,
  LabelTextElement,
  LabelFieldValueElement,
  LabelQRCodeElement,
  LabelComplianceBadgeElement,
  LabelPictogramElement,
  LabelImageElement,
  LabelDividerElement,
  LabelSpacerElement,
  LabelMaterialCodeElement,
  LabelBarcodeElement,
  LabelIconTextElement,
  LabelPackageCounterElement,
  MasterLabelTemplate,
} from '@/types/master-label-editor';

// ---------------------------------------------------------------------------
// A6 dimensions in points
// ---------------------------------------------------------------------------

export const A6_WIDTH_PT = 297.64;
export const A6_HEIGHT_PT = 419.53;

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

let counter = 0;
export function generateElementId(): string {
  counter += 1;
  return `el_${Date.now()}_${counter}`;
}

export function generateTemplateId(): string {
  return `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Default Sections
// ---------------------------------------------------------------------------

export function createDefaultSections(): LabelSection[] {
  return [
    { id: 'identity', label: 'ml.section.identity', visible: true, collapsed: false, sortOrder: 0, paddingTop: 0, paddingBottom: 6, showBorder: true, borderColor: '#d1d5db' },
    { id: 'dpp', label: 'ml.section.dpp', visible: true, collapsed: false, sortOrder: 1, paddingTop: 0, paddingBottom: 6, showBorder: true, borderColor: '#d1d5db' },
    { id: 'compliance', label: 'ml.section.compliance', visible: true, collapsed: false, sortOrder: 2, paddingTop: 0, paddingBottom: 6, showBorder: true, borderColor: '#d1d5db' },
    { id: 'sustainability', label: 'ml.section.sustainability', visible: true, collapsed: false, sortOrder: 3, paddingTop: 0, paddingBottom: 6, showBorder: false, borderColor: '#d1d5db' },
    { id: 'custom', label: 'ml.section.custom', visible: false, collapsed: false, sortOrder: 4, paddingTop: 0, paddingBottom: 6, showBorder: false, borderColor: '#d1d5db' },
    { id: 'footer', label: 'ml.section.footer', visible: false, collapsed: false, sortOrder: 5, paddingTop: 4, paddingBottom: 0, showBorder: false, borderColor: '#d1d5db' },
  ];
}

// ---------------------------------------------------------------------------
// Default Element Factories
// ---------------------------------------------------------------------------

export function createElement(type: LabelElementType, sectionId: LabelSectionId, sortOrder = 0): LabelElement {
  const base = { id: generateElementId(), sectionId, sortOrder };

  switch (type) {
    case 'text':
      return { ...base, type: 'text', content: 'Text', fontSize: 7, fontWeight: 'normal', color: '#1a1a1a', alignment: 'left', italic: false, uppercase: false } satisfies LabelTextElement;

    case 'field-value':
      return { ...base, type: 'field-value', fieldKey: 'productName', showLabel: true, fontSize: 7, fontWeight: 'bold', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'inline', lineHeight: 1.2, italic: false, uppercase: false, marginBottom: 2 } satisfies LabelFieldValueElement;

    case 'qr-code':
      return { ...base, type: 'qr-code', size: 52, showLabel: true, labelText: 'Digital Product Passport', showUrl: true, alignment: 'left' } satisfies LabelQRCodeElement;

    case 'pictogram':
      return { ...base, type: 'pictogram', pictogramId: 'ce-mark', source: 'builtin', size: 24, color: '#1a1a1a', showLabel: false, alignment: 'left' } satisfies LabelPictogramElement;

    case 'compliance-badge':
      return { ...base, type: 'compliance-badge', badgeId: 'ce', symbol: 'CE', style: 'outlined', size: 7, color: '#1a1a1a', backgroundColor: 'transparent', showLabel: false, alignment: 'left' } satisfies LabelComplianceBadgeElement;

    case 'image':
      return { ...base, type: 'image', src: '', alt: '', width: 50, alignment: 'center', borderRadius: 0 } satisfies LabelImageElement;

    case 'divider':
      return { ...base, type: 'divider', color: '#d1d5db', thickness: 0.5, style: 'solid', marginTop: 4, marginBottom: 4 } satisfies LabelDividerElement;

    case 'spacer':
      return { ...base, type: 'spacer', height: 8 } satisfies LabelSpacerElement;

    case 'material-code':
      return { ...base, type: 'material-code', codes: [], autoPopulate: true, fontSize: 5.5, color: '#1a1a1a', borderColor: '#9ca3af', alignment: 'left' } satisfies LabelMaterialCodeElement;

    case 'barcode':
      return { ...base, type: 'barcode', format: 'ean13', value: '', autoPopulate: true, height: 30, showText: true, alignment: 'center' } satisfies LabelBarcodeElement;

    case 'icon-text':
      return { ...base, type: 'icon-text', icon: 'Info', text: 'Label text', fontSize: 6, color: '#374151', iconSize: 8, alignment: 'left' } satisfies LabelIconTextElement;

    case 'package-counter':
      return {
        ...base,
        type: 'package-counter',
        format: 'package-x-of-y',
        fontSize: 11,
        fontWeight: 'bold',
        color: '#1a1a1a',
        backgroundColor: '#f3f4f6',
        borderColor: '#9ca3af',
        borderWidth: 1,
        borderRadius: 4,
        padding: 6,
        alignment: 'center',
        showBorder: true,
        showBackground: true,
        uppercase: false,
      } satisfies LabelPackageCounterElement;
  }
}

// ---------------------------------------------------------------------------
// Blank Design
// ---------------------------------------------------------------------------

export function createBlankDesign(): LabelDesign {
  return {
    _version: 2,
    pageSize: 'A6',
    pageWidth: A6_WIDTH_PT,
    pageHeight: A6_HEIGHT_PT,
    padding: 14,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    baseFontSize: 6.5,
    baseTextColor: '#1a1a1a',
    sections: createDefaultSections(),
    elements: [],
  };
}

// ---------------------------------------------------------------------------
// 5 Built-in Templates
// ---------------------------------------------------------------------------

function createElectronicsTemplate(): MasterLabelTemplate {
  const design = createBlankDesign();
  design.elements = [
    // Identity
    { id: generateElementId(), type: 'text', sectionId: 'identity', sortOrder: 0, content: 'IDENTITY & TRACEABILITY', fontSize: 5, fontWeight: 'bold', color: '#6b7280', alignment: 'left', italic: false, uppercase: true } satisfies LabelTextElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'identity', sortOrder: 1, fieldKey: 'productName', showLabel: false, fontSize: 9, fontWeight: 'bold', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'stacked' } satisfies LabelFieldValueElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'identity', sortOrder: 2, fieldKey: 'gtin', showLabel: true, labelText: 'Model/SKU', fontSize: 6, fontWeight: 'bold', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'inline' } satisfies LabelFieldValueElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'identity', sortOrder: 3, fieldKey: 'batchNumber', showLabel: true, fontSize: 6, fontWeight: 'bold', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'inline' } satisfies LabelFieldValueElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'identity', sortOrder: 4, fieldKey: 'manufacturerName', showLabel: true, fontSize: 6, fontWeight: 'normal', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'inline' } satisfies LabelFieldValueElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'identity', sortOrder: 5, fieldKey: 'importerName', showLabel: true, labelText: 'EU Importer', fontSize: 6, fontWeight: 'normal', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'inline' } satisfies LabelFieldValueElement,
    // DPP
    { id: generateElementId(), type: 'text', sectionId: 'dpp', sortOrder: 0, content: 'DIGITAL PRODUCT PASSPORT', fontSize: 5, fontWeight: 'bold', color: '#6b7280', alignment: 'left', italic: false, uppercase: true } satisfies LabelTextElement,
    { id: generateElementId(), type: 'qr-code', sectionId: 'dpp', sortOrder: 1, size: 52, showLabel: true, labelText: 'Digital Product Passport', showUrl: true, alignment: 'left' } satisfies LabelQRCodeElement,
    // Compliance
    { id: generateElementId(), type: 'text', sectionId: 'compliance', sortOrder: 0, content: 'COMPLIANCE', fontSize: 5, fontWeight: 'bold', color: '#6b7280', alignment: 'left', italic: false, uppercase: true } satisfies LabelTextElement,
    { id: generateElementId(), type: 'compliance-badge', sectionId: 'compliance', sortOrder: 1, badgeId: 'ce', symbol: 'CE', style: 'outlined', size: 7, color: '#1a1a1a', backgroundColor: 'transparent', showLabel: false, alignment: 'left' } satisfies LabelComplianceBadgeElement,
    { id: generateElementId(), type: 'compliance-badge', sectionId: 'compliance', sortOrder: 2, badgeId: 'weee', symbol: 'WEEE', style: 'outlined', size: 7, color: '#1a1a1a', backgroundColor: 'transparent', showLabel: false, alignment: 'left' } satisfies LabelComplianceBadgeElement,
    { id: generateElementId(), type: 'compliance-badge', sectionId: 'compliance', sortOrder: 3, badgeId: 'rohs', symbol: 'RoHS', style: 'outlined', size: 7, color: '#1a1a1a', backgroundColor: 'transparent', showLabel: false, alignment: 'left' } satisfies LabelComplianceBadgeElement,
    { id: generateElementId(), type: 'pictogram', sectionId: 'compliance', sortOrder: 4, pictogramId: 'weee-bin', source: 'builtin', size: 20, color: '#1a1a1a', showLabel: false, alignment: 'left' } satisfies LabelPictogramElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'compliance', sortOrder: 5, fieldKey: 'eprelNumber', showLabel: true, labelText: 'EPREL', fontSize: 5.5, fontWeight: 'normal', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'inline' } satisfies LabelFieldValueElement,
    // Sustainability
    { id: generateElementId(), type: 'text', sectionId: 'sustainability', sortOrder: 0, content: 'SUSTAINABILITY & DISPOSAL', fontSize: 5, fontWeight: 'bold', color: '#6b7280', alignment: 'left', italic: false, uppercase: true } satisfies LabelTextElement,
    { id: generateElementId(), type: 'material-code', sectionId: 'sustainability', sortOrder: 1, codes: [], autoPopulate: true, fontSize: 5.5, color: '#1a1a1a', borderColor: '#9ca3af', alignment: 'left' } satisfies LabelMaterialCodeElement,
    { id: generateElementId(), type: 'pictogram', sectionId: 'sustainability', sortOrder: 2, pictogramId: 'energy-arrow', source: 'builtin', size: 18, color: '#1a1a1a', showLabel: true, labelText: 'Energy', alignment: 'left' } satisfies LabelPictogramElement,
  ];
  return {
    id: 'builtin-electronics',
    name: 'Electronics Standard',
    description: 'CE, WEEE, RoHS badges with EPREL field and energy pictogram.',
    category: 'electronics',
    variant: 'universal',
    design,
    isDefault: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function createTextilesTemplate(): MasterLabelTemplate {
  const design = createBlankDesign();
  design.elements = [
    { id: generateElementId(), type: 'text', sectionId: 'identity', sortOrder: 0, content: 'IDENTITY & TRACEABILITY', fontSize: 5, fontWeight: 'bold', color: '#6b7280', alignment: 'left', italic: false, uppercase: true } satisfies LabelTextElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'identity', sortOrder: 1, fieldKey: 'productName', showLabel: false, fontSize: 9, fontWeight: 'bold', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'stacked' } satisfies LabelFieldValueElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'identity', sortOrder: 2, fieldKey: 'gtin', showLabel: true, labelText: 'Model/SKU', fontSize: 6, fontWeight: 'bold', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'inline' } satisfies LabelFieldValueElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'identity', sortOrder: 3, fieldKey: 'batchNumber', showLabel: true, fontSize: 6, fontWeight: 'bold', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'inline' } satisfies LabelFieldValueElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'identity', sortOrder: 4, fieldKey: 'manufacturerName', showLabel: true, fontSize: 6, fontWeight: 'normal', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'inline' } satisfies LabelFieldValueElement,
    // DPP
    { id: generateElementId(), type: 'text', sectionId: 'dpp', sortOrder: 0, content: 'DIGITAL PRODUCT PASSPORT', fontSize: 5, fontWeight: 'bold', color: '#6b7280', alignment: 'left', italic: false, uppercase: true } satisfies LabelTextElement,
    { id: generateElementId(), type: 'qr-code', sectionId: 'dpp', sortOrder: 1, size: 52, showLabel: true, labelText: 'Digital Product Passport', showUrl: true, alignment: 'left' } satisfies LabelQRCodeElement,
    // Compliance
    { id: generateElementId(), type: 'text', sectionId: 'compliance', sortOrder: 0, content: 'COMPLIANCE', fontSize: 5, fontWeight: 'bold', color: '#6b7280', alignment: 'left', italic: false, uppercase: true } satisfies LabelTextElement,
    { id: generateElementId(), type: 'compliance-badge', sectionId: 'compliance', sortOrder: 1, badgeId: 'oeko_tex', symbol: 'OT', style: 'outlined', size: 7, color: '#1a1a1a', backgroundColor: 'transparent', showLabel: true, alignment: 'left' } satisfies LabelComplianceBadgeElement,
    { id: generateElementId(), type: 'compliance-badge', sectionId: 'compliance', sortOrder: 2, badgeId: 'gots', symbol: 'GOTS', style: 'outlined', size: 7, color: '#1a1a1a', backgroundColor: 'transparent', showLabel: false, alignment: 'left' } satisfies LabelComplianceBadgeElement,
    { id: generateElementId(), type: 'compliance-badge', sectionId: 'compliance', sortOrder: 3, badgeId: 'reach', symbol: 'REACH', style: 'outlined', size: 7, color: '#1a1a1a', backgroundColor: 'transparent', showLabel: false, alignment: 'left' } satisfies LabelComplianceBadgeElement,
    // Sustainability
    { id: generateElementId(), type: 'text', sectionId: 'sustainability', sortOrder: 0, content: 'SUSTAINABILITY & DISPOSAL', fontSize: 5, fontWeight: 'bold', color: '#6b7280', alignment: 'left', italic: false, uppercase: true } satisfies LabelTextElement,
    { id: generateElementId(), type: 'material-code', sectionId: 'sustainability', sortOrder: 1, codes: [], autoPopulate: true, fontSize: 5.5, color: '#1a1a1a', borderColor: '#9ca3af', alignment: 'left' } satisfies LabelMaterialCodeElement,
  ];
  return {
    id: 'builtin-textiles',
    name: 'Textiles Standard',
    description: 'OEKO-TEX, GOTS, REACH badges with care label support.',
    category: 'textiles',
    variant: 'universal',
    design,
    isDefault: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function createToysTemplate(): MasterLabelTemplate {
  const design = createBlankDesign();
  design.elements = [
    { id: generateElementId(), type: 'text', sectionId: 'identity', sortOrder: 0, content: 'IDENTITY & TRACEABILITY', fontSize: 5, fontWeight: 'bold', color: '#6b7280', alignment: 'left', italic: false, uppercase: true } satisfies LabelTextElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'identity', sortOrder: 1, fieldKey: 'productName', showLabel: false, fontSize: 9, fontWeight: 'bold', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'stacked' } satisfies LabelFieldValueElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'identity', sortOrder: 2, fieldKey: 'gtin', showLabel: true, labelText: 'Model/SKU', fontSize: 6, fontWeight: 'bold', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'inline' } satisfies LabelFieldValueElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'identity', sortOrder: 3, fieldKey: 'batchNumber', showLabel: true, fontSize: 6, fontWeight: 'bold', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'inline' } satisfies LabelFieldValueElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'identity', sortOrder: 4, fieldKey: 'manufacturerName', showLabel: true, fontSize: 6, fontWeight: 'normal', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'inline' } satisfies LabelFieldValueElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'identity', sortOrder: 5, fieldKey: 'importerName', showLabel: true, labelText: 'EU Importer', fontSize: 6, fontWeight: 'normal', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'inline' } satisfies LabelFieldValueElement,
    // DPP
    { id: generateElementId(), type: 'text', sectionId: 'dpp', sortOrder: 0, content: 'DIGITAL PRODUCT PASSPORT', fontSize: 5, fontWeight: 'bold', color: '#6b7280', alignment: 'left', italic: false, uppercase: true } satisfies LabelTextElement,
    { id: generateElementId(), type: 'qr-code', sectionId: 'dpp', sortOrder: 1, size: 52, showLabel: true, labelText: 'Digital Product Passport', showUrl: true, alignment: 'left' } satisfies LabelQRCodeElement,
    // Compliance
    { id: generateElementId(), type: 'text', sectionId: 'compliance', sortOrder: 0, content: 'COMPLIANCE & SAFETY', fontSize: 5, fontWeight: 'bold', color: '#6b7280', alignment: 'left', italic: false, uppercase: true } satisfies LabelTextElement,
    { id: generateElementId(), type: 'compliance-badge', sectionId: 'compliance', sortOrder: 1, badgeId: 'ce', symbol: 'CE', style: 'outlined', size: 7, color: '#1a1a1a', backgroundColor: 'transparent', showLabel: false, alignment: 'left' } satisfies LabelComplianceBadgeElement,
    { id: generateElementId(), type: 'compliance-badge', sectionId: 'compliance', sortOrder: 2, badgeId: 'en71', symbol: 'EN71', style: 'outlined', size: 7, color: '#1a1a1a', backgroundColor: 'transparent', showLabel: false, alignment: 'left' } satisfies LabelComplianceBadgeElement,
    { id: generateElementId(), type: 'icon-text', sectionId: 'compliance', sortOrder: 3, icon: 'AlertTriangle', text: 'Warning: Not suitable for children under 3 years', fontSize: 6, color: '#dc2626', iconSize: 10, alignment: 'left' } satisfies LabelIconTextElement,
    // Sustainability
    { id: generateElementId(), type: 'text', sectionId: 'sustainability', sortOrder: 0, content: 'SUSTAINABILITY & DISPOSAL', fontSize: 5, fontWeight: 'bold', color: '#6b7280', alignment: 'left', italic: false, uppercase: true } satisfies LabelTextElement,
    { id: generateElementId(), type: 'material-code', sectionId: 'sustainability', sortOrder: 1, codes: [], autoPopulate: true, fontSize: 5.5, color: '#1a1a1a', borderColor: '#9ca3af', alignment: 'left' } satisfies LabelMaterialCodeElement,
  ];
  return {
    id: 'builtin-toys',
    name: 'Toys Standard',
    description: 'CE, EN71 badges with age warning and safety pictograms.',
    category: 'toys',
    variant: 'universal',
    design,
    isDefault: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function createHouseholdTemplate(): MasterLabelTemplate {
  const design = createBlankDesign();
  design.elements = [
    { id: generateElementId(), type: 'text', sectionId: 'identity', sortOrder: 0, content: 'IDENTITY & TRACEABILITY', fontSize: 5, fontWeight: 'bold', color: '#6b7280', alignment: 'left', italic: false, uppercase: true } satisfies LabelTextElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'identity', sortOrder: 1, fieldKey: 'productName', showLabel: false, fontSize: 9, fontWeight: 'bold', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'stacked' } satisfies LabelFieldValueElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'identity', sortOrder: 2, fieldKey: 'gtin', showLabel: true, labelText: 'Model/SKU', fontSize: 6, fontWeight: 'bold', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'inline' } satisfies LabelFieldValueElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'identity', sortOrder: 3, fieldKey: 'batchNumber', showLabel: true, fontSize: 6, fontWeight: 'bold', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'inline' } satisfies LabelFieldValueElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'identity', sortOrder: 4, fieldKey: 'manufacturerName', showLabel: true, fontSize: 6, fontWeight: 'normal', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'inline' } satisfies LabelFieldValueElement,
    // DPP
    { id: generateElementId(), type: 'text', sectionId: 'dpp', sortOrder: 0, content: 'DIGITAL PRODUCT PASSPORT', fontSize: 5, fontWeight: 'bold', color: '#6b7280', alignment: 'left', italic: false, uppercase: true } satisfies LabelTextElement,
    { id: generateElementId(), type: 'qr-code', sectionId: 'dpp', sortOrder: 1, size: 52, showLabel: true, labelText: 'Digital Product Passport', showUrl: true, alignment: 'left' } satisfies LabelQRCodeElement,
    // Compliance
    { id: generateElementId(), type: 'text', sectionId: 'compliance', sortOrder: 0, content: 'COMPLIANCE', fontSize: 5, fontWeight: 'bold', color: '#6b7280', alignment: 'left', italic: false, uppercase: true } satisfies LabelTextElement,
    { id: generateElementId(), type: 'compliance-badge', sectionId: 'compliance', sortOrder: 1, badgeId: 'ce', symbol: 'CE', style: 'outlined', size: 7, color: '#1a1a1a', backgroundColor: 'transparent', showLabel: false, alignment: 'left' } satisfies LabelComplianceBadgeElement,
    { id: generateElementId(), type: 'pictogram', sectionId: 'compliance', sortOrder: 2, pictogramId: 'food-safe', source: 'builtin', size: 22, color: '#1a1a1a', showLabel: true, labelText: 'Food Safe', alignment: 'left' } satisfies LabelPictogramElement,
    { id: generateElementId(), type: 'compliance-badge', sectionId: 'compliance', sortOrder: 3, badgeId: 'reach', symbol: 'REACH', style: 'outlined', size: 7, color: '#1a1a1a', backgroundColor: 'transparent', showLabel: false, alignment: 'left' } satisfies LabelComplianceBadgeElement,
    // Sustainability
    { id: generateElementId(), type: 'text', sectionId: 'sustainability', sortOrder: 0, content: 'SUSTAINABILITY & DISPOSAL', fontSize: 5, fontWeight: 'bold', color: '#6b7280', alignment: 'left', italic: false, uppercase: true } satisfies LabelTextElement,
    { id: generateElementId(), type: 'material-code', sectionId: 'sustainability', sortOrder: 1, codes: [], autoPopulate: true, fontSize: 5.5, color: '#1a1a1a', borderColor: '#9ca3af', alignment: 'left' } satisfies LabelMaterialCodeElement,
  ];
  return {
    id: 'builtin-household',
    name: 'Household Standard',
    description: 'CE, food contact, REACH badges with GS mark.',
    category: 'household',
    variant: 'universal',
    design,
    isDefault: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function createGeneralTemplate(): MasterLabelTemplate {
  const design = createBlankDesign();
  design.elements = [
    { id: generateElementId(), type: 'field-value', sectionId: 'identity', sortOrder: 0, fieldKey: 'productName', showLabel: false, fontSize: 9, fontWeight: 'bold', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'stacked' } satisfies LabelFieldValueElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'identity', sortOrder: 1, fieldKey: 'gtin', showLabel: true, labelText: 'GTIN', fontSize: 6, fontWeight: 'bold', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'inline' } satisfies LabelFieldValueElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'identity', sortOrder: 2, fieldKey: 'batchNumber', showLabel: true, fontSize: 6, fontWeight: 'bold', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'inline' } satisfies LabelFieldValueElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'identity', sortOrder: 3, fieldKey: 'manufacturerName', showLabel: true, fontSize: 6, fontWeight: 'normal', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'inline' } satisfies LabelFieldValueElement,
    // DPP
    { id: generateElementId(), type: 'qr-code', sectionId: 'dpp', sortOrder: 0, size: 52, showLabel: true, labelText: 'Digital Product Passport', showUrl: true, alignment: 'left' } satisfies LabelQRCodeElement,
    // Compliance left empty for general
    // Sustainability
    { id: generateElementId(), type: 'material-code', sectionId: 'sustainability', sortOrder: 0, codes: [], autoPopulate: true, fontSize: 5.5, color: '#1a1a1a', borderColor: '#9ca3af', alignment: 'left' } satisfies LabelMaterialCodeElement,
  ];
  return {
    id: 'builtin-general',
    name: 'General Minimal',
    description: 'Minimal label with identity, QR code, and basic compliance.',
    category: 'general',
    variant: 'universal',
    design,
    isDefault: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

function createLogistics2026Template(): MasterLabelTemplate {
  const design = createBlankDesign();

  // Custom sections for 5 zones
  design.sections = [
    { id: 'logistics', label: 'ZONE 1: Identification & Logistics', visible: true, collapsed: false, sortOrder: 0, paddingTop: 0, paddingBottom: 8, showBorder: true, borderColor: '#1a1a1a' },
    { id: 'regulatory', label: 'ZONE 2: Regulatory & Origin', visible: true, collapsed: false, sortOrder: 1, paddingTop: 0, paddingBottom: 8, showBorder: true, borderColor: '#1a1a1a' },
    { id: 'dpp-barcode', label: 'ZONE 3: DPP & Barcode', visible: true, collapsed: false, sortOrder: 2, paddingTop: 0, paddingBottom: 8, showBorder: true, borderColor: '#1a1a1a' },
    { id: 'packaging', label: 'ZONE 4: PPWR & Sustainability', visible: true, collapsed: false, sortOrder: 3, paddingTop: 0, paddingBottom: 8, showBorder: true, borderColor: '#1a1a1a' },
    { id: 'handling', label: 'ZONE 5: Handling Symbols', visible: true, collapsed: false, sortOrder: 4, paddingTop: 0, paddingBottom: 0, showBorder: false, borderColor: '#d1d5db' },
  ];

  design.elements = [
    // ZONE 1: Identifikation & Logistik
    { id: generateElementId(), type: 'text', sectionId: 'logistics', sortOrder: 0, content: 'ZONE 1: IDENTIFICATION & LOGISTICS', fontSize: 5.5, fontWeight: 'bold', color: '#1a1a1a', alignment: 'left', italic: false, uppercase: true } satisfies LabelTextElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'logistics', sortOrder: 1, fieldKey: 'productName', showLabel: false, fontSize: 10, fontWeight: 'bold', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'stacked', lineHeight: 1.1, marginBottom: 3 } satisfies LabelFieldValueElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'logistics', sortOrder: 2, fieldKey: 'gtin', showLabel: true, labelText: 'SKU / ITEM NO', fontSize: 7, fontWeight: 'bold', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'inline', marginBottom: 2 } satisfies LabelFieldValueElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'logistics', sortOrder: 3, fieldKey: 'batchNumber', showLabel: true, labelText: 'BATCH NO', fontSize: 7, fontWeight: 'bold', color: '#d97706', labelColor: '#6b7280', alignment: 'left', layout: 'inline', marginBottom: 2 } satisfies LabelFieldValueElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'logistics', sortOrder: 4, fieldKey: 'quantity', showLabel: true, labelText: 'QUANTITY', fontSize: 6.5, fontWeight: 'normal', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'inline', marginBottom: 1.5 } satisfies LabelFieldValueElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'logistics', sortOrder: 5, fieldKey: 'grossWeight', showLabel: true, labelText: 'GROSS WEIGHT', fontSize: 6.5, fontWeight: 'normal', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'inline', marginBottom: 1.5 } satisfies LabelFieldValueElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'logistics', sortOrder: 6, fieldKey: 'netWeight', showLabel: true, labelText: 'NET WEIGHT', fontSize: 6.5, fontWeight: 'normal', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'inline', marginBottom: 1.5 } satisfies LabelFieldValueElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'logistics', sortOrder: 7, fieldKey: 'cartonDimensions', showLabel: true, labelText: 'CARTON DIMENSIONS', fontSize: 6.5, fontWeight: 'normal', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'inline', marginBottom: 1.5 } satisfies LabelFieldValueElement,

    // ZONE 2: Regulatorische Haftung & Herkunft
    { id: generateElementId(), type: 'text', sectionId: 'regulatory', sortOrder: 0, content: 'ZONE 2: REGULATORY & ORIGIN', fontSize: 5.5, fontWeight: 'bold', color: '#1a1a1a', alignment: 'left', italic: false, uppercase: true } satisfies LabelTextElement,
    { id: generateElementId(), type: 'compliance-badge', sectionId: 'regulatory', sortOrder: 1, badgeId: 'ce', symbol: 'CE', style: 'filled', size: 9, color: '#ffffff', backgroundColor: '#1a1a1a', showLabel: true, labelText: 'CE MARK (Min. 5mm height)', alignment: 'left' } satisfies LabelComplianceBadgeElement,
    { id: generateElementId(), type: 'spacer', sectionId: 'regulatory', sortOrder: 2, height: 3 } satisfies LabelSpacerElement,
    { id: generateElementId(), type: 'text', sectionId: 'regulatory', sortOrder: 3, content: 'EU-MANUFACTURER / IMPORTER:', fontSize: 6, fontWeight: 'bold', color: '#1a1a1a', alignment: 'left', italic: false, uppercase: true } satisfies LabelTextElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'regulatory', sortOrder: 4, fieldKey: 'manufacturerName', showLabel: false, fontSize: 7, fontWeight: 'bold', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'stacked', marginBottom: 1 } satisfies LabelFieldValueElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'regulatory', sortOrder: 5, fieldKey: 'manufacturerAddress', showLabel: false, fontSize: 6, fontWeight: 'normal', color: '#374151', labelColor: '#6b7280', alignment: 'left', layout: 'stacked', marginBottom: 1 } satisfies LabelFieldValueElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'regulatory', sortOrder: 6, fieldKey: 'manufacturerContact', showLabel: false, fontSize: 6, fontWeight: 'normal', color: '#374151', labelColor: '#6b7280', alignment: 'left', layout: 'stacked', marginBottom: 2 } satisfies LabelFieldValueElement,
    { id: generateElementId(), type: 'field-value', sectionId: 'regulatory', sortOrder: 7, fieldKey: 'countryOfOrigin', showLabel: true, labelText: 'COUNTRY OF ORIGIN', fontSize: 6.5, fontWeight: 'bold', color: '#1a1a1a', labelColor: '#6b7280', alignment: 'left', layout: 'inline' } satisfies LabelFieldValueElement,

    // ZONE 3: Digitaler Produktpass & Barcode
    { id: generateElementId(), type: 'text', sectionId: 'dpp-barcode', sortOrder: 0, content: 'ZONE 3: DIGITAL PRODUCT PASSPORT', fontSize: 5.5, fontWeight: 'bold', color: '#1a1a1a', alignment: 'left', italic: false, uppercase: true } satisfies LabelTextElement,
    { id: generateElementId(), type: 'qr-code', sectionId: 'dpp-barcode', sortOrder: 1, size: 60, showLabel: true, labelText: 'QR-CODE (DPP) - Min. 25x25mm', showUrl: false, alignment: 'left' } satisfies LabelQRCodeElement,
    { id: generateElementId(), type: 'text', sectionId: 'dpp-barcode', sortOrder: 2, content: 'Cloud-Akte: DoC, Safety Data, Recycling Pass', fontSize: 5, fontWeight: 'normal', color: '#6b7280', alignment: 'left', italic: true, uppercase: false } satisfies LabelTextElement,
    { id: generateElementId(), type: 'spacer', sectionId: 'dpp-barcode', sortOrder: 3, height: 4 } satisfies LabelSpacerElement,
    { id: generateElementId(), type: 'text', sectionId: 'dpp-barcode', sortOrder: 4, content: 'LOGISTIC BARCODE:', fontSize: 6, fontWeight: 'bold', color: '#1a1a1a', alignment: 'left', italic: false, uppercase: true } satisfies LabelTextElement,
    { id: generateElementId(), type: 'barcode', sectionId: 'dpp-barcode', sortOrder: 5, format: 'ean13', value: '', autoPopulate: true, height: 35, showText: true, alignment: 'left' } satisfies LabelBarcodeElement,

    // ZONE 4: PPWR & Nachhaltigkeit
    { id: generateElementId(), type: 'text', sectionId: 'packaging', sortOrder: 0, content: 'ZONE 4: PPWR & SUSTAINABILITY', fontSize: 5.5, fontWeight: 'bold', color: '#1a1a1a', alignment: 'left', italic: false, uppercase: true } satisfies LabelTextElement,
    { id: generateElementId(), type: 'text', sectionId: 'packaging', sortOrder: 1, content: 'MATERIAL IDENTIFICATION:', fontSize: 6, fontWeight: 'bold', color: '#1a1a1a', alignment: 'left', italic: false, uppercase: true } satisfies LabelTextElement,
    { id: generateElementId(), type: 'material-code', sectionId: 'packaging', sortOrder: 2, codes: ['PAP 20'], autoPopulate: true, fontSize: 6, color: '#1a1a1a', borderColor: '#1a1a1a', alignment: 'left' } satisfies LabelMaterialCodeElement,
    { id: generateElementId(), type: 'spacer', sectionId: 'packaging', sortOrder: 3, height: 3 } satisfies LabelSpacerElement,
    { id: generateElementId(), type: 'text', sectionId: 'packaging', sortOrder: 4, content: 'SORTING INSTRUCTION:', fontSize: 6, fontWeight: 'bold', color: '#1a1a1a', alignment: 'left', italic: false, uppercase: true } satisfies LabelTextElement,
    { id: generateElementId(), type: 'pictogram', sectionId: 'packaging', sortOrder: 5, pictogramId: 'paper-recyclable', source: 'builtin', size: 22, color: '#1a1a1a', showLabel: true, labelText: 'Blue Bin (Altpapier)', alignment: 'left' } satisfies LabelPictogramElement,
    { id: generateElementId(), type: 'spacer', sectionId: 'packaging', sortOrder: 6, height: 3 } satisfies LabelSpacerElement,
    { id: generateElementId(), type: 'text', sectionId: 'packaging', sortOrder: 7, content: 'PACKAGING STATEMENT:', fontSize: 5.5, fontWeight: 'bold', color: '#1a1a1a', alignment: 'left', italic: false, uppercase: true } satisfies LabelTextElement,
    { id: generateElementId(), type: 'text', sectionId: 'packaging', sortOrder: 8, content: 'PFAS-free material. Minimum 80% recycled content.', fontSize: 6, fontWeight: 'normal', color: '#059669', alignment: 'left', italic: false, uppercase: false } satisfies LabelTextElement,

    // ZONE 5: Handling-Symbole
    { id: generateElementId(), type: 'text', sectionId: 'handling', sortOrder: 0, content: 'ZONE 5: HANDLING SYMBOLS (ISO 780)', fontSize: 5.5, fontWeight: 'bold', color: '#1a1a1a', alignment: 'left', italic: false, uppercase: true } satisfies LabelTextElement,
    { id: generateElementId(), type: 'pictogram', sectionId: 'handling', sortOrder: 1, pictogramId: 'fragile', source: 'builtin', size: 18, color: '#1a1a1a', showLabel: false, alignment: 'left' } satisfies LabelPictogramElement,
    { id: generateElementId(), type: 'pictogram', sectionId: 'handling', sortOrder: 2, pictogramId: 'keep-dry', source: 'builtin', size: 18, color: '#1a1a1a', showLabel: false, alignment: 'left' } satisfies LabelPictogramElement,
    { id: generateElementId(), type: 'pictogram', sectionId: 'handling', sortOrder: 3, pictogramId: 'this-way-up', source: 'builtin', size: 18, color: '#1a1a1a', showLabel: false, alignment: 'left' } satisfies LabelPictogramElement,
  ];

  return {
    id: 'builtin-logistics-2026',
    name: 'Logistics 2026 (5-Zone)',
    description: 'Professional logistics label with 5 zones: ID/Logistics, Regulatory/Origin, DPP/Barcode, PPWR/Sustainability, Handling symbols. Compliant with EU 2026 requirements.',
    category: 'logistics',
    variant: 'b2b',
    design,
    isDefault: true,
    createdAt: '2026-02-09T00:00:00Z',
    updatedAt: '2026-02-09T00:00:00Z',
  };
}

export const DEFAULT_MASTER_LABEL_TEMPLATES: MasterLabelTemplate[] = [
  createElectronicsTemplate(),
  createTextilesTemplate(),
  createToysTemplate(),
  createHouseholdTemplate(),
  createGeneralTemplate(),
  createLogistics2026Template(),
];

export function getDefaultDesignForGroup(group: string): LabelDesign {
  const template = DEFAULT_MASTER_LABEL_TEMPLATES.find(t => t.category === group);
  if (template) {
    // Deep clone so mutations don't affect defaults
    return JSON.parse(JSON.stringify(template.design));
  }
  return createBlankDesign();
}
