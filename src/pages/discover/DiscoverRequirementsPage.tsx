import { RequirementsCalculatorPage } from '@/pages/RequirementsCalculatorPage';
import { GuestUpsellCard } from '@/components/discover/GuestUpsellCard';

/**
 * Product requirements check for guests.
 *
 * The calculator is entirely static — 34 requirements, 60 product categories,
 * 86 countries, all bundled TypeScript — so it works with no account and no
 * connection. Only the AI layer is withheld: streamCompletion needs a Supabase
 * session token for the Edge Function, so every AI control would 401 the moment
 * it was pressed. The upsell card fills exactly the space it leaves.
 */
export function DiscoverRequirementsPage() {
  return (
    <>
      <RequirementsCalculatorPage aiEnabled={false} />
      <div className="mx-auto mt-6 max-w-4xl">
        <GuestUpsellCard reason="ai" />
      </div>
    </>
  );
}
