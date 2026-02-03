/**
 * Master Label PDF Generator (A6 format)
 *
 * Uses @react-pdf/renderer for client-side PDF generation.
 * Dynamically imported to avoid loading the heavy library upfront.
 *
 * Page size: A6 = 105 x 148 mm = 297.64 x 419.53 pt
 * Min font size: 3.4pt (= 1.2mm per EU regulation)
 */

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';
import type { MasterLabelData, ComplianceModuleIcon } from '@/types/master-label';

// ---------------------------------------------------------------------------
// A6 dimensions in points
// ---------------------------------------------------------------------------

const A6_WIDTH = 297.64;
const A6_HEIGHT = 419.53;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  page: {
    width: A6_WIDTH,
    height: A6_HEIGHT,
    padding: 14,
    fontFamily: 'Helvetica',
    fontSize: 6.5,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
  },

  // Section containers
  section: {
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#d1d5db',
  },
  sectionLast: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  sectionTitle: {
    fontSize: 5,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  // Section 1: Identity
  identityRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  identityLabel: {
    width: 70,
    fontSize: 5.5,
    color: '#6b7280',
  },
  identityValue: {
    flex: 1,
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
  },
  identityValueNormal: {
    flex: 1,
    fontSize: 5.5,
  },
  productName: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },

  // Section 2: DPP QR
  qrContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qrImage: {
    width: 52,
    height: 52,
  },
  qrTextContainer: {
    flex: 1,
  },
  qrLabel: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  qrUrl: {
    fontSize: 4.5,
    color: '#6b7280',
    wordBreak: 'break-all' as const,
  },

  // Section 3: Compliance
  complianceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  complianceBox: {
    borderWidth: 0.75,
    borderColor: '#1a1a1a',
    borderRadius: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  complianceBoxMissing: {
    borderWidth: 0.75,
    borderColor: '#d1d5db',
    borderRadius: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  complianceSymbol: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
  },
  complianceSymbolMissing: {
    fontSize: 6.5,
    fontFamily: 'Helvetica',
    color: '#d1d5db',
  },

  // Section 4: Sustainability
  materialCodes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    marginBottom: 3,
  },
  materialCode: {
    borderWidth: 0.5,
    borderColor: '#9ca3af',
    borderRadius: 1,
    paddingHorizontal: 3,
    paddingVertical: 1,
    fontSize: 5.5,
  },
  recyclingText: {
    fontSize: 5,
    color: '#374151',
    lineHeight: 1.4,
  },

  // B2B extras
  b2bRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: '#e5e7eb',
  },
  b2bItem: {
    fontSize: 5.5,
  },
  b2bLabel: {
    color: '#6b7280',
  },
  b2bValue: {
    fontFamily: 'Helvetica-Bold',
  },

  // B2C disposal hint
  b2cHint: {
    marginTop: 4,
    padding: 4,
    backgroundColor: '#f0fdf4',
    borderRadius: 2,
    fontSize: 5,
    color: '#166534',
    lineHeight: 1.4,
  },
});

// ---------------------------------------------------------------------------
// Compliance Icon Component
// ---------------------------------------------------------------------------

