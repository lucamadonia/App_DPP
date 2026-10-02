import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { LandingBrand } from './LandingBrand';

export function LandingFooter() {
  const { t, i18n } = useTranslation('landing');

  const LANGS = ['en', 'de', 'el'] as const;
  const LANG_LABELS: Record<string, string> = { en: 'English', de: 'Deutsch', el: '\u0395\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac' };

  const cycleLang = () => {
    const idx = LANGS.indexOf(i18n.language as typeof LANGS[number]);
    const next = LANGS[(idx + 1) % LANGS.length];
    i18n.changeLanguage(next);
  };

  const columns = [
    {
      title: t('footer.product'),
      links: [
        { label: t('footer.product.features'), href: '#features' },
        { label: t('footer.product.dpp'), href: '#dpp-showcase' },
        { label: t('footer.product.returns'), href: '#returns' },
        { label: t('footer.product.templates'), href: '#features' },
        { label: t('footer.product.pricing'), href: '/pricing' },
      ],
    },
    {
      title: t('footer.compliance'),
      links: [
        { label: t('footer.compliance.espr'), href: '#ai' },
        { label: t('footer.compliance.reach'), href: '#ai' },
        { label: t('footer.compliance.gpsr'), href: '#ai' },
        { label: t('footer.compliance.checklists'), href: '#features' },
      ],
    },
    {
      title: t('footer.company'),
      links: [
        // About/Blog pointed at "#" (dead links). Contact details live in the imprint.
        { label: t('footer.company.contact'), href: '/imprint' },
        { label: t('nav.faq'), href: '#faq' },
      ],
    },
    {
      title: t('footer.legal'),
      links: [
        { label: t('footer.legal.privacy'), href: '/privacy' },
        { label: t('footer.legal.terms'), href: '/terms' },
        { label: t('footer.legal.imprint'), href: '/imprint' },
      ],
    },
  ];

  return (
    <footer className="relative overflow-hidden bg-slate-950 pt-16 pb-[calc(2rem+env(safe-area-inset-bottom))] text-slate-400">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[48rem] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <LandingBrand tone="light" size={40} />
          <p className="max-w-md text-sm text-slate-400">{t('footer.tagline')}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-white mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('/') ? (
                      <Link
                        to={link.href}
                        className="inline-block py-1 text-sm transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="inline-block py-1 text-sm transition-colors hover:text-white"
                        onClick={(e) => {
                          if (link.href.startsWith('#')) {
                            e.preventDefault();
                            const id = link.href.slice(1);
                            if (id) {
                              document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                            }
                          }
                        }}
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm">
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
          <button
            onClick={cycleLang}
            className="flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm transition-colors hover:text-white"
          >
            <Globe className="h-4 w-4" />
            {t('footer.language')}: {LANG_LABELS[i18n.language] ?? 'English'}
          </button>
        </div>
      </div>
    </footer>
  );
}
