import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Globe } from 'lucide-react';

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
        { label: t('footer.product.dpp'), href: '#features' },
        { label: t('footer.product.returns'), href: '#returns' },
        { label: t('footer.product.templates'), href: '#features' },
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
        { label: t('footer.company.about'), href: '#' },
        { label: t('footer.company.contact'), href: '#' },
        { label: t('footer.company.blog'), href: '#' },
      ],
    },
    {
      title: t('footer.legal'),
      links: [
        { label: t('footer.legal.privacy'), href: '/privacy' },
        { label: t('footer.legal.terms'), href: '#' },
        { label: t('footer.legal.imprint'), href: '/imprint' },
      ],
    },
  ];

  return (
    <footer className="bg-slate-900 text-slate-400 pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
                        className="text-sm hover:text-white transition-colors"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="text-sm hover:text-white transition-colors"
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
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-violet-600 text-white font-bold text-[10px]">
              TB
            </div>
            <p className="text-sm">
              {t('footer.copyright', { year: new Date().getFullYear() })}
            </p>
          </div>
          <button
            onClick={cycleLang}
            className="flex items-center gap-1.5 text-sm hover:text-white transition-colors"
          >
            <Globe className="h-4 w-4" />
            {t('footer.language')}: {LANG_LABELS[i18n.language] ?? 'English'}
          </button>
        </div>
      </div>
    </footer>
  );
}
