import type { Requirement } from '@/data/requirements-database';

export type BatteryType = 'integrated' | 'removable' | 'external';
export type Voltage = 'low' | 'high' | 'none';
export type TargetAudience = 'b2c' | 'b2b' | 'both';

export interface CalculatorConfig {
  productName: string;
  selectedCategory: string;
  selectedSubcategory: string;
  selectedCountries: string[];
  hasElectronics: boolean;
  hasBattery: boolean;
  batteryType: BatteryType;
  hasWireless: boolean;
  selectedWirelessTypes: string[];
  voltage: Voltage;
  hasPackaging: boolean;
  selectedPackagingMaterials: string[];
  containsChemicals: boolean;
  targetAudience: TargetAudience;
  isConnected: boolean;
}

export const DEFAULT_CALCULATOR_CONFIG: CalculatorConfig = {
  productName: '',
  selectedCategory: '',
  selectedSubcategory: '',
  selectedCountries: [],
  hasElectronics: false,
  hasBattery: false,
  batteryType: 'removable',
  hasWireless: false,
  selectedWirelessTypes: [],
  voltage: 'none',
  hasPackaging: true,
  selectedPackagingMaterials: [],
  containsChemicals: false,
  targetAudience: 'b2c',
  isConnected: false,
};

export function toggleInList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/**
 * Applicable requirements for a configuration. Logic unchanged from the
 * original page — only moved here so it can be read and tested in isolation.
 */
export function calculateRequirements(db: Requirement[], c: CalculatorConfig): Requirement[] {
  const find = (id: string) => db.find((r) => r.id === id)!;
  const requirements: Requirement[] = [];
  const { selectedCategory, selectedCountries } = c;

  // Base: CE marking for all products with electronics
  if (c.hasElectronics || selectedCategory === 'electronics' || selectedCategory === 'lighting' || selectedCategory === 'toys') {
    requirements.push(find('ce-marking'));
    // LVD if mains voltage
    if (c.voltage === 'high') requirements.push(find('lvd'));
    // EMC + RoHS for all electronics
    requirements.push(find('emv'));
    requirements.push(find('rohs'));
  }

  // RED for wireless products
  if (c.hasWireless) requirements.push(find('red'));

  // WEEE depending on country
  if (c.hasElectronics || selectedCategory === 'electronics' || selectedCategory === 'lighting') {
    if (selectedCountries.includes('DE')) requirements.push(find('weee-de'));
    if (selectedCountries.includes('FR')) {
      requirements.push(find('weee-fr'));
      requirements.push(find('repairability-fr'));
      requirements.push(find('spare-parts-fr'));
    }
  }

  // Batteries
  if (c.hasBattery) {
    if (selectedCountries.includes('DE')) requirements.push(find('battery-de'));
    requirements.push(find('battery-dpp'));
  }

  // Packaging
  if (c.hasPackaging && c.targetAudience !== 'b2b') {
    if (selectedCountries.includes('DE')) requirements.push(find('packaging-de'));
    if (selectedCountries.includes('FR')) requirements.push(find('packaging-fr'));
  }

  // REACH SVHC for all products
  requirements.push(find('reach-svhc'));

  // Textiles
  if (selectedCategory === 'textiles') {
    requirements.push(find('textile-label'));
    requirements.push(find('textile-azodyes'));
  }

  // Energy label for specific product groups
  if (['Household Appliance', 'TV/Monitor', 'LED Bulb', 'Luminaire'].includes(c.selectedSubcategory)) {
    requirements.push(find('energy-label'));
  }

  // Filter undefined and duplicates
  return requirements.filter((r, index, self) => r && self.findIndex((req) => req?.id === r.id) === index);
}
