import { useContext } from 'react';
import { CustomerPortalContext, type CustomerPortalContextType } from '@/contexts/CustomerPortalContext';

export function useCustomerPortal(): CustomerPortalContextType {
  const context = useContext(CustomerPortalContext);
  if (!context) {
    throw new Error('useCustomerPortal must be used within a CustomerPortalProvider');
  }
  return context;
}
