import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  Award,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { REGISTRATION_FIELDS } from '@/lib/registration-fields';
import type { Product } from '@/types/product';
import type { ProductRegistrations } from '@/types/database';
import { getDocuments, type Document } from '@/services/supabase';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';

interface Props {
  product: Product;
}

export function ProductComplianceTab({ product }: Props) {
  const { t } = useTranslation('products');
  const locale = useLocale();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getDocuments().then(docs => {
      setDocuments(docs.filter(d => d.product_id === product.id));
      setIsLoading(false);
    });
  }, [product.id]);

  const registrations = (product.registrations || {}) as ProductRegistrations;
  const now = new Date();

  // Calculate registration completeness
  const filledRegistrations = REGISTRATION_FIELDS.filter(field => {
    const val = registrations[field.key as keyof ProductRegistrations];
    return val !== undefined && val !== null && val !== '';
  });
  const registrationScore = REGISTRATION_FIELDS.length > 0
    ? Math.round((filledRegistrations.length / REGISTRATION_FIELDS.length) * 100)
    : 0;

  // Certification status
  const certs = product.certifications || [];
  const validCerts = certs.filter(c => !c.validUntil || new Date(c.validUntil) > now);
  const expiringCerts = certs.filter(c => {
    if (!c.validUntil) return false;
    const d = new Date(c.validUntil);
    return d > now && d < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  });
  const expiredCerts = certs.filter(c => c.validUntil && new Date(c.validUntil) <= now);
  const certScore = certs.length > 0 ? Math.round((validCerts.length / certs.length) * 100) : 100;

  // Document status
  const validDocs = documents.filter(d => d.status === 'valid');
  const expiringDocs = documents.filter(d => d.status === 'expiring');
  const expiredDocs = documents.filter(d => d.status === 'expired');
  const docScore = documents.length > 0 ? Math.round((validDocs.length / documents.length) * 100) : 100;

  // Overall score
  const overallScore = Math.round((registrationScore * 0.3 + certScore * 0.35 + docScore * 0.35));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${
                overallScore >= 80 ? 'bg-success/10' : overallScore >= 50 ? 'bg-warning/10' : 'bg-destructive/10'
              }`}>
                <span className={`text-2xl font-bold ${
                  overallScore >= 80 ? 'text-success' : overallScore >= 50 ? 'text-warning' : 'text-destructive'
                }`}>
                  {overallScore}%
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{t('Overall Compliance')}</p>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-lg font-bold">{registrationScore}%</p>
                <p className="text-xs text-muted-foreground">{t('Registrations')}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-lg font-bold">{certScore}%</p>
                <p className="text-xs text-muted-foreground">{t('Certificates')}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-lg font-bold">{docScore}%</p>
                <p className="text-xs text-muted-foreground">{t('Documents')}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {(expiredCerts.length > 0 || expiredDocs.length > 0 || expiringCerts.length > 0 || expiringDocs.length > 0) && (
        <Card className="border-warning">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              {t('Warnings')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {expiredCerts.map((cert, i) => (
              <div key={`ec-${i}`} className="flex items-center gap-2 text-sm text-destructive">
                <XCircle className="h-4 w-4 flex-shrink-0" />
                <span>{t('Certificate expired')}: {cert.name} ({formatDate(cert.validUntil, locale)})</span>
              </div>
            ))}
            {expiredDocs.map(doc => (
              <div key={doc.id} className="flex items-center gap-2 text-sm text-destructive">
                <XCircle className="h-4 w-4 flex-shrink-0" />
                <span>{t('Document expired')}: {doc.name}</span>
              </div>
            ))}
            {expiringCerts.map((cert, i) => (
              <div key={`xc-${i}`} className="flex items-center gap-2 text-sm text-warning">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{t('Certificate expiring soon')}: {cert.name} ({formatDate(cert.validUntil, locale)})</span>
              </div>
            ))}
            {expiringDocs.map(doc => (
              <div key={doc.id} className="flex items-center gap-2 text-sm text-warning">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{t('Document expiring soon')}: {doc.name}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Registration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {t('Registration Status')}
          </CardTitle>
          <CardDescription>
            {t('{{filled}} of {{total}} registrations completed', {
              filled: filledRegistrations.length,
              total: REGISTRATION_FIELDS.length,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={registrationScore} className="h-2 mb-4" />
          <div className="grid gap-3 md:grid-cols-2">
            {REGISTRATION_FIELDS.map(field => {
              const value = registrations[field.key as keyof ProductRegistrations];
              const hasValue = value !== undefined && value !== null && value !== '';
              return (
                <div
                  key={field.key}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    hasValue ? 'border-success/30 bg-success/5' : 'border-muted'
                  }`}
                >
                  {hasValue ? (
                    <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{t(field.label)}</p>
                    {hasValue && (
                      <p className="text-xs text-muted-foreground truncate">
                        {Array.isArray(value) ? value.join(', ') : String(value)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Certifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-warning" />
            {t('Certifications')}
          </CardTitle>
          <CardDescription>
            {t('{{valid}} valid, {{expiring}} expiring, {{expired}} expired', {
              valid: validCerts.length,
              expiring: expiringCerts.length,
              expired: expiredCerts.length,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {certs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('No certifications recorded')}
            </p>
          ) : (
            <div className="space-y-3">
              {certs.map((cert, index) => {
                const isExpired = cert.validUntil && new Date(cert.validUntil) <= now;
                const isExpiring = !isExpired && cert.validUntil &&
                  new Date(cert.validUntil) < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                return (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      {isExpired ? (
                        <XCircle className="h-5 w-5 text-destructive" />
                      ) : isExpiring ? (
                        <AlertTriangle className="h-5 w-5 text-warning" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      )}
                      <div>
                        <p className="font-medium">{cert.name}</p>
                        <p className="text-sm text-muted-foreground">{cert.issuedBy}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {cert.validUntil && (
                        <Badge variant={isExpired ? 'destructive' : isExpiring ? 'secondary' : 'outline'}>
                          {formatDate(cert.validUntil, locale)}
                        </Badge>
                      )}
                      {cert.certificateUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={cert.certificateUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="mr-1 h-3 w-3" />
                            PDF
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Related Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {t('Compliance Documents')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('No compliance documents uploaded')}
            </p>
          ) : (
            <div className="space-y-2">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {doc.status === 'valid' && <CheckCircle2 className="h-4 w-4 text-success" />}
                    {doc.status === 'expiring' && <AlertTriangle className="h-4 w-4 text-warning" />}
                    {doc.status === 'expired' && <XCircle className="h-4 w-4 text-destructive" />}
                    <div>
                      <p className="text-sm font-medium">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.category}</p>
                    </div>
                  </div>
                  <Badge variant="outline">{doc.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
