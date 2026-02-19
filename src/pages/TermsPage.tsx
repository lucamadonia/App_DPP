import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowLeft, Globe } from 'lucide-react';

const LANGS = ['en', 'de', 'el'] as const;
const LANG_LABELS: Record<string, string> = { en: 'English', de: 'Deutsch', el: '\u0395\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac' };

export function TermsPage() {
  const { t, i18n } = useTranslation('legal');

  const cycleLang = () => {
    const idx = LANGS.indexOf(i18n.language as typeof LANGS[number]);
    const next = LANGS[(idx + 1) % LANGS.length];
    i18n.changeLanguage(next);
  };

  const sections = [
    'scope',
    'registration',
    'services',
    'obligations',
    'billing',
    'intellectualProperty',
    'dataProtection',
    'liability',
    'termination',
    'changes',
    'severability',
    'governing',
  ] as const;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            to="/landing"
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backToHome')}
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={cycleLang}
              className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Globe className="h-4 w-4" />
              {LANG_LABELS[i18n.language] ?? 'English'}
            </button>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-violet-600 text-white font-bold text-[10px]">
              TB
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
          {t('terms.title')}
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          {t('lastUpdated')}: 10.02.2026
        </p>

        <div className="prose prose-slate max-w-none space-y-8">
          {sections.map((key, i) => (
            <section key={key}>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">
                {t(`terms.${key}.title`, { num: i + 1 })}
              </h2>
              <p className="text-slate-700 leading-relaxed">
                {t(`terms.${key}.text`)}
              </p>
            </section>
          ))}
        </div>

        {/* Footer links */}
        <div className="mt-16 pt-8 border-t border-slate-200 flex flex-wrap gap-4 text-sm text-slate-500">
          <Link to="/privacy" className="hover:text-slate-900 transition-colors">
            {t('privacyPolicy')}
          </Link>
          <span className="text-slate-300">|</span>
          <Link to="/imprint" className="hover:text-slate-900 transition-colors">
            {t('imprint')}
          </Link>
          <span className="text-slate-300">|</span>
          <Link to="/landing" className="hover:text-slate-900 transition-colors">
            {t('home')}
          </Link>
        </div>
      </main>
    </div>
  );
}
