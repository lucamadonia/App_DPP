import { useTranslation } from 'react-i18next';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import {
  Package, ShieldCheck, Truck, BrainCircuit, RotateCcw, QrCode,
  FileText, Award, Building2, Users, ListChecks, Mail, UserCircle,
} from 'lucide-react';

const features = [
  { key: 'productManagement', icon: Package, color: 'bg-blue-100 text-blue-600', borderColor: 'group-hover:border-t-blue-500', span: 2 },
  { key: 'compliance', icon: ShieldCheck, color: 'bg-emerald-100 text-emerald-600', borderColor: 'group-hover:border-t-emerald-500', span: 2 },
  { key: 'supplyChain', icon: Truck, color: 'bg-orange-100 text-orange-600', borderColor: 'group-hover:border-t-orange-500', span: 1 },
  { key: 'ai', icon: BrainCircuit, color: 'bg-violet-100 text-violet-600', borderColor: 'group-hover:border-t-violet-500', span: 1 },
  { key: 'returnsHub', icon: RotateCcw, color: 'bg-rose-100 text-rose-600', borderColor: 'group-hover:border-t-rose-500', span: 1 },
  { key: 'dppTemplates', icon: QrCode, color: 'bg-cyan-100 text-cyan-600', borderColor: 'group-hover:border-t-cyan-500', span: 1 },
  { key: 'documents', icon: FileText, color: 'bg-amber-100 text-amber-600', borderColor: 'group-hover:border-t-amber-500', span: 1 },
  { key: 'certificates', icon: Award, color: 'bg-teal-100 text-teal-600', borderColor: 'group-hover:border-t-teal-500', span: 1 },
  { key: 'suppliers', icon: Building2, color: 'bg-indigo-100 text-indigo-600', borderColor: 'group-hover:border-t-indigo-500', span: 1 },
  { key: 'multiTenant', icon: Users, color: 'bg-pink-100 text-pink-600', borderColor: 'group-hover:border-t-pink-500', span: 1 },
  { key: 'qrGenerator', icon: QrCode, color: 'bg-sky-100 text-sky-600', borderColor: 'group-hover:border-t-sky-500', span: 1 },
  { key: 'customerPortal', icon: UserCircle, color: 'bg-emerald-100 text-emerald-600', borderColor: 'group-hover:border-t-emerald-500', span: 1 },
  { key: 'checklists', icon: ListChecks, color: 'bg-lime-100 text-lime-600', borderColor: 'group-hover:border-t-lime-500', span: 1 },
  { key: 'emailTemplates', icon: Mail, color: 'bg-sky-100 text-sky-600', borderColor: 'group-hover:border-t-sky-500', span: 1 },
];

export function LandingFeaturesBento() {
  const { t } = useTranslation('landing');
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="features" className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div ref={ref} className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 ${isVisible ? 'animate-landing-reveal' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
            {t('features.title')}
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            {t('features.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <div
              key={f.key}
              className={`group relative rounded-2xl border border-slate-200 border-t-2 border-t-transparent bg-white p-6
                hover:bg-white/80 hover:backdrop-blur-sm hover:shadow-lg hover:border-slate-300
                landing-card-hover ${f.borderColor}
                ${f.span === 2 ? 'sm:col-span-2' : ''}
                ${isVisible ? 'animate-landing-reveal' : 'opacity-0 translate-y-8'}`}
              style={{ animationDelay: isVisible ? `${i * 60}ms` : undefined }}
            >
              <div className={`inline-flex rounded-xl p-2.5 ${f.color} transition-all group-hover:shadow-md group-hover:shadow-current/10`}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                {t(`features.${f.key}.title`)}
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                {t(`features.${f.key}.desc`)}
              </p>

              {/* Mini Mockup for span-2 cards */}
              {f.key === 'productManagement' && (
                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 hidden sm:block">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-slate-200" />
                    <div className="flex-1">
                      <div className="h-3 w-24 rounded bg-slate-200 mb-1" />
                      <div className="h-2 w-16 rounded bg-slate-100" />
                    </div>
                    <div className="flex gap-1">
                      <span className="rounded-full bg-blue-100 text-blue-600 px-2 py-0.5 text-[9px] font-medium">Cotton</span>
                      <span className="rounded-full bg-emerald-100 text-emerald-600 px-2 py-0.5 text-[9px] font-medium">GOTS</span>
                    </div>
                    <div className="h-1.5 w-12 rounded-full bg-slate-200">
                      <div className="h-1.5 w-10 rounded-full bg-blue-400" />
                    </div>
                  </div>
                </div>
              )}
              {f.key === 'compliance' && (
                <div className="mt-4 flex items-center gap-4 hidden sm:flex">
                  <div className="flex-1">
                    <svg width="60" height="60" viewBox="0 0 60 60">
                      <circle cx="30" cy="30" r="26" fill="none" stroke="#e2e8f0" strokeWidth="5" />
                      <circle cx="30" cy="30" r="26" fill="none" stroke="#10b981" strokeWidth="5" strokeDasharray="163" strokeDashoffset="21" strokeLinecap="round" transform="rotate(-90 30 30)" />
                      <text x="30" y="34" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#0f172a">87</text>
                    </svg>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { label: 'ESPR', ok: true },
                      { label: 'REACH', ok: true },
                      { label: 'GPSR', ok: false },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-1.5 text-xs">
                        <div className={`h-2 w-2 rounded-full ${item.ok ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <span className="text-slate-600">{item.label}</span>
                        <span className={`text-[10px] ${item.ok ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {item.ok ? '✓' : '⚠'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-feature count */}
              <div className="mt-3 text-[11px] font-medium text-slate-400">
                {t(`features.${f.key}.count`)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
