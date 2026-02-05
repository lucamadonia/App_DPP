import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Type,
  Tag,
  QrCode,
  Image,
  ShieldCheck,
  Minus,
  Space,
  Recycle,
  Barcode,
  Info,
  Stamp,
  Search,
  ChevronRight,
  Layers,
  FileText,
  Package,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { LabelElementType, LabelFieldKey } from '@/types/master-label-editor';
import { LABEL_FIELD_METADATA } from '@/types/master-label-editor';

interface LabelElementPaletteProps {
  onDragStart: (type: LabelElementType) => void;
  onClickAdd: (type: LabelElementType) => void;
  onFieldDragStart?: (fieldKey: LabelFieldKey) => void;
  onFieldClickAdd?: (fieldKey: LabelFieldKey) => void;
}

// ---------------------------------------------------------------------------
// Element palette items (Tab 1)
// ---------------------------------------------------------------------------

const PALETTE_ITEMS: Array<{ type: LabelElementType; icon: typeof Type; labelKey: string }> = [
  { type: 'text', icon: Type, labelKey: 'ml.element.text' },
  { type: 'field-value', icon: Tag, labelKey: 'ml.element.fieldValue' },
  { type: 'qr-code', icon: QrCode, labelKey: 'ml.element.qrCode' },
  { type: 'pictogram', icon: Stamp, labelKey: 'ml.element.pictogram' },
  { type: 'compliance-badge', icon: ShieldCheck, labelKey: 'ml.element.complianceBadge' },
  { type: 'image', icon: Image, labelKey: 'ml.element.image' },
  { type: 'divider', icon: Minus, labelKey: 'ml.element.divider' },
  { type: 'spacer', icon: Space, labelKey: 'ml.element.spacer' },
  { type: 'material-code', icon: Recycle, labelKey: 'ml.element.materialCode' },
  { type: 'barcode', icon: Barcode, labelKey: 'ml.element.barcode' },
  { type: 'icon-text', icon: Info, labelKey: 'ml.element.iconText' },
  { type: 'package-counter', icon: Package, labelKey: 'ml.palette.packageCounter' },
];

// ---------------------------------------------------------------------------
// Field groups for the Field Browser (Tab 2)
// ---------------------------------------------------------------------------

interface FieldGroup {
  id: string;
  labelKey: string;
  fields: LabelFieldKey[];
}

