import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Menu, X, Globe } from 'lucide-react';

const navIds = [
  { key: 'nav.features', id: 'features' },
  { key: 'nav.dppTemplates', id: 'dpp-showcase' },
  { key: 'nav.supplyChain', id: 'supply-chain' },
  { key: 'nav.ai', id: 'ai' },
  { key: 'nav.returns', id: 'returns' },
  { key: 'nav.emailEditor', id: 'email-editor' },
  { key: 'nav.pricing', id: 'stats' },
];

export function LandingNavbar() {
  const { t, i18n } = useTranslation('landing');
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

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

  const toggleLang = () => {
    const next = i18n.language === 'de' ? 'en' : 'de';
    i18n.changeLanguage(next);
  };

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
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 text-white font-bold text-sm transition-shadow group-hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                TB
              </div>
              <span className="text-lg font-semibold text-slate-900">Trackbliss</span>
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
              <button
                onClick={toggleLang}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <Globe className="h-4 w-4" />
                {i18n.language === 'de' ? 'DE' : 'EN'}
              </button>
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
                <button
                  onClick={toggleLang}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl"
                >
                  <Globe className="h-4 w-4" />
                  {i18n.language === 'de' ? 'Deutsch → English' : 'English → Deutsch'}
                </button>
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
