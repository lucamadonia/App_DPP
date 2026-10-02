import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Menu, X, Globe, ChevronDown, Check } from 'lucide-react';
import { LandingBrand } from './LandingBrand';

interface NavLink {
  key: string;
  id: string;
  /** Section is only rendered from md up (see LandingPage), so hide the link below md. */
  mdOnly?: boolean;
}

/** Grouped under the "Product" dropdown on desktop to keep the bar on one line. */
const productLinks: NavLink[] = [
  { key: 'nav.features', id: 'features' },
  { key: 'nav.dppTemplates', id: 'dpp-showcase' },
  { key: 'nav.supplyChain', id: 'supply-chain', mdOnly: true },
  { key: 'nav.emailEditor', id: 'email-editor', mdOnly: true },
];

const primaryLinks: NavLink[] = [
  { key: 'nav.ai', id: 'ai' },
  { key: 'nav.returns', id: 'returns' },
  { key: 'nav.pricing', id: 'pricing' },
];

const allLinks = [...productLinks, ...primaryLinks];

const languages = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'de', label: 'DE', name: 'Deutsch' },
  { code: 'el', label: 'EL', name: 'Ελληνικά' },
];

function useOutsideClose(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onKey);
    };
  }, [ref, onClose]);
}

export function LandingNavbar() {
  const { t, i18n } = useTranslation('landing');
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [langOpen, setLangOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const productRef = useRef<HTMLDivElement>(null);

  const closeLang = useCallback(() => setLangOpen(false), []);
  const closeProduct = useCallback(() => setProductOpen(false), []);
  useOutsideClose(langRef, closeLang);
  useOutsideClose(productRef, closeProduct);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Active section highlighting via IntersectionObserver
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    allLinks.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { rootMargin: '-40% 0px -55% 0px' }
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const changeLang = (code: string) => {
    i18n.changeLanguage(code);
    setLangOpen(false);
  };

  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  const scrollTo = useCallback((id: string) => {
    setMobileOpen(false);
    setProductOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Over the dark hero the bar is transparent with light text; once the page
  // scrolls it becomes a frosted glass bar (light or dark with the theme).
  const onDark = !scrolled && !mobileOpen;
  const linkBase =
    'relative inline-flex min-h-10 items-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors';
  const linkIdle = onDark
    ? 'text-slate-200 hover:bg-white/10 hover:text-white'
    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white';
  const linkActive = onDark ? 'text-white' : 'text-blue-600 dark:text-blue-400';
  const productActive = productLinks.some((l) => l.id === activeSection);

  return (
    <>
      <nav
        aria-label={t('nav.ariaMain')}
        className={`fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)] transition-[background-color,box-shadow,border-color] duration-300 ${
          onDark
            ? 'border-b border-transparent bg-transparent'
            : 'landing-glass border-b border-slate-200/70 shadow-sm dark:border-white/10'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="group -ml-1 rounded-xl p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label={t('nav.backToTop')}
            >
              <LandingBrand tone={onDark ? 'light' : 'auto'} />
            </button>

            {/* Desktop Nav */}
            <div className="hidden items-center gap-0.5 lg:flex">
              <div ref={productRef} className="relative">
                <button
                  onClick={() => setProductOpen((o) => !o)}
                  aria-expanded={productOpen}
                  aria-haspopup="true"
                  className={`${linkBase} gap-1 ${productActive ? linkActive : linkIdle}`}
                >
                  {t('nav.product')}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${productOpen ? 'rotate-180' : ''}`} />
                </button>
                {productOpen && (
                  <div className="absolute left-0 mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 animate-landing-reveal-scale dark:border-white/10 dark:bg-slate-900">
                    {productLinks.map((link) => (
                      <button
                        key={link.id}
                        onClick={() => scrollTo(link.id)}
                        className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                          activeSection === link.id
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                            : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5'
                        }`}
                      >
                        {t(link.key)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {primaryLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className={`${linkBase} ${activeSection === link.id ? linkActive : linkIdle}`}
                >
                  {t(link.key)}
                  {activeSection === link.id && (
                    <span className="absolute bottom-0.5 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-500 to-violet-500" />
                  )}
                </button>
              ))}
            </div>

            {/* Desktop Actions */}
            <div className="hidden items-center gap-2 lg:flex">
              <div ref={langRef} className="relative">
                <button
                  onClick={() => setLangOpen(!langOpen)}
                  aria-expanded={langOpen}
                  aria-haspopup="true"
                  aria-label={t('footer.language')}
                  className={`${linkBase} gap-1.5 ${linkIdle}`}
                >
                  <Globe className="h-4 w-4" />
                  {currentLang.label}
                  <ChevronDown className={`h-3 w-3 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
                </button>
                {langOpen && (
                  <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-landing-reveal-scale dark:border-white/10 dark:bg-slate-900">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => changeLang(lang.code)}
                        className="flex w-full items-center justify-between px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
                      >
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{lang.label}</span>
                          <span className="text-slate-400">{lang.name}</span>
                        </span>
                        {i18n.language === lang.code && <Check className="h-3.5 w-3.5 text-blue-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => navigate('/login')} className={`${linkBase} ${linkIdle}`}>
                {t('nav.login')}
              </button>
              <button
                onClick={() => navigate('/login')}
                className="inline-flex min-h-10 items-center whitespace-nowrap rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:-translate-y-px hover:shadow-violet-600/40"
              >
                {t('nav.getStarted')}
              </button>
            </div>

            {/* Mobile Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-xl lg:hidden ${
                onDark
                  ? 'text-white hover:bg-white/10'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10'
              }`}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-[calc(4rem+env(safe-area-inset-top))] max-h-[calc(100dvh-4rem-env(safe-area-inset-top))] w-[min(300px,92vw)] overflow-y-auto rounded-bl-2xl border-l border-slate-200 bg-white/95 pb-[var(--safe-bottom)] shadow-xl backdrop-blur-xl animate-landing-reveal dark:border-white/10 dark:bg-slate-900/95">
            <div className="space-y-1 p-4">
              {allLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className={`w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition-all ${
                    link.mdOnly ? 'hidden md:block' : 'block'
                  } ${
                    activeSection === link.id
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300'
                      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5'
                  }`}
                >
                  {t(link.key)}
                </button>
              ))}
              <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-white/10">
                <div className="px-4 py-2">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <Globe className="mr-1 inline h-3 w-3" />
                    {t('footer.language')}
                  </p>
                  <div className="flex gap-2">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => changeLang(lang.code)}
                        className={`min-h-11 flex-1 rounded-lg px-2 py-2 text-center text-xs font-medium transition-all ${
                          i18n.language === lang.code
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-200'
                        }`}
                      >
                        <span className="block font-semibold">{lang.label}</span>
                        <span className="block text-[10px] opacity-80">{lang.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => { setMobileOpen(false); navigate('/login'); }}
                  className="min-h-11 w-full rounded-xl px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
                >
                  {t('nav.login')}
                </button>
                <button
                  onClick={() => { setMobileOpen(false); navigate('/login'); }}
                  className="min-h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-blue-600/30"
                >
                  {t('nav.getStarted')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
