/**
 * Compliance Report PDF Generator
 *
 * Uses @react-pdf/renderer for client-side PDF generation.
 * Dynamically imported to avoid loading the heavy library upfront.
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';
import type { Product, ProductBatch } from '@/types/product';
import type { ComplianceCheckResult } from '@/types/compliance-check';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
  },
  // Cover
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
    marginBottom: 8,
    color: '#1e40af',
  },
  coverSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 40,
  },
  coverScore: {
    fontSize: 72,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  coverScoreLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 20,
  },
  coverInfo: {
    fontSize: 11,
    color: '#374151',
    marginBottom: 4,
  },
  coverDate: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 20,
  },

  // Section
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 10,
    marginTop: 16,
    color: '#1e40af',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 4,
  },
  summaryText: {
    fontSize: 10,
    lineHeight: 1.6,
    color: '#374151',
  },

  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableCell: {
    fontSize: 9,
    color: '#374151',
  },

  // Risk matrix
  riskCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    padding: 8,
    marginBottom: 6,
  },
  riskArea: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  riskDesc: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
  },
  riskMeta: {
    fontSize: 8,
    color: '#9ca3af',
    marginTop: 3,
  },

  // Finding
  findingRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 6,
  },
  findingSeverity: {
    width: 60,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  findingContent: {
    flex: 1,
  },
  findingTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  findingDesc: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
  },
  findingRec: {
    fontSize: 9,
    color: '#1e40af',
    marginTop: 2,
  },

  // Action
  actionItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  actionPriority: {
    width: 30,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1e40af',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  actionDesc: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
  },

  // Disclaimer
  disclaimer: {
    marginTop: 30,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  disclaimerTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 8,
    color: '#9ca3af',
    lineHeight: 1.5,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#9ca3af',
  },
});

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function getScoreColor(score: number): string {
  if (score >= 81) return '#16a34a';
  if (score >= 61) return '#ca8a04';
  if (score >= 41) return '#ea580c';
  return '#dc2626';
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return '#dc2626';
    case 'high': return '#ea580c';
    case 'medium': return '#ca8a04';
    case 'low': return '#2563eb';
    default: return '#6b7280';
  }
}

// ---------------------------------------------------------------------------
// PDF Document
// ---------------------------------------------------------------------------

interface ComplianceReportProps {
  product: Product;
  result: ComplianceCheckResult;
  batch?: ProductBatch | null;
}

function ComplianceReport({ product, result, batch }: ComplianceReportProps) {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverTitle}>AI Compliance Report</Text>
        <Text style={styles.coverSubtitle}>Product Compliance Analysis</Text>
        <Text style={[styles.coverScore, { color: getScoreColor(result.overallScore) }]}>
          {result.overallScore}
        </Text>
        <Text style={styles.coverScoreLabel}>Compliance Score / 100</Text>
        <Text style={styles.coverInfo}>{product.name}</Text>
        <Text style={styles.coverInfo}>{product.manufacturer} · {product.category}</Text>
        <Text style={styles.coverInfo}>GTIN: {product.gtin}</Text>
        {batch && (
          <Text style={styles.coverInfo}>Batch: {batch.serialNumber}</Text>
        )}
        <Text style={styles.coverDate}>Generated: {date}</Text>
        <Text style={[styles.coverDate, { marginTop: 4 }]}>
          Risk Level: {result.riskLevel.toUpperCase()}
        </Text>
      </Page>

      {/* Executive Summary + Risk Matrix */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Executive Summary</Text>
        <Text style={styles.summaryText}>{result.executiveSummary}</Text>

        {result.riskMatrix.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Risk Matrix</Text>
            {result.riskMatrix.map((entry, i) => (
              <View key={i} style={styles.riskCard}>
                <Text style={styles.riskArea}>{entry.area}</Text>
                <Text style={styles.riskDesc}>{entry.description}</Text>
                <Text style={styles.riskMeta}>
                  Likelihood: {entry.likelihood} · Impact: {entry.impact}
                  {entry.regulation ? ` · ${entry.regulation}` : ''}
                </Text>
              </View>
            ))}
          </>
        )}

        <View style={styles.footer}>
          <Text>{product.name} — AI Compliance Report</Text>
          <Text>{date}</Text>
        </View>
      </Page>

      {/* Findings */}
      {result.findings.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>
            Findings ({result.findings.length})
          </Text>
          {result.findings.map((finding, i) => (
            <View key={i} style={styles.findingRow}>
              <Text style={[styles.findingSeverity, { color: getSeverityColor(finding.severity) }]}>
                [{finding.severity.toUpperCase()}]
              </Text>
              <View style={styles.findingContent}>
                <Text style={styles.findingTitle}>
                  {finding.category} — {finding.title}
                </Text>
                <Text style={styles.findingDesc}>{finding.description}</Text>
                {finding.recommendation && (
                  <Text style={styles.findingRec}>→ {finding.recommendation}</Text>
                )}
                <Text style={styles.riskMeta}>
                  {finding.regulation} · Status: {finding.status}
                </Text>
              </View>
            </View>
          ))}

          <View style={styles.footer}>
            <Text>{product.name} — AI Compliance Report</Text>
            <Text>{date}</Text>
          </View>
        </Page>
      )}

      {/* Action Plan */}
      {result.actionPlan.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>
            Action Plan ({result.actionPlan.length} items)
          </Text>
          {result.actionPlan.map((item, i) => (
            <View key={i} style={styles.actionItem}>
              <Text style={styles.actionPriority}>{item.priority}</Text>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>{item.title}</Text>
                <Text style={styles.actionDesc}>{item.description}</Text>
                <Text style={styles.riskMeta}>
                  {item.responsible}
                  {item.deadline ? ` · Deadline: ${item.deadline}` : ''}
                  {item.estimatedEffort ? ` · Effort: ${item.estimatedEffort}` : ''}
                </Text>
              </View>
            </View>
          ))}

          {result.recommendations.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Recommendations</Text>
              {result.recommendations.map((rec, i) => (
                <View key={i} style={styles.actionItem}>
                  <Text style={styles.actionPriority}>{rec.type === 'quick_win' ? 'QW' : rec.type === 'strategic' ? 'STR' : 'IMP'}</Text>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>{rec.title}</Text>
                    <Text style={styles.actionDesc}>{rec.description}</Text>
                    {rec.impact && <Text style={styles.findingRec}>{rec.impact}</Text>}
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerTitle}>AI Disclaimer</Text>
            <Text style={styles.disclaimerText}>
              This analysis was generated by AI and serves as an orientation aid. It does not replace
              professional legal advice or an official conformity assessment. All information should be
              verified by qualified compliance experts. The AI model may produce inaccurate or incomplete results.
            </Text>
          </View>

          <View style={styles.footer}>
            <Text>{product.name} — AI Compliance Report</Text>
            <Text>{date}</Text>
          </View>
        </Page>
      )}
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Export function — called from AIComplianceCheckTab
// ---------------------------------------------------------------------------

export async function generateCompliancePDF(
  product: Product,
  result: ComplianceCheckResult,
  batch?: ProductBatch | null,
): Promise<void> {
  const blob = await pdf(
    <ComplianceReport product={product} result={result} batch={batch} />
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `compliance-report-${product.gtin}${batch ? `-${batch.serialNumber}` : ''}-${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
