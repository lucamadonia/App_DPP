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
  Lock,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { getDocuments, uploadDocument, deleteDocument, type Document } from '@/services/supabase';
import { DOCUMENT_CATEGORIES } from '@/lib/document-categories';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
import type { VisibilityLevel } from '@/types/visibility';

const statusConfig = {
  valid: { icon: CheckCircle2, className: 'text-success', label: 'Valid' },
  expiring: { icon: Clock, className: 'text-warning', label: 'Expiring' },
  expired: { icon: AlertTriangle, className: 'text-destructive', label: 'Expired' },
};

const visibilityBadgeConfig: Record<VisibilityLevel, { icon: typeof Lock; label: string; className: string }> = {
  internal: { icon: Lock, label: 'Internal Only', className: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600' },
  customs: { icon: ShieldCheck, label: 'Customs', className: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700' },
  consumer: { icon: Users, label: 'Consumer', className: 'bg-green-50 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-700' },
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    category: 'Certificate',
    visibility: 'internal' as VisibilityLevel,
    validUntil: '',
  });

  useEffect(() => {
    loadDocuments();
  }, [productId]);

  const loadDocuments = async () => {
    setIsLoading(true);
    const docs = await getDocuments();
    setDocuments(docs.filter(d => d.product_id === productId));
    setIsLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadForm(prev => ({ ...prev, name: prev.name || file.name }));
      setIsDialogOpen(true);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.name) return;
    setIsUploading(true);
    const result = await uploadDocument(selectedFile, {
      name: uploadForm.name,
      category: uploadForm.category,
      productId,
      validUntil: uploadForm.validUntil || undefined,
      visibility: uploadForm.visibility,
    });
    if (result.success) {
      await loadDocuments();
      setIsDialogOpen(false);
      setSelectedFile(null);
      setUploadForm({ name: '', category: 'Certificate', visibility: 'internal', validUntil: '' });
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
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="mr-2 h-4 w-4" />
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
                <TableHead>{t('Visibility')}</TableHead>
                <TableHead>{t('Status')}</TableHead>
                <TableHead>{t('Valid Until')}</TableHead>
                <TableHead>{t('Uploaded')}</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.map((doc) => {
                const status = statusConfig[doc.status];
                const vis = visibilityBadgeConfig[doc.visibility || 'internal'];
                const VisIcon = vis.icon;
                return (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {doc.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{t(doc.category)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={vis.className}>
                        <VisIcon className="mr-1 h-3 w-3" />
                        {t(vis.label)}
                      </Badge>
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

      {/* Upload Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          setSelectedFile(null);
          setUploadForm({ name: '', category: 'Certificate', visibility: 'internal', validUntil: '' });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Upload Document')}</DialogTitle>
            <DialogDescription>
              {t('Configure document details before uploading.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedFile && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="upload-name">{t('Name')}</Label>
              <Input
                id="upload-name"
                value={uploadForm.name}
                onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('Category')}</Label>
              <Select
                value={uploadForm.category}
                onValueChange={(value) => setUploadForm(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{t(cat)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('Visibility')}</Label>
              <Select
                value={uploadForm.visibility}
                onValueChange={(value) => setUploadForm(prev => ({ ...prev, visibility: value as VisibilityLevel }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">
                    <div className="flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5" />
                      {t('Internal Only')}
                    </div>
                  </SelectItem>
                  <SelectItem value="customs">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {t('Customs')}
                    </div>
                  </SelectItem>
                  <SelectItem value="consumer">
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      {t('Consumer')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-valid-until">{t('Valid Until (optional)')}</Label>
              <Input
                id="upload-valid-until"
                type="date"
                value={uploadForm.validUntil}
                onChange={(e) => setUploadForm(prev => ({ ...prev, validUntil: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('Cancel', { ns: 'common' })}
            </Button>
            <Button onClick={handleUpload} disabled={!uploadForm.name || isUploading}>
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {isUploading ? t('Uploading...') : t('Upload')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
