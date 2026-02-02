import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export function LandingFooter() {
  const { t, i18n } = useTranslation('landing');

  const toggleLang = () => {
    const next = i18n.language === 'de' ? 'en' : 'de';
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
        { label: t('footer.legal.privacy'), href: '#' },
        { label: t('footer.legal.terms'), href: '#' },
        { label: t('footer.legal.imprint'), href: '#' },
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
            onClick={toggleLang}
            className="flex items-center gap-1.5 text-sm hover:text-white transition-colors"
          >
            <Globe className="h-4 w-4" />
            {t('footer.language')}: {i18n.language === 'de' ? 'Deutsch' : 'English'}
          </button>
        </div>
      </div>
    </footer>
  );
}
