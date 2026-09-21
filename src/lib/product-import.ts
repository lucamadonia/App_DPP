import { IMPORTABLE_FIELDS } from './product-csv';

export interface ImportIssue { key: string; field?: string }

/** Keep identifiers as strings and structured cells as JSON, including sparse rows. */
export function normalizeImportJSON(value: unknown): Record<string, string>[] {
  const rows: unknown[] = Array.isArray(value) ? value : [value];
  if (!rows.length || rows.some(row => !row || typeof row !== 'object' || Array.isArray(row))) {
    throw new Error('Invalid import file');
  }
  return rows.map(row => Object.fromEntries(Object.entries(row as Record<string, unknown>)
    .map(([key, cell]) => [key, cell == null ? '' : typeof cell === 'object' ? JSON.stringify(cell) : String(cell)])));
}

export function validateImportRows(rows: Record<string, string>[], mapping: Record<string, string>, existing: Set<string>) {
  const seen = new Set(existing);
  return rows.map((row, index) => {
    const data = Object.fromEntries(Object.entries(mapping).filter(([, target]) => target && target !== '_skip')
      .map(([source, target]) => [target, (row[source] || '').trim()]));
    const issues: ImportIssue[] = [];
    for (const field of IMPORTABLE_FIELDS) {
      if (field.required && !data[field.key]) issues.push({ key: 'Required field missing: {{field}}', field: field.label });
    }
    if (data.gtin) {
      if (!/^(\d{8}|\d{12,14})$/.test(data.gtin)) issues.push({ key: 'Invalid GTIN format' });
      if (seen.has(data.gtin)) issues.push({ key: 'GTIN already exists' });
      seen.add(data.gtin);
    }
    for (const field of ['netWeight', 'grossWeight']) {
      if (data[field] && (!Number.isFinite(Number(data[field])) || Number(data[field]) <= 0)) {
        issues.push({ key: 'Invalid positive number: {{field}}', field });
      }
    }
    for (const field of ['materials', 'certifications']) {
      if (!data[field]) continue;
      try {
        const cells: unknown = JSON.parse(data[field]);
        if (!Array.isArray(cells) || cells.some(cell => {
          if (!cell || typeof cell !== 'object' || typeof cell.name !== 'string' || !cell.name.trim()) return true;
          return field === 'materials'
            ? typeof cell.percentage !== 'number' || !Number.isFinite(cell.percentage) || cell.percentage < 0 || cell.percentage > 100 || typeof cell.recyclable !== 'boolean'
            : typeof cell.issuedBy !== 'string' || typeof cell.validUntil !== 'string';
        })) throw new Error('Invalid structure');
      } catch { issues.push({ key: 'Invalid JSON structure: {{field}}', field }); }
    }
    return { index, data, issues, status: issues.length ? 'error' as const : 'valid' as const };
  });
}
