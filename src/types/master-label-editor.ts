/**
 * Master Label Visual Editor Types
 *
 * All types for the drag-and-drop label editor, including elements,
 * sections, design config, templates, and editor state.
 */

// ---------------------------------------------------------------------------
// Element Types
// ---------------------------------------------------------------------------

export type LabelElementType =
  | 'text'
  | 'field-value'
  | 'qr-code'
  | 'pictogram'
  | 'compliance-badge'
  | 'image'
  | 'divider'
  | 'spacer'
  | 'material-code'
  | 'barcode'
  | 'icon-text'
  | 'package-counter';

// ---------------------------------------------------------------------------
// Element Interfaces (discriminated union on `type`)
// ---------------------------------------------------------------------------

interface LabelElementBase {
  id: string;
  type: LabelElementType;
  sectionId: LabelSectionId;
  sortOrder: number;
}

export interface LabelTextElement extends LabelElementBase {
  type: 'text';
  content: string;
  fontSize: number; // in pt
  fontWeight: 'normal' | 'bold';
  color: string;
  alignment: 'left' | 'center' | 'right';
  italic: boolean;
  uppercase: boolean;
}

export interface LabelFieldValueElement extends LabelElementBase {
  type: 'field-value';
  fieldKey: LabelFieldKey;
  showLabel: boolean;
  labelText?: string; // custom override for the label
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  color: string;
  labelColor: string;
  alignment: 'left' | 'center' | 'right';
  layout: 'inline' | 'stacked';
  lineHeight?: number;        // default 1.2
  italic?: boolean;           // default false
  uppercase?: boolean;        // default false
  marginBottom?: number;      // pt, default 2
  fontFamily?: 'Helvetica' | 'Courier' | 'Times-Roman';
}

export interface LabelQRCodeElement extends LabelElementBase {
  type: 'qr-code';
  size: number; // in pt
  showLabel: boolean;
  labelText: string;
  showUrl: boolean;
  alignment: 'left' | 'center' | 'right';
}

export interface LabelPictogramElement extends LabelElementBase {
  type: 'pictogram';
  pictogramId: string; // references BuiltinPictogram.id or DB pictogram.id
  source: 'builtin' | 'database';
  size: number; // in pt
  color: string;
  showLabel: boolean;
  labelText?: string;
  alignment: 'left' | 'center' | 'right';
}

export interface LabelComplianceBadgeElement extends LabelElementBase {
  type: 'compliance-badge';
  badgeId: string; // e.g. 'ce', 'weee', 'rohs'
  symbol: string;
  style: 'outlined' | 'filled' | 'minimal';
  size: number;
  color: string;
  backgroundColor: string;
  showLabel: boolean;
  alignment: 'left' | 'center' | 'right';
}

export interface LabelImageElement extends LabelElementBase {
  type: 'image';
  src: string; // data URL or storage URL
  alt: string;
  width: number; // percentage of container (10–100)
  alignment: 'left' | 'center' | 'right';
  borderRadius: number;
}

export interface LabelDividerElement extends LabelElementBase {
  type: 'divider';
  color: string;
  thickness: number; // in pt
  style: 'solid' | 'dashed' | 'dotted';
  marginTop: number;
  marginBottom: number;
}

export interface LabelSpacerElement extends LabelElementBase {
  type: 'spacer';
  height: number; // in pt
}

export interface LabelMaterialCodeElement extends LabelElementBase {
  type: 'material-code';
  codes: string[]; // auto-populated from product or manually added
  autoPopulate: boolean;
  fontSize: number;
  color: string;
  borderColor: string;
  alignment: 'left' | 'center' | 'right';
}

export interface LabelBarcodeElement extends LabelElementBase {
  type: 'barcode';
  format: 'ean13' | 'code128' | 'code39';
  value: string; // auto from GTIN or manual
  autoPopulate: boolean;
  height: number; // in pt
  showText: boolean;
  alignment: 'left' | 'center' | 'right';
}

export interface LabelIconTextElement extends LabelElementBase {
  type: 'icon-text';
  icon: string; // lucide icon name
  text: string;
  fontSize: number;
  color: string;
  iconSize: number;
  alignment: 'left' | 'center' | 'right';
}

export type PackageCounterFormat =
  | 'x-of-y'           // "1 von 6" / "1 of 6"
  | 'x-slash-y'        // "1/6"
  | 'package-x-of-y'   // "Paket 1 von 6" / "Package 1 of 6"
  | 'box-x-of-y'       // "Karton 1 von 6" / "Box 1 of 6"
  | 'parcel-x-of-y';   // "Paket 1 von 6" / "Parcel 1 of 6"

