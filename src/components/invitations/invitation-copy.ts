/**
 * Shared, translation-key-based copy for the accept-invitation flow.
 * Keys are English source strings in the `settings` namespace.
 */
import type { AcceptInvitationError, InvitationRole } from '@/services/supabase/invitations';

export const ROLE_LABEL_KEYS: Record<InvitationRole, string> = {
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};

/** Friendly labels for the tenant tables the server reports as holding data. */
const DATA_TABLE_LABEL_KEYS: Record<string, string> = {
  products: 'Products',
  product_batches: 'Batches',
  product_images: 'Product images',
  documents: 'Documents',
  suppliers: 'Suppliers',
  supply_chain_entries: 'Supply chain entries',
  ai_compliance_checks: 'AI compliance checks',
  checklist_progress: 'Checklist progress',
  rh_returns: 'Returns',
  rh_tickets: 'Support tickets',
  rh_customers: 'Customers',
  billing_invoices: 'Invoices',
};

/**
 * Turn server table names into a short, de-duplicated list of label keys.
 * Unknown tables collapse into one "Other records" entry.
 */
export function dataLabelKeys(tables: string[]): string[] {
  const out: string[] = [];
  let other = false;
  for (const table of tables) {
    const key = DATA_TABLE_LABEL_KEYS[table];
    if (key) {
      if (!out.includes(key)) out.push(key);
    } else {
      other = true;
    }
  }
  if (other) out.push('Other records');
  return out;
}

export const ACCEPT_ERROR_KEYS: Record<AcceptInvitationError, string> = {
  not_found: 'This invitation is not available for the account you are signed in with.',
  email_not_confirmed: 'Please confirm your email address first, then open the invitation again.',
  not_pending: 'This invitation has already been used or was withdrawn.',
  expired: 'This invitation has expired. Ask the person who invited you to send a new one.',
  no_profile: 'This account cannot join an organization. Sign in with your team account.',
  promote_admin_first: 'You are the only admin of your current organization and other members remain. Make another member an admin first.',
  active_subscription: 'Your current organization has an active paid plan or module. Cancel it in Billing first, or make another member an admin.',
  seat_limit: 'This organization has reached the user limit of its plan. Ask the person who invited you to upgrade the plan or free up a seat.',
  unknown: 'The invitation could not be accepted. Please try again.',
};
