/**
 * Built-in EU regulation pictograms for the Master Label editor.
 *
 * 15 SVG pictograms renderable in both HTML <svg> and @react-pdf/renderer <Svg>/<Path>.
 * Each entry uses a single SVG path with a standard viewBox.
 */

import type { BuiltinPictogram } from '@/types/master-label-editor';

export const BUILTIN_PICTOGRAMS: BuiltinPictogram[] = [
  // ─── Compliance ─────────────────────────────────────────
  {
    id: 'ce-mark',
    name: 'CE Marking',
    category: 'compliance',
    viewBox: '0 0 100 60',
    svgPath: 'M35 5C18.4 5 5 18.4 5 35s13.4 25 25 25c8.5 0 16.1-4.3 20.6-10.8l-7.4-4.3C40.3 49.5 36 52 31 52c-9.4 0-17-7.6-17-17s7.6-17 17-17c5 0 9.4 2.5 12.2 6.3l7.3-4.4C46.1 13.6 38.5 5 35 5zM70 5c-6.1 0-11.6 2.5-15.5 6.5l7.2 4.3C64.2 12.6 67 11 70 11c5 0 9 4 9 9H63v6h16c0 5-4 9-9 9-3 0-5.8-1.6-8.3-4.8l-7.2 4.3C58.4 39.5 63.9 47 70 47c11 0 20-9 20-20S81 5 70 5z',
    mandatory: false,
    description: 'Conformité Européenne marking required for products sold in the EEA.',
  },
  {
    id: 'ukca-mark',
    name: 'UKCA Marking',
    category: 'compliance',
    viewBox: '0 0 100 100',
    svgPath: 'M50 5C25.1 5 5 25.1 5 50s20.1 45 45 45 45-20.1 45-45S74.9 5 50 5zm0 8c20.4 0 37 16.6 37 37S70.4 87 50 87 13 70.4 13 50s16.6-37 37-37zM33 35v16c0 5.5 4.5 10 10 10s10-4.5 10-10V35h-6v16c0 2.2-1.8 4-4 4s-4-1.8-4-4V35h-6zm30 0v26h6v-10h4l5 10h7l-6-11c3-2 5-5 5-8 0-5.5-4.5-9-10-9h-11zm6 6h5c2.2 0 4 1.3 4 3s-1.8 3-4 3h-5v-6z',
    mandatory: false,
    description: 'UK Conformity Assessed marking for the Great Britain market.',
  },
  {
    id: 'rohs-stamp',
    name: 'RoHS Compliant',
    category: 'compliance',
    viewBox: '0 0 100 100',
    svgPath: 'M50 5C25.1 5 5 25.1 5 50s20.1 45 45 45 45-20.1 45-45S74.9 5 50 5zm0 8c20.4 0 37 16.6 37 37S70.4 87 50 87 13 70.4 13 50s16.6-37 37-37zM30 38v24h6v-8h3l5 8h7l-6-9c3-1.5 5-4.5 5-7.5 0-5-4-7.5-9-7.5h-11zm6 5h4c2 0 3.5 1 3.5 3s-1.5 3-3.5 3h-4v-6zm20-5v24h6V49h8v-5h-8v-1h8v-5h-14z',
    mandatory: false,
    description: 'Restriction of Hazardous Substances in electrical and electronic equipment.',
  },

  // ─── Recycling ──────────────────────────────────────────
  {
    id: 'weee-bin',
    name: 'WEEE Wheelie Bin',
    category: 'recycling',
    viewBox: '0 0 100 120',
    svgPath: 'M30 5v8H15v10h70V13H70V5H30zm-5 22l5 78h40l5-78H25zm15 10h4v58h-4V37zm8 0h4v58h-4V37zm8 0h4v58h-4V37z M20 110v4h60v-4H20z',
    mandatory: true,
    description: 'WEEE directive crossed-out wheelie bin symbol for electronic waste.',
  },
  {
    id: 'mobius-loop',
    name: 'Recycling Triangle',
    category: 'recycling',
    viewBox: '0 0 100 100',
    svgPath: 'M50 8L15 68h12l23-42 23 42h12L50 8zM22 72l-12 20h28l-4-7H24l2-3 4-7-8-3zm56 0l-8 3 4 7 2 3H66l-4 7h28L78 72z',
    mandatory: false,
    description: 'Universal recycling symbol (Mobius loop). Indicates material is recyclable.',
  },
  {
    id: 'tidyman',
    name: 'Tidyman',
    category: 'recycling',
    viewBox: '0 0 80 100',
    svgPath: 'M45 5a7 7 0 100 14 7 7 0 000-14zM35 22l-15 30h8l8-16v54h8V58h2v32h8V36l8 16h8L55 22H35zM10 65v30h25v-6H16V65H10z',
    mandatory: false,
    description: 'Tidyman symbol encouraging proper disposal of packaging waste.',
  },
  {
    id: 'green-dot',
    name: 'Grüner Punkt',
    category: 'recycling',
    viewBox: '0 0 100 100',
    svgPath: 'M50 5C25.1 5 5 25.1 5 50s20.1 45 45 45 45-20.1 45-45S74.9 5 50 5zm0 10c7 0 13.5 2.1 19 5.6L35 65c-3-5-5-11-5-17 0-13.8 8.9-25.5 21.3-29.7L50 15zm19.7 8.3C80.1 30.5 85 39.7 85 50c0 19.3-15.7 35-35 35-7 0-13.5-2.1-19-5.6L65 35c3 5 5 11 5 17 0 3.2-.5 6.3-1.5 9.2L69.7 23.3z',
    mandatory: false,
    description: 'Green Dot (Grüner Punkt) indicates participation in packaging recovery system.',
  },
  {
    id: 'triman',
    name: 'Triman',
    category: 'recycling',
    viewBox: '0 0 100 100',
    svgPath: 'M50 5C25.1 5 5 25.1 5 50s20.1 45 45 45 45-20.1 45-45S74.9 5 50 5zm0 8c20.4 0 37 16.6 37 37S70.4 87 50 87 13 70.4 13 50s16.6-37 37-37zM50 25a5 5 0 100 10 5 5 0 000-10zm-3 14v3l-10 18h6l7-13 7 13h6L53 42v-3h-6zm-15 25l8-4 4 7-8 4-4-7zm30 0l4 7-8 4-4-7 8-4z',
    mandatory: false,
    description: 'French Triman logo indicating product should be sorted for recycling.',
  },
  {
    id: 'battery-disposal',
    name: 'Battery Collection',
    category: 'recycling',
    viewBox: '0 0 80 100',
    svgPath: 'M25 5v8H15v10h50V13H55V5H25zm-5 22v58h40V27H20zm10 8h20v6H30v-6zm0 12h20v6H30v-6zm0 12h20v6H30v-6z M10 90v4h60v-4H10z M35 90l5 8 5-8h-10z',
    mandatory: false,
    description: 'Battery collection symbol indicating separate disposal of batteries.',
  },

  // ─── Chemicals ──────────────────────────────────────────
  {
    id: 'ghs-flame',
    name: 'GHS Flammable',
    category: 'chemicals',
    viewBox: '0 0 100 100',
    svgPath: 'M50 2L2 88h96L50 2zm0 20c5 15 15 20 15 35 0 10-7 18-15 18s-15-8-15-18c0-15 10-20 15-35z',
    mandatory: false,
    description: 'GHS flammable hazard pictogram for products containing flammable substances.',
  },
  {
    id: 'ghs-skull',
    name: 'GHS Toxic',
    category: 'chemicals',
    viewBox: '0 0 100 100',
    svgPath: 'M50 2L2 88h96L50 2zm0 22c10 0 18 8 18 18v2c0 3-1 5-3 7l3 5h-8l-2-4h-16l-2 4h-8l3-5c-2-2-3-4-3-7v-2c0-10 8-18 18-18zm-7 12a4 4 0 100 8 4 4 0 000-8zm14 0a4 4 0 100 8 4 4 0 000-8zm-7 18v4h-6v4h6v-4h6v-4h-6z',
    mandatory: false,
    description: 'GHS acute toxicity pictogram for highly toxic substances.',
  },
  {
    id: 'ghs-exclamation',
    name: 'GHS Warning',
    category: 'chemicals',
    viewBox: '0 0 100 100',
    svgPath: 'M50 2L2 88h96L50 2zm-3 28h6v30h-6V30zm0 38h6v6h-6v-6z',
    mandatory: false,
    description: 'GHS exclamation mark for irritants and lower-level health hazards.',
  },
  {
    id: 'ghs-corrosion',
    name: 'GHS Corrosive',
    category: 'chemicals',
    viewBox: '0 0 100 100',
    svgPath: 'M50 2L2 88h96L50 2zm-10 30h6l-4 20c2-1 5-2 8-2s6 1 8 2l-4-20h6l2 10-8 18c-2 3-3 5-4 8h-4c-1-3-2-5-4-8L38 42l2-10z',
    mandatory: false,
    description: 'GHS corrosion pictogram for corrosive substances.',
  },

  // ─── Energy ─────────────────────────────────────────────
  {
    id: 'energy-arrow',
    name: 'EU Energy Label',
    category: 'energy',
    viewBox: '0 0 100 60',
    svgPath: 'M5 10h60l25 20-25 20H5V10zm10 8v24h42l15-12-15-12H15z',
    mandatory: false,
    description: 'EU energy label arrow used in energy efficiency classification.',
  },

  // ─── Safety ─────────────────────────────────────────────
  {
    id: 'food-safe',
    name: 'Food Contact',
    category: 'safety',
    viewBox: '0 0 100 100',
    svgPath: 'M25 10v60c0 11 11 20 25 20s25-9 25-20V10h-6v60c0 8-8.5 14-19 14S31 78 31 70V10h-6zm12 0v45c0 8 5.5 14 13 14s13-6 13-14V10h-4v45c0 5.5-3.6 10-9 10s-9-4.5-9-10V10h-4z',
    mandatory: false,
    description: 'Food contact material (glass + fork) symbol per Regulation (EC) 1935/2004.',
  },
];

/**
 * Lookup a built-in pictogram by ID.
 */
export function getBuiltinPictogram(id: string): BuiltinPictogram | undefined {
  return BUILTIN_PICTOGRAMS.find(p => p.id === id);
}

/**
 * Get built-in pictograms filtered by category.
 */
export function getBuiltinPictogramsByCategory(category: string): BuiltinPictogram[] {
  return BUILTIN_PICTOGRAMS.filter(p => p.category === category);
}

/**
 * All unique categories from built-in pictograms.
 */
export const BUILTIN_PICTOGRAM_CATEGORIES = [
  ...new Set(BUILTIN_PICTOGRAMS.map(p => p.category)),
] as const;
