import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProducts,
  getProductById,
  deleteProduct,
  type ProductListItem,
} from '@/services/supabase/products';
import type { Product } from '@/types/product';

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (search?: string) => [...productKeys.lists(), { search }] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

export function useProducts(search?: string) {
  return useQuery<ProductListItem[]>({
    queryKey: productKeys.list(search),
    queryFn: () => getProducts(search),
  });
}

export function useProduct(id: string | undefined) {
  return useQuery<Product | null>({
    queryKey: productKeys.detail(id!),
    queryFn: () => getProductById(id!),
    enabled: !!id,
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}