export interface LabelPackageCounterElement extends LabelElementBase {
  type: 'package-counter';
  format: PackageCounterFormat;
  fontSize: number;                    // default: 11
  fontWeight: 'normal' | 'bold';       // default: 'bold'
  color: string;                       // default: '#1a1a1a'
  backgroundColor: string;             // default: '#f3f4f6'
  borderColor: string;                 // default: '#9ca3af'
  borderWidth: number;                 // default: 1
  borderRadius: number;                // default: 4
  padding: number;                     // default: 6
  alignment: 'left' | 'center' | 'right';
  showBorder: boolean;                 // default: true
  showBackground: boolean;             // default: true
  uppercase: boolean;                  // default: false
  fontFamily?: 'Helvetica' | 'Courier' | 'Times-Roman';
}

export type LabelElement =
  | LabelTextElement
  | LabelFieldValueElement
  | LabelQRCodeElement
  | LabelPictogramElement
  | LabelComplianceBadgeElement
  | LabelImageElement
  | LabelDividerElement
  | LabelSpacerElement
  | LabelMaterialCodeElement
  | LabelBarcodeElement
  | LabelIconTextElement
  | LabelPackageCounterElement;

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export type LabelSectionId =
  | 'identity'
  | 'dpp'
  | 'compliance'
  | 'sustainability'
  | 'custom'
  | 'footer';

export interface LabelSection {
  id: LabelSectionId;
  label: string; // i18n key
  visible: boolean;
  collapsed: boolean;
  sortOrder: number;
  paddingTop: number;
  paddingBottom: number;
  showBorder: boolean;
  borderColor: string;
  backgroundColor?: string;
}

// ---------------------------------------------------------------------------
// Auto-populated Field Keys
// ---------------------------------------------------------------------------

export type LabelFieldKey =
  | 'productName'
  | 'gtin'
  | 'batchNumber'
  | 'serialNumber'
  | 'manufacturerName'
  | 'manufacturerAddress'
  | 'manufacturerEmail'
  | 'manufacturerPhone'
  | 'manufacturerVAT'
  | 'manufacturerEORI'
  | 'manufacturerWebsite'
  | 'manufacturerContact'
  | 'manufacturerCountry'
  | 'importerName'
  | 'importerAddress'
  | 'importerEmail'
  | 'importerPhone'
  | 'importerVAT'
  | 'importerEORI'
  | 'importerCountry'
  | 'countryOfOrigin'
  | 'category'
  | 'grossWeight'
  | 'netWeight'
  | 'hsCode'
  | 'quantity'
  | 'eprelNumber'
  | 'weeeNumber'
  | 'madeIn'
  // ESPR fields
  | 'uniqueProductId'
  | 'productionDate'
  | 'recycledContentPercentage'
  | 'durabilityYears'
  | 'repairabilityScore'
  | 'dppRegistryId'
  | 'safetyInformation';

export interface LabelFieldMetadata {
  key: LabelFieldKey;
  labelKey: string; // i18n key
  section: LabelSectionId;
  format?: 'weight' | 'number';
}

