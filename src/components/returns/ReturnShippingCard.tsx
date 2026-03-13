import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Truck,
  Download,
  Printer,
  XCircle,
  Send,
  Loader2,
  Package,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
  Tag,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createReturnLabel,
  cancelReturnLabel,
  getReturnDHLTracking,
  getDHLSettings,
} from '@/services/supabase/dhl-carrier';
import { triggerEmailNotification } from '@/services/supabase/rh-notification-trigger';
import type { RhReturn } from '@/types/returns-hub';
import type { DHLTrackingEvent, DHLSettingsPublic } from '@/types/dhl';

interface ReturnShippingCardProps {
  returnData: RhReturn;
  onUpdate: () => void;
}

const DHL_TRACKING_URL = 'https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=';

function getStatusColor(statusCode: string | undefined): string {
  if (!statusCode) return 'bg-muted border-border text-muted-foreground';
  const code = statusCode.toLowerCase();
  if (code === 'delivered') return 'bg-emerald-100 border-emerald-300 text-emerald-600';
  if (code === 'transit' || code === 'out-for-delivery' || code === 'delivery') return 'bg-yellow-100 border-yellow-300 text-yellow-600';
  return 'bg-muted border-border text-muted-foreground';
}

export function ReturnShippingCard({ returnData, onUpdate }: ReturnShippingCardProps) {
  const { t } = useTranslation('returns');
  const [generating, setGenerating] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [sendingLabel, setSendingLabel] = useState(false);
  const [sentLabel, setSentLabel] = useState(false);
  const [dhlSettings, setDhlSettings] = useState<DHLSettingsPublic | null>(null);

  // Tracking state
  const [trackingEvents, setTrackingEvents] = useState<DHLTrackingEvent[]>([]);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Manual address form
  const [manualAddress, setManualAddress] = useState({
    name1: '',
    addressStreet: '',
    postalCode: '',
    city: '',
    country: 'DE',
  });

  // Load DHL settings on mount
  useEffect(() => {
    getDHLSettings().then(setDhlSettings).catch(() => {});
  }, []);

  // Load tracking events when tracking number exists
  const loadTracking = useCallback(async () => {
    if (!returnData.trackingNumber) return;
    setTrackingLoading(true);
    try {
      const events = await getReturnDHLTracking(returnData.trackingNumber);
      setTrackingEvents(events);
      setLastUpdated(new Date());
    } catch {
      setTrackingEvents([]);
    } finally {
      setTrackingLoading(false);
    }
  }, [returnData.trackingNumber]);

  useEffect(() => {
    loadTracking();
  }, [loadTracking]);

  // Auto-refresh tracking every 60s
  useEffect(() => {
    if (!returnData.trackingNumber) return;
    const interval = setInterval(loadTracking, 60_000);
    return () => clearInterval(interval);
  }, [loadTracking, returnData.trackingNumber]);

  const handleGenerateLabel = async (senderAddress?: Record<string, unknown>) => {
    setGenerating(true);
    setError('');
    try {
      await createReturnLabel(returnData.id, senderAddress);
      onUpdate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate label';
      if (msg.includes('No shipping address')) {
        setAddressDialogOpen(true);
      } else {
        setError(msg);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleCancelLabel = async () => {
    setCancelling(true);
    setError('');
    try {
      await cancelReturnLabel(returnData.id);
      setCancelDialogOpen(false);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel label');
    } finally {
      setCancelling(false);
    }
  };

  const handleSendToCustomer = async () => {
    setSendingLabel(true);
    try {
      const email = (returnData.metadata as Record<string, unknown>)?.email as string;
      if (!email) throw new Error('No customer email found');
      await triggerEmailNotification('return_label_ready', {
        recipientEmail: email,
        returnNumber: returnData.returnNumber,
        status: returnData.status,
        returnId: returnData.id,
        customerId: returnData.customerId,
      });
      setSentLabel(true);
      setTimeout(() => setSentLabel(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send label');
    } finally {
      setSendingLabel(false);
    }
  };

  const handleManualAddressSubmit = () => {
    setAddressDialogOpen(false);
    handleGenerateLabel(manualAddress);
  };

  const hasLabel = !!returnData.trackingNumber && !!returnData.labelUrl;
  const canGenerateLabel = ['APPROVED'].includes(returnData.status) && !hasLabel;
  const canCancelLabel = returnData.status === 'LABEL_GENERATED' && hasLabel;
  const showTracking = !!returnData.trackingNumber && ['LABEL_GENERATED', 'SHIPPED', 'DELIVERED', 'INSPECTION_IN_PROGRESS', 'REFUND_PROCESSING', 'REFUND_COMPLETED', 'COMPLETED'].includes(returnData.status);
  const dhlConfigured = dhlSettings?.hasCredentials && dhlSettings?.enabled;

  const topStatus = trackingEvents[0]?.statusCode;
  const isDelivered = topStatus?.toLowerCase() === 'delivered';

  return (
    <>
      <div className="space-y-4">
        {/* DHL Configuration Status */}
        {!dhlConfigured && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="py-3 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">{t('DHL not configured')}</p>
                <p className="text-xs text-amber-600">{t('Set up DHL credentials in Warehouse > DHL Integration to generate return labels.')}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generate Label Section */}
        {canGenerateLabel && dhlConfigured && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Tag className="h-4 w-4" />
                {t('Generate Return Label')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t('Create a DHL return shipping label for this return. The label will be stored and can be sent to the customer.')}
              </p>
              <Button
                onClick={() => handleGenerateLabel()}
                disabled={generating}
                className="gap-2"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Truck className="h-4 w-4" />
                )}
                {generating ? t('Generating label...') : t('Generate DHL Return Label')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Label Info + Actions */}
        {hasLabel && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-yellow-400 text-[8px] font-extrabold text-red-600 leading-none">
                  DHL
                </div>
                {t('DHL Return Label')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Tracking number */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{t('Tracking Number')}</p>
                  <p className="font-mono text-sm font-medium">{returnData.trackingNumber}</p>
                </div>
                <a
                  href={`${DHL_TRACKING_URL}${returnData.trackingNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  {t('Track on DHL')}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Label created date */}
              {returnData.carrierLabelData?.createdAt && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {t('Label created on')} {new Date(returnData.carrierLabelData.createdAt).toLocaleDateString()}
                </div>
              )}

              {/* Label expiry warning */}
              {returnData.labelExpiresAt && new Date(returnData.labelExpiresAt) < new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600">
                  <AlertCircle className="h-3 w-3" />
                  {t('Label URL expires soon. Download the label to keep a copy.')}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  asChild
                >
                  <a href={returnData.labelUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="h-3.5 w-3.5" />
                    {t('Download Label')}
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => window.open(returnData.labelUrl, '_blank')}
                >
                  <Printer className="h-3.5 w-3.5" />
                  {t('Print Label')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleSendToCustomer}
                  disabled={sendingLabel}
                >
                  {sendingLabel ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : sentLabel ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  {sentLabel ? t('Sent!') : t('Send Label to Customer')}
                </Button>
                {canCancelLabel && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    onClick={() => setCancelDialogOpen(true)}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    {t('Cancel Label')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Live Tracking */}
        {showTracking && (
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  {t('Shipment Tracking')}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {topStatus && (
                    <Badge variant="secondary" className={`text-xs ${isDelivered ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                      {isDelivered ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Truck className="h-3 w-3 mr-1" />}
                      {isDelivered ? t('Delivered') : t('In Transit')}
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" onClick={loadTracking} disabled={trackingLoading} className="h-7 px-2">
                    {trackingLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {trackingLoading && trackingEvents.length === 0 ? (
                <div className="space-y-4 py-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="h-5 w-5 rounded-full bg-muted shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 w-3/4 rounded bg-muted" />
                        <div className="h-3 w-1/2 rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : trackingEvents.length === 0 ? (
                <div className="text-center py-6 space-y-2">
                  <Package className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                  <p className="text-sm text-muted-foreground">{t('Tracking data unavailable')}</p>
                  <p className="text-xs text-muted-foreground">{t('Tracking data usually appears within a few hours after the parcel is dropped off.')}</p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-3">
                  <div className="absolute left-[9px] top-1 bottom-1 w-px bg-border" />
                  {trackingEvents.map((event, idx) => (
                    <div key={idx} className="relative flex gap-3">
                      <div className={`absolute -left-6 top-0 flex h-5 w-5 items-center justify-center rounded-full border ${
                        idx === 0 ? getStatusColor(event.statusCode) : 'bg-background border-border text-muted-foreground'
                      }`}>
                        {idx === 0 ? (
                          isDelivered ? <CheckCircle2 className="h-3 w-3" /> : <Truck className="h-3 w-3" />
                        ) : (
                          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${idx === 0 ? 'font-medium' : 'text-foreground/80'}`}>
                          {event.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-0.5">
                          {event.timestamp && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(event.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                          )}
                          {event.location && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {lastUpdated && trackingEvents.length > 0 && (
                <p className="text-[11px] text-muted-foreground mt-4 pt-3 border-t text-center">
                  {t('Last updated')}: {lastUpdated.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  {' · '}{t('Auto-refreshes every minute')}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="py-3 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Cancel Label Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Cancel Label')}</DialogTitle>
            <DialogDescription>
              {t('Are you sure you want to cancel this return label? The tracking number will be removed and the status will revert to Approved.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>{t('Cancel', { ns: 'common' })}</Button>
            <Button variant="destructive" onClick={handleCancelLabel} disabled={cancelling}>
              {cancelling ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
              {t('Cancel Label')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Address Dialog */}
      <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Customer Shipping Address')}</DialogTitle>
            <DialogDescription>
              {t('No shipping address available for this customer. Please enter the address for the return label.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t('Name')}</Label>
              <Input
                value={manualAddress.name1}
                onChange={(e) => setManualAddress(p => ({ ...p, name1: e.target.value }))}
                placeholder={t('Customer name or company')}
              />
            </div>
            <div>
              <Label>{t('Street')}</Label>
              <Input
                value={manualAddress.addressStreet}
                onChange={(e) => setManualAddress(p => ({ ...p, addressStreet: e.target.value }))}
                placeholder={t('Street and house number')}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>{t('Postal Code')}</Label>
                <Input
                  value={manualAddress.postalCode}
                  onChange={(e) => setManualAddress(p => ({ ...p, postalCode: e.target.value }))}
                  placeholder="12345"
                />
              </div>
              <div className="col-span-2">
                <Label>{t('City')}</Label>
                <Input
                  value={manualAddress.city}
                  onChange={(e) => setManualAddress(p => ({ ...p, city: e.target.value }))}
                  placeholder={t('City')}
                />
              </div>
            </div>
            <div>
              <Label>{t('Country Code')}</Label>
              <Input
                value={manualAddress.country}
                onChange={(e) => setManualAddress(p => ({ ...p, country: e.target.value }))}
                placeholder="DE"
                maxLength={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddressDialogOpen(false)}>{t('Cancel', { ns: 'common' })}</Button>
            <Button
              onClick={handleManualAddressSubmit}
              disabled={!manualAddress.name1 || !manualAddress.addressStreet || !manualAddress.postalCode || !manualAddress.city}
            >
              <Truck className="h-4 w-4 mr-1" />
              {t('Generate DHL Return Label')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
