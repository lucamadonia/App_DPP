/**
 * Embeddable Tracking Widget
 *
 * Standalone, iframe-friendly page that lives at /widget/track. Customer
 * enters their order number + email; if both match, we deep-link to the
 * branded magic-link tracking page. No header, no app chrome — designed
 * to be embedded in shop.fambliss.de via:
 *
 *   <iframe src="https://dpp-app.fambliss.eu/widget/track"
 *           style="width:100%;height:520px;border:0" loading="lazy" />
 *
 * Sends postMessage('trackbliss-widget:resize', height) on load + on
 * state change so the host page can auto-size the iframe.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, Search, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { lookupShipmentByOrderAndEmail } from '@/services/supabase/shipment-tracking';

export function TrackingWidgetPage() {
  const { t } = useTranslation('tracking');
  const [order, setOrder] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Notify the host page about our height so the iframe auto-sizes.
  useEffect(() => {
    const ping = () => {
      const h = rootRef.current?.offsetHeight ?? 480;
      try {
        window.parent?.postMessage({ type: 'trackbliss-widget:resize', height: h }, '*');
      } catch {
        // not embedded, ignore
      }
    };
    ping();
    const ro = typeof ResizeObserver !== 'undefined' && rootRef.current
      ? new ResizeObserver(ping) : null;
    if (ro && rootRef.current) ro.observe(rootRef.current);
    return () => ro?.disconnect();
  }, [error, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order.trim() || !email.trim()) return;
    setLoading(true);
    setError(null);
    const result = await lookupShipmentByOrderAndEmail(order, email);
    setLoading(false);
    if (!result) {
      setError(t('widget_not_found'));
      return;
    }
    // Open the full branded tracking page. When embedded we break out of
    // the iframe so the customer ends up on the proper tracking URL.
    const url = `/t/${result.trackingToken}`;
    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({ type: 'trackbliss-widget:redirect', url }, '*');
      } catch { /* ignore */ }
      // Fallback: open in a new tab so the host page can ignore the message.
      window.open(url, '_top');
    } else {
      window.location.href = url;
    }
  };

  return (
    <div
      ref={rootRef}
      className="min-h-[480px] bg-background flex items-center justify-center p-4 sm:p-6"
    >
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-5">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight">
              {t('widget_title')}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t('widget_subtitle')}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="widget-order" className="text-xs">
              {t('widget_order_label')}
            </Label>
            <Input
              id="widget-order"
              autoComplete="off"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              placeholder="#1234"
              disabled={loading}
              required
              className="text-base sm:text-sm h-10"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="widget-email" className="text-xs">
              {t('widget_email_label')}
            </Label>
            <Input
              id="widget-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              disabled={loading}
              required
              className="text-base sm:text-sm h-10"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" disabled={loading || !order.trim() || !email.trim()} className="w-full h-10">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            {t('widget_submit')}
            {!loading && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        </form>

        <p className="text-[10px] text-muted-foreground/60 text-center mt-4">
          {t('widget_powered_by')}
        </p>
      </div>
    </div>
  );
}
