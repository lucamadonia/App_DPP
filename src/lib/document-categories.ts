export const DOCUMENT_CATEGORIES = [
  'Conformity',
  'Certificate',
  'Report',
  'Datasheet',
  'Test Report',
  'Safety Data Sheet',
  'User Manual',
  'Installation Guide',
  'Warranty Document',
  'Material Declaration',
  'Environmental Declaration',
  'Technical Drawing',
  'Video',
  'Other',
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];
