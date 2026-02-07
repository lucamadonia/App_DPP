import type { FieldGroup } from '@/types/supplier-data-portal';

export const PRODUCT_FIELD_GROUPS: FieldGroup[] = [
  {
    category: 'basic',
    labelKey: 'Basic Data',
    fields: [
      { key: 'name', labelKey: 'Product Name', type: 'text', category: 'basic' },
      { key: 'manufacturer', labelKey: 'Manufacturer', type: 'text', category: 'basic' },
      { key: 'gtin', labelKey: 'GTIN', type: 'text', category: 'basic' },
      { key: 'description', labelKey: 'Description', type: 'textarea', category: 'basic' },
      { key: 'category', labelKey: 'Category', type: 'text', category: 'basic' },
      { key: 'countryOfOrigin', labelKey: 'Country of Origin', type: 'text', category: 'basic' },
    ],
  },
  {
    category: 'materials',
    labelKey: 'Materials',
    fields: [
      { key: 'materials', labelKey: 'Materials', type: 'jsonb-array', category: 'materials' },
      { key: 'recyclability', labelKey: 'Recyclability', type: 'jsonb-object', category: 'materials' },
    ],
  },
  {
    category: 'certifications',
    labelKey: 'Certifications',
    fields: [
      { key: 'certifications', labelKey: 'Certifications', type: 'jsonb-array', category: 'certifications' },
    ],
  },
  {
    category: 'carbon',
    labelKey: 'Carbon Footprint',
    fields: [
      { key: 'carbonFootprint', labelKey: 'Carbon Footprint', type: 'jsonb-object', category: 'carbon' },
    ],
  },
  {
    category: 'customs',
    labelKey: 'Customs Data',
    fields: [
      { key: 'hsCode', labelKey: 'HS Code', type: 'text', category: 'customs' },
      { key: 'netWeight', labelKey: 'Net Weight (g)', type: 'number', category: 'customs' },
      { key: 'grossWeight', labelKey: 'Gross Weight (g)', type: 'number', category: 'customs' },
      { key: 'manufacturerAddress', labelKey: 'Manufacturer Address', type: 'text', category: 'customs' },
      { key: 'manufacturerEORI', labelKey: 'Manufacturer EORI', type: 'text', category: 'customs' },
      { key: 'manufacturerVAT', labelKey: 'Manufacturer VAT', type: 'text', category: 'customs' },
    ],
  },
  {
    category: 'dimensions',
    labelKey: 'Dimensions',
    fields: [
      { key: 'productHeightCm', labelKey: 'Height (cm)', type: 'number', category: 'dimensions' },
      { key: 'productWidthCm', labelKey: 'Width (cm)', type: 'number', category: 'dimensions' },
      { key: 'productDepthCm', labelKey: 'Depth (cm)', type: 'number', category: 'dimensions' },
    ],
  },
  {
    category: 'packaging',
    labelKey: 'Packaging',
    fields: [
      { key: 'packagingType', labelKey: 'Packaging Type', type: 'select', category: 'packaging' },
      { key: 'packagingDescription', labelKey: 'Packaging Description', type: 'textarea', category: 'packaging' },
      { key: 'packagingHeightCm', labelKey: 'Packaging Height (cm)', type: 'number', category: 'packaging' },
      { key: 'packagingWidthCm', labelKey: 'Packaging Width (cm)', type: 'number', category: 'packaging' },
      { key: 'packagingDepthCm', labelKey: 'Packaging Depth (cm)', type: 'number', category: 'packaging' },
    ],
  },
  {
    category: 'espr',
    labelKey: 'ESPR Compliance',
    fields: [
      { key: 'importerName', labelKey: 'Importer Name', type: 'text', category: 'espr' },
      { key: 'importerEORI', labelKey: 'Importer EORI', type: 'text', category: 'espr' },
      { key: 'authorizedRepresentative', labelKey: 'Authorized Representative', type: 'jsonb-object', category: 'espr' },
      { key: 'substancesOfConcern', labelKey: 'Substances of Concern', type: 'jsonb-array', category: 'espr' },
      { key: 'durabilityYears', labelKey: 'Durability (Years)', type: 'number', category: 'espr' },
      { key: 'repairabilityScore', labelKey: 'Repairability Score', type: 'number', category: 'espr' },
      { key: 'ceMarking', labelKey: 'CE Marking', type: 'boolean', category: 'espr' },
      { key: 'euDeclarationOfConformity', labelKey: 'EU Declaration of Conformity', type: 'text', category: 'espr' },
      { key: 'recycledContentPercentage', labelKey: 'Recycled Content (%)', type: 'number', category: 'espr' },
      { key: 'energyConsumptionKWh', labelKey: 'Energy Consumption (kWh)', type: 'number', category: 'espr' },
    ],
  },
];

