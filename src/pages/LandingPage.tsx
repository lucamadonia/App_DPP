import type { ReactNode } from 'react';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingOldVsNew } from '@/components/landing/LandingOldVsNew';
import { LandingOutcomes } from '@/components/landing/LandingOutcomes';
import { LandingDPPShowcase } from '@/components/landing/LandingDPPShowcase';
import { LandingSupplyChain } from '@/components/landing/LandingSupplyChain';
import { LandingAISection } from '@/components/landing/LandingAISection';
import { LandingVsCompetitors } from '@/components/landing/LandingVsCompetitors';
import { LandingReturnFlow } from '@/components/landing/LandingReturnFlow';
import { LandingReturnsHub } from '@/components/landing/LandingReturnsHub';
import { LandingWorkflowShowcase } from '@/components/landing/LandingWorkflowShowcase';
import { LandingEmailEditor } from '@/components/landing/LandingEmailEditor';
import { LandingQRSection } from '@/components/landing/LandingQRSection';
import { LandingVisibility } from '@/components/landing/LandingVisibility';
import { LandingStats } from '@/components/landing/LandingStats';
import { LandingPricing } from '@/components/landing/LandingPricing';
import { LandingTestimonials } from '@/components/landing/LandingTestimonials';
import { LandingFAQ } from '@/components/landing/LandingFAQ';
import { LandingCTA } from '@/components/landing/LandingCTA';
import { LandingFooter } from '@/components/landing/LandingFooter';

function GlowDivider() {
  return (
    <div className="hidden py-2 md:block">
      <div className="landing-glow-divider max-w-4xl" />
    </div>
  );
}

/**
 * Deep-dive demos (editor, workflow, QR, visibility, supply chain, stats) need
 * a wide canvas and made the phone page ~31,600px tall. Below md they are
 * skipped so the mobile story stays: hero -> problem -> outcomes -> DPP -> AI
 * -> comparison -> scenarios -> returns -> pricing -> FAQ -> CTA.
 */
function DesktopOnly({ children }: { children: ReactNode }) {
  return <div className="hidden md:block">{children}</div>;
}

export function LandingPage() {
  return (
    <div className="min-h-screen scroll-smooth bg-white dark:bg-slate-950 [&_section[id]]:scroll-mt-16">
      <LandingNavbar />
      <LandingHero />
      <LandingOldVsNew />
      <LandingOutcomes />
      <LandingDPPShowcase />
      <DesktopOnly>
        <LandingSupplyChain />
      </DesktopOnly>
      <GlowDivider />
      <LandingAISection />
      <LandingVsCompetitors />
      <LandingTestimonials />
      <DesktopOnly>
        <LandingReturnFlow />
      </DesktopOnly>
      <LandingReturnsHub />
      <GlowDivider />
      <DesktopOnly>
        <LandingWorkflowShowcase />
        <LandingEmailEditor />
        <LandingQRSection />
        <LandingVisibility />
      </DesktopOnly>
      <GlowDivider />
      <DesktopOnly>
        <LandingStats />
      </DesktopOnly>
      <LandingPricing />
      <LandingFAQ />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
}
