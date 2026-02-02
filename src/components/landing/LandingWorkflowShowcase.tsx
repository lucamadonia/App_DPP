import { useTranslation } from 'react-i18next';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { Zap, GitBranch, Play, Clock, Mail } from 'lucide-react';

const palettes = [
  { key: 'trigger', icon: Play, color: 'bg-emerald-500 text-white' },
  { key: 'condition', icon: GitBranch, color: 'bg-amber-500 text-white' },
  { key: 'action', icon: Zap, color: 'bg-blue-500 text-white' },
  { key: 'delay', icon: Clock, color: 'bg-violet-500 text-white' },
];

const badges = ['dragDrop', 'nodeTypes', 'conditions', 'emailActions'];

export function LandingWorkflowShowcase() {
  const { t } = useTranslation('landing');
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="workflow" className="py-24 bg-white overflow-hidden">
      <div ref={ref} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 ${isVisible ? 'animate-landing-reveal' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
            {t('workflow.title')}
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            {t('workflow.subtitle')}
          </p>
        </div>

        {/* Workflow Builder Mockup */}
        <div className={`rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden max-w-5xl mx-auto ${
          isVisible ? 'animate-landing-reveal [animation-delay:0.3s]' : 'opacity-0 translate-y-8'
        }`}>
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 bg-slate-50">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
            </div>
            <span className="text-xs text-slate-400">Workflow Builder</span>
            <div className="flex items-center gap-2">
              <div className="h-5 w-12 rounded bg-emerald-100 border border-emerald-200" />
            </div>
          </div>

          <div className="grid grid-cols-[72px_1fr] min-h-[350px] divide-x divide-slate-100">
            {/* Left: Palette */}
            <div className="bg-slate-50 p-2 space-y-2">
              <p className="text-[9px] font-medium text-slate-400 text-center mb-2">Nodes</p>
              {palettes.map((p) => (
                <div key={p.key} className={`flex flex-col items-center gap-0.5 rounded-lg p-2 ${p.color} cursor-default`}>
                  <p.icon className="h-4 w-4" />
                  <span className="text-[7px] font-medium">{t(`workflow.palette.${p.key}`)}</span>
                </div>
              ))}
            </div>

            {/* Canvas */}
            <div className="relative p-6 bg-[radial-gradient(circle,#e2e8f0_1px,transparent_1px)] bg-[size:20px_20px]">
              {/* SVG Connections */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                {/* Trigger → Condition1 */}
                <path d="M 180 60 C 240 60, 240 60, 280 60" stroke="#94a3b8" strokeWidth="2" fill="none" strokeDasharray="6 3" />
                {/* Condition1 → Action1 */}
                <path d="M 370 60 C 420 60, 420 60, 460 60" stroke="#94a3b8" strokeWidth="2" fill="none" strokeDasharray="6 3" />
                {/* Action1 → Condition2 */}
                <path d="M 460 90 C 460 150, 300 150, 300 180" stroke="#94a3b8" strokeWidth="2" fill="none" strokeDasharray="6 3" />
                {/* Condition2 → Action2 (Yes) */}
                <path d="M 370 200 C 420 200, 420 200, 460 200" stroke="#94a3b8" strokeWidth="2" fill="none" strokeDasharray="6 3" />
              </svg>

              <div className="relative" style={{ zIndex: 1 }}>
                {/* Row 1: Trigger → Condition → Action */}
                <div className="flex items-center gap-6 mb-16">
                  {/* Trigger Node */}
                  <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50 px-4 py-3 min-w-[140px] shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Play className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-[10px] font-medium text-emerald-600 uppercase">Trigger</span>
                    </div>
                    <p className="text-xs font-medium text-slate-700">{t('workflow.node.trigger')}</p>
                  </div>

                  <div className="h-0.5 w-8 bg-slate-300 flex-shrink-0 hidden sm:block" />

                  {/* Condition Node (diamond shape via rotated border) */}
                  <div className="rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3 min-w-[140px] shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <GitBranch className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-[10px] font-medium text-amber-600 uppercase">Condition</span>
                    </div>
                    <p className="text-xs font-medium text-slate-700">{t('workflow.node.condition1')}</p>
                  </div>

                  <div className="h-0.5 w-8 bg-slate-300 flex-shrink-0 hidden sm:block" />

                  {/* Action Node */}
                  <div className="rounded-xl border-2 border-blue-400 bg-blue-50 px-4 py-3 min-w-[160px] shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="h-3.5 w-3.5 text-blue-600" />
                      <span className="text-[10px] font-medium text-blue-600 uppercase">Action</span>
                    </div>
                    <p className="text-xs font-medium text-slate-700">{t('workflow.node.action1')}</p>
                  </div>
                </div>

                {/* Row 2: Condition2 → Action2 */}
                <div className="flex items-center gap-6 ml-12">
                  {/* Condition Node 2 */}
                  <div className="rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3 min-w-[140px] shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <GitBranch className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-[10px] font-medium text-amber-600 uppercase">Condition</span>
                    </div>
                    <p className="text-xs font-medium text-slate-700">{t('workflow.node.condition2')}</p>
                    <div className="flex gap-3 mt-1.5">
                      <span className="text-[9px] font-medium text-emerald-600 bg-emerald-100 rounded px-1.5 py-0.5">{t('workflow.yes')}</span>
                      <span className="text-[9px] font-medium text-red-600 bg-red-100 rounded px-1.5 py-0.5">{t('workflow.no')}</span>
                    </div>
                  </div>

                  <div className="h-0.5 w-8 bg-slate-300 flex-shrink-0 hidden sm:block" />

                  {/* Action Node 2 */}
                  <div className="rounded-xl border-2 border-blue-400 bg-blue-50 px-4 py-3 min-w-[140px] shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="h-3.5 w-3.5 text-blue-600" />
                      <span className="text-[10px] font-medium text-blue-600 uppercase">Action</span>
                    </div>
                    <p className="text-xs font-medium text-slate-700">{t('workflow.node.action2')}</p>
                  </div>
                </div>
              </div>

              {/* Minimap */}
              <div className="absolute bottom-3 right-3 w-24 h-16 rounded-lg border border-slate-200 bg-white/80 p-1.5">
                <div className="h-full w-full rounded bg-slate-50 relative">
                  <div className="absolute top-1 left-1 h-1 w-3 rounded-full bg-emerald-400" />
                  <div className="absolute top-1 left-5 h-1 w-3 rounded-full bg-amber-400" />
                  <div className="absolute top-1 left-9 h-1 w-3 rounded-full bg-blue-400" />
                  <div className="absolute top-4 left-2 h-1 w-3 rounded-full bg-amber-400" />
                  <div className="absolute top-4 left-7 h-1 w-3 rounded-full bg-blue-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Badges */}
        <div className={`mt-8 flex flex-wrap justify-center gap-3 ${
          isVisible ? 'animate-landing-reveal [animation-delay:0.6s]' : 'opacity-0'
        }`}>
          {badges.map((key) => (
            <span key={key} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 landing-card-hover">
              {t(`workflow.badge.${key}`)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
