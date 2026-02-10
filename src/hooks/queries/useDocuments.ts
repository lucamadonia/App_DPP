import { useQuery } from '@tanstack/react-query';
import { getDocumentStats } from '@/services/supabase/documents';

export const documentKeys = {
  all: ['documents'] as const,
  stats: () => [...documentKeys.all, 'stats'] as const,
};

export function useDocumentStats() {
  return useQuery({
    queryKey: documentKeys.stats(),
    queryFn: getDocumentStats,
  });
}
