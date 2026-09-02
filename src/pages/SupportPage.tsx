import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Globe, LifeBuoy, Mail, ShieldCheck, Trash2 } from 'lucide-react';

const LANGS = ['en', 'de', 'el'] as const;
type Language = (typeof LANGS)[number];

const COPY: Record<Language, {
  language: string;
  title: string;
  intro: string;
  contactTitle: string;
  contactText: string;
  contactCta: string;
  include: string;
  deleteTitle: string;
  deleteText: string;
  adminPath: string;
  customerPath: string;
  privacyTitle: string;
  privacyText: string;
  legal: string;
}> = {
  en: {
    language: 'English',
    title: 'Trackbliss Support',
    intro: 'Help with digital product passports, compliance, returns, and your account.',
    contactTitle: 'Contact support',
    contactText: 'Send us your question by email. Never include passwords, one-time codes, or secret API keys.',
    contactCta: 'Email Trackbliss support',
    include: 'Please include your organization name, the affected area, and the steps that led to the issue.',
    deleteTitle: 'Delete your account',
    deleteText: 'Account deletion is available directly inside Trackbliss and does not require a support request.',
    adminPath: 'Admin account: Sign in → Settings → Account → Danger zone → Delete account',
    customerPath: 'Customer portal: Sign in → Profile → Delete account',
    privacyTitle: 'Privacy and legal information',
    privacyText: 'Learn how Trackbliss handles personal and business data, or review the terms of service.',
    legal: 'Legal notice',
  },
  de: {
    language: 'Deutsch',
    title: 'Trackbliss Support',
    intro: 'Hilfe zu digitalen Produktpässen, Compliance, Retouren und Ihrem Konto.',
    contactTitle: 'Support kontaktieren',
    contactText: 'Senden Sie uns Ihre Frage per E-Mail. Übermitteln Sie niemals Passwörter, Einmalcodes oder geheime API-Schlüssel.',
    contactCta: 'Trackbliss Support schreiben',
    include: 'Nennen Sie bitte Ihre Organisation, den betroffenen Bereich und die Schritte, die zum Problem geführt haben.',
    deleteTitle: 'Konto löschen',
    deleteText: 'Die Kontolöschung ist direkt in Trackbliss möglich und erfordert keine Support-Anfrage.',
    adminPath: 'Administratorkonto: Anmelden → Einstellungen → Konto → Gefahrenbereich → Konto löschen',
    customerPath: 'Kundenportal: Anmelden → Profil → Konto löschen',
    privacyTitle: 'Datenschutz und Rechtliches',
    privacyText: 'Erfahren Sie, wie Trackbliss personenbezogene und geschäftliche Daten verarbeitet, oder lesen Sie die Nutzungsbedingungen.',
    legal: 'Impressum',
  },
  el: {
    language: 'Ελληνικά',
    title: 'Υποστήριξη Trackbliss',
    intro: 'Βοήθεια για ψηφιακά διαβατήρια προϊόντων, συμμόρφωση, επιστροφές και τον λογαριασμό σας.',
    contactTitle: 'Επικοινωνία με την υποστήριξη',
    contactText: 'Στείλτε μας την ερώτησή σας με email. Μην στέλνετε ποτέ κωδικούς πρόσβασης, κωδικούς μίας χρήσης ή μυστικά κλειδιά API.',
    contactCta: 'Email στην υποστήριξη Trackbliss',
    include: 'Συμπεριλάβετε τον οργανισμό σας, την επηρεαζόμενη περιοχή και τα βήματα που οδήγησαν στο πρόβλημα.',
    deleteTitle: 'Διαγραφή λογαριασμού',
    deleteText: 'Η διαγραφή λογαριασμού είναι διαθέσιμη απευθείας στο Trackbliss χωρίς αίτημα υποστήριξης.',
    adminPath: 'Λογαριασμός διαχειριστή: Σύνδεση → Ρυθμίσεις → Λογαριασμός → Ζώνη κινδύνου → Διαγραφή λογαριασμού',
    customerPath: 'Πύλη πελατών: Σύνδεση → Προφίλ → Διαγραφή λογαριασμού',
    privacyTitle: 'Απόρρητο και νομικές πληροφορίες',
    privacyText: 'Δείτε πώς το Trackbliss επεξεργάζεται προσωπικά και εταιρικά δεδομένα ή διαβάστε τους όρους χρήσης.',
    legal: 'Νομικές πληροφορίες',
  },
};

export function SupportPage() {
  const { t, i18n } = useTranslation('legal');
  const language = LANGS.includes(i18n.language as Language) ? i18n.language as Language : 'en';
  const copy = COPY[language];

  const cycleLanguage = () => {
    const next = LANGS[(LANGS.indexOf(language) + 1) % LANGS.length];
    void i18n.changeLanguage(next);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link to="/landing" className="flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-slate-950">
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t('backToHome')}
          </Link>
          <button
            type="button"
            onClick={cycleLanguage}
            className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
          >
            <Globe className="size-4" aria-hidden="true" />
            {copy.language}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-10 max-w-2xl">
          <span className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <LifeBuoy className="size-6" aria-hidden="true" />
          </span>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{copy.title}</h1>
          <p className="mt-3 text-lg leading-relaxed text-slate-600">{copy.intro}</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <Mail className="mb-4 size-5 text-blue-600" aria-hidden="true" />
            <h2 className="text-lg font-semibold">{copy.contactTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{copy.contactText}</p>
            <a
              href="mailto:info@myfamblissgroup.com?subject=Trackbliss%20Support"
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              {copy.contactCta}
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
            <p className="mt-4 text-xs leading-relaxed text-slate-500">{copy.include}</p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <Trash2 className="mb-4 size-5 text-rose-600" aria-hidden="true" />
            <h2 className="text-lg font-semibold">{copy.deleteTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{copy.deleteText}</p>
            <ol className="mt-4 space-y-3 text-sm text-slate-700">
              <li className="rounded-xl bg-slate-50 p-3">{copy.adminPath}</li>
              <li className="rounded-xl bg-slate-50 p-3">{copy.customerPath}</li>
            </ol>
          </section>
        </div>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <ShieldCheck className="mb-4 size-5 text-emerald-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold">{copy.privacyTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{copy.privacyText}</p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm font-medium text-blue-700">
            <Link to="/privacy" className="hover:underline">{t('privacyPolicy')}</Link>
            <Link to="/terms" className="hover:underline">{t('terms')}</Link>
            <Link to="/imprint" className="hover:underline">{copy.legal}</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
