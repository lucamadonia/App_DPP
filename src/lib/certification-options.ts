export interface CertificationOption {
  name: string;
  category: string;
}

export interface CertificationCategory {
  label: string;
  options: CertificationOption[];
}

export const CERTIFICATION_CATEGORIES: CertificationCategory[] = [
  {
    label: 'EU / CE',
    options: [
      { name: 'CE-Kennzeichnung', category: 'EU / CE' },
      { name: 'RoHS Konformität', category: 'EU / CE' },
      { name: 'REACH Konformität', category: 'EU / CE' },
      { name: 'EU Ecolabel', category: 'EU / CE' },
      { name: 'EU Energy Label', category: 'EU / CE' },
    ],
  },
  {
    label: 'Quality Management',
    options: [
      { name: 'ISO 9001', category: 'Quality Management' },
      { name: 'ISO 14001', category: 'Quality Management' },
      { name: 'ISO 45001', category: 'Quality Management' },
      { name: 'ISO 50001', category: 'Quality Management' },
    ],
  },
  {
    label: 'Textile',
    options: [
      { name: 'OEKO-TEX Standard 100', category: 'Textile' },
      { name: 'GOTS (Global Organic Textile Standard)', category: 'Textile' },
      { name: 'Fair Trade', category: 'Textile' },
      { name: 'BSCI', category: 'Textile' },
      { name: 'SA8000', category: 'Textile' },
    ],
  },
  {
    label: 'Sustainability',
    options: [
      { name: 'GRS (Global Recycled Standard)', category: 'Sustainability' },
      { name: 'FSC', category: 'Sustainability' },
      { name: 'Blauer Engel', category: 'Sustainability' },
      { name: 'Cradle to Cradle', category: 'Sustainability' },
      { name: 'Nordic Swan', category: 'Sustainability' },
      { name: 'EPD (Environmental Product Declaration)', category: 'Sustainability' },
    ],
  },
  {
    label: 'Energy & Safety',
    options: [
      { name: 'Energy Star', category: 'Energy & Safety' },
      { name: 'UL Listed', category: 'Energy & Safety' },
      { name: 'TÜV', category: 'Energy & Safety' },
      { name: 'GS-Zeichen', category: 'Energy & Safety' },
    ],
  },
];

/** Flat list of all certification names */
export const ALL_CERTIFICATION_NAMES: string[] = CERTIFICATION_CATEGORIES.flatMap(
  (cat) => cat.options.map((opt) => opt.name)
);
