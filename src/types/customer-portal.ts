/**
 * Customer Portal Types
 */

import type { RhCustomerAddress } from './returns-hub';

export interface CustomerPortalProfile {
  id: string;
  customerId: string;
  tenantId: string;
  displayName?: string;
  avatarUrl?: string;
  emailVerified: boolean;
  lastLoginAt?: string;
  // From rh_customers join
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  addresses: RhCustomerAddress[];
  communicationPreferences: {
    email: boolean;
    sms: boolean;
    marketing: boolean;
  };
}

export interface CustomerDashboardStats {
  activeReturns: number;
  openTickets: number;
  totalRefunds: number;
  lastReturnStatus?: string;
  recentReturns: Array<{
    id: string;
    returnNumber: string;
    status: string;
    createdAt: string;
  }>;
  recentMessages: Array<{
    id: string;
    ticketId: string;
    ticketSubject: string;
    senderType: string;
    content: string;
    createdAt: string;
  }>;
}

export interface CustomerReturnInput {
  orderId?: string;
  reasonCategory?: string;
  reasonSubcategory?: string;
  reasonText?: string;
  desiredSolution: string;
  shippingMethod: string;
  items: Array<{
    name: string;
    quantity: number;
    sku?: string;
    photos?: string[];
  }>;
}

export interface CustomerReturnsFilter {
  status?: string[];
  search?: string;
}

export interface CustomerTicketsFilter {
  status?: string[];
  search?: string;
}
