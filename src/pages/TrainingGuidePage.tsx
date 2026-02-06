import {
  LayoutDashboard,
  Package,
  QrCode,
  FolderArchive,
  Truck,
  ShieldCheck,
  RotateCcw,
  Globe,
  Settings,
  CreditCard,
} from 'lucide-react';
import { useTrainingGuideProgress } from '@/hooks/useTrainingGuideProgress';
import type { ChapterId } from '@/hooks/useTrainingGuideProgress';
import { GuideProgress } from '@/components/training-guide/GuideProgress';
import { TrainingGuideHero } from '@/components/training-guide/TrainingGuideHero';
import { ChapterNavigation } from '@/components/training-guide/ChapterNavigation';
import { ChapterSection } from '@/components/training-guide/ChapterSection';
import { BackToTop } from '@/components/training-guide/BackToTop';

import { DashboardMockup } from '@/components/training-guide/mockups/DashboardMockup';
import { ProductsMockup } from '@/components/training-guide/mockups/ProductsMockup';
import { DPPMockup } from '@/components/training-guide/mockups/DPPMockup';
import { DocumentsMockup } from '@/components/training-guide/mockups/DocumentsMockup';
import { SupplyChainMockup } from '@/components/training-guide/mockups/SupplyChainMockup';
import { ComplianceMockup } from '@/components/training-guide/mockups/ComplianceMockup';
import { ReturnsHubMockup } from '@/components/training-guide/mockups/ReturnsHubMockup';
import { PortalsMockup } from '@/components/training-guide/mockups/PortalsMockup';
import { SettingsMockup } from '@/components/training-guide/mockups/SettingsMockup';
import { BillingMockup } from '@/components/training-guide/mockups/BillingMockup';

interface ChapterConfig {
  id: ChapterId;
  icon: React.ReactNode;
  gradient: string;
  bgTint: string;
  mockup: React.ReactNode;
  steps: {
    titleKey: string;
    descKey: string;
    detailKey?: string;
    tipKey?: string;
    tipVariant?: 'tip' | 'important' | 'note' | 'shortcut';
  }[];
}

