import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ProductListItem } from '@/services/supabase/products';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      key
        .replace('{{name}}', String(values?.name ?? ''))
        .replace('{{count}}', String(values?.count ?? '')),
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'release-user', email: 'luca@example.com', name: 'Luca' } }),
}));

vi.mock('@/hooks/use-locale', () => ({ useLocale: () => 'en' }));
vi.mock('@/components/ui/animated-counter', () => ({
  AnimatedCounter: ({ value }: { value: number }) => <span>{value}</span>,
}));

import { DashboardHero } from './DashboardHero';

const products: ProductListItem[] = [
  {
    id: 'product-1',
    name: 'Circular Chair',
    manufacturer: 'Trackbliss',
    gtin: '07612345678901',
    serial: 'TB-1',
    category: 'Furniture',
    batchCount: 3,
    createdAt: new Date().toISOString(),
  },
];

function renderHero(isLoading = false) {
  return render(
    <MemoryRouter>
      <DashboardHero
        products={products}
        docStats={{ total: 12, valid: 9, expiring: 2, expired: 1 }}
        isLoading={isLoading}
        isNewUser={false}
      />
    </MemoryRouter>,
  );
}

describe('DashboardHero release contract', () => {
  it('renders the release artwork and primary routes', () => {
    const { container } = renderHero();

    const artwork = container.querySelector<HTMLImageElement>(
      'img[src="/images/dashboard/compliance-intelligence-hero.webp"]',
    );
    expect(artwork).toHaveAttribute('width', '960');
    expect(artwork).toHaveAttribute('height', '640');
    expect(artwork).toHaveAttribute('fetchpriority', 'high');

    expect(screen.getByRole('link', { name: /Generate QR/ })).toHaveAttribute('href', '/dpp/qr-generator');
    expect(screen.getByRole('link', { name: /New Product/ })).toHaveAttribute('href', '/products/new');
  });

  it('renders live KPI values and links the cells to their modules', () => {
    renderHero();

    expect(screen.getByText('3 Batches')).toBeInTheDocument();
    expect(screen.getByText('9 valid')).toBeInTheDocument();
    expect(screen.getByText('Action required')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Active Products|Documents|Expiring Certificates|Expired Documents/ })).toHaveLength(4);
  });

  it('keeps loading placeholders inside the final hero surface', () => {
    const { container } = renderHero(true);
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(4);
    expect(container.querySelector('.dashboard-hero-panel')).toBeInTheDocument();
  });
});

