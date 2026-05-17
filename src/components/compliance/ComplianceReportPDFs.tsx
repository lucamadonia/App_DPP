/**
 * PDF templates for the German EAR + LUCID monthly reports.
 *
 * Both produce a Stiftung-EAR / ZSVR-compatible audit document with:
 *   - Cover page (tenant, brand, registration number, month, generated-at)
 *   - Aggregation table (6×2 categories for EAR, 8 materials for LUCID)
 *   - Signature block
 *
 * Uses @react-pdf/renderer (already in package.json). Functions are
 * dynamically importable so the heavy lib only loads on demand.
 */

import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import type {
  ComplianceMonthlyReport,
  EarSnapshot,
  LucidSnapshot,
  EarCategory,
} from '@/types/compliance';
import { EAR_CATEGORY_NAMES_DE, LUCID_MATERIAL_NAMES_DE, LUCID_MATERIAL_ORDER } from '@/types/compliance';

const MONTH_NAMES = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

function fmtMonth(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtKg(g: number): string {
  return (g / 1000).toFixed(3).replace('.', ',');
}

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a' },
  cover: { padding: 40, fontFamily: 'Helvetica', justifyContent: 'flex-start' },
  headerStripe: { backgroundColor: '#1e40af', color: '#fff', padding: 12, marginBottom: 18 },
  brandSmall: { fontSize: 9, color: '#cbd5e1', marginBottom: 2 },
  reportTitle: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#fff' },
  monthSub: { fontSize: 12, color: '#dbeafe', marginTop: 4 },
  metaTable: { marginTop: 8, marginBottom: 20, border: '1pt solid #e5e7eb', borderRadius: 4 },
  metaRow: { flexDirection: 'row', borderBottom: '0.5pt solid #f3f4f6', padding: 6 },
  metaRowLast: { flexDirection: 'row', padding: 6 },
  metaKey: { width: '40%', fontFamily: 'Helvetica-Bold', color: '#374151' },
  metaVal: { width: '60%', color: '#111827' },
  sectionTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#1e40af', marginTop: 14, marginBottom: 6, paddingBottom: 4, borderBottom: '1pt solid #e5e7eb' },
  table: { border: '1pt solid #d1d5db', borderRadius: 2, marginBottom: 14 },
  th: { flexDirection: 'row', backgroundColor: '#f3f4f6', padding: 5, borderBottom: '1pt solid #d1d5db', fontFamily: 'Helvetica-Bold', fontSize: 9 },
  tr: { flexDirection: 'row', padding: 5, borderBottom: '0.5pt solid #f3f4f6', fontSize: 9 },
  trTotal: { flexDirection: 'row', padding: 5, backgroundColor: '#fef3c7', borderTop: '1pt solid #d97706', fontFamily: 'Helvetica-Bold', fontSize: 9 },
  cell: { flex: 1 },
  cellNum: { flex: 1, textAlign: 'right' },
  cellCat: { width: 32, fontFamily: 'Helvetica-Bold' },
  cellWide: { flex: 2 },
  small: { fontSize: 8, color: '#6b7280' },
  signatureBlock: { marginTop: 30, flexDirection: 'row', justifyContent: 'space-between' },
  signatureBox: { width: '45%' },
  signatureLine: { borderTop: '0.5pt solid #1a1a1a', marginTop: 28, paddingTop: 3, fontSize: 9, color: '#6b7280', textAlign: 'center' },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, fontSize: 8, color: '#9ca3af', textAlign: 'center', borderTop: '0.5pt solid #e5e7eb', paddingTop: 4 },
});

// ============================================
// EAR REPORT
// ============================================

