import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LegalFooterLinks } from './LegalFooterLinks';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function renderLinks(props: Parameters<typeof LegalFooterLinks>[0] = {}) {
  return render(
    <MemoryRouter>
      <LegalFooterLinks {...props} />
    </MemoryRouter>
  );
}

describe('LegalFooterLinks', () => {
  it('falls back to the platform imprint and privacy pages when the tenant has no URLs', () => {
    renderLinks();
    expect(screen.getByRole('link', { name: 'imprint' })).toHaveAttribute('href', '/imprint');
    expect(screen.getByRole('link', { name: 'privacyPolicy' })).toHaveAttribute('href', '/privacy');
  });

  it('never shows the platform B2B terms to consumers by default', () => {
    renderLinks();
    expect(screen.queryByRole('link', { name: 'terms' })).toBeNull();
  });

  it('shows tenant terms when configured', () => {
    renderLinks({ termsUrl: 'https://shop.example/agb' });
    expect(screen.getByRole('link', { name: 'terms' })).toHaveAttribute('href', 'https://shop.example/agb');
  });

  it('prefers tenant-configured URLs and opens them in a new tab', () => {
    renderLinks({ privacyUrl: 'https://shop.example/datenschutz' });
    const privacy = screen.getByRole('link', { name: 'privacyPolicy' });
    expect(privacy).toHaveAttribute('href', 'https://shop.example/datenschutz');
    expect(privacy).toHaveAttribute('target', '_blank');
    expect(privacy).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('falls back to the platform terms only when a platform surface opts in', () => {
    renderLinks({ showTerms: true });
    expect(screen.getByRole('link', { name: 'terms' })).toHaveAttribute('href', '/terms');
  });

  it('renders every link with a 44px minimum touch target', () => {
    renderLinks();
    for (const link of screen.getAllByRole('link')) {
      expect(link.className).toContain('min-h-11');
    }
  });
});
