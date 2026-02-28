import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ArrowLeft, Package, Truck, User, MapPin, ExternalLink, Copy,
  Check, X, Pencil, FileText, Clock, Weight, DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { getShipment, getShipmentItems, updateShipmentStatus, updateShipment } from '@/services/supabase/wh-shipments';
import { SHIPMENT_STATUS_COLORS, SHIPMENT_STATUS_ICON_COLORS, PRIORITY_COLORS, getTrackingUrl } from '@/lib/warehouse-constants';
import type { WhShipment, WhShipmentItem, ShipmentStatus } from '@/types/warehouse';
import { SHIPMENT_STATUS_ORDER } from '@/types/warehouse';
import { DHLLabelActions } from '@/components/warehouse/DHLLabelActions';
import { DHLTrackingPanel } from '@/components/warehouse/DHLTrackingPanel';

/* -------------------------------------------------------------------------- */
/*  STATUS TRANSITION LABELS                                                   */
/* -------------------------------------------------------------------------- */

const NEXT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  draft: 'Start Picking',
  picking: 'Mark as Packed',
  packed: 'Mark as Label Created',
  label_created: 'Mark as Shipped',
  shipped: 'Mark as In Transit',
  in_transit: 'Mark as Delivered',
  delivered: '',
  cancelled: '',
};

/* -------------------------------------------------------------------------- */
/*  Status Pipeline                                                            */
/* -------------------------------------------------------------------------- */

