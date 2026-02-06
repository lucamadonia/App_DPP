import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowLeft, Globe } from 'lucide-react';

const LANGS = ['en', 'de', 'el'] as const;
const LANG_LABELS: Record<string, string> = { en: 'English', de: 'Deutsch', el: '\u0395\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac' };

export function ImprintPage() {
  const { t, i18n } = useTranslation('legal');

  const cycleLang = () => {
    const idx = LANGS.indexOf(i18n.language as typeof LANGS[number]);
    const next = LANGS[(idx + 1) % LANGS.length];
    i18n.changeLanguage(next);
  };

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
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-8">
          {t('imprint.title')}
        </h1>

        <div className="prose prose-slate max-w-none space-y-8">
          {/* Company Information */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              {t('imprint.companyInfo.title')}
            </h2>
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
              <p className="font-semibold text-slate-900 text-lg mb-1">MYFAMBLISS GROUP LTD</p>
              <p className="text-slate-700">Gladstonos 12-14</p>
              <p className="text-slate-700">8042 Paphos</p>
              <p className="text-slate-700 mb-3">{t('imprint.companyInfo.country')}</p>
              <p className="text-slate-700">
                <span className="font-medium text-slate-900">{t('imprint.companyInfo.tradeRegister')}:</span>{' '}
                {t('imprint.companyInfo.registeredIn')}
              </p>
            </div>
          </section>

          {/* Authorized Representative */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              {t('imprint.representative.title')}
            </h2>
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
              <p className="text-slate-700">
                <span className="font-medium text-slate-900">Director:</span> Antonia Arapi
              </p>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              {t('imprint.contact.title')}
            </h2>
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
              <p className="text-slate-700">
                <span className="font-medium text-slate-900">E-Mail:</span>{' '}
                <a href="mailto:info@myfamblissgroup.com" className="text-blue-600 hover:text-blue-800 underline">
                  info@myfamblissgroup.com
                </a>
              </p>
              <p className="text-slate-700 mt-1">
                <span className="font-medium text-slate-900">Website:</span>{' '}
                <a href="https://myfamblissgroup.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                  www.myfamblissgroup.com
                </a>
              </p>
            </div>
          </section>

          {/* Brand */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              {t('imprint.brand.title')}
            </h2>
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
              <p className="text-slate-700">
                <span className="font-medium text-slate-900">Trackbliss</span>{' '}
                {t('imprint.brand.desc')}
              </p>
              <p className="text-slate-700 mt-1">
                <span className="font-medium text-slate-900">URL:</span>{' '}
                <a href="https://dpp-app.fambliss.eu" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                  dpp-app.fambliss.eu
                </a>
              </p>
            </div>
          </section>

          {/* Responsible for Content */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              {t('imprint.contentResponsible.title')}
            </h2>
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
              <p className="text-slate-700">Antonia Arapi</p>
              <p className="text-slate-700">MYFAMBLISS GROUP LTD</p>
              <p className="text-slate-700">Gladstonos 12-14</p>
              <p className="text-slate-700">8042 Paphos, {t('imprint.companyInfo.country')}</p>
            </div>
          </section>

          {/* EU Dispute Resolution */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              {t('imprint.dispute.title')}
            </h2>
            <p className="text-slate-700 leading-relaxed">
              {t('imprint.dispute.intro')}
            </p>
            <p className="mt-2">
              <a
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline break-all"
              >
                https://ec.europa.eu/consumers/odr/
              </a>
            </p>
            <p className="text-slate-700 mt-3 leading-relaxed">
              {t('imprint.dispute.note')}
            </p>
          </section>

          {/* Liability for Content */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              {t('imprint.liability.title')}
            </h2>
            <p className="text-slate-700 leading-relaxed">
              {t('imprint.liability.text')}
            </p>
          </section>

          {/* Liability for Links */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              {t('imprint.liabilityLinks.title')}
            </h2>
            <p className="text-slate-700 leading-relaxed">
              {t('imprint.liabilityLinks.text')}
            </p>
          </section>

          {/* Copyright */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              {t('imprint.copyright.title')}
            </h2>
            <p className="text-slate-700 leading-relaxed">
              {t('imprint.copyright.text')}
            </p>
          </section>
        </div>

        {/* Footer links */}
        <div className="mt-16 pt-8 border-t border-slate-200 flex flex-wrap gap-4 text-sm text-slate-500">
          <Link to="/privacy" className="hover:text-slate-900 transition-colors">
            {t('privacyPolicy')}
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
