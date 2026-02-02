import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, BarChart3, QrCode, RotateCcw, FileText, Users } from 'lucide-react';

export function LandingHero() {
  const { t } = useTranslation('landing');
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Gradient Mesh Background + Grid Pattern */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(226,232,240,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(226,232,240,0.3)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute top-[-20%] left-[-10%] h-[500px] w-[500px] rounded-full bg-blue-400/20 blur-3xl animate-landing-gradient-mesh" />
        <div className="absolute top-[20%] right-[-10%] h-[400px] w-[400px] rounded-full bg-violet-400/15 blur-3xl animate-landing-gradient-mesh [animation-delay:2s]" />
        <div className="absolute bottom-[-10%] left-[30%] h-[350px] w-[350px] rounded-full bg-cyan-400/15 blur-3xl animate-landing-gradient-mesh [animation-delay:4s]" />
        <div className="absolute top-[40%] left-[50%] h-[300px] w-[300px] rounded-full bg-emerald-400/10 blur-3xl animate-landing-gradient-mesh [animation-delay:6s]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <div className="animate-landing-reveal">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-4 py-1.5 text-sm font-medium text-blue-700 mb-6">
              <ShieldCheck className="h-4 w-4" />
              EU ESPR 2024
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.1]">
              {t('hero.headline')}
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-xl leading-relaxed">
              {t('hero.sub1')}
            </p>
            <p className="mt-2 text-lg sm:text-xl text-slate-500">
              {t('hero.sub2')}
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <button
                onClick={() => navigate('/login')}
                className="rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 hover:shadow-blue-600/30 transition-all landing-glow"
              >
                {t('hero.cta.primary')}
              </button>
              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="rounded-xl border border-slate-300 bg-white px-8 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                {t('hero.cta.secondary')}
              </button>
            </div>

            {/* Social Proof */}
            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2">
                {['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500'].map((c, i) => (
                  <div key={i} className={`h-8 w-8 rounded-full ${c} border-2 border-white flex items-center justify-center`}>
                    <Users className="h-3.5 w-3.5 text-white" />
                  </div>
                ))}
              </div>
              <span className="text-sm text-slate-500">{t('hero.socialProof')}</span>
            </div>
          </div>

          {/* Right: Dashboard Mockup */}
          <div className="animate-landing-reveal [animation-delay:0.3s] hidden lg:block">
            <div className="relative">
              {/* Floating Badges */}
              <div className="absolute -top-3 -right-3 z-20 landing-glass rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg animate-landing-float">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-700">ESPR</span>
              </div>
              <div className="absolute top-1/3 -right-4 z-20 landing-glass rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg animate-landing-float [animation-delay:2s]">
                <QrCode className="h-4 w-4 text-violet-600" />
                <span className="text-xs font-semibold text-slate-700">GS1</span>
              </div>
              <div className="absolute bottom-8 -right-2 z-20 landing-glass rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg animate-landing-float [animation-delay:4s]">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-700">AI</span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/50 overflow-hidden animate-landing-glow-pulse">
                {/* Fake Browser Bar */}
                <div className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-2.5 bg-slate-50">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  <div className="ml-3 flex-1 rounded-md bg-slate-200/70 px-3 py-1 text-xs text-slate-400">
                    trackbliss.com
                  </div>
                </div>

                <div className="flex">
                  {/* Sidebar Silhouette */}
                  <div className="w-12 bg-slate-900 p-2 flex flex-col items-center gap-3 pt-4">
                    <div className="h-6 w-6 rounded-lg bg-blue-500 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-white">D</span>
                    </div>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className={`h-3 w-3 rounded ${i === 0 ? 'bg-blue-400' : 'bg-slate-700'}`} />
                    ))}
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 p-4 space-y-3">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="h-2 w-12 rounded bg-slate-100" />
                      <div className="h-2 w-1 rounded bg-slate-200" />
                      <div className="h-2 w-16 rounded bg-slate-100" />
                    </div>

                    {/* 4 KPI Cards */}
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { icon: BarChart3, label: t('hero.mockup.products'), value: '247', color: 'text-blue-600 bg-blue-50', sparkColor: '#3b82f6' },
                        { icon: ShieldCheck, label: t('hero.mockup.compliant'), value: '94%', color: 'text-emerald-600 bg-emerald-50', sparkColor: '#10b981' },
                        { icon: QrCode, label: t('hero.mockup.dpps'), value: '183', color: 'text-violet-600 bg-violet-50', sparkColor: '#8b5cf6' },
                        { icon: RotateCcw, label: t('hero.mockup.returns'), value: '12', color: 'text-rose-600 bg-rose-50', sparkColor: '#f43f5e' },
                      ].map((stat) => (
                        <div key={stat.label} className="rounded-lg border border-slate-100 bg-white p-2">
                          <div className="flex items-center justify-between mb-1">
                            <div className={`inline-flex rounded-md p-1 ${stat.color}`}>
                              <stat.icon className="h-3 w-3" />
                            </div>
                            {/* Mini Sparkline */}
                            <svg width="32" height="12" viewBox="0 0 32 12">
                              <polyline
                                points="0,8 5,6 10,9 15,4 20,5 25,2 32,4"
                                fill="none"
                                stroke={stat.sparkColor}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                              />
                            </svg>
                          </div>
                          <p className="text-sm font-bold text-slate-900 leading-none">{stat.value}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">{stat.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Mini Chart */}
                    <div className="rounded-lg border border-slate-100 p-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-medium text-slate-500">{t('hero.mockup.compliance')}</span>
                        <div className="flex gap-1">
                          <div className="h-1.5 w-6 rounded-full bg-blue-200" />
                          <div className="h-1.5 w-6 rounded-full bg-emerald-200" />
                        </div>
                      </div>
                      <svg width="100%" height="48" viewBox="0 0 280 48" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d="M 0 38 L 40 30 L 80 35 L 120 22 L 160 18 L 200 10 L 240 14 L 280 8 L 280 48 L 0 48 Z" fill="url(#chart-fill)" />
                        <polyline points="0,38 40,30 80,35 120,22 160,18 200,10 240,14 280,8" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>

                    {/* Product Table */}
                    <div className="rounded-lg border border-slate-100 p-2">
                      <div className="flex items-center gap-1.5 mb-2">
                        <FileText className="h-3 w-3 text-slate-400" />
                        <span className="text-[10px] font-medium text-slate-500">{t('hero.mockup.recentProducts')}</span>
                      </div>
                      {/* Header */}
                      <div className="grid grid-cols-[24px_1fr_60px_50px_40px] gap-1.5 mb-1 px-1">
                        <div />
                        <div className="h-2 w-10 rounded bg-slate-100" />
                        <div className="h-2 w-8 rounded bg-slate-100" />
                        <div className="h-2 w-8 rounded bg-slate-100" />
                        <div className="h-2 w-6 rounded bg-slate-100" />
                      </div>
                      {[
                        { name: 'Cotton T-Shirt', gtin: '4260...789', status: 'bg-emerald-50 border-emerald-200', pct: 94 },
                        { name: 'Denim Jacket', gtin: '4260...456', status: 'bg-emerald-50 border-emerald-200', pct: 87 },
                        { name: 'Wool Sweater', gtin: '4260...123', status: 'bg-amber-50 border-amber-200', pct: 72 },
                        { name: 'Linen Shirt', gtin: '4260...321', status: 'bg-emerald-50 border-emerald-200', pct: 91 },
                      ].map((row) => (
                        <div key={row.name} className="grid grid-cols-[24px_1fr_60px_50px_40px] gap-1.5 items-center py-1 border-t border-slate-50 px-1">
                          <div className="h-5 w-5 rounded bg-slate-100" />
                          <div>
                            <div className="text-[9px] font-medium text-slate-700 truncate">{row.name}</div>
                          </div>
                          <div className="text-[8px] text-slate-400 font-mono">{row.gtin}</div>
                          <div className={`h-4 rounded-full border text-[8px] flex items-center justify-center font-medium ${row.status}`}>
                            {row.pct}%
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-100">
                            <div className="h-1.5 rounded-full bg-blue-400" style={{ width: `${row.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Hint - Animated Mouse */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-xs text-slate-400">{t('hero.scrollHint')}</span>
        <div className="h-8 w-5 rounded-full border-2 border-slate-300 flex justify-center pt-1.5">
          <div className="h-1.5 w-1 rounded-full bg-slate-400 animate-bounce" />
        </div>
      </div>
    </section>
  );
}
