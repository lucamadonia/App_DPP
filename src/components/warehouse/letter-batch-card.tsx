/**
 * Serial letters: upload one PDF that contains many letters (e.g. a stack of
 * invoices), review the recipients read from the address windows, buy one
 * stamp per letter and download a single print file.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Files, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { createLetter, fetchPdfBytes } from '@/services/supabase/letters';
import { detectLetters, type DetectedLetter } from '@/lib/letter-batch';
import { detectStampRegion, downloadPdf, mergeLetterBatch, type PdfRegion } from '@/lib/letter-pdf';
import type { DeutschePostLetterProduct } from '@/types/dhl';

const MAX_DOCUMENT_BYTES = 40 * 1024 * 1024;

interface LetterBatchCardProps {
  ready: boolean;
  products: DeutschePostLetterProduct[];
  /** Called after stamps were bought, so the history can reload. */
  onPurchased: () => void;
}

function money(cents: number, currency = 'EUR'): string {
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency });
}

/** Serial letters are limited to Germany: one national product for all. */
function isSendable(letter: DetectedLetter): boolean {
  return !!letter.recipient && letter.recipient.country === 'DE';
}

export function LetterBatchCard({ ready, products, onPurchased }: LetterBatchCardProps) {
  const { t } = useTranslation('warehouse');
  const [fileName, setFileName] = useState('');
  const [documentPdf, setDocumentPdf] = useState<Uint8Array | null>(null);
  const [letters, setLetters] = useState<DetectedLetter[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [productCode, setProductCode] = useState('');
  const [reading, setReading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const nationalProducts = useMemo(
    () => products.filter((product) => product.transport === 'national'),
    [products],
  );
  const product = nationalProducts.find((entry) => entry.productCode === productCode) || nationalProducts[0];
  const chosen = letters.filter((_, index) => selected.has(index));
  const totalCents = product ? product.priceCents * chosen.length : 0;

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setLetters([]);
    setSelected(new Set());
    setDocumentPdf(null);
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error(t('Please choose a PDF file'));
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      toast.error(t('The PDF is too large (max. 40 MB)'));
      return;
    }
    setReading(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const detected = await detectLetters(bytes);
      setFileName(file.name.replace(/\.pdf$/i, ''));
      setDocumentPdf(bytes);
      setLetters(detected);
      setSelected(new Set(detected.flatMap((letter, index) => (isSendable(letter) ? [index] : []))));
    } catch (err) {
      console.error('[letters] batch read failed:', err);
      toast.error(t('Could not read the PDF'));
    } finally {
      setReading(false);
    }
  };

  const toggle = (index: number) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    return next;
  });

  const handleBuy = async () => {
    setConfirmOpen(false);
    if (!documentPdf || !product || chosen.length === 0) return;
    const done: { pages: number[]; stampPdf: Uint8Array; stampRegion: PdfRegion }[] = [];
    setProgress({ done: 0, total: chosen.length });
    let failure = '';
    // One purchase at a time; stop at the first error so nothing is bought blindly.
    for (const letter of chosen) {
      try {
        const result = await createLetter({
          recipient: letter.recipient!,
          productCode: product.productCode,
          reference: `${fileName} · ${t('p.')} ${letter.pages[0]}`.slice(0, 80),
        });
        const stampPdf = await fetchPdfBytes(result.stampUrl);
        done.push({ pages: letter.pages, stampPdf, stampRegion: await detectStampRegion(stampPdf) });
        setProgress({ done: done.length, total: chosen.length });
      } catch (err) {
        failure = err instanceof Error ? err.message : String(err);
        break;
      }
    }
    onPurchased();
    try {
      if (done.length > 0) {
        downloadPdf(await mergeLetterBatch({ documentPdf, letters: done }), `serienbrief-${fileName || 'briefe'}.pdf`);
      }
      if (failure) {
        toast.error(t('Stopped after {{done}} of {{total}} letters: {{error}}', {
          done: done.length, total: chosen.length, error: failure,
        }));
      } else {
        toast.success(t('{{n}} letters created', { n: done.length }));
      }
    } catch (err) {
      console.error('[letters] batch merge failed:', err);
      toast.error(t('The stamp was purchased, but the PDF could not be created. Download the stamp from the history below.'));
    } finally {
      setProgress(null);
    }
  };

  const buyLabel = t('Buy {{n}} stamps — {{price}}', { n: chosen.length, price: money(totalCents, product?.currency) });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Files className="h-4 w-4" /> {t('Serial letters from one PDF')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('Upload one PDF with several invoices. The recipient of each letter is read from the address window; pages with the same recipient stay together.')}
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="letter-batch-document">{t('PDF with several letters')}</Label>
          <Input id="letter-batch-document" type="file" accept="application/pdf" onChange={(e) => void handleFile(e)} disabled={!!progress} />
        </div>
        {reading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {t('Reading addresses...')}
          </p>
        )}

        {letters.length > 0 && (
          <>
            <ul className="divide-y rounded-lg border text-sm">
              {letters.map((letter, index) => (
                <li key={letter.pages[0]} className="flex items-start gap-3 p-3">
                  <Checkbox
                    className="mt-0.5"
                    checked={selected.has(index)}
                    disabled={!isSendable(letter) || !!progress}
                    onCheckedChange={() => toggle(index)}
                    aria-label={letter.recipient?.name || t('Unreadable address')}
                  />
                  <div className="min-w-0 flex-1">
                    {letter.recipient ? (
                      <>
                        <span className="font-medium">{letter.recipient.name}</span>
                        <span className="block text-muted-foreground">
                          {[letter.recipient.street, letter.recipient.additionalName].filter(Boolean).join(', ')}
                          {' · '}{letter.recipient.postalCode} {letter.recipient.city}
                          {letter.recipient.country !== 'DE' && ` · ${letter.recipient.country}`}
                        </span>
                        {letter.recipient.country !== 'DE' && (
                          <span className="block text-xs text-amber-700 dark:text-amber-400">
                            {t('Outside Germany: please create this letter individually.')}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-destructive">
                        {t('Unreadable address')}: {letter.addressLines.join(' / ') || '—'}
                      </span>
                    )}
                  </div>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {t('p.')} {letter.pages[0]}{letter.pages.length > 1 ? `–${letter.pages[letter.pages.length - 1]}` : ''}
                  </span>
                </li>
              ))}
            </ul>

            <div className="space-y-1.5">
              <Label>{t('Letter product')}</Label>
              <Select value={product?.productCode || ''} onValueChange={setProductCode} disabled={!ready || !!progress}>
                <SelectTrigger><SelectValue placeholder={t('Select a letter product')} /></SelectTrigger>
                <SelectContent>
                  {nationalProducts.map((entry) => (
                    <SelectItem key={entry.productCode} value={entry.productCode}>
                      {entry.name} — {money(entry.priceCents, entry.currency)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => setConfirmOpen(true)} disabled={!ready || !product || chosen.length === 0 || !!progress}>
              {progress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {progress
                ? t('Buying stamp {{done}} of {{total}}...', { done: Math.min(progress.done + 1, progress.total), total: progress.total })
                : buyLabel}
            </Button>
          </>
        )}
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{buyLabel}</AlertDialogTitle>
            <AlertDialogDescription>
              {product && t('{{n}} × {{product}} will be charged to your Portokasse now.', { n: chosen.length, product: product.name })}{' '}
              <a href="https://www.internetmarke.de/agb.html" target="_blank" rel="noopener noreferrer" className="underline">
                {t('The INTERNETMARKE terms and conditions of Deutsche Post apply.')}
              </a>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel', { ns: 'common' })}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleBuy()}>{t('Buy now')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
