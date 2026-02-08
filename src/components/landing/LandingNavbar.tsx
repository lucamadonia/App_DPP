import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Menu, X, Globe, ChevronDown, Check } from 'lucide-react';

const navIds = [
  { key: 'nav.features', id: 'features' },
  { key: 'nav.dppTemplates', id: 'dpp-showcase' },
  { key: 'nav.supplyChain', id: 'supply-chain' },
  { key: 'nav.ai', id: 'ai' },
  { key: 'nav.returns', id: 'returns' },
  { key: 'nav.emailEditor', id: 'email-editor' },
  { key: 'nav.pricing', id: 'pricing' },
];

const languages = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'de', label: 'DE', name: 'Deutsch' },
  { code: 'el', label: 'EL', name: 'Ελληνικά' },
];

export function LandingNavbar() {
  const { t, i18n } = useTranslation('landing');
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Active section highlighting via IntersectionObserver
  useEffect(() => {
    const ids = navIds.map((n) => n.id);
    const observers: IntersectionObserver[] = [];

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(id);
          }
        },
        { rootMargin: '-40% 0px -55% 0px' }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  // Click outside to close language dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const changeLang = (code: string) => {
    i18n.changeLanguage(code);
    setLangOpen(false);
  };

  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  const scrollTo = useCallback((id: string) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <>
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'landing-glass shadow-sm border-b border-slate-200/60'
            : 'bg-white/40 backdrop-blur-md border-b border-transparent'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="group">
              <img src="/trackbliss-logo.png" alt="Trackbliss" className="h-28 -my-6 object-contain transition-transform group-hover:scale-105" />
            </button>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navIds.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className={`relative px-3 py-1.5 text-sm font-medium transition-colors rounded-lg ${
                    activeSection === link.id
                      ? 'text-blue-600'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  {t(link.key)}
                  {activeSection === link.id && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-blue-600" />
                  )}
                </button>
              ))}
            </div>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-3">
              {/* Language Dropdown */}
              <div ref={langRef} className="relative">
                <button
                  onClick={() => setLangOpen(!langOpen)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <Globe className="h-4 w-4" />
                  {currentLang.label}
                  <ChevronDown className={`h-3 w-3 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
                </button>
                {langOpen && (
                  <div className="absolute right-0 mt-1 w-44 rounded-xl border border-slate-200 bg-white shadow-lg py-1 animate-landing-reveal-scale">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => changeLang(lang.code)}
                        className="flex items-center justify-between w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{lang.label}</span>
                          <span className="text-slate-400">{lang.name}</span>
                        </span>
                        {i18n.language === lang.code && (
                          <Check className="h-3.5 w-3.5 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => navigate('/login')}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                {t('nav.login')}
              </button>
              <button
                onClick={() => navigate('/login')}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors landing-glow"
              >
                {t('nav.getStarted')}
              </button>
            </div>

            {/* Mobile Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-16 right-0 w-72 max-h-[calc(100vh-4rem)] overflow-y-auto bg-white/95 backdrop-blur-xl border-l border-slate-200 shadow-xl rounded-bl-2xl animate-landing-reveal">
            <div className="p-4 space-y-1">
              {navIds.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className={`block w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeSection === link.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t(link.key)}
                </button>
              ))}
              <div className="border-t border-slate-200 pt-3 mt-3 space-y-2">
                {/* Mobile Language Selector */}
                <div className="px-4 py-2">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                    <Globe className="h-3 w-3 inline mr-1" />
                    {t('footer.language', { ns: 'landing' })}
                  </p>
                  <div className="flex gap-2">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => changeLang(lang.code)}
                        className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium text-center transition-all ${
                          i18n.language === lang.code
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                  className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white text-center landing-glow"
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
