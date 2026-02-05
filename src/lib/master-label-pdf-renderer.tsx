/**
 * Master Label Editor PDF Renderer
 *
 * Takes a LabelDesign + MasterLabelData → @react-pdf/renderer document.
 * Renders each element type with @react-pdf primitives.
 */

import {
  Document,
  Page,
  Text,
  View,
  Image,
  Svg,
  Path,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';
import type { LabelDesign, LabelElement, LabelSection, PackageCounterFormat, MultiLabelExportConfig } from '@/types/master-label-editor';
import type { MasterLabelData } from '@/types/master-label';
import { resolveFieldValue } from './master-label-assembler';
import { getBuiltinPictogram } from './master-label-builtin-pictograms';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  fieldRow: { flexDirection: 'row', marginBottom: 1.5 },
  fieldLabel: { fontSize: 5.5, color: '#6b7280', width: 65 },
  fieldValue: { flex: 1 },
  qrContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qrTextContainer: { flex: 1 },
  badgeBox: { borderWidth: 0.75, borderRadius: 2, paddingHorizontal: 4, paddingVertical: 2, minWidth: 24, alignItems: 'center' as const },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  materialRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  materialCode: { borderWidth: 0.5, borderRadius: 1, paddingHorizontal: 3, paddingVertical: 1 },
});

// ---------------------------------------------------------------------------
// Package Counter Helper
// ---------------------------------------------------------------------------

function formatPackageCounter(
  current: number,
  total: number,
  format: PackageCounterFormat,
  locale: 'en' | 'de'
): string {
  switch (format) {
    case 'x-of-y':
      return locale === 'de' ? `${current} von ${total}` : `${current} of ${total}`;
    case 'x-slash-y':
      return `${current}/${total}`;
    case 'package-x-of-y':
      return locale === 'de'
        ? `Paket ${current} von ${total}`
        : `Package ${current} of ${total}`;
    case 'box-x-of-y':
      return locale === 'de'
        ? `Karton ${current} von ${total}`
        : `Box ${current} of ${total}`;
    case 'parcel-x-of-y':
      return locale === 'de'
        ? `Paket ${current} von ${total}`
        : `Parcel ${current} of ${total}`;
    default:
      return `${current}/${total}`;
  }
}

// ---------------------------------------------------------------------------
// Element Renderer
// ---------------------------------------------------------------------------

function getAlignment(alignment: string): 'flex-start' | 'center' | 'flex-end' {
  if (alignment === 'center') return 'center';
  if (alignment === 'right') return 'flex-end';
  return 'flex-start';
}

function getTextAlign(alignment: string): 'left' | 'center' | 'right' {
  if (alignment === 'center') return 'center';
  if (alignment === 'right') return 'right';
  return 'left';
}

