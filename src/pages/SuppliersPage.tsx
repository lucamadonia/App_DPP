import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Mail, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { blurIn, useReducedMotion } from '@/lib/motion';
import {
  getSuppliers, getProducts, getCountries, getSupplierSpendAnalysis,
  getSupplierProducts, deleteSupplier,
  type ProductListItem, type SupplierSpendSummary,
} from '@/services/supabase';
import { SupplierKPIStrip } from '@/components/suppliers/SupplierKPIStrip';
import { SupplierSpendOverview } from '@/components/suppliers/SupplierSpendOverview';
import { SupplierDirectory } from '@/components/suppliers/SupplierDirectory';
import { SupplierDetailSheet } from '@/components/suppliers/SupplierDetailSheet';
import { SupplierFormDialog } from '@/components/suppliers/SupplierFormDialog';
import { ProductAssignmentDialog } from '@/components/suppliers/ProductAssignmentDialog';
import { InvitationsPanel } from '@/components/suppliers/InvitationsPanel';
import {
  PendingApprovalsPanel, ApprovalDialog, type ApprovalAction,
} from '@/components/suppliers/PendingApprovalsPanel';
import type { Supplier, Country } from '@/types/database';

/**
 * Suppliers page — orchestrator only.
 * Data loading + dialog state live here; UI lives in src/components/suppliers/.
 */
