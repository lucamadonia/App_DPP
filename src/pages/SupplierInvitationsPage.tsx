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
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground transition-colors flex items-center">
          <Home className="h-4 w-4 mr-1" />
          {t('Home', { ns: 'common' })}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link to="/supply-chain" className="hover:text-foreground transition-colors">
          {t('Suppliers', { ns: 'common' })}
        </Link>
        <ChevronRight className="h-4 w-4" />
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
