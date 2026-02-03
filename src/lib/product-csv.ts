/**
 * CSV generation, template, and column mapping logic for product import/export.
 */

import type { Product, ProductBatch } from '@/types/product';

// ---------------------------------------------------------------------------
// Importable field definitions
// ---------------------------------------------------------------------------

export interface ImportFieldDef {
  key: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'json';
}

export const IMPORTABLE_FIELDS: ImportFieldDef[] = [
  { key: 'name', label: 'Name', required: true, type: 'string' },
  { key: 'manufacturer', label: 'Manufacturer', required: true, type: 'string' },
  { key: 'category', label: 'Category', required: true, type: 'string' },
  { key: 'gtin', label: 'GTIN', required: false, type: 'string' },
  { key: 'description', label: 'Description', required: false, type: 'string' },
  { key: 'hsCode', label: 'HS Code', required: false, type: 'string' },
  { key: 'countryOfOrigin', label: 'Country of Origin', required: false, type: 'string' },
  { key: 'netWeight', label: 'Net Weight (g)', required: false, type: 'number' },
  { key: 'grossWeight', label: 'Gross Weight (g)', required: false, type: 'number' },
  { key: 'materials', label: 'Materials (JSON)', required: false, type: 'json' },
  { key: 'certifications', label: 'Certifications (JSON)', required: false, type: 'json' },
];

// ---------------------------------------------------------------------------
// Auto-mapping: source header → target field key
// ---------------------------------------------------------------------------

const HEADER_ALIASES: Record<string, string[]> = {
  name: ['name', 'product_name', 'productname', 'produktname', 'artikel', 'article', 'title'],
  manufacturer: ['manufacturer', 'hersteller', 'brand', 'marke', 'vendor'],
  category: ['category', 'kategorie', 'product_category', 'type', 'produkttyp'],
  gtin: ['gtin', 'ean', 'barcode', 'upc', 'gtin/ean', 'gtin_ean'],
  description: ['description', 'beschreibung', 'desc', 'product_description'],
  hsCode: ['hs_code', 'hscode', 'hs code', 'tariff', 'zolltarifnummer', 'customs_code'],
  countryOfOrigin: ['country_of_origin', 'countryoforigin', 'country', 'herkunftsland', 'origin', 'herkunft', 'made_in'],
  netWeight: ['net_weight', 'netweight', 'net weight', 'nettogewicht', 'net_weight_g', 'weight_net'],
  grossWeight: ['gross_weight', 'grossweight', 'gross weight', 'bruttogewicht', 'gross_weight_g', 'weight_gross'],
  materials: ['materials', 'materialien', 'material'],
  certifications: ['certifications', 'zertifizierungen', 'certificates', 'certs'],
};

export function autoMapColumns(sourceHeaders: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const header of sourceHeaders) {
    const normalized = header.toLowerCase().trim().replace(/[^a-z0-9_/ ]/g, '');
    for (const [fieldKey, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(normalized)) {
        mapping[header] = fieldKey;
        break;
      }
    }
  }

  return mapping;
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatCSVRow(values: string[]): string {
  return values.map(escapeCSV).join(',');
}

const PRODUCT_HEADERS = [
  'Name', 'GTIN', 'Manufacturer', 'Category', 'Description', 'Status',
  'HS Code', 'Country of Origin', 'Net Weight (g)', 'Gross Weight (g)',
  'Materials', 'Certifications', 'Carbon Footprint (kg CO2)', 'Carbon Rating',
  'Recyclable %', 'Created',
];

const BATCH_HEADERS = [
  'Batch Number', 'Serial Number', 'Production Date', 'Expiration Date',
  'Batch Status', 'Quantity', 'Price/Unit', 'Currency',
];

function productToRow(p: Product): string[] {
  return [
    p.name || '',
    p.gtin || '',
    p.manufacturer || '',
    p.category || '',
    p.description || '',
    'draft',
    p.hsCode || '',
    p.countryOfOrigin || '',
    p.netWeight != null ? String(p.netWeight) : '',
    p.grossWeight != null ? String(p.grossWeight) : '',
    p.materials?.length ? JSON.stringify(p.materials.map(m => `${m.name} (${m.percentage}%)`)) : '',
    p.certifications?.length ? JSON.stringify(p.certifications.map(c => c.name)) : '',
    p.carbonFootprint?.totalKgCO2 != null ? String(p.carbonFootprint.totalKgCO2) : '',
    p.carbonFootprint?.rating || '',
    p.recyclability?.recyclablePercentage != null ? String(p.recyclability.recyclablePercentage) : '',
    '',
  ];
}

function batchToRow(b: ProductBatch): string[] {
  return [
    b.batchNumber || '',
    b.serialNumber || '',
    b.productionDate || '',
    b.expirationDate || '',
    b.status || '',
    b.quantity != null ? String(b.quantity) : '',
    b.pricePerUnit != null ? String(b.pricePerUnit) : '',
    b.currency || '',
  ];
}

export function generateProductCSV(
  products: Array<Product & { batches?: ProductBatch[] }>,
  includeBatches: boolean,
): string {
  const headers = includeBatches
    ? [...PRODUCT_HEADERS, ...BATCH_HEADERS]
    : PRODUCT_HEADERS;

  const rows: string[] = [formatCSVRow(headers)];

  for (const product of products) {
    const productRow = productToRow(product);

    if (includeBatches && product.batches && product.batches.length > 0) {
      for (const batch of product.batches) {
        rows.push(formatCSVRow([...productRow, ...batchToRow(batch)]));
      }
    } else {
      if (includeBatches) {
        rows.push(formatCSVRow([...productRow, ...Array(BATCH_HEADERS.length).fill('')]));
      } else {
        rows.push(formatCSVRow(productRow));
      }
    }
  }

  return rows.join('\n');
}

// ---------------------------------------------------------------------------
// CSV template for import
// ---------------------------------------------------------------------------

export function generateCSVTemplate(): string {
  const headers = IMPORTABLE_FIELDS.map(f => f.label);
  const example = [
    'Example Product',
    'Example GmbH',
    'Electronics',
    '4012345678901',
    'A sample product description',
    '8517.12.00',
    'Germany',
    '250',
    '320',
    '',
    '',
  ];
  return formatCSVRow(headers) + '\n' + formatCSVRow(example);
}
