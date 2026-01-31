import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Loader2,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { getDocuments, uploadDocument, deleteDocument, type Document } from '@/services/supabase';
import { DOCUMENT_CATEGORIES } from '@/lib/document-categories';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';

const statusConfig = {
  valid: { icon: CheckCircle2, className: 'text-success', label: 'Valid' },
  expiring: { icon: Clock, className: 'text-warning', label: 'Expiring' },
  expired: { icon: AlertTriangle, className: 'text-destructive', label: 'Expired' },
};

interface Props {
  productId: string;
}

export function ProductDocumentsTab({ productId }: Props) {
  const { t } = useTranslation('documents');
  const locale = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [uploadCategory, setUploadCategory] = useState<string>('Certificate');

  useEffect(() => {
    loadDocuments();
  }, [productId]);

  const loadDocuments = async () => {
    setIsLoading(true);
    const docs = await getDocuments();
    setDocuments(docs.filter(d => d.product_id === productId));
    setIsLoading(false);
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    const result = await uploadDocument(file, {
      name: file.name,
      category: uploadCategory,
      productId: productId,
    });
    if (result.success) {
      await loadDocuments();
    }
    setIsUploading(false);
  };

  const handleDelete = async (docId: string) => {
    if (!confirm(t('Are you sure you want to delete this document?'))) return;
    await deleteDocument(docId);
    setDocuments(documents.filter(d => d.id !== docId));
  };

  const filteredDocs = categoryFilter === 'all'
    ? documents
    : documents.filter(d => d.category === categoryFilter);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {t('Documents & Certificates')}
            </CardTitle>
            <CardDescription>
              {t('{{count}} documents', { count: documents.length })}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={uploadCategory} onValueChange={setUploadCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{t(cat)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {t('Upload')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Category filter */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Badge
            variant={categoryFilter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer flex-shrink-0"
            onClick={() => setCategoryFilter('all')}
          >
            {t('All')}
          </Badge>
          {DOCUMENT_CATEGORIES.map(cat => (
            <Badge
              key={cat}
              variant={categoryFilter === cat ? 'default' : 'outline'}
              className="cursor-pointer flex-shrink-0"
              onClick={() => setCategoryFilter(cat)}
            >
              {t(cat)}
            </Badge>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">{t('No documents')}</h3>
            <p className="text-muted-foreground mt-1">
              {t('Upload documents to associate them with this product')}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Name')}</TableHead>
                <TableHead>{t('Category')}</TableHead>
                <TableHead>{t('Status')}</TableHead>
                <TableHead>{t('Valid Until')}</TableHead>
                <TableHead>{t('Uploaded')}</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.map((doc) => {
                const status = statusConfig[doc.status];
                return (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {doc.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <status.icon className={`h-4 w-4 ${status.className}`} />
                        <span className={`text-sm ${status.className}`}>
                          {t(status.label)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {doc.validUntil ? formatDate(doc.validUntil, locale) : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(doc.uploadedAt, locale)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {doc.url && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(doc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
