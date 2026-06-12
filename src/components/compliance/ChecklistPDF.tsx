/**
 * Compliance Checklist PDF Generator
 *
 * Uses @react-pdf/renderer for client-side PDF generation.
 * Dynamically imported from ChecklistPage to avoid loading the heavy
 * library upfront (same pattern as ComplianceReportPDF).
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChecklistPDFStatus = 'pending' | 'in_progress' | 'completed' | 'not_applicable';
export type ChecklistPDFPriority = 'critical' | 'high' | 'medium' | 'low';

export interface ChecklistPDFItem {
  id: string;
  title: string;
  description: string;
  category: string;
  mandatory: boolean;
  priority: ChecklistPDFPriority;
  status: ChecklistPDFStatus;
  legalBasis?: string;
  authority?: string;
  deadline?: string;
}

/** Pre-translated labels — keeps the PDF locale-aware without importing i18n. */
export interface ChecklistPDFLabels {
  title: string;
  progress: string;
  progressSummary: string;
  generated: string;
  required: string;
  legalBasis: string;
  authority: string;
  deadline: string;
  priorities: Record<ChecklistPDFPriority, string>;
  statuses: Record<ChecklistPDFStatus, string>;
}

export interface ChecklistPDFOptions {
  countryCode: string;
  categoryKey: string;
  countryName: string;
  categoryName: string;
  progressPercent: number;
  items: ChecklistPDFItem[];
  labels: ChecklistPDFLabels;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 56,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
  },

  // Header
  title: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#1e40af',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 2,
  },
  meta: {
    fontSize: 9,
    color: '#9ca3af',
    marginBottom: 12,
  },

  // Progress
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
  },
  progressValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    marginBottom: 4,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  progressSummary: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 8,
  },

  // Legend
  legend: {
    fontSize: 8,
    color: '#9ca3af',
    marginBottom: 12,
  },

  // Group
  group: {
    marginBottom: 10,
  },
  groupTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1e40af',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 3,
    marginBottom: 6,
  },

  // Item
  itemRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  checkbox: {
    width: 11,
    height: 11,
    borderWidth: 1,
    borderColor: '#6b7280',
    borderRadius: 2,
    marginRight: 7,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMark: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#16a34a',
  },
  itemContent: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginRight: 6,
  },
  badge: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    marginRight: 4,
    color: '#ffffff',
  },
  itemDescription: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
  },
  itemMeta: {
    fontSize: 8,
    color: '#9ca3af',
    marginTop: 2,
  },
  itemStatus: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 1,
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
// Helpers
// ---------------------------------------------------------------------------

function getProgressColor(percent: number): string {
  if (percent >= 80) return '#16a34a';
  if (percent >= 50) return '#ca8a04';
  return '#dc2626';
}

function getPriorityColor(priority: ChecklistPDFPriority): string {
  switch (priority) {
    case 'critical': return '#dc2626';
    case 'high': return '#ea580c';
    case 'medium': return '#2563eb';
    case 'low': return '#6b7280';
  }
}

/** WinAnsi-safe status marks (Helvetica has no U+2713 check mark). */
function getStatusMark(status: ChecklistPDFStatus): string {
  switch (status) {
    case 'completed': return 'X';
    case 'in_progress': return '/';
    case 'not_applicable': return '–';
    case 'pending': return '';
  }
}

function groupByCategory(items: ChecklistPDFItem[]): { category: string; items: ChecklistPDFItem[] }[] {
  const groups: { category: string; items: ChecklistPDFItem[] }[] = [];
  const index = new Map<string, number>();
  for (const item of items) {
    let i = index.get(item.category);
    if (i === undefined) {
      i = groups.length;
      index.set(item.category, i);
      groups.push({ category: item.category, items: [] });
    }
    groups[i].items.push(item);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// PDF Document
// ---------------------------------------------------------------------------

// Lazy-loaded PDF module (not part of the hot-reloaded component tree),
// same pattern as compliance-check/ComplianceReportPDF.tsx.
// eslint-disable-next-line react-refresh/only-export-components
function ChecklistDocument({ options }: { options: ChecklistPDFOptions }) {
  const { countryName, categoryName, progressPercent, items, labels } = options;
  const date = new Date().toLocaleDateString();
  const groups = groupByCategory(items);
  const progressColor = getProgressColor(progressPercent);

  const legend = (['pending', 'in_progress', 'completed', 'not_applicable'] as const)
    .map(s => `[${getStatusMark(s) || ' '}] ${labels.statuses[s]}`)
    .join('   ');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <Text style={styles.title}>{labels.title}</Text>
        <Text style={styles.subtitle}>{countryName} · {categoryName}</Text>
        <Text style={styles.meta}>{labels.generated}: {date}</Text>

        {/* Progress */}
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>{labels.progress}</Text>
          <Text style={[styles.progressValue, { color: progressColor }]}>{progressPercent}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.max(0, Math.min(100, progressPercent))}%`, backgroundColor: progressColor },
            ]}
          />
        </View>
        <Text style={styles.progressSummary}>{labels.progressSummary}</Text>

        {/* Status legend */}
        <Text style={styles.legend}>{legend}</Text>

        {/* Groups */}
        {groups.map(group => (
          <View key={group.category} style={styles.group}>
            <Text style={styles.groupTitle}>{group.category}</Text>
            {group.items.map(item => (
              <View key={item.id} style={styles.itemRow} wrap={false}>
                {/* Status checkbox */}
                <View style={styles.checkbox}>
                  <Text style={styles.checkboxMark}>{getStatusMark(item.status)}</Text>
                </View>

                <View style={styles.itemContent}>
                  <View style={styles.itemTitleRow}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {item.mandatory && (
                      <Text style={[styles.badge, { backgroundColor: '#dc2626' }]}>
                        {labels.required.toUpperCase()}
                      </Text>
                    )}
                    <Text style={[styles.badge, { backgroundColor: getPriorityColor(item.priority) }]}>
                      {labels.priorities[item.priority].toUpperCase()}
                    </Text>
                  </View>

                  <Text style={styles.itemDescription}>{item.description}</Text>

                  {(item.legalBasis || item.authority || item.deadline) && (
                    <Text style={styles.itemMeta}>
                      {[
                        item.legalBasis ? `${labels.legalBasis}: ${item.legalBasis}` : null,
                        item.authority ? `${labels.authority}: ${item.authority}` : null,
                        item.deadline ? `${labels.deadline}: ${item.deadline}` : null,
                      ].filter(Boolean).join('  ·  ')}
                    </Text>
                  )}

                  <Text style={styles.itemStatus}>{labels.statuses[item.status]}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>{labels.title} — {countryName} · {categoryName}</Text>
          <Text
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Export function — called from ChecklistPage via lazy import
// ---------------------------------------------------------------------------

export async function generateChecklistPDF(options: ChecklistPDFOptions): Promise<void> {
  const blob = await pdf(<ChecklistDocument options={options} />).toBlob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `compliance-checklist-${options.countryCode}-${options.categoryKey}-${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
