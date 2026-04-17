/**
 * Document extraction dispatcher.
 * Routes by MIME type to the appropriate extractor.
 */

import { extractPdf } from './pdf';
import { extractImage } from './image';

export type ExtractedDocument = {
  /** Plain text (may be empty for image-only documents) */
  text: string;
  /** data:image/...;base64,... — first page image for Vision fallback (may be empty) */
  pageImage: string;
  /** Short reason if extraction partially failed */
  warnings: string[];
  /** Which MIME category was detected */
  kind: 'pdf' | 'image' | 'text' | 'unsupported';
};

/**
 * Extract content from a document File (browser-side).
 * Never throws — returns warnings for partial failures.
 */
export async function extractDocument(file: File): Promise<ExtractedDocument> {
  const warnings: string[] = [];

  try {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const result = await extractPdf(file);
      if (!result.text || result.text.length < 20) {
        warnings.push('PDF appears to have no selectable text (scanned document?).');
      }
      if (result.truncated) {
        warnings.push(`Text truncated to first ${result.pageImage ? '5 pages' : 'portion'}.`);
      }
      return {
        text: result.text,
        pageImage: result.pageImage,
        warnings,
        kind: 'pdf',
      };
    }

    if (file.type.startsWith('image/')) {
      const result = await extractImage(file);
      return {
        text: '',
        pageImage: result.pageImage,
        warnings,
        kind: 'image',
      };
    }

    // Plain text fallback (txt, md, csv)
    if (
      file.type.startsWith('text/') ||
      /\.(txt|md|csv)$/i.test(file.name)
    ) {
      const text = await file.text();
      return {
        text: text.slice(0, 15_000),
        pageImage: '',
        warnings,
        kind: 'text',
      };
    }

    // Unsupported (docx, xlsx, etc.) — can't extract client-side without extra deps
    warnings.push(
      `File type "${file.type || 'unknown'}" is not supported for AI extraction. ` +
        'Only PDF, images and plain-text files can be auto-classified.'
    );
    return { text: '', pageImage: '', warnings, kind: 'unsupported' };
  } catch (err) {
    console.error('Document extraction failed:', err);
    warnings.push(err instanceof Error ? err.message : 'Extraction failed.');
    return { text: '', pageImage: '', warnings, kind: 'unsupported' };
  }
}

/**
 * Human-friendly display of file size.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
