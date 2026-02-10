import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBatches, deleteBatch, getBatchCostsBySupplier } from '@/services/supabase/batches';
import { productKeys } from './useProducts';

export const batchKeys = {
  all: ['batches'] as const,
  lists: () => [...batchKeys.all, 'list'] as const,
  list: (productId: string) => [...batchKeys.lists(), productId] as const,
  costs: (productId: string) => [...batchKeys.all, 'costs', productId] as const,
};

export function useBatches(productId: string | undefined) {
  return useQuery({
    queryKey: batchKeys.list(productId!),
    queryFn: () => getBatches(productId!),
    enabled: !!productId,
  });
}

export function useBatchCosts(productId: string | undefined) {
  return useQuery({
    queryKey: batchKeys.costs(productId!),
    queryFn: () => getBatchCostsBySupplier(productId!),
    enabled: !!productId,
  });
}

export function useDeleteBatch(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (batchId: string) => deleteBatch(batchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchKeys.list(productId) });
      queryClient.invalidateQueries({ queryKey: batchKeys.costs(productId) });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}