function EarDocument({ report, tenantName }: { report: ComplianceMonthlyReport; tenantName?: string }) {
  const snap = report.summary as EarSnapshot;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerStripe}>
          <Text style={styles.brandSmall}>{tenantName || 'Trackbliss Compliance Report'}</Text>
          <Text style={styles.reportTitle}>EAR-Monatsmeldung · ElektroG</Text>
          <Text style={styles.monthSub}>Berichtsmonat: {fmtMonth(report.reportMonth)}</Text>
        </View>

        {/* Meta */}
        <View style={styles.metaTable}>
          <View style={styles.metaRow}><Text style={styles.metaKey}>WEEE-Reg.-Nummer</Text><Text style={styles.metaVal}>{snap.weeeNumber || '—'}</Text></View>
          <View style={styles.metaRow}><Text style={styles.metaKey}>Marke</Text><Text style={styles.metaVal}>{snap.brand || '—'}</Text></View>
          <View style={styles.metaRow}><Text style={styles.metaKey}>Anzahl Sendungen</Text><Text style={styles.metaVal}>{snap.shipmentCount}</Text></View>
          <View style={styles.metaRow}><Text style={styles.metaKey}>Geräte gesamt</Text><Text style={styles.metaVal}>{snap.totalUnits} Stück · {fmtKg(snap.totalWeightGrams)} kg</Text></View>
          <View style={styles.metaRow}><Text style={styles.metaKey}>Mit Batterie</Text><Text style={styles.metaVal}>{snap.totalUnitsWithBattery} Stück · {fmtKg(snap.totalBatteryWeightGrams)} kg</Text></View>
          <View style={styles.metaRow}><Text style={styles.metaKey}>Generiert</Text><Text style={styles.metaVal}>{new Date(report.generatedAt).toLocaleString('de-DE')}</Text></View>
          <View style={styles.metaRowLast}><Text style={styles.metaKey}>Status</Text><Text style={styles.metaVal}>{report.status}{report.externalReference ? ` · ${report.externalReference}` : ''}</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Aufschlüsselung nach Geräte-Kategorie</Text>
        <View style={styles.table}>
          <View style={styles.th}>
            <Text style={styles.cellCat}>Kat.</Text>
            <Text style={styles.cellWide}>Bezeichnung</Text>
            <Text style={[styles.cell, { textAlign: 'center' }]}>Markt</Text>
            <Text style={styles.cellNum}>Stück</Text>
            <Text style={styles.cellNum}>Gewicht (kg)</Text>
            <Text style={styles.cellNum}>davon m. Akku</Text>
            <Text style={styles.cellNum}>Akku-Gewicht (kg)</Text>
          </View>
          {([1, 2, 3, 4, 5, 6] as EarCategory[]).flatMap((cat) => {
            const rows = snap.rows.filter((r) => r.category === cat);
            if (rows.length === 0) {
              return [(
                <View key={`empty-${cat}`} style={styles.tr}>
                  <Text style={styles.cellCat}>{cat}</Text>
                  <Text style={styles.cellWide}>{EAR_CATEGORY_NAMES_DE[cat]}</Text>
                  <Text style={[styles.cell, { textAlign: 'center', color: '#9ca3af' }]}>—</Text>
                  <Text style={[styles.cellNum, { color: '#9ca3af' }]}>0</Text>
                  <Text style={[styles.cellNum, { color: '#9ca3af' }]}>0,000</Text>
                  <Text style={[styles.cellNum, { color: '#9ca3af' }]}>0</Text>
                  <Text style={[styles.cellNum, { color: '#9ca3af' }]}>0,000</Text>
                </View>
              )];
            }
            return rows.map((row, idx) => (
              <View key={`${cat}-${row.b2b}`} style={styles.tr}>
                <Text style={styles.cellCat}>{idx === 0 ? cat : ''}</Text>
                <Text style={styles.cellWide}>{idx === 0 ? EAR_CATEGORY_NAMES_DE[cat] : ''}</Text>
                <Text style={[styles.cell, { textAlign: 'center' }]}>{row.b2b ? 'B2B' : 'B2C'}</Text>
                <Text style={styles.cellNum}>{row.unitCount}</Text>
                <Text style={styles.cellNum}>{fmtKg(row.totalWeightGrams)}</Text>
                <Text style={styles.cellNum}>{row.unitsWithBattery}</Text>
                <Text style={styles.cellNum}>{fmtKg(row.batteryWeightGrams)}</Text>
              </View>
            ));
          })}
          <View style={styles.trTotal}>
            <Text style={styles.cellCat}>Σ</Text>
            <Text style={styles.cellWide}>Gesamt</Text>
            <Text style={[styles.cell, { textAlign: 'center' }]}>—</Text>
            <Text style={styles.cellNum}>{snap.totalUnits}</Text>
            <Text style={styles.cellNum}>{fmtKg(snap.totalWeightGrams)}</Text>
            <Text style={styles.cellNum}>{snap.totalUnitsWithBattery}</Text>
            <Text style={styles.cellNum}>{fmtKg(snap.totalBatteryWeightGrams)}</Text>
          </View>
        </View>

        {/* Signature */}
        <View style={styles.signatureBlock}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}>Ort, Datum</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}>Unterschrift Bevollmächtigte/r</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Audit-ID {report.id} · Wahrheitsgemäß erfasst nach § 27 ElektroG · Aufbewahrung 10 Jahre (HGB § 257)
        </Text>
      </Page>
    </Document>
  );
}

