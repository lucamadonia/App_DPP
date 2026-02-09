/**
 * Hook that loads a real product for the DPP design preview.
 * Falls back to comprehensive mock data so all sections are populated.
 */
import { useState, useEffect } from 'react';
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { Product } from '@/types/product';

const MOCK_PREVIEW_PRODUCT: Product = {
  id: 'preview-mock',
  tenantId: '',
  gtin: '4012345678901',
  serialNumber: 'SN-2025-001234',
  name: 'Premium Wireless Headphones',
  manufacturer: 'AudioTech GmbH',
  description: 'High-quality wireless headphones with active noise cancellation and premium sound.',
  category: 'Electronics',
  productType: 'single',
  imageUrl: '',
  batchNumber: 'BATCH-2025-Q1',
  hsCode: '8518.30.00',
  countryOfOrigin: 'Germany',
  netWeight: 250,
  grossWeight: 450,
  productionDate: '2025-01-15',
  manufacturerAddress: 'Musterstraße 42, 80331 München, Germany',
  manufacturerEORI: 'DE123456789012',
  manufacturerVAT: 'DE123456789',
  materials: [
    { name: 'Recycled Aluminum', percentage: 35, recyclable: true, origin: 'Germany' },
    { name: 'ABS Plastic', percentage: 30, recyclable: true, origin: 'China' },
    { name: 'Leather (PU)', percentage: 20, recyclable: false, origin: 'Italy' },
    { name: 'Copper Wiring', percentage: 15, recyclable: true, origin: 'Chile' },
  ],
  certifications: [
    { name: 'CE Marking', issuedBy: 'TÜV Rheinland', validUntil: '2027-12-31' },
    { name: 'RoHS Compliant', issuedBy: 'SGS', validUntil: '2026-06-30' },
    { name: 'ISO 14001', issuedBy: 'Bureau Veritas', validUntil: '2026-09-15' },
  ],
  carbonFootprint: {
    totalKgCO2: 12.5,
    productionKgCO2: 8.3,
    transportKgCO2: 4.2,
    rating: 'B',
  },
  recyclability: {
    recyclablePercentage: 78,
    instructions: 'Separate electronic components from plastic housing before recycling. Battery must be removed and disposed of at a certified collection point.',
    disposalMethods: ['Electronics Recycling', 'Battery Collection', 'Plastic Recycling'],
  },
  supplyChain: [
    { step: 1, description: 'Raw Material Sourcing', location: 'Munich', country: 'Germany', date: '2024-10-01', processType: 'raw_material_sourcing' },
    { step: 2, description: 'Component Manufacturing', location: 'Shenzhen', country: 'China', date: '2024-11-15', processType: 'manufacturing', emissionsKg: 3.2 },
    { step: 3, description: 'Assembly & Quality Control', location: 'Munich', country: 'Germany', date: '2024-12-20', processType: 'assembly', emissionsKg: 1.8 },
    { step: 4, description: 'Packaging & Labeling', location: 'Munich', country: 'Germany', date: '2025-01-05', processType: 'packaging', emissionsKg: 0.5 },
    { step: 5, description: 'Distribution Center', location: 'Hamburg', country: 'Germany', date: '2025-01-10', processType: 'distribution', transportMode: 'road', emissionsKg: 2.1 },
  ],
  supportResources: {
    instructions: 'Power on by pressing the main button for 3 seconds. Pair via Bluetooth settings on your device.',
    videos: [
      { title: 'Getting Started Guide', url: 'https://example.com/guide', type: 'youtube' },
    ],
    faq: [
      { question: 'How long does the battery last?', answer: 'Up to 30 hours of continuous playback with ANC enabled.' },
      { question: 'Is the product water-resistant?', answer: 'IPX4 rated — resistant to splashes and sweat.' },
    ],
    warranty: {
      durationMonths: 24,
      terms: 'Full manufacturer warranty covering manufacturing defects.',
      contactEmail: 'support@audiotech.de',
      contactPhone: '+49 89 123456',
    },
    repairInfo: {
      repairGuide: 'Visit our service portal for repair options.',
      repairabilityScore: 7,
      serviceCenters: ['Munich Service Center', 'Berlin Service Center'],
    },
    spareParts: [
      { name: 'Ear Cushions (Pair)', partNumber: 'SP-EC-001', price: 19.99, currency: '€', available: true },
      { name: 'Headband Padding', partNumber: 'SP-HB-002', price: 14.99, currency: '€', available: true },
    ],
  },
  documents: [],
  registrations: {},
  createdAt: '2025-01-15',
  updatedAt: '2025-01-15',
};

export function usePreviewProduct(): { product: Product; loading: boolean } {
  const [product, setProduct] = useState<Product>(MOCK_PREVIEW_PRODUCT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const tenantId = await getCurrentTenantId();
        if (!tenantId || cancelled) { setLoading(false); return; }

        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data && !cancelled) {
          // Transform to Product — use basic fields, keep mock for missing data
          setProduct(prev => ({
            ...prev,
            id: data.id,
            name: data.name || prev.name,
            manufacturer: data.manufacturer || prev.manufacturer,
            description: data.description || prev.description,
            category: data.category || prev.category,
            gtin: data.gtin || prev.gtin,
            serialNumber: data.serial_number || prev.serialNumber,
            imageUrl: data.image_url || prev.imageUrl,
            batchNumber: data.batch_number || prev.batchNumber,
            hsCode: data.hs_code || prev.hsCode,
            countryOfOrigin: data.country_of_origin || prev.countryOfOrigin,
            materials: Array.isArray(data.materials) && data.materials.length > 0 ? data.materials : prev.materials,
            certifications: Array.isArray(data.certifications) && data.certifications.length > 0 ? data.certifications : prev.certifications,
            carbonFootprint: data.carbon_footprint || prev.carbonFootprint,
          }));
        }
      } catch {
        // Keep mock data on error
      }
      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { product, loading };
}
