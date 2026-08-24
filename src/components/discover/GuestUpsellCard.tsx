import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';

export type UpsellReason = 'ai' | 'qr' | 'checklist' | 'tips';

/**
 * Contextual invitation to create an account.
 *
 * RULES — please keep these true, they erode easily:
 *   1. Never modal, never timed, never blocking. No interstitial after N
 *      screens, no "you have used 3 of 5 free tools".
 *   2. Exactly one ambient affordance exists (the header button). This card is
 *      not ambient — it fires only AFTER the guest has got something out of the
 *      tool, and it sits inline in the content flow, dismissible.
 *   3. It sells the thing the guest just bumped into, not the product in
 *      general.
 *
 * Dismissal lives in component state on purpose: a later session may legitimately
 * offer it again, so it is not persisted.
 */
export function GuestUpsellCard({ reason }: { reason: UpsellReason }) {
  const { t } = useTranslation('journey');
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <GlassCard enableGlow className="relative border-primary/20 bg-primary/5 p-5">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={t('discover.upsell.dismiss')}
        className="touch-target absolute right-1 top-1 flex items-center justify-center text-muted-foreground"
      >
        <X className="size-4" />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/15 to-violet-500/15">
          <Sparkles className="size-4 text-primary" aria-hidden />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="text-body font-semibold leading-snug">
            {t(`discover.upsell.${reason}.title`)}
          </p>
          <p className="text-caption leading-relaxed text-muted-foreground">
            {t(`discover.upsell.${reason}.line`)}
          </p>
        </div>
      </div>

      <Button
        className="mt-4 h-11 w-full"
        onClick={() => navigate(`/login?mode=signup&from=discover&intent=${reason}`)}
      >
        {t('discover.upsell.cta')}
        <ArrowRight className="ml-1.5 size-4" />
      </Button>
    </GlassCard>
  );
}
