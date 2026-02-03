import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/use-locale';
import { formatDate } from '@/lib/format';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Loader2,
  File,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getSupplierDocuments,
  uploadDocument,
  deleteDocument,
  type Document,
} from '@/services/supabase';

const SUPPLIER_DOC_CATEGORIES = [
  'Offer',
  'Invoice',
  'Contract',
  'NDA',
  'Quality Certificate',
  'Audit Report',
  'Insurance Certificate',
  'Price List',
  'Certificate',
  'Report',
  'Datasheet',
  'Other',
] as const;

interface SupplierDocumentsTabProps {
  supplierId: string;
}

export function SupplierDocumentsTab({ supplierId }: SupplierDocumentsTabProps) {
  const { t } = useTranslation('settings');
  const locale = useLocale();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Upload dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Other');
  const [uploadValidUntil, setUploadValidUntil] = useState('');
  const [uploadVisibility, setUploadVisibility] = useState<'internal' | 'customs' | 'consumer'>('internal');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    const docs = await getSupplierDocuments(supplierId);
    setDocuments(docs);
    setIsLoading(false);
  }, [supplierId]);

  useEffect(() => {
    let cancelled = false;
    getSupplierDocuments(supplierId).then(docs => {
      if (!cancelled) {
        setDocuments(docs);
        setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [supplierId]);

  const filteredDocs = categoryFilter === 'all'
    ? documents
    : documents.filter(d => d.category === categoryFilter);

  const handleFileSelect = useCallback((file: File) => {
    setUploadFile(file);
    setUploadName(prev => prev || file.name.replace(/\.[^/.]+$/, ''));
  }, []);

  const handleUpload = async () => {
    if (!uploadFile || !uploadName) return;
    setUploading(true);
    const result = await uploadDocument(uploadFile, {
      name: uploadName,
      category: uploadCategory,
      supplierId,
      validUntil: uploadValidUntil || undefined,
      visibility: uploadVisibility,
    });
    setUploading(false);
    if (result.success) {
      setUploadOpen(false);
      resetUploadForm();
      loadDocuments();
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteDocument(id);
    if (result.success) {
      setDocuments(prev => prev.filter(d => d.id !== id));
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadName('');
    setUploadCategory('Other');
    setUploadValidUntil('');
    setUploadVisibility('internal');
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <File className="h-4 w-4 text-red-500" />;
      case 'image': return <ImageIcon className="h-4 w-4 text-blue-500" />;
      default: return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{t('Active')}</Badge>;
      case 'expiring': return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{t('Contract Expiring Soon')}</Badge>;
      case 'expired': return <Badge variant="destructive">{t('Contract Expired')}</Badge>;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t('Documents', { ns: 'common' })}</h3>
        <Button size="sm" onClick={() => { resetUploadForm(); setUploadOpen(true); }}>
          <Upload className="h-4 w-4 mr-1" />
          {t('Upload Document')}
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        <Badge
          variant={categoryFilter === 'all' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setCategoryFilter('all')}
        >
          {t('All Categories')}
        </Badge>
        {SUPPLIER_DOC_CATEGORIES.map(cat => {
          const count = documents.filter(d => d.category === cat).length;
          if (count === 0) return null;
          return (
            <Badge
              key={cat}
              variant={categoryFilter === cat ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setCategoryFilter(cat)}
            >
              {t(cat)} ({count})
            </Badge>
          );
        })}
      </div>

      {/* Documents table or empty state */}
      {filteredDocs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{t('No documents yet')}</p>
          <p className="text-sm mt-1">{t('Upload your first document for this supplier.')}</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('File Name')}</TableHead>
              <TableHead>{t('Category')}</TableHead>
              <TableHead>{t('Status')}</TableHead>
              <TableHead>{t('Valid Until')}</TableHead>
              <TableHead>{t('Uploaded')}</TableHead>
              <TableHead className="w-[100px]">{t('Actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDocs.map(doc => (
              <TableRow key={doc.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getTypeIcon(doc.type)}
                    <span className="font-medium truncate max-w-[200px]">{doc.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{t(doc.category)}</Badge>
                </TableCell>
                <TableCell>{getStatusBadge(doc.status)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {doc.validUntil ? formatDate(doc.validUntil, locale) : '-'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(doc.uploadedAt, locale)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {doc.url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => window.open(doc.url, '_blank')}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Upload Document')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              ref={dropRef}
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              {uploadFile ? (
                <div className="flex items-center justify-center gap-2">
                  {getTypeIcon(uploadFile.type.includes('pdf') ? 'pdf' : uploadFile.type.startsWith('image') ? 'image' : 'other')}
                  <span className="font-medium">{uploadFile.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {t('Drag & drop files here or click to upload')}
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('File Name')}</Label>
              <Input
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder={t('File Name')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('Category')}</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPLIER_DOC_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{t(cat)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('Valid Until')}</Label>
              <Input
                type="date"
                value={uploadValidUntil}
                onChange={(e) => setUploadValidUntil(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('Visible', { ns: 'settings' })}</Label>
              <Select value={uploadVisibility} onValueChange={(v) => setUploadVisibility(v as typeof uploadVisibility)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="customs">Customs</SelectItem>
                  <SelectItem value="consumer">Consumer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              {t('Close')}
            </Button>
            <Button onClick={handleUpload} disabled={!uploadFile || !uploadName || uploading}>
              {uploading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {t('Upload Document')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
