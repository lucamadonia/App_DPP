import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Trash2, Lock, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
}

export function DocumentDetailDialog({
  doc,
  open,
  onOpenChange,
  folders,
  onSaved,
  onDelete,
}: DocumentDetailDialogProps) {
  const { t } = useTranslation('documents');

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [visibility, setVisibility] = useState<VisibilityLevel>('internal');
  const [validUntil, setValidUntil] = useState('');
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
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Document Details')}</DialogTitle>
            <DialogDescription>
              {t('Edit document metadata and assignment.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="detail-name">{t('Name')}</Label>
              <Input
                id="detail-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('Category')}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('Visibility')}</Label>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as VisibilityLevel)}>
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
              <Label htmlFor="detail-valid">{t('Valid Until (optional)')}</Label>
              <Input
                id="detail-valid"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="space-y-2">
                <Label>{t('Assignment')}</Label>
                <Select
                  value={assignmentType}
                  onValueChange={(v) => { setAssignmentType(v as AssignmentType); setAssignmentId(''); }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('No assignment')}</SelectItem>
                    <SelectItem value="product">{t('Product')}</SelectItem>
                    <SelectItem value="supplier">{t('Supplier')}</SelectItem>
                    <SelectItem value="folder">{t('Folder')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {assignmentType === 'product' && (
                <div className="space-y-2">
                  <Label>{t('Product')}</Label>
                  <Select value={assignmentId} onValueChange={setAssignmentId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('Select product...')} />
                    </SelectTrigger>
                    <SelectContent>
                      {productOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {assignmentType === 'supplier' && (
                <div className="space-y-2">
                  <Label>{t('Supplier')}</Label>
                  <Select value={assignmentId} onValueChange={setAssignmentId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('Select supplier...')} />
                    </SelectTrigger>
                    <SelectContent>
                      {supplierOptions.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {assignmentType === 'folder' && (
                <div className="space-y-2">
                  <Label>{t('Folder')}</Label>
                  <Select value={assignmentId} onValueChange={setAssignmentId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('Select folder...')} />
                    </SelectTrigger>
                    <SelectContent>
                      {folders.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="destructive"
              size="sm"
              className="mr-auto"
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
          </DialogFooter>
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
