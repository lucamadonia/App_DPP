import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Trash2, Lock, ShieldCheck, Users, Sparkles, History, UploadCloud, FileText, Eye, Link2, Package, Truck, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FormSections, FormSection, FormGrid, FormField, ChoiceCards, FormActions } from '@/components/ui/form-layout';
import { AiHintsList } from '@/components/documents/AiHintsList';
import { DocumentVersionHistory } from '@/components/documents/DocumentVersionHistory';
import type { DocumentHint } from '@/services/openrouter/document-classification-prompts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/adaptive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DOCUMENT_CATEGORIES } from '@/lib/document-categories';
import {
  updateDocument,
  getProducts,
  getSuppliers,
  type Document,
} from '@/services/supabase';
import type { DocumentFolder } from '@/types/database';
import type { VisibilityLevel } from '@/types/visibility';

type AssignmentType = 'none' | 'product' | 'supplier' | 'folder';

interface DocumentDetailDialogProps {
  doc: Document | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: DocumentFolder[];
  onSaved: () => void;
  onDelete: (doc: Document) => void;
  onUploadNewVersion?: (doc: Document) => void;
  /** Bump this value to force version history refresh (after new upload/restore). */
  versionRefreshKey?: number;
}

export function DocumentDetailDialog({
  doc,
  open,
  onOpenChange,
  folders,
  onSaved,
  onDelete,
  onUploadNewVersion,
  versionRefreshKey,
}: DocumentDetailDialogProps) {
  const { t } = useTranslation('documents');

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [visibility, setVisibility] = useState<VisibilityLevel>('internal');
  const [validUntil, setValidUntil] = useState('');
  const [description, setDescription] = useState('');
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('none');
  const [assignmentId, setAssignmentId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [productOptions, setProductOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [supplierOptions, setSupplierOptions] = useState<Array<{ id: string; name: string }>>([]);

  const populateForm = useCallback((d: Document) => {
    setName(d.name);
    setCategory(d.category);
    setVisibility(d.visibility || 'internal');
    setValidUntil(d.validUntil || '');
    setDescription(d.description || '');

    if (d.product_id) {
      setAssignmentType('product');
      setAssignmentId(d.product_id);
    } else if (d.supplier_id) {
      setAssignmentType('supplier');
      setAssignmentId(d.supplier_id);
    } else if (d.folder_id) {
      setAssignmentType('folder');
      setAssignmentId(d.folder_id);
    } else {
      setAssignmentType('none');
      setAssignmentId('');
    }
  }, []);

  // Populate form when doc changes
  useEffect(() => {
    if (doc && open) {
      populateForm(doc);
    }
  }, [doc, open, populateForm]);

  // Load product/supplier options
  useEffect(() => {
    if (open && productOptions.length === 0) {
      getProducts().then((prods) =>
        setProductOptions(prods.map((p) => ({ id: p.id, name: p.name })))
      );
      getSuppliers().then((supps) =>
        setSupplierOptions(supps.map((s) => ({ id: s.id, name: s.name })))
      );
    }
  }, [open, productOptions.length]);

  function computeStatus(dateStr: string): 'valid' | 'expiring' | 'expired' {
    if (!dateStr) return 'valid';
    const validDate = new Date(dateStr);
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (validDate <= now) return 'expired';
    if (validDate <= thirtyDays) return 'expiring';
    return 'valid';
  }

  async function handleSave() {
    if (!doc) return;
    setIsSaving(true);

    const status = computeStatus(validUntil);

    const updates: Partial<Document> = {
      name,
      category,
      visibility,
      validUntil: validUntil || undefined,
      description: description || undefined,
      status,
      product_id: assignmentType === 'product' ? assignmentId : undefined,
      supplier_id: assignmentType === 'supplier' ? assignmentId : undefined,
      folder_id: assignmentType === 'folder' ? assignmentId : undefined,
    };

    // Clear other assignment fields when changing type
    if (assignmentType !== 'product') updates.product_id = '';
    if (assignmentType !== 'supplier') updates.supplier_id = '';
    if (assignmentType !== 'folder') updates.folder_id = '';

    if (assignmentType === 'product' && assignmentId) updates.product_id = assignmentId;
    if (assignmentType === 'supplier' && assignmentId) updates.supplier_id = assignmentId;
    if (assignmentType === 'folder' && assignmentId) updates.folder_id = assignmentId;

    const result = await updateDocument(doc.id, updates);
    setIsSaving(false);

    if (result.success) {
      onSaved();
      onOpenChange(false);
    }
  }

  if (!doc) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto pb-0">
          <DialogHeader>
            <DialogTitle>{t('Document Details')}</DialogTitle>
            <DialogDescription>
              {t('Edit document metadata and assignment.')}
            </DialogDescription>
          </DialogHeader>

          <FormSections className="py-2">
            {/* AI Classification Info (read-only, prominent) */}
            {doc.aiClassifiedAt && (
              <div className="space-y-3 rounded-xl border bg-muted/40 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" aria-hidden="true" />
                    <span className="text-sm font-medium">{t('AI classification')}</span>
                    {typeof doc.aiConfidence === 'number' && (
                      <Badge
                        variant="outline"
                        className={
                          doc.aiConfidence >= 0.7
                            ? 'border-success/30 bg-success/10 text-success'
                            : doc.aiConfidence >= 0.5
                            ? 'border-warning/30 bg-warning/10 text-warning'
                            : 'border-destructive/30 bg-destructive/10 text-destructive'
                        }
                      >
                        {Math.round(doc.aiConfidence * 100)}%
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {new Date(doc.aiClassifiedAt).toLocaleDateString()}
                  </span>
                </div>
                {doc.hints && doc.hints.length > 0 && (
                  <AiHintsList hints={doc.hints as DocumentHint[]} />
                )}
              </div>
            )}

            <FormSection title={t('Details')} icon={FileText} layout="stacked" variant="plain">
              <FormGrid cols={2}>
                <FormField label={t('Name')} htmlFor="detail-name" required span="full">
                  <Input
                    id="detail-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </FormField>
                <FormField label={t('Category')} htmlFor="detail-category">
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="detail-category" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label={t('Valid Until')} htmlFor="detail-valid" optional>
                  <Input
                    id="detail-valid"
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </FormField>
                <FormField label={t('Description')} htmlFor="detail-description" optional span="full">
                  <Textarea
                    id="detail-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('Short summary of the document content (optional)')}
                    rows={2}
                  />
                </FormField>
              </FormGrid>
            </FormSection>

            <FormSection
              title={t('Visibility')}
              description={t('Who can see this document in the product passport.')}
              icon={Eye}
              layout="stacked"
              variant="plain"
            >
              <ChoiceCards<VisibilityLevel>
                value={visibility}
                onValueChange={setVisibility}
                columns={3}
                aria-label={t('Visibility')}
                options={[
                  { value: 'internal', label: t('Internal Only'), icon: Lock },
                  { value: 'customs', label: t('Customs'), icon: ShieldCheck },
                  { value: 'consumer', label: t('Consumer'), icon: Users },
                ]}
              />
            </FormSection>

            <FormSection title={t('Assignment')} icon={Link2} layout="stacked" variant="plain">
              <ChoiceCards<AssignmentType>
                value={assignmentType}
                onValueChange={(v) => { setAssignmentType(v); setAssignmentId(''); }}
                columns={4}
                aria-label={t('Assignment')}
                options={[
                  { value: 'none', label: t('No assignment') },
                  { value: 'product', label: t('Product'), icon: Package },
                  { value: 'supplier', label: t('Supplier'), icon: Truck },
                  { value: 'folder', label: t('Folder'), icon: Folder },
                ]}
              />

              {assignmentType === 'product' && (
                <FormField label={t('Product')} htmlFor="detail-product">
                  <Select value={assignmentId} onValueChange={setAssignmentId}>
                    <SelectTrigger id="detail-product" className="w-full">
                      <SelectValue placeholder={t('Select product...')} />
                    </SelectTrigger>
                    <SelectContent>
                      {productOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}

              {assignmentType === 'supplier' && (
                <FormField label={t('Supplier')} htmlFor="detail-supplier">
                  <Select value={assignmentId} onValueChange={setAssignmentId}>
                    <SelectTrigger id="detail-supplier" className="w-full">
                      <SelectValue placeholder={t('Select supplier...')} />
                    </SelectTrigger>
                    <SelectContent>
                      {supplierOptions.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}

              {assignmentType === 'folder' && (
                <FormField label={t('Folder')} htmlFor="detail-folder">
                  <Select value={assignmentId} onValueChange={setAssignmentId}>
                    <SelectTrigger id="detail-folder" className="w-full">
                      <SelectValue placeholder={t('Select folder...')} />
                    </SelectTrigger>
                    <SelectContent>
                      {folders.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            </FormSection>

            <FormSection
              title={t('Version History')}
              icon={History}
              layout="stacked"
              variant="plain"
              aside={onUploadNewVersion && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onUploadNewVersion(doc)}
                >
                  <UploadCloud className="mr-2 h-3.5 w-3.5" />
                  {t('Upload New Version')}
                </Button>
              )}
            >
              <DocumentVersionHistory
                key={`${doc.id}-${versionRefreshKey ?? 0}`}
                documentId={doc.id}
                onCurrentChanged={onSaved}
              />
            </FormSection>
          </FormSections>

          <FormActions sticky="dialog">
            <Button
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('Delete', { ns: 'common' })}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('Cancel', { ns: 'common' })}
            </Button>
            <Button onClick={handleSave} disabled={!name || isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? t('Saving...') : t('Save', { ns: 'common' })}
            </Button>
          </FormActions>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete document?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('This action cannot be undone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel', { ns: 'common' })}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setShowDeleteConfirm(false);
                onOpenChange(false);
                onDelete(doc);
              }}
            >
              {t('Delete', { ns: 'common' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
