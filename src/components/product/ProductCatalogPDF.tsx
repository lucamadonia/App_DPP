import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';
import type { Product, ProductBatch } from '@/types/product';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1a1a1a',
  },
  coverPage: {
    padding: 40,
    fontFamily: 'Helvetica',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverTitle: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 12,
    color: '#1e40af',
  },
  coverSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
  },
  coverDate: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1e40af',
  },
  headerRight: {
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    marginTop: 14,
    color: '#1e40af',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 4,
  },
  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  thNum: { width: 24, fontSize: 8, fontFamily: 'Helvetica-Bold' },
  thName: { width: 140, fontSize: 8, fontFamily: 'Helvetica-Bold' },
  thGtin: { width: 90, fontSize: 8, fontFamily: 'Helvetica-Bold' },
  thCat: { width: 80, fontSize: 8, fontFamily: 'Helvetica-Bold' },
  thStatus: { width: 50, fontSize: 8, fontFamily: 'Helvetica-Bold' },
  thHs: { width: 65, fontSize: 8, fontFamily: 'Helvetica-Bold' },
  thWeight: { width: 55, fontSize: 8, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  tdNum: { width: 24, fontSize: 8 },
  tdName: { width: 140, fontSize: 8 },
  tdGtin: { width: 90, fontSize: 8, fontFamily: 'Courier' },
  tdCat: { width: 80, fontSize: 8 },
  tdStatus: { width: 50, fontSize: 8 },
  tdHs: { width: 65, fontSize: 8, fontFamily: 'Courier' },
  tdWeight: { width: 55, fontSize: 8, textAlign: 'right' },
  // Batch sub-row
  batchRow: {
    flexDirection: 'row',
    paddingLeft: 28,
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  batchCell: { fontSize: 7, color: '#6b7280', width: 100 },
  // Catalog detail
  productTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  productMeta: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 2,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  detailLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    width: 120,
    color: '#374151',
  },
  detailValue: {
    fontSize: 9,
    flex: 1,
  },
  materialRow: {
    flexDirection: 'row',
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  materialName: { fontSize: 8, width: 150 },
  materialPct: { fontSize: 8, width: 50, textAlign: 'right' },
  materialRecyclable: { fontSize: 8, width: 60, textAlign: 'center' },
  certItem: {
    fontSize: 8,
    marginBottom: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#9ca3af',
  },
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginVertical: 12,
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const today = () => new Date().toISOString().slice(0, 10);

function weightStr(g?: number): string {
  if (g == null) return '-';
  return g >= 1000 ? `${(g / 1000).toFixed(2)} kg` : `${g} g`;
}

// ---------------------------------------------------------------------------
// PDF 1: Overview (compact table)
// ---------------------------------------------------------------------------

function OverviewDocument({
  products,
  tenantName,
  includeBatches,
}: {
  products: Array<Product & { batches?: ProductBatch[] }>;
  tenantName: string;
  includeBatches: boolean;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{tenantName} — Product Overview</Text>
          <View>
            <Text style={styles.headerRight}>{today()}</Text>
            <Text style={styles.headerRight}>{products.length} products</Text>
          </View>
        </View>

        {/* Table header */}
        <View style={styles.tableHeader}>
          <Text style={styles.thNum}>#</Text>
          <Text style={styles.thName}>Name</Text>
          <Text style={styles.thGtin}>GTIN</Text>
          <Text style={styles.thCat}>Category</Text>
          <Text style={styles.thStatus}>Status</Text>
          <Text style={styles.thHs}>HS Code</Text>
          <Text style={styles.thWeight}>Weight</Text>
        </View>

        {products.map((p, i) => (
          <View key={p.id} wrap={false}>
            <View style={styles.tableRow}>
              <Text style={styles.tdNum}>{i + 1}</Text>
              <Text style={styles.tdName}>{p.name}</Text>
              <Text style={styles.tdGtin}>{p.gtin || '-'}</Text>
              <Text style={styles.tdCat}>{p.category || '-'}</Text>
              <Text style={styles.tdStatus}>draft</Text>
              <Text style={styles.tdHs}>{p.hsCode || '-'}</Text>
              <Text style={styles.tdWeight}>{weightStr(p.netWeight)}</Text>
            </View>
            {includeBatches &&
              p.batches?.map((b) => (
                <View key={b.id} style={styles.batchRow}>
                  <Text style={styles.batchCell}>
                    Batch: {b.batchNumber || '-'}
                  </Text>
                  <Text style={styles.batchCell}>
                    Serial: {b.serialNumber || '-'}
                  </Text>
                  <Text style={styles.batchCell}>
                    {b.productionDate?.slice(0, 10) || '-'}
                  </Text>
                  <Text style={styles.batchCell}>{b.status}</Text>
                </View>
              ))}
          </View>
        ))}

        <View style={styles.footer}>
          <Text>{tenantName}</Text>
          <Text>{today()}</Text>
        </View>
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// PDF 2: Catalog (detail pages)
// ---------------------------------------------------------------------------

function CatalogDocument({
  products,
  tenantName,
  includeBatches,
}: {
  products: Array<Product & { batches?: ProductBatch[] }>;
  tenantName: string;
  includeBatches: boolean;
}) {
  return (
    <Document>
      {/* Cover */}
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverTitle}>Product Catalog</Text>
        <Text style={styles.coverSubtitle}>{tenantName}</Text>
        <Text style={styles.coverSubtitle}>{products.length} products</Text>
        <Text style={styles.coverDate}>{today()}</Text>
      </Page>

      {/* Detail pages */}
      {products.map((p, idx) => (
        <Page key={p.id} size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {idx + 1}/{products.length}
            </Text>
            <Text style={styles.headerRight}>{tenantName}</Text>
          </View>

          <Text style={styles.productTitle}>{p.name}</Text>
          <Text style={styles.productMeta}>
            {p.manufacturer} {p.category ? `· ${p.category}` : ''}
          </Text>
          {p.gtin ? (
            <Text style={styles.productMeta}>GTIN: {p.gtin}</Text>
          ) : null}

          {p.description ? (
            <>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={{ fontSize: 9, lineHeight: 1.4 }}>{p.description}</Text>
            </>
          ) : null}

          {/* Key data */}
          <Text style={styles.sectionTitle}>Product Data</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>HS Code</Text>
            <Text style={styles.detailValue}>{p.hsCode || '-'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Country of Origin</Text>
            <Text style={styles.detailValue}>{p.countryOfOrigin || '-'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Net Weight</Text>
            <Text style={styles.detailValue}>{weightStr(p.netWeight)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Gross Weight</Text>
            <Text style={styles.detailValue}>{weightStr(p.grossWeight)}</Text>
          </View>
          {p.carbonFootprint && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Carbon Footprint</Text>
              <Text style={styles.detailValue}>
                {p.carbonFootprint.totalKgCO2} kg CO2 (Rating: {p.carbonFootprint.rating})
              </Text>
            </View>
          )}
          {p.recyclability?.recyclablePercentage != null && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Recyclability</Text>
              <Text style={styles.detailValue}>{p.recyclability.recyclablePercentage}%</Text>
            </View>
          )}

          {/* Materials */}
          {p.materials && p.materials.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Materials</Text>
              <View style={[styles.materialRow, { backgroundColor: '#f3f4f6' }]}>
                <Text style={[styles.materialName, { fontFamily: 'Helvetica-Bold' }]}>Material</Text>
                <Text style={[styles.materialPct, { fontFamily: 'Helvetica-Bold' }]}>Share</Text>
                <Text style={[styles.materialRecyclable, { fontFamily: 'Helvetica-Bold' }]}>Recyclable</Text>
              </View>
              {p.materials.map((m, mi) => (
                <View key={mi} style={styles.materialRow}>
                  <Text style={styles.materialName}>{m.name}</Text>
                  <Text style={styles.materialPct}>{m.percentage}%</Text>
                  <Text style={styles.materialRecyclable}>{m.recyclable ? 'Yes' : 'No'}</Text>
                </View>
              ))}
            </>
          )}

          {/* Certifications */}
          {p.certifications && p.certifications.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Certifications</Text>
              {p.certifications.map((c, ci) => (
                <Text key={ci} style={styles.certItem}>
                  {c.name} — issued by {c.issuedBy}
                  {c.validUntil ? ` (valid until ${c.validUntil})` : ''}
                </Text>
              ))}
            </>
          )}

          {/* Batches */}
          {includeBatches && p.batches && p.batches.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Batches ({p.batches.length})</Text>
              <View style={[styles.tableHeader, { marginBottom: 0 }]}>
                <Text style={[styles.batchCell, { fontFamily: 'Helvetica-Bold', color: '#1a1a1a' }]}>Batch #</Text>
                <Text style={[styles.batchCell, { fontFamily: 'Helvetica-Bold', color: '#1a1a1a' }]}>Serial</Text>
                <Text style={[styles.batchCell, { fontFamily: 'Helvetica-Bold', color: '#1a1a1a' }]}>Date</Text>
                <Text style={[styles.batchCell, { fontFamily: 'Helvetica-Bold', color: '#1a1a1a' }]}>Status</Text>
              </View>
              {p.batches.map((b) => (
                <View key={b.id} style={styles.batchRow}>
                  <Text style={styles.batchCell}>{b.batchNumber || '-'}</Text>
                  <Text style={styles.batchCell}>{b.serialNumber || '-'}</Text>
                  <Text style={styles.batchCell}>{b.productionDate?.slice(0, 10) || '-'}</Text>
                  <Text style={styles.batchCell}>{b.status}</Text>
                </View>
              ))}
            </>
          )}

          <View style={styles.footer}>
            <Text>{p.name}</Text>
            <Text>{today()}</Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Export functions (called from components)
// ---------------------------------------------------------------------------

export async function generateProductOverviewPDF(
  products: Array<Product & { batches?: ProductBatch[] }>,
  tenantName: string,
  includeBatches: boolean,
): Promise<void> {
  const blob = await pdf(
    <OverviewDocument
      products={products}
      tenantName={tenantName}
      includeBatches={includeBatches}
    />,
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `product-overview-${today()}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function generateProductCatalogPDF(
  products: Array<Product & { batches?: ProductBatch[] }>,
  tenantName: string,
  includeBatches: boolean,
): Promise<void> {
  const blob = await pdf(
    <CatalogDocument
      products={products}
      tenantName={tenantName}
      includeBatches={includeBatches}
    />,
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `product-catalog-${today()}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
