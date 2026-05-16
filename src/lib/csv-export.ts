/**
 * Minimal client-side CSV export.
 *
 * Uses semicolon separator + UTF-8 BOM so the file opens cleanly in German
 * Excel without an import wizard. Values are quoted when they contain the
 * separator, a quote, or a line break.
 */

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = value instanceof Date ? value.toISOString() : String(value);
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => unknown;
}

export function buildCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const headerLine = columns.map((c) => escapeCsvCell(c.header)).join(';');
  const body = rows.map((r) => columns.map((c) => escapeCsvCell(c.value(r))).join(';')).join('\n');
  return `${headerLine}\n${body}`;
}

/** Trigger a browser download for a CSV string. */
export function downloadCsv(filename: string, csv: string): void {
  // UTF-8 BOM so Excel auto-detects the encoding.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Build a timestamped filename like "shipments-2026-05-16_1042.csv". */
export function timestampedFilename(prefix: string, ext = 'csv'): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${prefix}-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.${ext}`;
}
