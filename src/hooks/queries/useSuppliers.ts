import { useQuery } from '@tanstack/react-query';
import { getProductSuppliersWithDetails } from '@/services/supabase/suppliers';

export const supplierKeys = {
  all: ['suppliers'] as const,
  productSuppliers: (productId: string) => [...supplierKeys.all, 'product', productId] as const,
};

export function useProductSuppliers(productId: string | undefined) {
  return useQuery({
    queryKey: supplierKeys.productSuppliers(productId!),
    queryFn: () => getProductSuppliersWithDetails(productId!),
    enabled: !!productId,
  });
}
