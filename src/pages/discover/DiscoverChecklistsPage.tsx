import { ChecklistPage } from '@/pages/ChecklistPage';
import { guestChecklistStore } from '@/lib/checklist-progress-store';

/**
 * Compliance checklists for guests.
 *
 * The templates themselves are anon-readable; only the tick state was tenant
 * bound. Swapping the store keeps every other behaviour — filters, PDF export,
 * 16 countries x 15 categories — byte-identical to the authenticated page.
 */
export function DiscoverChecklistsPage() {
  return <ChecklistPage store={guestChecklistStore} />;
}
