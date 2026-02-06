import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowLeft, Globe } from 'lucide-react';

const LANGS = ['en', 'de', 'el'] as const;
const LANG_LABELS: Record<string, string> = { en: 'English', de: 'Deutsch', el: '\u0395\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac' };

export function PrivacyPolicyPage() {
  const { t, i18n } = useTranslation('legal');

  const cycleLang = () => {
    const idx = LANGS.indexOf(i18n.language as typeof LANGS[number]);
    const next = LANGS[(idx + 1) % LANGS.length];
    i18n.changeLanguage(next);
  };

  const lastUpdated = '06.02.2026';

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
          {t('privacy.title')}
        </h1>
        <p className="text-sm text-slate-500 mb-10">
          {t('lastUpdated')}: {lastUpdated}
        </p>

        <div className="prose prose-slate max-w-none space-y-10">

          {/* 1. Data Controller */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              {t('privacy.1.title')}
            </h2>
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 mb-4">
              <p className="font-semibold text-slate-900">MYFAMBLISS GROUP LTD</p>
              <p className="text-slate-700">Gladstonos 12-14</p>
              <p className="text-slate-700">8042 Paphos, {t('imprint.companyInfo.country')}</p>
              <p className="text-slate-700 mt-2">
                <span className="font-medium">Director:</span> Antonia Arapi
              </p>
              <p className="text-slate-700">
                <span className="font-medium">E-Mail:</span>{' '}
                <a href="mailto:info@myfamblissgroup.com" className="text-blue-600 hover:text-blue-800 underline">
                  info@myfamblissgroup.com
                </a>
              </p>
            </div>
            <p className="text-slate-700 leading-relaxed">{t('privacy.1.intro')}</p>
          </section>

          {/* 2. Overview */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">{t('privacy.2.title')}</h2>
            <p className="text-slate-700 leading-relaxed">{t('privacy.2.text')}</p>
          </section>

          {/* 3. Legal Basis */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">{t('privacy.3.title')}</h2>
            <p className="text-slate-700 leading-relaxed mb-4">{t('privacy.3.intro')}</p>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li><span className="font-medium text-slate-900">{t('privacy.3.a')}:</span> {t('privacy.3.a.desc')}</li>
              <li><span className="font-medium text-slate-900">{t('privacy.3.b')}:</span> {t('privacy.3.b.desc')}</li>
              <li><span className="font-medium text-slate-900">{t('privacy.3.c')}:</span> {t('privacy.3.c.desc')}</li>
              <li><span className="font-medium text-slate-900">{t('privacy.3.f')}:</span> {t('privacy.3.f.desc')}</li>
            </ul>
          </section>

          {/* 4. Hosting */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">{t('privacy.4.title')}</h2>
            <h3 className="text-lg font-medium text-slate-800 mb-2 mt-6">{t('privacy.4a.title')}</h3>
            <p className="text-slate-700 leading-relaxed">{t('privacy.4a.text')}</p>
            <h3 className="text-lg font-medium text-slate-800 mb-2 mt-6">{t('privacy.4b.title')}</h3>
            <p className="text-slate-700 leading-relaxed">{t('privacy.4b.text')}</p>
          </section>

          {/* 5. Data Collection */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">{t('privacy.5.title')}</h2>
            <h3 className="text-lg font-medium text-slate-800 mb-2 mt-6">{t('privacy.5a.title')}</h3>
            <p className="text-slate-700 leading-relaxed mb-3">{t('privacy.5a.intro')}</p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-700">
              <li>{t('privacy.5a.item1')}</li>
              <li>{t('privacy.5a.item2')}</li>
              <li>{t('privacy.5a.item3')}</li>
              <li>{t('privacy.5a.item4')}</li>
              <li>{t('privacy.5a.item5')}</li>
              <li>{t('privacy.5a.item6')}</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-3">{t('privacy.5a.note')}</p>
            <h3 className="text-lg font-medium text-slate-800 mb-2 mt-6">{t('privacy.5b.title')}</h3>
            <p className="text-slate-700 leading-relaxed">{t('privacy.5b.text')}</p>
          </section>

          {/* 6. User Account */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">{t('privacy.6.title')}</h2>
            <p className="text-slate-700 leading-relaxed mb-3">{t('privacy.6.intro')}</p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-700">
              <li>{t('privacy.6.item1')}</li>
              <li>{t('privacy.6.item2')}</li>
              <li>{t('privacy.6.item3')}</li>
              <li>{t('privacy.6.item4')}</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-3">{t('privacy.6.note')}</p>
          </section>

          {/* 7. Business Data */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">{t('privacy.7.title')}</h2>
            <p className="text-slate-700 leading-relaxed mb-3">{t('privacy.7.intro')}</p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-700">
              <li>{t('privacy.7.item1')}</li>
              <li>{t('privacy.7.item2')}</li>
              <li>{t('privacy.7.item3')}</li>
              <li>{t('privacy.7.item4')}</li>
              <li>{t('privacy.7.item5')}</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-3">{t('privacy.7.note')}</p>
          </section>

          {/* 8. AI Compliance */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">{t('privacy.8.title')}</h2>
            <p className="text-slate-700 leading-relaxed">{t('privacy.8.text')}</p>
          </section>

          {/* 9. Email Notifications */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">{t('privacy.9.title')}</h2>
            <p className="text-slate-700 leading-relaxed">{t('privacy.9.text')}</p>
          </section>

          {/* 10. Data Transfer */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">{t('privacy.10.title')}</h2>
            <p className="text-slate-700 leading-relaxed mb-3">{t('privacy.10.intro')}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-900">{t('privacy.10.table.service')}</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-900">{t('privacy.10.table.country')}</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-900">{t('privacy.10.table.safeguard')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="px-4 py-3 text-slate-700">Vercel</td>
                    <td className="px-4 py-3 text-slate-700">USA</td>
                    <td className="px-4 py-3 text-slate-700">EU-U.S. Data Privacy Framework</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-slate-700">Supabase</td>
                    <td className="px-4 py-3 text-slate-700">{t('privacy.10.table.supabaseCountry')}</td>
                    <td className="px-4 py-3 text-slate-700">{t('privacy.10.table.supabaseSafeguard')}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-slate-700">OpenRouter / Anthropic</td>
                    <td className="px-4 py-3 text-slate-700">USA</td>
                    <td className="px-4 py-3 text-slate-700">EU-U.S. Data Privacy Framework</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-slate-700">Resend</td>
                    <td className="px-4 py-3 text-slate-700">USA</td>
                    <td className="px-4 py-3 text-slate-700">EU-U.S. Data Privacy Framework</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 11. Data Subject Rights */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">{t('privacy.11.title')}</h2>
            <p className="text-slate-700 leading-relaxed mb-3">{t('privacy.11.intro')}</p>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li><span className="font-medium text-slate-900">{t('privacy.11.access')}</span> (Art. 15 GDPR)</li>
              <li><span className="font-medium text-slate-900">{t('privacy.11.rectification')}</span> (Art. 16 GDPR)</li>
              <li><span className="font-medium text-slate-900">{t('privacy.11.erasure')}</span> (Art. 17 GDPR)</li>
              <li><span className="font-medium text-slate-900">{t('privacy.11.restriction')}</span> (Art. 18 GDPR)</li>
              <li><span className="font-medium text-slate-900">{t('privacy.11.portability')}</span> (Art. 20 GDPR)</li>
              <li><span className="font-medium text-slate-900">{t('privacy.11.object')}</span> (Art. 21 GDPR)</li>
              <li><span className="font-medium text-slate-900">{t('privacy.11.withdraw')}</span> (Art. 7(3) GDPR)</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-3">{t('privacy.11.contact')}</p>
          </section>

          {/* 12. Right to Complain */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">{t('privacy.12.title')}</h2>
            <p className="text-slate-700 leading-relaxed">{t('privacy.12.text')}</p>
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 mt-3">
              <p className="font-semibold text-slate-900">{t('privacy.12.authority')}</p>
              <p className="text-slate-700">Iasonos 1, 1082 Nicosia, {t('privacy.12.country')}</p>
              <p className="text-slate-700 mt-1">
                <span className="font-medium">Web:</span>{' '}
                <a href="http://www.dataprotection.gov.cy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                  www.dataprotection.gov.cy
                </a>
              </p>
            </div>
          </section>

          {/* 13. Data Security */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">{t('privacy.13.title')}</h2>
            <p className="text-slate-700 leading-relaxed mb-3">{t('privacy.13.intro')}</p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-700">
              <li>{t('privacy.13.item1')}</li>
              <li>{t('privacy.13.item2')}</li>
              <li>{t('privacy.13.item3')}</li>
              <li>{t('privacy.13.item4')}</li>
              <li>{t('privacy.13.item5')}</li>
            </ul>
          </section>

          {/* 14. Data Retention */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">{t('privacy.14.title')}</h2>
            <p className="text-slate-700 leading-relaxed">{t('privacy.14.text')}</p>
          </section>

          {/* 15. Changes */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">{t('privacy.15.title')}</h2>
            <p className="text-slate-700 leading-relaxed">{t('privacy.15.text')}</p>
          </section>
        </div>

        {/* Footer links */}
        <div className="mt-16 pt-8 border-t border-slate-200 flex flex-wrap gap-4 text-sm text-slate-500">
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
