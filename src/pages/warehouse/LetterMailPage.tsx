/**
 * Letter Mail — frank letters with Deutsche Post INTERNETMARKE without a
 * warehouse shipment, e.g. to post an invoice. The stamp is bought through
 * the dhl-shipping Edge Function and merged into the address window of an
 * uploaded PDF (or onto a blank address sheet) in the browser.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Download, FileText, Loader2, Mail, Undo2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PageContainer } from '@/components/layout/page-container';
import { getDHLSettings, getDeutschePostLetterProducts } from '@/services/supabase/dhl-carrier';
import { getContacts } from '@/services/supabase/wh-contacts';
import {
  createLetter, downloadLetterStamp, fetchPdfBytes, getLetters, refundLetter,
} from '@/services/supabase/letters';
import { composeFrankedLetter, downloadPdf, type LetterPlacement } from '@/lib/letter-pdf';
import { formatDate } from '@/lib/format';
import type { DeutschePostLetterProduct, LetterRecipient, WhLetter } from '@/types/dhl';
import type { WhContact } from '@/types/warehouse';

const EMPTY_RECIPIENT: LetterRecipient = {
  name: '', additionalName: '', street: '', postalCode: '', city: '', country: 'DE',
};
const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

function isGermany(country: string): boolean {
  const code = country.trim().toUpperCase();
  return code === '' || code === 'DE' || code === 'DEU';
}

function money(cents: number, currency = 'EUR'): string {
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency });
}

function fileSafe(value: string): string {
  return value.replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'brief';
}

export function LetterMailPage() {
  const { t } = useTranslation('warehouse');
  const [ready, setReady] = useState<boolean | null>(null);
  const [products, setProducts] = useState<DeutschePostLetterProduct[]>([]);
  const [contacts, setContacts] = useState<WhContact[]>([]);
  const [letters, setLetters] = useState<WhLetter[]>([]);
  const [recipient, setRecipient] = useState<LetterRecipient>(EMPTY_RECIPIENT);
  const [reference, setReference] = useState('');
  const [productCode, setProductCode] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [placement, setPlacement] = useState<LetterPlacement>('window');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<WhLetter | null>(null);

  const loadLetters = useCallback(async () => {
    try {
      setLetters(await getLetters());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('Could not load letters'));
    }
  }, [t]);

  useEffect(() => {
    void (async () => {
      const settings = await getDHLSettings().catch(() => null);
      const isReady = !!(settings?.internetmarke.enabled && settings.internetmarke.hasCredentials);
      setReady(isReady);
      void loadLetters();
      getContacts({ activeOnly: true }).then(setContacts).catch(() => setContacts([]));
      if (!isReady) return;
      try {
        setProducts(await getDeutschePostLetterProducts());
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('Could not load letter products'));
      }
    })();
  }, [loadLetters, t]);

  const transport = isGermany(recipient.country) ? 'national' : 'international';
  const matchingProducts = useMemo(
    () => products.filter((product) => product.transport === transport),
    [products, transport],
  );
  const selectedProduct = matchingProducts.find((product) => product.productCode === productCode);

  // Keep the selection valid when the destination switches national/international.
  useEffect(() => {
    if (!matchingProducts.some((product) => product.productCode === productCode)) {
      setProductCode(matchingProducts[0]?.productCode || '');
    }
  }, [matchingProducts, productCode]);

  const addressContacts = useMemo(
    () => contacts.filter((contact) => contact.street && contact.postalCode && contact.city),
    [contacts],
  );

  const applyContact = (contactId: string) => {
    const contact = addressContacts.find((entry) => entry.id === contactId);
    if (!contact) return;
    setRecipient({
      name: contact.companyName || contact.contactName,
      additionalName: contact.companyName ? contact.contactName : '',
      street: contact.street || '',
      postalCode: contact.postalCode || '',
      city: contact.city || '',
      country: contact.country || 'DE',
    });
  };

  const setField = (field: keyof LetterRecipient) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setRecipient((current) => ({ ...current, [field]: event.target.value }));

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file && file.type !== 'application/pdf') {
      toast.error(t('Please choose a PDF file'));
      event.target.value = '';
      return;
    }
    if (file && file.size > MAX_DOCUMENT_BYTES) {
      toast.error(t('The PDF is too large (max. 15 MB)'));
      event.target.value = '';
      return;
    }
    setDocumentFile(file);
  };

  const formComplete = !!(recipient.name.trim() && recipient.street.trim()
    && recipient.postalCode.trim() && recipient.city.trim() && selectedProduct);

  const handleBuy = async () => {
    setConfirmOpen(false);
    setBusy(true);
    try {
      // Read the document first so a broken file fails before any money is spent.
      const documentPdf = documentFile ? new Uint8Array(await documentFile.arrayBuffer()) : undefined;
      const result = await createLetter({ recipient, productCode, reference: reference.trim() || undefined });
      void loadLetters();
      try {
        const stampPdf = await fetchPdfBytes(result.stampUrl);
        const merged = await composeFrankedLetter({ stampPdf, documentPdf, placement });
        downloadPdf(merged, `brief-${fileSafe(reference || recipient.name)}.pdf`);
        toast.success(t('Letter created — {{product}}', { product: result.productName }));
        setRecipient(EMPTY_RECIPIENT);
        setReference('');
        setDocumentFile(null);
      } catch (err) {
        console.error('[letters] compose failed:', err);
        toast.error(t('The stamp was purchased, but the PDF could not be created. Download the stamp from the history below.'));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('Could not create the letter'));
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadStamp = async (letter: WhLetter) => {
    setRowBusy(letter.id);
    try {
      const stampPdf = await downloadLetterStamp(letter.stampStoragePath);
      const merged = await composeFrankedLetter({ stampPdf, placement: 'cover' });
      downloadPdf(merged, `brief-${fileSafe(letter.reference || letter.recipientName)}.pdf`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('Could not load the stamp PDF'));
    } finally {
      setRowBusy(null);
    }
  };

  const handleRefund = async () => {
    if (!refundTarget) return;
    const letter = refundTarget;
    setRefundTarget(null);
    setRowBusy(letter.id);
    try {
      await refundLetter(letter.id);
      toast.success(t('Letter stamp refund requested'));
      await loadLetters();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('Could not request the refund'));
    } finally {
      setRowBusy(null);
    }
  };

  return (
    <PageContainer
      stack
      title={t('Letter Mail')}
      description={t('Frank letters and invoices with Deutsche Post INTERNETMARKE and print them ready for a window envelope.')}
    >
      {ready === false && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <span>{t('Deutsche Post INTERNETMARKE is not set up yet.')}</span>
            <Button asChild size="sm" variant="outline">
              <Link to="/warehouse/integrations/dhl">{t('Configure DHL')}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" /> {t('New letter')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {addressContacts.length > 0 && (
            <div className="space-y-1.5">
              <Label>{t('Fill from contact')}</Label>
              <Select onValueChange={applyContact}>
                <SelectTrigger><SelectValue placeholder={t('Choose a contact (optional)')} /></SelectTrigger>
                <SelectContent>
                  {addressContacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.companyName ? `${contact.companyName} — ${contact.contactName}` : contact.contactName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="letter-name">{t('Recipient (name or company)')}</Label>
              <Input id="letter-name" value={recipient.name} onChange={setField('name')} maxLength={50} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="letter-additional">{t('Additional line (optional)')}</Label>
              <Input id="letter-additional" value={recipient.additionalName} onChange={setField('additionalName')} maxLength={50} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="letter-street">{t('Street and house number')}</Label>
              <Input id="letter-street" value={recipient.street} onChange={setField('street')} maxLength={50} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="letter-postal">{t('Postal code')}</Label>
              <Input id="letter-postal" value={recipient.postalCode} onChange={setField('postalCode')} maxLength={12} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="letter-city">{t('City')}</Label>
              <Input id="letter-city" value={recipient.city} onChange={setField('city')} maxLength={40} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="letter-country">{t('Country code (e.g. DE, AT)')}</Label>
              <Input id="letter-country" value={recipient.country} onChange={setField('country')} maxLength={3} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="letter-reference">{t('Reference, e.g. invoice number (optional)')}</Label>
              <Input id="letter-reference" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={80} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t('Letter product')}</Label>
            <Select value={productCode} onValueChange={setProductCode} disabled={!ready || matchingProducts.length === 0}>
              <SelectTrigger><SelectValue placeholder={t('Select a letter product')} /></SelectTrigger>
              <SelectContent>
                {matchingProducts.map((product) => (
                  <SelectItem key={product.productCode} value={product.productCode}>
                    {product.name} — {money(product.priceCents, product.currency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProduct && (
              <p className="text-xs text-muted-foreground">
                {t('Live price from Deutsche Post')} · {t('up to')} {selectedProduct.maxWeightGrams ?? '—'} g
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="letter-document">{t('Invoice or document as PDF (optional)')}</Label>
            <Input id="letter-document" type="file" accept="application/pdf" onChange={handleFile} />
            <p className="text-xs text-muted-foreground">
              {documentFile
                ? t('The stamp and address are placed on the document so it fits a window envelope.')
                : t('Without a document you get an address sheet with the stamp to put in front of your letter.')}
            </p>
          </div>

          {documentFile && (
            <div className="space-y-1.5">
              <Label>{t('Stamp position')}</Label>
              <Select value={placement} onValueChange={(value) => setPlacement(value as LetterPlacement)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="window">{t('Address window on page 1 (replaces the printed address)')}</SelectItem>
                  <SelectItem value="cover">{t('Separate address sheet in front')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Button onClick={() => setConfirmOpen(true)} disabled={!ready || !formComplete || busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            {t('Buy stamp and create letter')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t('Letter history')}</CardTitle></CardHeader>
        <CardContent>
          {letters.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('No letters yet')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Date')}</TableHead>
                    <TableHead>{t('Recipient')}</TableHead>
                    <TableHead>{t('Reference')}</TableHead>
                    <TableHead>{t('Letter product')}</TableHead>
                    <TableHead className="text-right">{t('Postage')}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {letters.map((letter) => (
                    <TableRow key={letter.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(letter.createdAt)}</TableCell>
                      <TableCell>
                        {letter.recipientName}
                        <span className="block text-xs text-muted-foreground">
                          {letter.recipientPostalCode} {letter.recipientCity}
                        </span>
                      </TableCell>
                      <TableCell>{letter.reference || '—'}</TableCell>
                      <TableCell>{letter.productName}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{money(letter.priceCents, letter.currency)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {letter.status === 'refund_requested' ? (
                          <Badge variant="secondary">{t('Refund requested')}</Badge>
                        ) : (
                          <>
                            <Button
                              variant="ghost" size="sm" disabled={rowBusy === letter.id}
                              onClick={() => void handleDownloadStamp(letter)}
                              aria-label={t('Download stamp')} title={t('Download stamp')}
                            >
                              {rowBusy === letter.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost" size="sm" disabled={rowBusy === letter.id}
                              onClick={() => setRefundTarget(letter)}
                              aria-label={t('Refund letter stamp')} title={t('Refund letter stamp')}
                            >
                              <Undo2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Buy letter stamp?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedProduct && t('{{product}} for {{price}} will be charged to your Portokasse now.', {
                product: selectedProduct.name,
                price: money(selectedProduct.priceCents, selectedProduct.currency),
              })}{' '}
              <a
                href="https://www.internetmarke.de/agb.html" target="_blank" rel="noopener noreferrer"
                className="underline"
              >
                {t('The INTERNETMARKE terms and conditions of Deutsche Post apply.')}
              </a>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel', { ns: 'common' })}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleBuy()}>{t('Buy stamp and create letter')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!refundTarget} onOpenChange={(open) => { if (!open) setRefundTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Refund letter stamp')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('This requests a refund from Deutsche Post. The stamp must not be used afterwards.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel', { ns: 'common' })}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleRefund()}>{t('Refund letter stamp')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
