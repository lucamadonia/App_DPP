import { useContext } from 'react';
import { ReturnsPortalContext } from '@/pages/returns/public/ReturnsPortalLayout';
import type { ReturnsPortalContextType } from '@/pages/returns/public/ReturnsPortalLayout';

export function useReturnsPortal(): ReturnsPortalContextType {
  const ctx = useContext(ReturnsPortalContext);
  if (!ctx) {
    throw new Error('useReturnsPortal must be used within ReturnsPortalLayout');
  }
  return ctx;
}
