/**
 * Hook to access Supplier Portal Context
 * Must be used within SupplierPortalLayout
 */

import { useContext } from 'react';
import { SupplierPortalContext } from '@/pages/suppliers/public/SupplierPortalLayout';
import type { SupplierPortalContext as SupplierPortalContextType } from '@/types/supplier-portal';

export function useSupplierPortal(): SupplierPortalContextType {
  const ctx = useContext(SupplierPortalContext);
  if (!ctx) {
    throw new Error('useSupplierPortal must be used within SupplierPortalLayout');
  }
  return ctx;
}