export const LABEL_FIELD_METADATA: LabelFieldMetadata[] = [
  { key: 'productName', labelKey: 'ml.field.productName', section: 'identity' },
  { key: 'gtin', labelKey: 'ml.field.gtin', section: 'identity' },
  { key: 'batchNumber', labelKey: 'ml.field.batchNumber', section: 'identity' },
  { key: 'serialNumber', labelKey: 'ml.field.serialNumber', section: 'identity' },
  { key: 'manufacturerName', labelKey: 'ml.field.manufacturerName', section: 'identity' },
  { key: 'manufacturerAddress', labelKey: 'ml.field.manufacturerAddress', section: 'identity' },
  { key: 'manufacturerEmail', labelKey: 'ml.field.manufacturerEmail', section: 'identity' },
  { key: 'manufacturerPhone', labelKey: 'ml.field.manufacturerPhone', section: 'identity' },
  { key: 'manufacturerVAT', labelKey: 'ml.field.manufacturerVAT', section: 'identity' },
  { key: 'manufacturerEORI', labelKey: 'ml.field.manufacturerEORI', section: 'identity' },
  { key: 'manufacturerWebsite', labelKey: 'ml.field.manufacturerWebsite', section: 'identity' },
  { key: 'manufacturerContact', labelKey: 'ml.field.manufacturerContact', section: 'identity' },
  { key: 'manufacturerCountry', labelKey: 'ml.field.manufacturerCountry', section: 'identity' },
  { key: 'importerName', labelKey: 'ml.field.importerName', section: 'identity' },
  { key: 'importerAddress', labelKey: 'ml.field.importerAddress', section: 'identity' },
  { key: 'importerEmail', labelKey: 'ml.field.importerEmail', section: 'identity' },
  { key: 'importerPhone', labelKey: 'ml.field.importerPhone', section: 'identity' },
  { key: 'importerVAT', labelKey: 'ml.field.importerVAT', section: 'identity' },
  { key: 'importerEORI', labelKey: 'ml.field.importerEORI', section: 'identity' },
  { key: 'importerCountry', labelKey: 'ml.field.importerCountry', section: 'identity' },
  { key: 'countryOfOrigin', labelKey: 'ml.field.countryOfOrigin', section: 'identity' },
  { key: 'category', labelKey: 'ml.field.category', section: 'identity' },
  { key: 'grossWeight', labelKey: 'ml.field.grossWeight', section: 'identity', format: 'weight' },
  { key: 'netWeight', labelKey: 'ml.field.netWeight', section: 'identity', format: 'weight' },
  { key: 'hsCode', labelKey: 'ml.field.hsCode', section: 'compliance' },
  { key: 'quantity', labelKey: 'ml.field.quantity', section: 'identity', format: 'number' },
  { key: 'eprelNumber', labelKey: 'ml.field.eprelNumber', section: 'compliance' },
  { key: 'weeeNumber', labelKey: 'ml.field.weeeNumber', section: 'compliance' },
  { key: 'madeIn', labelKey: 'ml.field.madeIn', section: 'footer' },

  // ESPR fields - Identity
  { key: 'uniqueProductId', labelKey: 'ml.field.uniqueProductId', section: 'identity' },
  { key: 'productionDate', labelKey: 'ml.field.productionDate', section: 'identity' },

  // ESPR fields - Sustainability
  { key: 'recycledContentPercentage', labelKey: 'ml.field.recycledContentPercentage', section: 'sustainability', format: 'number' },
  { key: 'durabilityYears', labelKey: 'ml.field.durabilityYears', section: 'sustainability', format: 'number' },
  { key: 'repairabilityScore', labelKey: 'ml.field.repairabilityScore', section: 'sustainability', format: 'number' },

  // ESPR fields - Compliance
  { key: 'dppRegistryId', labelKey: 'ml.field.dppRegistryId', section: 'compliance' },
  { key: 'safetyInformation', labelKey: 'ml.field.safetyInformation', section: 'compliance' },
];

// ---------------------------------------------------------------------------
// Label Design (full editor state)
// ---------------------------------------------------------------------------

export interface LabelDesign {
  _version: 2;
  pageSize: 'A6' | 'A7' | 'custom';
  pageWidth: number; // in pt
  pageHeight: number; // in pt
  padding: number; // in pt
  backgroundColor: string;
  fontFamily: 'Helvetica' | 'Courier' | 'Times-Roman';
  baseFontSize: number; // in pt
  baseTextColor: string;
  sections: LabelSection[];
  elements: LabelElement[];
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export type MasterLabelTemplateCategory = 'electronics' | 'textiles' | 'toys' | 'household' | 'general' | 'custom';

export interface MasterLabelTemplate {
  id: string;
  name: string;
  description: string;
  category: MasterLabelTemplateCategory;
  variant: 'b2b' | 'b2c' | 'universal';
  thumbnail?: string;
  design: LabelDesign;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Editor State Types
// ---------------------------------------------------------------------------

export type LabelEditorView = 'gallery' | 'editor';

export type LabelSettingsPanelTab = 'preview' | 'settings' | 'design' | 'pictograms' | 'check';

export type LabelSaveStatus = 'saved' | 'unsaved' | 'saving' | 'error';

export interface LabelEditorHistoryEntry {
  design: LabelDesign;
  timestamp: number;
}

export interface LabelDragState {
  isDragging: boolean;
  sourceIndex: number | null;
  targetIndex: number | null;
  dragType: 'reorder' | 'insert' | 'section-reorder' | null;
  insertElementType: LabelElementType | null;
}

// ---------------------------------------------------------------------------
// Built-in Pictogram
// ---------------------------------------------------------------------------

export type PictogramCategory = 'compliance' | 'recycling' | 'chemicals' | 'energy' | 'safety';

export interface BuiltinPictogram {
  id: string;
  name: string;
  category: PictogramCategory;
  svgPath: string;
  viewBox: string;
  mandatory: boolean;
  description: string;
}

// ---------------------------------------------------------------------------
// Multi-Label Export Configuration
// ---------------------------------------------------------------------------

export interface MultiLabelExportConfig {
  labelCount: number;                  // 1-999
  format: PackageCounterFormat;
  startNumber: number;                 // default: 1
  filenamePattern: 'single' | 'batch'; // single multi-page PDF or separate PDFs
}
