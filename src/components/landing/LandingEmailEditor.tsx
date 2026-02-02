import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import {
  Type, MousePointerClick, Image, Minus, MoveVertical,
  LayoutGrid, Sparkles, Link2, Columns2, Check, Monitor, Smartphone,
} from 'lucide-react';

const blockIcons = [
  { icon: Type, label: 'Text' },
  { icon: MousePointerClick, label: 'Button' },
  { icon: Image, label: 'Image' },
  { icon: Minus, label: 'Divider' },
  { icon: MoveVertical, label: 'Spacer' },
  { icon: LayoutGrid, label: 'Info Box' },
  { icon: Sparkles, label: 'Hero' },
  { icon: Link2, label: 'Social' },
  { icon: Columns2, label: 'Columns' },
];

const templateStrip = [
  { key: 'returnConfirmed', color: 'bg-emerald-500' },
  { key: 'returnApproved', color: 'bg-blue-500' },
  { key: 'ticketCreated', color: 'bg-violet-500' },
  { key: 'ticketReply', color: 'bg-indigo-500' },
  { key: 'welcome', color: 'bg-teal-500' },
  { key: 'refund', color: 'bg-amber-500' },
  { key: 'voucher', color: 'bg-rose-500' },
  { key: 'feedback', color: 'bg-cyan-500' },
];

const badges = ['undoRedo', 'autosave', 'blockTypes'];