const CHAPTERS: ChapterConfig[] = [
  {
    id: 'dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
    gradient: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    bgTint: 'bg-blue-50/30',
    mockup: <DashboardMockup />,
    steps: [
      { titleKey: 'dashboard.step1.title', descKey: 'dashboard.step1.description', detailKey: 'dashboard.step1.detail' },
      { titleKey: 'dashboard.step2.title', descKey: 'dashboard.step2.description', detailKey: 'dashboard.step2.detail' },
      { titleKey: 'dashboard.step3.title', descKey: 'dashboard.step3.description', detailKey: 'dashboard.step3.detail' },
      { titleKey: 'dashboard.step4.title', descKey: 'dashboard.step4.description', detailKey: 'dashboard.step4.detail' },
      { titleKey: 'dashboard.step5.title', descKey: 'dashboard.step5.description', detailKey: 'dashboard.step5.detail', tipKey: 'dashboard.tip1', tipVariant: 'tip' },
    ],
  },
  {
    id: 'products',
    icon: <Package className="h-5 w-5" />,
    gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    bgTint: 'bg-emerald-50/20',
    mockup: <ProductsMockup />,
    steps: [
      { titleKey: 'products.step1.title', descKey: 'products.step1.description', detailKey: 'products.step1.detail' },
      { titleKey: 'products.step2.title', descKey: 'products.step2.description', detailKey: 'products.step2.detail' },
      { titleKey: 'products.step3.title', descKey: 'products.step3.description', detailKey: 'products.step3.detail', tipKey: 'products.tip1', tipVariant: 'tip' },
      { titleKey: 'products.step4.title', descKey: 'products.step4.description', detailKey: 'products.step4.detail' },
      { titleKey: 'products.step5.title', descKey: 'products.step5.description', detailKey: 'products.step5.detail' },
      { titleKey: 'products.step6.title', descKey: 'products.step6.description', detailKey: 'products.step6.detail' },
      { titleKey: 'products.step7.title', descKey: 'products.step7.description', detailKey: 'products.step7.detail', tipKey: 'products.tip2', tipVariant: 'important' },
    ],
  },
  {
    id: 'dpp',
    icon: <QrCode className="h-5 w-5" />,
    gradient: 'bg-gradient-to-br from-violet-500 to-purple-600',
    bgTint: 'bg-violet-50/20',
    mockup: <DPPMockup />,
    steps: [
      { titleKey: 'dpp.step1.title', descKey: 'dpp.step1.description', detailKey: 'dpp.step1.detail' },
      { titleKey: 'dpp.step2.title', descKey: 'dpp.step2.description', detailKey: 'dpp.step2.detail' },
      { titleKey: 'dpp.step3.title', descKey: 'dpp.step3.description', detailKey: 'dpp.step3.detail', tipKey: 'dpp.tip1', tipVariant: 'tip' },
      { titleKey: 'dpp.step4.title', descKey: 'dpp.step4.description', detailKey: 'dpp.step4.detail' },
      { titleKey: 'dpp.step5.title', descKey: 'dpp.step5.description', detailKey: 'dpp.step5.detail' },
      { titleKey: 'dpp.step6.title', descKey: 'dpp.step6.description', detailKey: 'dpp.step6.detail' },
      { titleKey: 'dpp.step7.title', descKey: 'dpp.step7.description', detailKey: 'dpp.step7.detail', tipKey: 'dpp.tip2', tipVariant: 'note' },
    ],
  },
  {
    id: 'documents',
    icon: <FolderArchive className="h-5 w-5" />,
    gradient: 'bg-gradient-to-br from-amber-500 to-yellow-600',
    bgTint: 'bg-amber-50/20',
    mockup: <DocumentsMockup />,
    steps: [
      { titleKey: 'documents.step1.title', descKey: 'documents.step1.description', detailKey: 'documents.step1.detail' },
      { titleKey: 'documents.step2.title', descKey: 'documents.step2.description', detailKey: 'documents.step2.detail' },
      { titleKey: 'documents.step3.title', descKey: 'documents.step3.description', detailKey: 'documents.step3.detail' },
      { titleKey: 'documents.step4.title', descKey: 'documents.step4.description', detailKey: 'documents.step4.detail' },
      { titleKey: 'documents.step5.title', descKey: 'documents.step5.description', detailKey: 'documents.step5.detail', tipKey: 'documents.tip1', tipVariant: 'tip' },
    ],
  },
  {
    id: 'supply-chain',
    icon: <Truck className="h-5 w-5" />,
    gradient: 'bg-gradient-to-br from-orange-500 to-amber-600',
    bgTint: 'bg-orange-50/20',
    mockup: <SupplyChainMockup />,
    steps: [
      { titleKey: 'supply-chain.step1.title', descKey: 'supply-chain.step1.description', detailKey: 'supply-chain.step1.detail' },
      { titleKey: 'supply-chain.step2.title', descKey: 'supply-chain.step2.description', detailKey: 'supply-chain.step2.detail' },
      { titleKey: 'supply-chain.step3.title', descKey: 'supply-chain.step3.description', detailKey: 'supply-chain.step3.detail' },
      { titleKey: 'supply-chain.step4.title', descKey: 'supply-chain.step4.description', detailKey: 'supply-chain.step4.detail' },
      { titleKey: 'supply-chain.step5.title', descKey: 'supply-chain.step5.description', detailKey: 'supply-chain.step5.detail' },
      { titleKey: 'supply-chain.step6.title', descKey: 'supply-chain.step6.description', detailKey: 'supply-chain.step6.detail', tipKey: 'supply-chain.tip1', tipVariant: 'tip' },
    ],
  },
  {
    id: 'compliance',
    icon: <ShieldCheck className="h-5 w-5" />,
    gradient: 'bg-gradient-to-br from-cyan-500 to-blue-600',
    bgTint: 'bg-cyan-50/20',
    mockup: <ComplianceMockup />,
    steps: [
      { titleKey: 'compliance.step1.title', descKey: 'compliance.step1.description', detailKey: 'compliance.step1.detail' },
      { titleKey: 'compliance.step2.title', descKey: 'compliance.step2.description', detailKey: 'compliance.step2.detail' },
      { titleKey: 'compliance.step3.title', descKey: 'compliance.step3.description', detailKey: 'compliance.step3.detail', tipKey: 'compliance.tip1', tipVariant: 'important' },
      { titleKey: 'compliance.step4.title', descKey: 'compliance.step4.description', detailKey: 'compliance.step4.detail' },
      { titleKey: 'compliance.step5.title', descKey: 'compliance.step5.description', detailKey: 'compliance.step5.detail' },
      { titleKey: 'compliance.step6.title', descKey: 'compliance.step6.description', detailKey: 'compliance.step6.detail' },
      { titleKey: 'compliance.step7.title', descKey: 'compliance.step7.description', detailKey: 'compliance.step7.detail' },
      { titleKey: 'compliance.step8.title', descKey: 'compliance.step8.description', detailKey: 'compliance.step8.detail', tipKey: 'compliance.tip2', tipVariant: 'note' },
    ],
  },
  {
    id: 'returns',
    icon: <RotateCcw className="h-5 w-5" />,
    gradient: 'bg-gradient-to-br from-rose-500 to-pink-600',
    bgTint: 'bg-rose-50/20',
    mockup: <ReturnsHubMockup />,
    steps: [
      { titleKey: 'returns.step1.title', descKey: 'returns.step1.description', detailKey: 'returns.step1.detail' },
      { titleKey: 'returns.step2.title', descKey: 'returns.step2.description', detailKey: 'returns.step2.detail' },
      { titleKey: 'returns.step3.title', descKey: 'returns.step3.description', detailKey: 'returns.step3.detail', tipKey: 'returns.tip1', tipVariant: 'tip' },
      { titleKey: 'returns.step4.title', descKey: 'returns.step4.description', detailKey: 'returns.step4.detail' },
      { titleKey: 'returns.step5.title', descKey: 'returns.step5.description', detailKey: 'returns.step5.detail' },
      { titleKey: 'returns.step6.title', descKey: 'returns.step6.description', detailKey: 'returns.step6.detail' },
      { titleKey: 'returns.step7.title', descKey: 'returns.step7.description', detailKey: 'returns.step7.detail' },
      { titleKey: 'returns.step8.title', descKey: 'returns.step8.description', detailKey: 'returns.step8.detail', tipKey: 'returns.tip2', tipVariant: 'shortcut' },
    ],
  },
  {
    id: 'portals',
    icon: <Globe className="h-5 w-5" />,
    gradient: 'bg-gradient-to-br from-indigo-500 to-blue-600',
    bgTint: 'bg-indigo-50/20',
    mockup: <PortalsMockup />,
    steps: [
      { titleKey: 'portals.step1.title', descKey: 'portals.step1.description', detailKey: 'portals.step1.detail' },
      { titleKey: 'portals.step2.title', descKey: 'portals.step2.description', detailKey: 'portals.step2.detail' },
      { titleKey: 'portals.step3.title', descKey: 'portals.step3.description', detailKey: 'portals.step3.detail' },
      { titleKey: 'portals.step4.title', descKey: 'portals.step4.description', detailKey: 'portals.step4.detail' },
      { titleKey: 'portals.step5.title', descKey: 'portals.step5.description', detailKey: 'portals.step5.detail' },
      { titleKey: 'portals.step6.title', descKey: 'portals.step6.description', detailKey: 'portals.step6.detail', tipKey: 'portals.tip1', tipVariant: 'tip' },
    ],
  },
  {
    id: 'settings',
    icon: <Settings className="h-5 w-5" />,
    gradient: 'bg-gradient-to-br from-slate-500 to-slate-700',
    bgTint: 'bg-slate-50/40',
    mockup: <SettingsMockup />,
    steps: [
      { titleKey: 'settings.step1.title', descKey: 'settings.step1.description', detailKey: 'settings.step1.detail' },
      { titleKey: 'settings.step2.title', descKey: 'settings.step2.description', detailKey: 'settings.step2.detail' },
      { titleKey: 'settings.step3.title', descKey: 'settings.step3.description', detailKey: 'settings.step3.detail' },
      { titleKey: 'settings.step4.title', descKey: 'settings.step4.description', detailKey: 'settings.step4.detail' },
      { titleKey: 'settings.step5.title', descKey: 'settings.step5.description', detailKey: 'settings.step5.detail' },
      { titleKey: 'settings.step6.title', descKey: 'settings.step6.description', detailKey: 'settings.step6.detail', tipKey: 'settings.tip1', tipVariant: 'important' },
    ],
  },
  {
    id: 'billing',
    icon: <CreditCard className="h-5 w-5" />,
    gradient: 'bg-gradient-to-br from-pink-500 to-rose-600',
    bgTint: 'bg-pink-50/20',
    mockup: <BillingMockup />,
    steps: [
      { titleKey: 'billing.step1.title', descKey: 'billing.step1.description', detailKey: 'billing.step1.detail' },
      { titleKey: 'billing.step2.title', descKey: 'billing.step2.description', detailKey: 'billing.step2.detail' },
      { titleKey: 'billing.step3.title', descKey: 'billing.step3.description', detailKey: 'billing.step3.detail' },
      { titleKey: 'billing.step4.title', descKey: 'billing.step4.description', detailKey: 'billing.step4.detail' },
      { titleKey: 'billing.step5.title', descKey: 'billing.step5.description', detailKey: 'billing.step5.detail', tipKey: 'billing.tip1', tipVariant: 'tip' },
    ],
  },
];

export function TrainingGuidePage() {
  const { completed, toggleChapter, isCompleted, stats } = useTrainingGuideProgress();

  return (
    <div className="-m-4 sm:-m-6">
      <GuideProgress percentage={stats.percentage} />
      <TrainingGuideHero
        completedCount={stats.completedCount}
        totalCount={stats.totalCount}
        percentage={stats.percentage}
      />
      <ChapterNavigation completed={completed} />

      <div>
        {CHAPTERS.map((chapter, index) => (
          <ChapterSection
            key={chapter.id}
            id={chapter.id}
            index={index}
            icon={chapter.icon}
            gradient={chapter.gradient}
            bgTint={chapter.bgTint}
            steps={chapter.steps}
            mockup={chapter.mockup}
            isCompleted={isCompleted(chapter.id)}
            onToggleComplete={() => toggleChapter(chapter.id)}
          />
        ))}
      </div>

      <BackToTop />
    </div>
  );
}