function LabelElementRenderer({ element, data }: { element: LabelElement; data: MasterLabelData }) {
  switch (element.type) {
    case 'text': {
      return (
        <Text
          style={{
            fontSize: element.fontSize,
            fontFamily: element.fontWeight === 'bold' ? 'Helvetica-Bold' : 'Helvetica',
            color: element.color,
            textAlign: getTextAlign(element.alignment),
            fontStyle: element.italic ? 'italic' : 'normal',
            textTransform: element.uppercase ? ('uppercase' as const) : ('none' as const),
            marginBottom: 2,
          }}
        >
          {element.content}
        </Text>
      );
    }

    case 'field-value': {
      const rawValue = resolveFieldValue(element.fieldKey, data);
      if (!rawValue) return null;
      const value = element.uppercase ? rawValue.toUpperCase() : rawValue;

      // Resolve font family with bold/italic mapping
      const baseFam = element.fontFamily || 'Helvetica';
      const isBold = element.fontWeight === 'bold';
      const isItalic = element.italic === true;
      let resolvedFont: string;
      if (baseFam === 'Courier') {
        resolvedFont = isBold && isItalic ? 'Courier-BoldOblique' : isBold ? 'Courier-Bold' : isItalic ? 'Courier-Oblique' : 'Courier';
      } else if (baseFam === 'Times-Roman') {
        resolvedFont = isBold && isItalic ? 'Times-BoldItalic' : isBold ? 'Times-Bold' : isItalic ? 'Times-Italic' : 'Times-Roman';
      } else {
        resolvedFont = isBold && isItalic ? 'Helvetica-BoldOblique' : isBold ? 'Helvetica-Bold' : isItalic ? 'Helvetica-Oblique' : 'Helvetica';
      }

      const mb = element.marginBottom ?? 2;
      const lh = element.lineHeight ?? 1.2;

      if (element.layout === 'stacked') {
        return (
          <View style={{ alignItems: getAlignment(element.alignment), marginBottom: mb }}>
            {element.showLabel && (
              <Text style={{ fontSize: element.fontSize - 1, color: element.labelColor, marginBottom: 1 }}>
                {element.labelText || element.fieldKey}
              </Text>
            )}
            <Text style={{ fontSize: element.fontSize, fontFamily: resolvedFont, color: element.color, lineHeight: lh }}>
              {value}
            </Text>
          </View>
        );
      }

      return (
        <View style={{ ...s.fieldRow, justifyContent: getAlignment(element.alignment), marginBottom: mb }}>
          {element.showLabel && (
            <Text style={{ ...s.fieldLabel, fontSize: element.fontSize - 0.5, color: element.labelColor }}>
              {element.labelText || element.fieldKey}
            </Text>
          )}
          <Text style={{ ...s.fieldValue, fontSize: element.fontSize, fontFamily: resolvedFont, color: element.color, lineHeight: lh }}>
            {value}
          </Text>
        </View>
      );
    }

    case 'qr-code': {
      return (
        <View style={{ ...s.qrContainer, justifyContent: getAlignment(element.alignment) }}>
          {data.dppQr.qrDataUrl && (
            <Image src={data.dppQr.qrDataUrl} style={{ width: element.size, height: element.size }} />
          )}
          <View style={s.qrTextContainer}>
            {element.showLabel && (
              <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>
                {element.labelText}
              </Text>
            )}
            {element.showUrl && (
              <Text style={{ fontSize: 4.5, color: '#6b7280' }}>
                {data.dppQr.dppUrl}
              </Text>
            )}
          </View>
        </View>
      );
    }

    case 'pictogram': {
      const pic = element.source === 'builtin' ? getBuiltinPictogram(element.pictogramId) : null;
      if (!pic) return null;

      const [, , w, h] = pic.viewBox.split(' ').map(Number);

      return (
        <View style={{ alignItems: getAlignment(element.alignment), marginBottom: 2 }}>
          <Svg viewBox={pic.viewBox} style={{ width: element.size, height: element.size * (h / w) }}>
            <Path d={pic.svgPath} fill={element.color} />
          </Svg>
          {element.showLabel && element.labelText && (
            <Text style={{ fontSize: 5, color: element.color, marginTop: 1 }}>
              {element.labelText}
            </Text>
          )}
        </View>
      );
    }

    case 'compliance-badge': {
      const boxStyle = element.style === 'filled'
        ? { ...s.badgeBox, borderColor: element.color, backgroundColor: element.backgroundColor || element.color }
        : element.style === 'minimal'
          ? { ...s.badgeBox, borderWidth: 0 }
          : { ...s.badgeBox, borderColor: element.color };

      const textColor = element.style === 'filled' ? '#ffffff' : element.color;

      return (
        <View style={{ ...boxStyle, alignSelf: getAlignment(element.alignment) }}>
          <Text style={{ fontSize: element.size, fontFamily: 'Helvetica-Bold', color: textColor }}>
            {element.symbol}
          </Text>
        </View>
      );
    }

    case 'image': {
      if (!element.src) return null;
      return (
        <View style={{ alignItems: getAlignment(element.alignment), marginBottom: 2 }}>
          <Image
            src={element.src}
            style={{
              width: `${element.width}%`,
              borderRadius: element.borderRadius,
            }}
          />
        </View>
      );
    }

    case 'divider': {
      return (
        <View
          style={{
            marginTop: element.marginTop,
            marginBottom: element.marginBottom,
            borderBottomWidth: element.thickness,
            borderBottomColor: element.color,
            borderStyle: element.style === 'dashed' ? 'dashed' : element.style === 'dotted' ? 'dotted' : 'solid',
          }}
        />
      );
    }

    case 'spacer': {
      return <View style={{ height: element.height }} />;
    }

    case 'material-code': {
      const codes = element.autoPopulate
        ? (data.sustainability.packagingMaterialCodes.length > 0 ? data.sustainability.packagingMaterialCodes : element.codes)
        : element.codes;

      if (codes.length === 0) return null;

      return (
        <View style={s.materialRow}>
          {codes.map((code, i) => (
            <View key={i} style={{ ...s.materialCode, borderColor: element.borderColor }}>
              <Text style={{ fontSize: element.fontSize, color: element.color }}>{code}</Text>
            </View>
          ))}
        </View>
      );
    }

    case 'barcode': {
      // Barcode rendering — fallback to text representation in PDF
      const value = element.autoPopulate ? data.identity.modelSku : element.value;
      if (!value) return null;

      return (
        <View style={{ alignItems: getAlignment(element.alignment), marginBottom: 2 }}>
          <View style={{ borderWidth: 0.5, borderColor: '#1a1a1a', padding: 4 }}>
            <Text style={{ fontSize: 8, fontFamily: 'Courier', letterSpacing: 2 }}>
              {value}
            </Text>
          </View>
          {element.showText && (
            <Text style={{ fontSize: 5, textAlign: 'center', marginTop: 1 }}>{value}</Text>
          )}
        </View>
      );
    }

    case 'icon-text': {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
          <View style={{ width: element.iconSize, height: element.iconSize, borderRadius: element.iconSize / 2, backgroundColor: element.color + '20', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: element.iconSize * 0.6, color: element.color }}>i</Text>
          </View>
          <Text style={{ fontSize: element.fontSize, color: element.color, flex: 1 }}>
            {element.text}
          </Text>
        </View>
      );
    }

    case 'package-counter': {
      // Extract counter values from enriched data
      const current = (data as any)._counterCurrent;
      const total = (data as any)._counterTotal;
      const counterFormat = (data as any)._counterFormat || element.format;
      const locale = (data as any)._locale || 'en';

      if (!current || !total) return null;  // Skip if no counter context

      const counterText = formatPackageCounter(current, total, counterFormat, locale);

      const baseFam = element.fontFamily || 'Helvetica';
      const isBold = element.fontWeight === 'bold';
      const resolvedFont = baseFam === 'Courier'
        ? (isBold ? 'Courier-Bold' : 'Courier')
        : baseFam === 'Times-Roman'
        ? (isBold ? 'Times-Bold' : 'Times-Roman')
        : (isBold ? 'Helvetica-Bold' : 'Helvetica');

      return (
        <View style={{ alignItems: getAlignment(element.alignment), marginBottom: 4 }}>
          <View
            style={{
              borderWidth: element.showBorder ? element.borderWidth : 0,
              borderColor: element.borderColor,
              borderRadius: element.borderRadius,
              backgroundColor: element.showBackground ? element.backgroundColor : 'transparent',
              paddingHorizontal: element.padding,
              paddingVertical: element.padding * 0.75,
              minWidth: 60,
            }}
          >
            <Text
              style={{
                fontSize: element.fontSize,
                fontFamily: resolvedFont,
                color: element.color,
                textAlign: getTextAlign(element.alignment),
                textTransform: element.uppercase ? ('uppercase' as any) : ('none' as any),
                letterSpacing: 0.5,
              }}
            >
              {counterText}
            </Text>
          </View>
        </View>
      );
    }

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Section Renderer
// ---------------------------------------------------------------------------

function LabelSectionRenderer({ section, elements, data }: { section: LabelSection; elements: LabelElement[]; data: MasterLabelData }) {
  if (!section.visible) return null;

  const sectionElements = elements
    .filter(el => el.sectionId === section.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (sectionElements.length === 0) return null;

  return (
    <View
      style={{
        paddingTop: section.paddingTop,
        paddingBottom: section.paddingBottom,
        marginBottom: section.showBorder ? 8 : 4,
        borderBottomWidth: section.showBorder ? 0.5 : 0,
        borderBottomColor: section.borderColor,
        backgroundColor: section.backgroundColor || 'transparent',
      }}
    >
      {sectionElements.map(element => (
        <LabelElementRenderer key={element.id} element={element} data={data} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// PDF Document
// ---------------------------------------------------------------------------

function MasterLabelEditorDocument({ design, data }: { design: LabelDesign; data: MasterLabelData }) {
  const sortedSections = [...design.sections].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Document>
      <Page
        size={[design.pageWidth, design.pageHeight]}
        style={{
          width: design.pageWidth,
          height: design.pageHeight,
          padding: design.padding,
          fontFamily: design.fontFamily,
          fontSize: design.baseFontSize,
          color: design.baseTextColor,
          backgroundColor: design.backgroundColor,
        }}
      >
        {sortedSections.map(section => (
          <LabelSectionRenderer
            key={section.id}
            section={section}
            elements={design.elements}
            data={data}
          />
        ))}
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Export function — called via dynamic import
// ---------------------------------------------------------------------------

export async function generateMasterLabelEditorPDF(
  design: LabelDesign,
  data: MasterLabelData,
  filename?: string,
  multiLabelConfig?: MultiLabelExportConfig,
  locale: 'en' | 'de' = 'en',
): Promise<void> {
  // Single label mode (backward compatible)
  if (!multiLabelConfig || multiLabelConfig.labelCount <= 1) {
    const blob = await pdf(
      <MasterLabelEditorDocument design={design} data={data} />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `master-label-${data.identity.modelSku || 'product'}-${data.identity.batchNumber || 'batch'}-${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  // Multi-label mode
  const { labelCount, format, startNumber, filenamePattern } = multiLabelConfig;

  if (filenamePattern === 'batch') {
    // Generate separate PDF per label
    for (let i = 0; i < labelCount; i++) {
      const currentPage = startNumber + i;

      // Enrich data with counter context
      const enrichedData = {
        ...data,
        _counterCurrent: currentPage,
        _counterTotal: labelCount,
        _counterFormat: format,
        _locale: locale,
      };

      const blob = await pdf(
        <MasterLabelEditorDocument design={design} data={enrichedData as any} />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const paddedNum = String(currentPage).padStart(3, '0');
      a.href = url;
      a.download = `master-label-${data.identity.modelSku || 'product'}-${data.identity.batchNumber || 'batch'}-${paddedNum}-of-${labelCount}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Small delay between downloads
      if (i < labelCount - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  } else {
    // Generate single multi-page PDF
    const pages = [];
    for (let i = 0; i < labelCount; i++) {
      const currentPage = startNumber + i;

      const enrichedData = {
        ...data,
        _counterCurrent: currentPage,
        _counterTotal: labelCount,
        _counterFormat: format,
        _locale: locale,
      };

      pages.push(enrichedData);
    }

    // Create multi-page document
    const multiPageDoc = (
      <Document>
        {pages.map((pageData, i) => {
          const sortedSections = [...design.sections].sort((a, b) => a.sortOrder - b.sortOrder);

          return (
            <Page
              key={i}
              size={[design.pageWidth, design.pageHeight]}
              style={{
                width: design.pageWidth,
                height: design.pageHeight,
                padding: design.padding,
                fontFamily: design.fontFamily,
                fontSize: design.baseFontSize,
                color: design.baseTextColor,
                backgroundColor: design.backgroundColor,
              }}
            >
              {sortedSections.map(section => (
                <LabelSectionRenderer
                  key={section.id}
                  section={section}
                  elements={design.elements}
                  data={pageData as any}
                />
              ))}
            </Page>
          );
        })}
      </Document>
    );

    const blob = await pdf(multiPageDoc).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `master-label-${data.identity.modelSku || 'product'}-${data.identity.batchNumber || 'batch'}-1-to-${labelCount}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