export function SuppliersPage() {
  const { t } = useTranslation('settings');
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();
  const MotionDiv = prefersReduced ? 'div' as const : motion.div;

  // Data state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [spendAnalysis, setSpendAnalysis] = useState<SupplierSpendSummary[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  // UI state
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null);
  const [productsVersion, setProductsVersion] = useState(0);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formSupplier, setFormSupplier] = useState<Supplier | null>(null);
  const [assignSupplier, setAssignSupplier] = useState<Supplier | null>(null);
  const [approvalAction, setApprovalAction] = useState<ApprovalAction | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Background: load assigned-product counts per supplier (for scorecards)
  const loadProductCounts = useCallback((list: Supplier[]) => {
    if (list.length === 0) {
      setProductCounts({});
      return;
    }
    Promise.all(
      list.map(s => getSupplierProducts(s.id).then(p => [s.id, p.length] as const))
    )
      .then(entries => setProductCounts(Object.fromEntries(entries)))
      .catch(error => console.error('Error loading product counts:', error));
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [suppliersData, productsData, countriesData, spendData] = await Promise.all([
        getSuppliers(),
        getProducts(),
        getCountries(),
        getSupplierSpendAnalysis(),
      ]);
      setSuppliers(suppliersData);
      setProducts(productsData);
      setCountries(countriesData);
      setSpendAnalysis(spendData);
      setDataVersion(v => v + 1);
      // Keep the open detail sheet in sync with fresh data
      setDetailSupplier(prev => (prev ? suppliersData.find(s => s.id === prev.id) ?? null : null));
      loadProductCounts(suppliersData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error(t('Error loading data'));
    }
    setIsLoading(false);
  }, [loadProductCounts, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const pendingSuppliers = useMemo(
    () => suppliers.filter(s => s.status === 'pending_approval'),
    [suppliers],
  );

  // --- Handlers -----------------------------------------------------------

  const openCreateDialog = () => {
    setFormMode('create');
    setFormSupplier(null);
    setFormDialogOpen(true);
  };

  const openEditDialog = (supplier: Supplier) => {
    setFormMode('edit');
    setFormSupplier(supplier);
    setFormDialogOpen(true);
  };

  const openFullPage = (supplier: Supplier) => navigate(`/suppliers/${supplier.id}`);

  const handleAssignmentsChanged = useCallback(() => {
    setProductsVersion(v => v + 1);
    setAssignSupplier(current => {
      if (current) {
        getSupplierProducts(current.id)
          .then(p => setProductCounts(prev => ({ ...prev, [current.id]: p.length })))
          .catch(error => console.error('Error refreshing product count:', error));
      }
      return current;
    });
  }, []);

  const confirmDeleteSupplier = async () => {
    if (!supplierToDelete) return;
    setIsLoading(true);
    try {
      const result = await deleteSupplier(supplierToDelete);
      if (!result.success) throw new Error(result.error || 'Deletion failed');
      toast.success(t('Supplier deleted'));
      if (detailSupplier?.id === supplierToDelete) {
        setDetailSupplier(null);
      }
      await loadData();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast.error(t('Error deleting'));
    }
    setIsLoading(false);
    setSupplierToDelete(null);
  };

  const handleApprove = (supplier: Supplier) => setApprovalAction({ supplier, mode: 'approve' });
  const handleReject = (supplier: Supplier) => setApprovalAction({ supplier, mode: 'reject' });

  // --- Render -------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <MotionDiv
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        {...(!prefersReduced && { variants: blurIn, initial: 'initial', animate: 'animate' })}
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('Suppliers')}</h1>
          <p className="text-muted-foreground">
            {t('Manage suppliers, rate them, and assign products')}
          </p>
        </div>
        <div className="flex gap-2">
          <motion.div whileTap={prefersReduced ? undefined : { scale: 0.97 }} className="flex-1 sm:flex-none">
            <Button variant="outline" className="min-h-[44px] w-full sm:min-h-10 sm:w-auto" onClick={() => setInviteDialogOpen(true)}>
              <Mail className="mr-2 h-4 w-4" />
              {t('Invite Supplier')}
            </Button>
          </motion.div>
          <motion.div whileTap={prefersReduced ? undefined : { scale: 0.97 }} className="flex-1 sm:flex-none">
            <Button className="min-h-[44px] w-full sm:min-h-10 sm:w-auto" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              {t('New Supplier')}
            </Button>
          </motion.div>
        </div>
      </MotionDiv>

      {/* Pending approvals action stream (prominent, on top) */}
      <PendingApprovalsPanel
        pendingSuppliers={pendingSuppliers}
        countries={countries}
        onApprove={handleApprove}
        onReject={handleReject}
        onOpenDetail={setDetailSupplier}
      />

      {/* KPI strip */}
      <SupplierKPIStrip suppliers={suppliers} />

      {/* Financial overview (only when spend data exists) */}
      <SupplierSpendOverview spendAnalysis={spendAnalysis} />

      {/* Supplier portal invitations */}
      <InvitationsPanel
        inviteDialogOpen={inviteDialogOpen}
        onInviteDialogChange={setInviteDialogOpen}
        refreshKey={dataVersion}
      />

      {/* Directory: search, filters, scorecard grid */}
      <SupplierDirectory
        suppliers={suppliers}
        countries={countries}
        productCounts={productCounts}
        isLoading={isLoading}
        onRefresh={loadData}
        onCreate={openCreateDialog}
        onInvite={() => setInviteDialogOpen(true)}
        onOpenDetail={setDetailSupplier}
        onOpenFullPage={openFullPage}
        onEdit={openEditDialog}
        onAssignProducts={setAssignSupplier}
        onDelete={setSupplierToDelete}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* Detail sheet */}
      <SupplierDetailSheet
        supplier={detailSupplier}
        countries={countries}
        productsVersion={productsVersion}
        onOpenChange={(open) => { if (!open) setDetailSupplier(null); }}
        onOpenFullPage={openFullPage}
        onEdit={openEditDialog}
        onAssignProducts={setAssignSupplier}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* Create / edit supplier */}
      <SupplierFormDialog
        open={formDialogOpen}
        mode={formMode}
        supplier={formSupplier}
        countries={countries}
        onOpenChange={setFormDialogOpen}
        onSaved={loadData}
      />

      {/* Product assignment incl. price tiers */}
      <ProductAssignmentDialog
        supplier={assignSupplier}
        products={products}
        onOpenChange={(open) => { if (!open) setAssignSupplier(null); }}
        onChanged={handleAssignmentsChanged}
      />

      {/* Approve / reject confirmation */}
      <ApprovalDialog
        action={approvalAction}
        onClose={() => setApprovalAction(null)}
        onDone={loadData}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!supplierToDelete}
        onOpenChange={(open) => { if (!open) setSupplierToDelete(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete supplier?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Really delete this supplier? All product assignments will also be removed.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel', { ns: 'common' })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSupplier}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('Delete', { ns: 'common' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
