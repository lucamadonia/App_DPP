import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { SupplierInvitationsTab } from '@/components/settings/SupplierInvitationsTab';
import { PageContainer } from '@/components/layout/page-container';

export function SupplierInvitationsPage() {
  const { t } = useTranslation('settings');

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link to="/" className="touch-hit inline-flex items-center hover:text-foreground transition-colors">
          <Home className="h-4 w-4 mr-1" />
          {t('Home', { ns: 'common' })}
        </Link>
        <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        <Link to="/supply-chain" className="touch-hit inline-flex items-center hover:text-foreground transition-colors">
          {t('Suppliers', { ns: 'common' })}
        </Link>
        <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="text-foreground">{t('Invitations')}</span>
      </nav>

      {/* Header + content */}
      <PageContainer
        size="full"
        padding={false}
        title={t('Supplier Invitations')}
        description={t('Manage supplier registration invitations and track their status')}
      >
        <SupplierInvitationsTab />
      </PageContainer>
    </div>
  );
}