export async function generateEarPDF(report: ComplianceMonthlyReport, tenantName?: string): Promise<void> {
  const blob = await pdf(<EarDocument report={report} tenantName={tenantName} />).toBlob();
  triggerDownload(blob, `EAR-Meldung-${report.reportMonth.slice(0, 7)}.pdf`);
}

// ============================================
// LUCID REPORT
// ============================================

function LucidDocument({ report, tenantName }: { report: ComplianceMonthlyReport; tenantName?: string }) {
  const snap = report.summary as LucidSnapshot;
  const role = snap.distributorRole === 'manufacturer' ? 'Hersteller'
    : snap.distributorRole === 'distributor' ? 'Vertreiber' : 'Importeur';
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={[styles.headerStripe, { backgroundColor: '#047857' }]}>
          <Text style={styles.brandSmall}>{tenantName || 'Trackbliss Compliance Report'}</Text>
          <Text style={styles.reportTitle}>LUCID-Monatsmeldung · VerpackG</Text>
          <Text style={styles.monthSub}>Berichtsmonat: {fmtMonth(report.reportMonth)}</Text>
        </View>

        <View style={styles.metaTable}>
          <View style={styles.metaRow}><Text style={styles.metaKey}>LUCID-Nummer</Text><Text style={styles.metaVal}>{snap.lucidNumber || '—'}</Text></View>
          <View style={styles.metaRow}><Text style={styles.metaKey}>Rolle</Text><Text style={styles.metaVal}>{role}</Text></View>
          {snap.dualSystem && (
            <View style={styles.metaRow}><Text style={styles.metaKey}>Duales System</Text><Text style={styles.metaVal}>{snap.dualSystem}</Text></View>
          )}
          <View style={styles.metaRow}><Text style={styles.metaKey}>Anzahl Sendungen</Text><Text style={styles.metaVal}>{snap.shipmentCount}</Text></View>
          <View style={styles.metaRow}><Text style={styles.metaKey}>Gewicht gesamt</Text><Text style={styles.metaVal}>{fmtKg(snap.totalWeightGrams)} kg</Text></View>
          <View style={styles.metaRow}><Text style={styles.metaKey}>Generiert</Text><Text style={styles.metaVal}>{new Date(report.generatedAt).toLocaleString('de-DE')}</Text></View>
          <View style={styles.metaRowLast}><Text style={styles.metaKey}>Status</Text><Text style={styles.metaVal}>{report.status}{report.externalReference ? ` · ${report.externalReference}` : ''}</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Aufschlüsselung nach Materialklasse</Text>
        <View style={styles.table}>
          <View style={styles.th}>
            <Text style={[styles.cellWide, { flex: 3 }]}>Material</Text>
            <Text style={styles.cellNum}>Gewicht (kg)</Text>
            <Text style={styles.cellNum}>Sendungen</Text>
          </View>
          {LUCID_MATERIAL_ORDER.map((m) => {
            const row = snap.rows.find((r) => r.material === m);
            const weight = row?.totalWeightGrams ?? 0;
            const ships = row?.contributingShipmentCount ?? 0;
            return (
              <View key={m} style={styles.tr}>
                <Text style={[styles.cellWide, { flex: 3 }]}>{LUCID_MATERIAL_NAMES_DE[m]}</Text>
                <Text style={[styles.cellNum, weight === 0 ? { color: '#9ca3af' } : {}]}>{fmtKg(weight)}</Text>
                <Text style={[styles.cellNum, ships === 0 ? { color: '#9ca3af' } : {}]}>{ships}</Text>
              </View>
            );
          })}
          <View style={[styles.trTotal, { backgroundColor: '#d1fae5', borderTopColor: '#047857' }]}>
            <Text style={[styles.cellWide, { flex: 3 }]}>Σ Gesamt</Text>
            <Text style={styles.cellNum}>{fmtKg(snap.totalWeightGrams)}</Text>
            <Text style={styles.cellNum}>{snap.shipmentCount}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Beitrag pro Verpackungs-Typ</Text>
        <View style={styles.table}>
          <View style={styles.th}>
            <Text style={[styles.cellWide, { flex: 2 }]}>Material</Text>
            <Text style={[styles.cellWide, { flex: 3 }]}>Verpackung</Text>
            <Text style={styles.cellNum}>Stück</Text>
            <Text style={styles.cellNum}>g / Stück</Text>
            <Text style={styles.cellNum}>kg gesamt</Text>
          </View>
          {snap.rows.flatMap((r) => r.perPackaging.map((p, i) => (
            <View key={`${r.material}-${p.packagingId}`} style={styles.tr}>
              <Text style={[styles.cellWide, { flex: 2 }]}>{i === 0 ? LUCID_MATERIAL_NAMES_DE[r.material] : ''}</Text>
              <Text style={[styles.cellWide, { flex: 3 }]}>{p.packagingName}</Text>
              <Text style={styles.cellNum}>{p.consumedCount}</Text>
              <Text style={styles.cellNum}>{p.weightPerUnit}</Text>
              <Text style={styles.cellNum}>{fmtKg(p.weightContributionGrams)}</Text>
            </View>
          )))}
          {snap.rows.every(r => r.perPackaging.length === 0) && (
            <View style={styles.tr}>
              <Text style={[styles.cellWide, { flex: 5, textAlign: 'center', color: '#9ca3af' }]}>
                Keine Verpackungs-Verbräuche in diesem Monat erfasst.
              </Text>
              <Text style={styles.cellNum}>—</Text>
              <Text style={styles.cellNum}>—</Text>
              <Text style={styles.cellNum}>—</Text>
            </View>
          )}
        </View>

        <View style={styles.signatureBlock}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}>Ort, Datum</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}>Unterschrift Bevollmächtigte/r</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Audit-ID {report.id} · Wahrheitsgemäß erfasst nach § 11 VerpackG · Aufbewahrung 10 Jahre (HGB § 257)
        </Text>
      </Page>
    </Document>
  );
}

export async function generateLucidPDF(report: ComplianceMonthlyReport, tenantName?: string): Promise<void> {
  const blob = await pdf(<LucidDocument report={report} tenantName={tenantName} />).toBlob();
  triggerDownload(blob, `LUCID-Meldung-${report.reportMonth.slice(0, 7)}.pdf`);
}

// ============================================
// Shared helpers
// ============================================

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