function StatusPipeline({ current, createdAt, shippedAt, deliveredAt, t }: {
  current: ShipmentStatus;
  createdAt: string;
  shippedAt?: string;
  deliveredAt?: string;
  t: (key: string) => string;
}) {
  const currentIdx = SHIPMENT_STATUS_ORDER.indexOf(current);
  const isCancelled = current === 'cancelled';

  const dateMap: Record<string, string | undefined> = {
    draft: createdAt,
    shipped: shippedAt,
    delivered: deliveredAt,
  };

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-center min-w-[600px] px-4">
        {SHIPMENT_STATUS_ORDER.map((status, idx) => {
          const isPast = !isCancelled && currentIdx > idx;
          const isCurrent = !isCancelled && status === current;
          const colors = SHIPMENT_STATUS_ICON_COLORS[status];
          const date = dateMap[status];

          return (
            <div key={status} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                {/* Circle */}
                <div className={`relative flex items-center justify-center rounded-full transition-all duration-300 ${
                  isPast
                    ? `h-8 w-8 bg-primary text-primary-foreground`
                    : isCurrent
                      ? `h-10 w-10 ${colors.bg} ring-2 ring-primary ring-offset-2 ring-offset-background`
                      : `h-8 w-8 border-2 border-dashed border-muted-foreground/30 bg-muted/30`
                }`}>
                  {isPast ? (
                    <Check className="h-4 w-4" />
                  ) : isCurrent ? (
                    <div className={`h-3 w-3 rounded-full bg-primary animate-pulse`} />
                  ) : null}
                </div>
                {/* Label */}
                <span className={`text-[10px] mt-1.5 whitespace-nowrap ${
                  isCurrent ? 'font-semibold text-foreground' : isPast ? 'text-muted-foreground' : 'text-muted-foreground/50'
                }`}>
                  {t(status)}
                </span>
                {/* Date */}
                {date && (isPast || isCurrent) && (
                  <span className="text-[9px] text-muted-foreground/70 mt-0.5">
                    {new Date(date).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
                  </span>
                )}
              </div>
              {/* Connector */}
              {idx < SHIPMENT_STATUS_ORDER.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 transition-colors ${
                  isPast ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          );
        })}
      </div>
      {isCancelled && (
        <div className="flex items-center justify-center mt-3 gap-2">
          <Badge variant="destructive" className="gap-1">
            <X className="h-3 w-3" />
            {t('cancelled')}
          </Badge>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Editable Card Section                                                      */
/* -------------------------------------------------------------------------- */

function EditableField({ label, value, editing, editValue, onChange }: {
  label: string;
  value: string;
  editing: boolean;
  editValue: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-muted-foreground text-sm shrink-0">{label}</span>
      {editing ? (
        <Input value={editValue} onChange={(e) => onChange(e.target.value)} className="max-w-[200px] h-8 text-sm" />
      ) : (
        <span className="text-sm text-right">{value || '—'}</span>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page Component                                                             */
/* -------------------------------------------------------------------------- */

export function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation('warehouse');
  const [shipment, setShipment] = useState<WhShipment | null>(null);
  const [items, setItems] = useState<WhShipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'activity'>('overview');

  // Edit mode
  const [editingRecipient, setEditingRecipient] = useState(false);
  const [editingShipping, setEditingShipping] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [s, i] = await Promise.all([getShipment(id), getShipmentItems(id)]);
        setShipment(s);
        setItems(i);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const reloadShipment = async () => {
    if (!id) return;
    const [s, i] = await Promise.all([getShipment(id), getShipmentItems(id)]);
    setShipment(s);
    setItems(i);
  };

  const handleStatusChange = async (newStatus: ShipmentStatus) => {
    if (!id || statusUpdating) return;
    setStatusUpdating(true);
    try {
      const updated = await updateShipmentStatus(id, newStatus);
      setShipment(updated);
      toast.success(t('Status updated successfully'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setStatusUpdating(false);
    }
  };

  const startEditing = (section: 'recipient' | 'shipping' | 'notes') => {
    if (!shipment) return;
    if (section === 'recipient') {
      setEditFields({
        recipientName: shipment.recipientName,
        recipientCompany: shipment.recipientCompany || '',
        recipientEmail: shipment.recipientEmail || '',
        recipientPhone: shipment.recipientPhone || '',
        shippingStreet: shipment.shippingStreet,
        shippingCity: shipment.shippingCity,
        shippingPostalCode: shipment.shippingPostalCode,
        shippingCountry: shipment.shippingCountry,
      });
      setEditingRecipient(true);
    } else if (section === 'shipping') {
      setEditFields({
        carrier: shipment.carrier || '',
        trackingNumber: shipment.trackingNumber || '',
        serviceLevel: shipment.serviceLevel || '',
        estimatedDelivery: shipment.estimatedDelivery || '',
        shippingCost: shipment.shippingCost != null ? String(shipment.shippingCost) : '',
        totalWeightGrams: shipment.totalWeightGrams != null ? String(shipment.totalWeightGrams) : '',
      });
      setEditingShipping(true);
    } else {
      setEditFields({
        notes: shipment.notes || '',
        internalNotes: shipment.internalNotes || '',
      });
      setEditingNotes(true);
    }
  };

  const saveEdit = async (section: 'recipient' | 'shipping' | 'notes') => {
    if (!id) return;
    setSaving(true);
    try {
      let updates: Record<string, string | number | undefined> = {};
      if (section === 'recipient') {
        updates = {
          recipientName: editFields.recipientName,
          recipientCompany: editFields.recipientCompany,
          recipientEmail: editFields.recipientEmail,
          recipientPhone: editFields.recipientPhone,
          shippingStreet: editFields.shippingStreet,
          shippingCity: editFields.shippingCity,
          shippingPostalCode: editFields.shippingPostalCode,
          shippingCountry: editFields.shippingCountry,
        };
      } else if (section === 'shipping') {
        updates = {
          carrier: editFields.carrier,
          trackingNumber: editFields.trackingNumber,
          serviceLevel: editFields.serviceLevel,
          estimatedDelivery: editFields.estimatedDelivery,
          shippingCost: editFields.shippingCost ? Number(editFields.shippingCost) : undefined,
          totalWeightGrams: editFields.totalWeightGrams ? Number(editFields.totalWeightGrams) : undefined,
        };
      } else {
        updates = {
          notes: editFields.notes,
          internalNotes: editFields.internalNotes,
        };
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updated = await updateShipment(id, updates as any);
      setShipment(updated);
      setEditingRecipient(false);
      setEditingShipping(false);
      setEditingNotes(false);
      toast.success(t('Save Changes'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = (section: 'recipient' | 'shipping' | 'notes') => {
    if (section === 'recipient') setEditingRecipient(false);
    else if (section === 'shipping') setEditingShipping(false);
    else setEditingNotes(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="flex-1">
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-20 w-full rounded-lg" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">{t('No shipments yet')}</p>
        <Button variant="outline" asChild><Link to="/warehouse/shipments"><ArrowLeft className="mr-2 h-4 w-4" /> {t('Back', { ns: 'common' })}</Link></Button>
      </div>
    );
  }

  const currentIdx = SHIPMENT_STATUS_ORDER.indexOf(shipment.status);
  const nextStatus = currentIdx >= 0 && currentIdx < SHIPMENT_STATUS_ORDER.length - 1
    ? SHIPMENT_STATUS_ORDER[currentIdx + 1]
    : null;
  const prevStatus = currentIdx > 0 ? SHIPMENT_STATUS_ORDER[currentIdx - 1] : null;

  const isDraft = shipment.status === 'draft';
  const isTerminal = shipment.status === 'delivered' || shipment.status === 'cancelled';
  const trackingUrl = getTrackingUrl(shipment.carrier, shipment.trackingNumber || '');

  const tabs = [
    { key: 'overview' as const, label: t('Overview') },
    { key: 'items' as const, label: `${t('Items')} (${items.length})` },
    { key: 'activity' as const, label: t('Activity') },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/warehouse/shipments"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{shipment.shipmentNumber}</h1>
            <Badge variant="secondary" className={SHIPMENT_STATUS_COLORS[shipment.status]}>{t(shipment.status)}</Badge>
            <Badge variant="secondary" className={PRIORITY_COLORS[shipment.priority]}>{t(shipment.priority)}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {shipment.recipientCompany && `${shipment.recipientCompany} · `}{shipment.recipientName}
          </p>
        </div>
      </div>

      {/* Status Pipeline */}
      <Card>
        <CardContent className="pt-6 pb-4">
          <StatusPipeline
            current={shipment.status}
            createdAt={shipment.createdAt}
            shippedAt={shipment.shippedAt}
            deliveredAt={shipment.deliveredAt}
            t={t}
          />
        </CardContent>
      </Card>

      {/* Inline KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex items-center gap-2 rounded-lg border p-3">
          <Package className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold tabular-nums">{shipment.totalItems}</p>
            <p className="text-[10px] text-muted-foreground">{t('Items')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border p-3">
          <Weight className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold tabular-nums">
              {shipment.totalWeightGrams != null ? `${(shipment.totalWeightGrams / 1000).toFixed(1)} kg` : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground">{t('Weight')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border p-3">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold tabular-nums">
              {shipment.shippingCost != null ? `€${shipment.shippingCost.toFixed(2)}` : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground">{t('Shipping Cost')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border p-3">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold truncate">{shipment.sourceLocationName || '—'}</p>
            <p className="text-[10px] text-muted-foreground">{t('Location')}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recipient Card */}
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" /> {t('Recipient')}
              </CardTitle>
              {isDraft && !editingRecipient && (
                <Button variant="ghost" size="sm" onClick={() => startEditing('recipient')}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> {t('Edit', { ns: 'common' })}
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              <EditableField label={t('Recipient Name')} value={shipment.recipientName} editing={editingRecipient} editValue={editFields.recipientName || ''} onChange={v => setEditFields(f => ({ ...f, recipientName: v }))} />
              <EditableField label={t('Company')} value={shipment.recipientCompany || ''} editing={editingRecipient} editValue={editFields.recipientCompany || ''} onChange={v => setEditFields(f => ({ ...f, recipientCompany: v }))} />
              <EditableField label={t('Email')} value={shipment.recipientEmail || ''} editing={editingRecipient} editValue={editFields.recipientEmail || ''} onChange={v => setEditFields(f => ({ ...f, recipientEmail: v }))} />
              <EditableField label={t('Phone')} value={shipment.recipientPhone || ''} editing={editingRecipient} editValue={editFields.recipientPhone || ''} onChange={v => setEditFields(f => ({ ...f, recipientPhone: v }))} />
              <div className="border-t pt-2 mt-2">
                <EditableField label={t('Street')} value={shipment.shippingStreet} editing={editingRecipient} editValue={editFields.shippingStreet || ''} onChange={v => setEditFields(f => ({ ...f, shippingStreet: v }))} />
                <EditableField label={t('City')} value={`${shipment.shippingPostalCode} ${shipment.shippingCity}`} editing={false} editValue="" onChange={() => {}} />
                {editingRecipient && (
                  <>
                    <EditableField label={t('Postal Code')} value="" editing editValue={editFields.shippingPostalCode || ''} onChange={v => setEditFields(f => ({ ...f, shippingPostalCode: v }))} />
                    <EditableField label={t('City')} value="" editing editValue={editFields.shippingCity || ''} onChange={v => setEditFields(f => ({ ...f, shippingCity: v }))} />
                  </>
                )}
                <EditableField label={t('Country')} value={shipment.shippingCountry} editing={editingRecipient} editValue={editFields.shippingCountry || ''} onChange={v => setEditFields(f => ({ ...f, shippingCountry: v }))} />
              </div>
              {editingRecipient && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => saveEdit('recipient')} disabled={saving}><Check className="h-3.5 w-3.5 mr-1" />{t('Save', { ns: 'common' })}</Button>
                  <Button size="sm" variant="outline" onClick={() => cancelEdit('recipient')}><X className="h-3.5 w-3.5 mr-1" />{t('Cancel', { ns: 'common' })}</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shipping Card */}
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4" /> {t('Shipping')}
              </CardTitle>
              {isDraft && !editingShipping && (
                <Button variant="ghost" size="sm" onClick={() => startEditing('shipping')}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> {t('Edit', { ns: 'common' })}
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              <EditableField label={t('Carrier')} value={shipment.carrier || ''} editing={editingShipping} editValue={editFields.carrier || ''} onChange={v => setEditFields(f => ({ ...f, carrier: v }))} />
              <div className="flex justify-between items-center gap-2">
                <span className="text-muted-foreground text-sm shrink-0">{t('Tracking Number')}</span>
                {editingShipping ? (
                  <Input value={editFields.trackingNumber || ''} onChange={(e) => setEditFields(f => ({ ...f, trackingNumber: e.target.value }))} className="max-w-[200px] h-8 text-sm" />
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-sm">{shipment.trackingNumber || '—'}</span>
                    {shipment.trackingNumber && (
                      <>
                        <Button
                          variant="ghost" size="icon" className="h-6 w-6"
                          onClick={() => { navigator.clipboard.writeText(shipment.trackingNumber!); toast.success(t('Copy tracking number')); }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        {trackingUrl && (
                          <a href={trackingUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="h-6 w-6"><ExternalLink className="h-3 w-3" /></Button>
                          </a>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              <EditableField label={t('Service Level')} value={shipment.serviceLevel || ''} editing={editingShipping} editValue={editFields.serviceLevel || ''} onChange={v => setEditFields(f => ({ ...f, serviceLevel: v }))} />
              <EditableField label={t('Estimated Delivery')} value={shipment.estimatedDelivery ? new Date(shipment.estimatedDelivery).toLocaleDateString() : ''} editing={editingShipping} editValue={editFields.estimatedDelivery || ''} onChange={v => setEditFields(f => ({ ...f, estimatedDelivery: v }))} />
              <EditableField label={t('Shipping Cost')} value={shipment.shippingCost != null ? `€${shipment.shippingCost.toFixed(2)}` : ''} editing={editingShipping} editValue={editFields.shippingCost || ''} onChange={v => setEditFields(f => ({ ...f, shippingCost: v }))} />
              <EditableField label={t('Weight')} value={shipment.totalWeightGrams != null ? `${shipment.totalWeightGrams} g (${(shipment.totalWeightGrams / 1000).toFixed(1)} kg)` : ''} editing={editingShipping} editValue={editFields.totalWeightGrams || ''} onChange={v => setEditFields(f => ({ ...f, totalWeightGrams: v }))} />
              {shipment.carrierLabelData?.carrier === 'DHL' && !editingShipping && (
                <div className="border-t pt-2 mt-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">{t('DHL Shipment Number')}</span>
                    <span className="font-mono text-sm">{shipment.carrierLabelData.dhlShipmentNumber || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">{t('Default Product')}</span>
                    <span className="text-sm">{shipment.carrierLabelData.dhlProduct || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">{t('Label Format')}</span>
                    <span className="text-sm">{shipment.carrierLabelData.labelFormat || '—'}</span>
                  </div>
                </div>
              )}
              {editingShipping && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => saveEdit('shipping')} disabled={saving}><Check className="h-3.5 w-3.5 mr-1" />{t('Save', { ns: 'common' })}</Button>
                  <Button size="sm" variant="outline" onClick={() => cancelEdit('shipping')}><X className="h-3.5 w-3.5 mr-1" />{t('Cancel', { ns: 'common' })}</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reference Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> {t('Reference')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Order Reference')}</span>
                <span>{shipment.orderReference || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Recipient Type')}</span>
                <span>{t(shipment.recipientType)}</span>
              </div>
              {shipment.contactId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('Contact')}</span>
                  <Link to={`/warehouse/contacts/${shipment.contactId}`} className="text-primary hover:underline">{t('View Contact')}</Link>
                </div>
              )}
              {shipment.sourceLocationId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('Location')}</span>
                  <Link to={`/warehouse/locations/${shipment.sourceLocationId}`} className="text-primary hover:underline">{shipment.sourceLocationName || t('View')}</Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes Card */}
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> {t('Notes')}
              </CardTitle>
              {!editingNotes && (
                <Button variant="ghost" size="sm" onClick={() => startEditing('notes')}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> {t('Edit', { ns: 'common' })}
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('External Notes')}</p>
                {editingNotes ? (
                  <Textarea value={editFields.notes || ''} onChange={(e) => setEditFields(f => ({ ...f, notes: e.target.value }))} rows={2} />
                ) : (
                  <p className="text-sm">{shipment.notes || '—'}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('Internal Notes')}</p>
                {editingNotes ? (
                  <Textarea value={editFields.internalNotes || ''} onChange={(e) => setEditFields(f => ({ ...f, internalNotes: e.target.value }))} rows={2} />
                ) : (
                  <p className="text-sm">{shipment.internalNotes || '—'}</p>
                )}
              </div>
              {editingNotes && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveEdit('notes')} disabled={saving}><Check className="h-3.5 w-3.5 mr-1" />{t('Save', { ns: 'common' })}</Button>
                  <Button size="sm" variant="outline" onClick={() => cancelEdit('notes')}><X className="h-3.5 w-3.5 mr-1" />{t('Cancel', { ns: 'common' })}</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Items */}
      {activeTab === 'items' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Product')}</TableHead>
                    <TableHead>{t('Batch')}</TableHead>
                    <TableHead>{t('Location')}</TableHead>
                    <TableHead className="text-right">{t('Quantity')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('picking')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('packed')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">{t('No results found')}</TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => {
                      const pickPct = item.quantity > 0 ? Math.round((item.quantityPicked / item.quantity) * 100) : 0;
                      const packPct = item.quantity > 0 ? Math.round((item.quantityPacked / item.quantity) * 100) : 0;
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Link to={`/products/${item.productId}`} className="font-medium text-primary hover:underline">
                              {item.productName || item.productId.slice(0, 8)}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Link to={`/products/${item.productId}/batches/${item.batchId}`} className="hover:underline">
                              {item.batchSerialNumber || item.batchId.slice(0, 8)}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {item.locationName ? (
                              <Link to={`/warehouse/locations/${item.locationId}`} className="hover:underline">{item.locationName}</Link>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">{item.quantity}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="flex items-center gap-2 min-w-[80px]">
                              <Progress value={pickPct} className="h-1.5 flex-1" />
                              <span className="text-xs tabular-nums text-muted-foreground">{item.quantityPicked}/{item.quantity}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="flex items-center gap-2 min-w-[80px]">
                              <Progress value={packPct} className="h-1.5 flex-1" />
                              <span className="text-xs tabular-nums text-muted-foreground">{item.quantityPacked}/{item.quantity}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab: Activity */}
      {activeTab === 'activity' && (
        <>
        {shipment.carrier === 'DHL' && shipment.trackingNumber && (
          <DHLTrackingPanel trackingNumber={shipment.trackingNumber} />
        )}
        <Card>
          <CardContent className="pt-6">
            <div className="relative pl-6 space-y-6">
              {/* Timeline line */}
              <div className="absolute left-2.5 top-1 bottom-1 w-px bg-border" />

              {/* Created */}
              <TimelineEntry
                icon={<FileText className="h-3.5 w-3.5" />}
                title={t('draft')}
                date={shipment.createdAt}
                description={t('Shipment created successfully')}
              />

              {/* Shipped */}
              {shipment.shippedAt && (
                <TimelineEntry
                  icon={<Truck className="h-3.5 w-3.5" />}
                  title={t('shipped')}
                  date={shipment.shippedAt}
                  description={shipment.shippedBy ? `${t('Shipped By')}: ${shipment.shippedBy.slice(0, 8)}...` : undefined}
                />
              )}

              {/* Delivered */}
              {shipment.deliveredAt && (
                <TimelineEntry
                  icon={<Check className="h-3.5 w-3.5" />}
                  title={t('delivered')}
                  date={shipment.deliveredAt}
                />
              )}

              {/* Cancelled */}
              {shipment.status === 'cancelled' && (
                <TimelineEntry
                  icon={<X className="h-3.5 w-3.5" />}
                  title={t('cancelled')}
                  date={shipment.updatedAt}
                  variant="destructive"
                />
              )}
            </div>
          </CardContent>
        </Card>
        </>
      )}

      {/* Action Bar */}
      {!isTerminal && (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t -mx-4 px-4 py-3 sm:-mx-6 sm:px-6 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {prevStatus && currentIdx > 0 && (
              <Button variant="outline" size="sm" onClick={() => handleStatusChange(prevStatus)} disabled={statusUpdating}>
                <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                {t(prevStatus)}
              </Button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {shipment.carrier === 'DHL' && (
              <DHLLabelActions shipment={shipment} onUpdate={reloadShipment} />
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">{t('Cancel Shipment')}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('Are you sure you want to cancel this shipment?')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('This action will release all reserved stock.')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('Cancel', { ns: 'common' })}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleStatusChange('cancelled')} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {t('Confirm Cancellation')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {nextStatus && (
              <Button onClick={() => handleStatusChange(nextStatus)} disabled={statusUpdating}>
                {t(NEXT_STATUS_LABELS[shipment.status]) || t(`Mark as ${nextStatus}`)}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Timeline Entry                                                             */
/* -------------------------------------------------------------------------- */

function TimelineEntry({ icon, title, date, description, variant }: {
  icon: React.ReactNode;
  title: string;
  date: string;
  description?: string;
  variant?: 'destructive';
}) {
  return (
    <div className="relative flex gap-3">
      <div className={`absolute -left-6 top-0 flex h-5 w-5 items-center justify-center rounded-full border ${
        variant === 'destructive'
          ? 'bg-red-100 border-red-300 text-red-600 dark:bg-red-900/30 dark:border-red-700'
          : 'bg-background border-border text-muted-foreground'
      }`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{title}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        </div>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </div>
  );
}