function ComplianceIcon({ icon }: { icon: ComplianceModuleIcon }) {
  if (!icon.present && !icon.mandatory) return null;

  const boxStyle = icon.present ? s.complianceBox : s.complianceBoxMissing;
  const textStyle = icon.present ? s.complianceSymbol : s.complianceSymbolMissing;

  return (
    <View style={boxStyle}>
      <Text style={textStyle}>{icon.symbol}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// PDF Document
// ---------------------------------------------------------------------------

function MasterLabelDocument({ data }: { data: MasterLabelData }) {
  const hasB2bExtras = data.variant === 'b2b' && (data.b2bQuantity != null || data.b2bGrossWeight != null);
  const visibleCompliance = data.compliance.filter(c => c.present || c.mandatory);

  return (
    <Document>
      <Page size={[A6_WIDTH, A6_HEIGHT]} style={s.page}>
        {/* Section 1: Identity & Traceability */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Identity & Traceability</Text>
          <Text style={s.productName}>{data.identity.productName}</Text>

          <View style={s.identityRow}>
            <Text style={s.identityLabel}>Model/SKU</Text>
            <Text style={s.identityValue}>{data.identity.modelSku}</Text>
          </View>

          {data.identity.batchNumber ? (
            <View style={s.identityRow}>
              <Text style={s.identityLabel}>Batch</Text>
              <Text style={s.identityValue}>{data.identity.batchNumber}</Text>
            </View>
          ) : null}

          <View style={s.identityRow}>
            <Text style={s.identityLabel}>Manufacturer</Text>
            <Text style={s.identityValueNormal}>
              {data.identity.manufacturer.name}
              {data.identity.manufacturer.address ? `\n${data.identity.manufacturer.address}` : ''}
            </Text>
          </View>

          {data.identity.importer && (
            <View style={s.identityRow}>
              <Text style={s.identityLabel}>EU Importer</Text>
              <Text style={s.identityValueNormal}>
                {data.identity.importer.name}
                {data.identity.importer.address ? `\n${data.identity.importer.address}` : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Section 2: DPP QR Code */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Digital Product Passport</Text>
          <View style={s.qrContainer}>
            {data.dppQr.qrDataUrl && (
              <Image src={data.dppQr.qrDataUrl} style={s.qrImage} />
            )}
            <View style={s.qrTextContainer}>
              <Text style={s.qrLabel}>{data.dppQr.labelText}</Text>
              <Text style={s.qrUrl}>{data.dppQr.dppUrl}</Text>
            </View>
          </View>
        </View>

        {/* Section 3: Compliance Modules */}
        {visibleCompliance.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Compliance</Text>
            <View style={s.complianceRow}>
              {visibleCompliance.map((icon) => (
                <ComplianceIcon key={icon.id} icon={icon} />
              ))}
            </View>
          </View>
        )}

        {/* Section 4: Sustainability & Disposal */}
        <View style={[s.section, s.sectionLast]}>
          <Text style={s.sectionTitle}>Sustainability & Disposal</Text>

          {data.sustainability.packagingMaterialCodes.length > 0 && (
            <View style={s.materialCodes}>
              {data.sustainability.packagingMaterialCodes.map((code, i) => (
                <View key={i} style={s.materialCode}>
                  <Text>{code}</Text>
                </View>
              ))}
            </View>
          )}

          {data.sustainability.recyclingInstructions ? (
            <Text style={s.recyclingText}>{data.sustainability.recyclingInstructions}</Text>
          ) : null}

          {data.sustainability.volumeOptimized && (
            <Text style={[s.recyclingText, { marginTop: 2 }]}>Package optimized for volume.</Text>
          )}

          {/* B2B extras */}
          {hasB2bExtras && (
            <View style={s.b2bRow}>
              {data.b2bQuantity != null && (
                <Text style={s.b2bItem}>
                  <Text style={s.b2bLabel}>Quantity: </Text>
                  <Text style={s.b2bValue}>{data.b2bQuantity} Units</Text>
                </Text>
              )}
              {data.b2bGrossWeight != null && (
                <Text style={s.b2bItem}>
                  <Text style={s.b2bLabel}>Gross Weight: </Text>
                  <Text style={s.b2bValue}>{(data.b2bGrossWeight / 1000).toFixed(2)} kg</Text>
                </Text>
              )}
            </View>
          )}

          {/* B2C disposal hint */}
          {data.variant === 'b2c' && data.b2cDisposalHint && (
            <Text style={s.b2cHint}>{data.b2cDisposalHint}</Text>
          )}
        </View>
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Export function — called via dynamic import
// ---------------------------------------------------------------------------

export async function generateMasterLabelPDF(
  data: MasterLabelData,
  filename?: string,
): Promise<void> {
  const blob = await pdf(<MasterLabelDocument data={data} />).toBlob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `master-label-${data.identity.modelSku}-${data.identity.batchNumber || 'product'}-${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