export const BATCH_FIELD_GROUPS: FieldGroup[] = [
  {
    category: 'core',
    labelKey: 'Core Data',
    fields: [
      { key: 'batchNumber', labelKey: 'Batch Number', type: 'text', category: 'core' },
      { key: 'serialNumber', labelKey: 'Serial Number', type: 'text', category: 'core' },
      { key: 'productionDate', labelKey: 'Production Date', type: 'date', category: 'core' },
      { key: 'expirationDate', labelKey: 'Expiration Date', type: 'date', category: 'core' },
      { key: 'status', labelKey: 'Status', type: 'select', category: 'core' },
      { key: 'quantity', labelKey: 'Quantity', type: 'number', category: 'core' },
    ],
  },
  {
    category: 'logistics',
    labelKey: 'Logistics & Pricing',
    fields: [
      { key: 'pricePerUnit', labelKey: 'Price per Unit', type: 'number', category: 'logistics' },
      { key: 'currency', labelKey: 'Currency', type: 'text', category: 'logistics' },
    ],
  },
  {
    category: 'overrides',
    labelKey: 'Overrides',
    fields: [
      { key: 'descriptionOverride', labelKey: 'Description Override', type: 'textarea', category: 'overrides' },
      { key: 'materialsOverride', labelKey: 'Materials Override', type: 'jsonb-array', category: 'overrides' },
      { key: 'certificationsOverride', labelKey: 'Certifications Override', type: 'jsonb-array', category: 'overrides' },
      { key: 'carbonFootprintOverride', labelKey: 'Carbon Footprint Override', type: 'jsonb-object', category: 'overrides' },
    ],
  },
  {
    category: 'batchDimensions',
    labelKey: 'Dimensions & Packaging',
    fields: [
      { key: 'productHeightCm', labelKey: 'Height (cm)', type: 'number', category: 'batchDimensions' },
      { key: 'productWidthCm', labelKey: 'Width (cm)', type: 'number', category: 'batchDimensions' },
      { key: 'productDepthCm', labelKey: 'Depth (cm)', type: 'number', category: 'batchDimensions' },
      { key: 'packagingType', labelKey: 'Packaging Type', type: 'select', category: 'batchDimensions' },
      { key: 'packagingDescription', labelKey: 'Packaging Description', type: 'textarea', category: 'batchDimensions' },
      { key: 'packagingHeightCm', labelKey: 'Packaging Height (cm)', type: 'number', category: 'batchDimensions' },
      { key: 'packagingWidthCm', labelKey: 'Packaging Width (cm)', type: 'number', category: 'batchDimensions' },
      { key: 'packagingDepthCm', labelKey: 'Packaging Depth (cm)', type: 'number', category: 'batchDimensions' },
    ],
  },
];

/** All product field keys as flat array */
export const ALL_PRODUCT_FIELD_KEYS = PRODUCT_FIELD_GROUPS.flatMap(g => g.fields.map(f => f.key));

/** All batch field keys as flat array */
export const ALL_BATCH_FIELD_KEYS = BATCH_FIELD_GROUPS.flatMap(g => g.fields.map(f => f.key));

/** Map from camelCase field key to snake_case DB column name */
const PRODUCT_FIELD_TO_COLUMN: Record<string, string> = {
  name: 'name',
  manufacturer: 'manufacturer',
  gtin: 'gtin',
  description: 'description',
  category: 'category',
  countryOfOrigin: 'country_of_origin',
  materials: 'materials',
  recyclability: 'recyclability',
  certifications: 'certifications',
  carbonFootprint: 'carbon_footprint',
  hsCode: 'hs_code',
  netWeight: 'net_weight',
  grossWeight: 'gross_weight',
  manufacturerAddress: 'manufacturer_address',
  manufacturerEORI: 'manufacturer_eori',
  manufacturerVAT: 'manufacturer_vat',
  productHeightCm: 'product_height_cm',
  productWidthCm: 'product_width_cm',
  productDepthCm: 'product_depth_cm',
  packagingType: 'packaging_type',
  packagingDescription: 'packaging_description',
  packagingHeightCm: 'packaging_height_cm',
  packagingWidthCm: 'packaging_width_cm',
  packagingDepthCm: 'packaging_depth_cm',
  importerName: 'importer_name',
  importerEORI: 'importer_eori',
  authorizedRepresentative: 'authorized_representative',
  substancesOfConcern: 'substances_of_concern',
  durabilityYears: 'durability_years',
  repairabilityScore: 'repairability_score',
  ceMarking: 'ce_marking',
  euDeclarationOfConformity: 'eu_declaration_of_conformity',
  recycledContentPercentage: 'recycled_content_percentage',
  energyConsumptionKWh: 'energy_consumption_kwh',
};

const BATCH_FIELD_TO_COLUMN: Record<string, string> = {
  batchNumber: 'batch_number',
  serialNumber: 'serial_number',
  productionDate: 'production_date',
  expirationDate: 'expiration_date',
  status: 'status',
  quantity: 'quantity',
  pricePerUnit: 'price_per_unit',
  currency: 'currency',
  descriptionOverride: 'description_override',
  materialsOverride: 'materials_override',
  certificationsOverride: 'certifications_override',
  carbonFootprintOverride: 'carbon_footprint_override',
  productHeightCm: 'product_height_cm',
  productWidthCm: 'product_width_cm',
  productDepthCm: 'product_depth_cm',
  packagingType: 'packaging_type',
  packagingDescription: 'packaging_description',
  packagingHeightCm: 'packaging_height_cm',
  packagingWidthCm: 'packaging_width_cm',
  packagingDepthCm: 'packaging_depth_cm',
};

/**
 * Convert camelCase product field data to snake_case DB columns,
 * filtering only allowed fields.
 */
export function filterProductFieldsToColumns(
  data: Record<string, unknown>,
  allowedFields: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in data && PRODUCT_FIELD_TO_COLUMN[field]) {
      result[PRODUCT_FIELD_TO_COLUMN[field]] = data[field];
    }
  }
  return result;
}

/**
 * Convert camelCase batch field data to snake_case DB columns,
 * filtering only allowed fields.
 */
export function filterBatchFieldsToColumns(
  data: Record<string, unknown>,
  allowedFields: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in data && BATCH_FIELD_TO_COLUMN[field]) {
      result[BATCH_FIELD_TO_COLUMN[field]] = data[field];
    }
  }
  return result;
}