const FIELD_GROUPS: FieldGroup[] = [
  {
    id: 'identity',
    labelKey: 'ml.fieldGroup.identity',
    fields: ['productName', 'gtin', 'batchNumber', 'serialNumber', 'uniqueProductId', 'productionDate', 'category', 'countryOfOrigin', 'madeIn'],
  },
  {
    id: 'manufacturer',
    labelKey: 'ml.fieldGroup.manufacturer',
    fields: ['manufacturerName', 'manufacturerAddress', 'manufacturerEmail', 'manufacturerPhone', 'manufacturerVAT', 'manufacturerEORI', 'manufacturerWebsite', 'manufacturerContact', 'manufacturerCountry'],
  },
  {
    id: 'importer',
    labelKey: 'ml.fieldGroup.importer',
    fields: ['importerName', 'importerAddress', 'importerEmail', 'importerPhone', 'importerVAT', 'importerEORI', 'importerCountry'],
  },
  {
    id: 'measurements',
    labelKey: 'ml.fieldGroup.measurements',
    fields: ['netWeight', 'grossWeight', 'quantity', 'hsCode'],
  },
  {
    id: 'sustainability',
    labelKey: 'ml.fieldGroup.sustainability',
    fields: ['recycledContentPercentage', 'durabilityYears', 'repairabilityScore'],
  },
  {
    id: 'compliance',
    labelKey: 'ml.fieldGroup.compliance',
    fields: ['eprelNumber', 'weeeNumber', 'dppRegistryId', 'safetyInformation'],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LabelElementPalette({ onDragStart, onClickAdd, onFieldDragStart, onFieldClickAdd }: LabelElementPaletteProps) {
  const { t } = useTranslation('products');
  const [activeTab, setActiveTab] = useState<'elements' | 'fields'>('elements');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['identity', 'manufacturer']));

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  // Filter fields based on search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return FIELD_GROUPS;
    const q = searchQuery.toLowerCase();
    return FIELD_GROUPS.map(group => ({
      ...group,
      fields: group.fields.filter(fieldKey => {
        const meta = LABEL_FIELD_METADATA.find(m => m.key === fieldKey);
        const label = meta ? t(meta.labelKey) : fieldKey;
        return label.toLowerCase().includes(q) || fieldKey.toLowerCase().includes(q);
      }),
    })).filter(group => group.fields.length > 0);
  }, [searchQuery, t]);

  const handleFieldDrag = useCallback((e: React.DragEvent, fieldKey: LabelFieldKey) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', `field:${fieldKey}`);
    onFieldDragStart?.(fieldKey);
  }, [onFieldDragStart]);

  const handleFieldClick = useCallback((fieldKey: LabelFieldKey) => {
    onFieldClickAdd?.(fieldKey);
  }, [onFieldClickAdd]);

  return (
    <div className="flex flex-col h-full backdrop-blur-md bg-white/60 dark:bg-gray-900/60">
      {/* Tabs */}
      <div className="flex border-b shrink-0">
        <button
          onClick={() => setActiveTab('elements')}
          className={`flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors ${
            activeTab === 'elements'
              ? 'text-primary border-b-2 border-primary bg-primary/5'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="h-3 w-3" />
          {t('ml.palette.elements')}
        </button>
        <button
          onClick={() => setActiveTab('fields')}
          className={`flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors ${
            activeTab === 'fields'
              ? 'text-primary border-b-2 border-primary bg-primary/5'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-3 w-3" />
          {t('ml.palette.fields')}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'elements' ? (
        <div className="p-1.5 space-y-1 overflow-y-auto flex-1">
          {PALETTE_ITEMS.map(({ type, icon: Icon, labelKey }) => (
            <button
              key={type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/plain', type);
                onDragStart(type);
              }}
              onClick={() => onClickAdd(type)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md cursor-grab active:cursor-grabbing hover:bg-accent/80 hover:shadow-sm transition-all text-left"
              title={t(labelKey)}
            >
              <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-[10px] text-muted-foreground leading-tight truncate">
                {t(labelKey)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Search */}
          <div className="p-1.5 shrink-0">
            <div className="relative">
              <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('ml.palette.searchFields')}
                className="h-7 text-[10px] pl-6 pr-2"
              />
            </div>
          </div>

          {/* Field groups */}
          <div className="overflow-y-auto flex-1 px-1 pb-2">
            {filteredGroups.map(group => (
              <div key={group.id} className="mb-0.5">
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center gap-1 px-1.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className={`h-3 w-3 transition-transform duration-200 ${expandedGroups.has(group.id) ? 'rotate-90' : ''}`} />
                  <span className="truncate">{t(group.labelKey)}</span>
                  <span className="ml-auto text-[8px] text-muted-foreground/60">{group.fields.length}</span>
                </button>

                {/* Fields with smooth collapse animation */}
                <div
                  className="overflow-hidden transition-all duration-200"
                  style={{
                    maxHeight: expandedGroups.has(group.id) ? `${group.fields.length * 28}px` : '0px',
                    opacity: expandedGroups.has(group.id) ? 1 : 0,
                  }}
                >
                  {group.fields.map(fieldKey => {
                    const meta = LABEL_FIELD_METADATA.find(m => m.key === fieldKey);
                    const label = meta ? t(meta.labelKey) : fieldKey;
                    return (
                      <button
                        key={fieldKey}
                        draggable
                        onDragStart={(e) => handleFieldDrag(e, fieldKey)}
                        onClick={() => handleFieldClick(fieldKey)}
                        className="w-full flex items-center gap-1.5 pl-5 pr-1.5 py-1 rounded-sm cursor-grab active:cursor-grabbing hover:bg-primary/10 hover:shadow-[0_0_6px_rgba(59,130,246,0.15)] transition-all text-left group/field"
                        title={label}
                      >
                        <FileText className="h-3 w-3 text-muted-foreground/60 group-hover/field:text-primary/70 shrink-0 transition-colors" />
                        <span className="text-[10px] text-muted-foreground group-hover/field:text-foreground leading-tight truncate transition-colors">
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {filteredGroups.length === 0 && searchQuery && (
              <div className="text-center py-4 text-[10px] text-muted-foreground">
                {t('ml.palette.noResults')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
