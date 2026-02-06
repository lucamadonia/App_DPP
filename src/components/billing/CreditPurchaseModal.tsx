/**
 * CreditPurchaseModal — Modal to purchase AI credit packs.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Check, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CREDIT_PACKS, type CreditPack } from '@/types/billing';
import { createCheckoutSession } from '@/services/supabase/billing';
import { getCreditPackPriceId } from '@/config/stripe-prices';

interface CreditPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreditPurchaseModal({ open, onOpenChange }: CreditPurchaseModalProps) {
  const { t, i18n } = useTranslation('billing');
  const [selectedPack, setSelectedPack] = useState<CreditPack | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchase = async () => {
    if (!selectedPack) return;

    const priceId = getCreditPackPriceId(selectedPack.id);
    if (!priceId) return;

    setIsLoading(true);
    try {
      const result = await createCheckoutSession({
        priceId,
        mode: 'payment',
        successUrl: `${window.location.origin}/settings/billing?credits=success`,
        cancelUrl: `${window.location.origin}/settings/billing`,
        metadata: {
          credit_pack: selectedPack.id,
          credits: String(selectedPack.credits),
        },
        locale: i18n.language,
      });

      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Failed to create checkout:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('Buy AI Credits')}
          </DialogTitle>
          <DialogDescription>
            {t('Purchased credits never expire and are used after monthly credits.')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {CREDIT_PACKS.map((pack) => (
            <Card
              key={pack.id}
              className={cn(
                'cursor-pointer transition-all hover:border-primary/50',
                selectedPack?.id === pack.id && 'border-primary ring-1 ring-primary',
              )}
              onClick={() => setSelectedPack(pack)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full',
                    selectedPack?.id === pack.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted',
                  )}>
                    {selectedPack?.id === pack.id
                      ? <Check className="h-5 w-5" />
                      : <Sparkles className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-medium">
                      {pack.credits} {t('Credits')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      €{pack.pricePerCredit.toFixed(3)} / {t('credit')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">€{pack.priceEur}</p>
                  {pack.id === 'large' && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {t('Best value')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button
          className="w-full"
          size="lg"
          disabled={!selectedPack || isLoading}
          onClick={handlePurchase}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {selectedPack
            ? t('Buy {{count}} Credits for €{{price}}', {
                count: selectedPack.credits,
                price: selectedPack.priceEur,
              })
            : t('Select a pack')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