export function LandingEmailEditor() {
  const { t } = useTranslation('landing');
  const { ref, isVisible } = useScrollReveal();
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  const features = [
    t('emailEditor.feature1'),
    t('emailEditor.feature2'),
    t('emailEditor.feature3'),
    t('emailEditor.feature4'),
  ];

  return (
    <section id="email-editor" className="py-24 bg-slate-50">
      <div ref={ref} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-12 ${isVisible ? 'animate-landing-reveal' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
            {t('emailEditor.title')}
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            {t('emailEditor.subtitle')}
          </p>
        </div>

        {/* Template Gallery Strip */}
        <div className={`mb-6 overflow-x-auto pb-2 ${isVisible ? 'animate-landing-reveal [animation-delay:0.2s]' : 'opacity-0'}`}>
          <div className="flex gap-2 justify-center min-w-max px-4">
            {templateStrip.map((tmpl, i) => (
              <div
                key={tmpl.key}
                className={`rounded-xl border bg-white p-2 w-28 shrink-0 cursor-default transition-all ${
                  i === 0 ? 'border-blue-300 shadow-md animate-landing-glow-pulse' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`${tmpl.color} rounded-md h-4 mb-1.5`} />
                <div className="h-2 w-full rounded bg-slate-100 mb-1" />
                <div className="h-2 w-3/4 rounded bg-slate-100" />
                <p className="mt-1.5 text-[8px] font-medium text-slate-500 truncate">{t(`emailEditor.template.${tmpl.key}`)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Editor Mockup */}
        <div className={`rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden max-w-4xl mx-auto ${
          isVisible ? 'animate-landing-reveal [animation-delay:0.4s]' : 'opacity-0 translate-y-8'
        }`}>
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 bg-slate-50">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
            </div>
            <span className="text-xs text-slate-400">Email Template Editor</span>
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-12 rounded bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                <span className="text-[8px] text-emerald-600 font-medium">Saved</span>
              </div>
            </div>
          </div>

          {/* 3-Column Layout */}
          <div className="grid grid-cols-[72px_1fr_200px] min-h-[340px] divide-x divide-slate-100">
            {/* Left: Block Icons */}
            <div className="bg-slate-50 p-2 space-y-1.5">
              <p className="text-[10px] font-medium text-slate-400 text-center mb-2">
                {t('emailEditor.blocks')}
              </p>
              {blockIcons.map((block) => (
                <div
                  key={block.label}
                  className="flex flex-col items-center gap-0.5 rounded-lg p-1.5 hover:bg-white cursor-default"
                >
                  <block.icon className="h-4 w-4 text-slate-500" />
                  <span className="text-[8px] text-slate-400">{block.label}</span>
                </div>
              ))}
            </div>

            {/* Center: Canvas */}
            <div className="p-4 bg-[radial-gradient(circle,#e2e8f0_1px,transparent_1px)] bg-[size:16px_16px]">
              <p className="text-[10px] font-medium text-slate-400 mb-3">{t('emailEditor.canvas')}</p>
              <div className="space-y-2 max-w-[280px] mx-auto">
                {/* Hero Block */}
                <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-violet-50 p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="h-5 w-5 rounded bg-blue-200" />
                    <div className="h-3 w-16 rounded bg-blue-200" />
                  </div>
                  <div className="h-4 w-32 rounded bg-blue-100 mx-auto mb-1.5" />
                  <div className="h-3 w-24 rounded bg-blue-50 mx-auto" />
                </div>
                {/* Text Block */}
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="h-3 w-full rounded bg-slate-100 mb-1.5" />
                  <div className="h-3 w-3/4 rounded bg-slate-100 mb-1.5" />
                  <div className="h-3 w-1/2 rounded bg-slate-100" />
                </div>
                {/* Columns Block */}
                <div className="rounded-lg border border-slate-200 p-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2">
                      <div className="h-2 w-10 rounded bg-emerald-200 mb-1" />
                      <div className="h-3 w-14 rounded bg-emerald-300" />
                    </div>
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-2">
                      <div className="h-2 w-10 rounded bg-amber-200 mb-1" />
                      <div className="h-3 w-14 rounded bg-amber-300" />
                    </div>
                  </div>
                </div>
                {/* Button Block */}
                <div className="rounded-lg border border-slate-200 p-3 text-center">
                  <div className="inline-block h-7 w-28 rounded-md bg-blue-500" />
                </div>
              </div>
            </div>

            {/* Right: Preview */}
            <div className="p-3 bg-slate-50">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-medium text-slate-400">{t('emailEditor.preview')}</p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPreviewMode('desktop')}
                    className={`rounded p-1 ${previewMode === 'desktop' ? 'bg-blue-100 text-blue-600' : 'text-slate-400'}`}
                  >
                    <Monitor className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setPreviewMode('mobile')}
                    className={`rounded p-1 ${previewMode === 'mobile' ? 'bg-blue-100 text-blue-600' : 'text-slate-400'}`}
                  >
                    <Smartphone className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div className={`rounded-lg border border-slate-200 bg-white p-2 space-y-1.5 mx-auto transition-all ${
                previewMode === 'mobile' ? 'max-w-[100px]' : 'max-w-full'
              }`}>
                <div className="rounded bg-gradient-to-r from-blue-500 to-violet-500 p-2">
                  <div className="h-2 w-8 rounded bg-white/50 mb-1" />
                  <div className="h-2 w-14 rounded bg-white/30" />
                </div>
                <div className="h-2 w-full rounded bg-slate-100" />
                <div className="h-2 w-3/4 rounded bg-slate-100" />
                <div className="grid grid-cols-2 gap-1">
                  <div className="h-4 rounded bg-emerald-50 border border-emerald-100" />
                  <div className="h-4 rounded bg-amber-50 border border-amber-100" />
                </div>
                <div className="mx-auto h-4 w-14 rounded bg-blue-500 mt-1" />
              </div>
            </div>
          </div>
        </div>

        {/* Floating Badges */}
        <div className={`mt-6 flex justify-center gap-3 ${isVisible ? 'animate-landing-reveal [animation-delay:0.6s]' : 'opacity-0'}`}>
          {badges.map((key) => (
            <span key={key} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
              {t(`emailEditor.badge.${key}`)}
            </span>
          ))}
        </div>

        {/* Features */}
        <div className={`mt-10 grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto ${
          isVisible ? 'animate-landing-reveal [animation-delay:0.7s]' : 'opacity-0 translate-y-8'
        }`}>
          {features.map((f) => (
            <div key={f} className="flex items-start gap-3">
              <div className="rounded-full bg-blue-100 p-1 mt-0.5 shrink-0">
                <Check className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <span className="text-sm text-slate-700">{f}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
