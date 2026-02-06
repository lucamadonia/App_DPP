import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import {
  Type, Pointer, Image, Minus, ArrowUpDown,
  Table2, Sparkles, Link2, Columns2, Check, Monitor, Smartphone,
  GripVertical, Copy, Trash2, Plus,
} from 'lucide-react';

const blockIcons = [
  { icon: Type, label: 'Text', gradient: 'from-blue-500/10 to-blue-500/5' },
  { icon: Pointer, label: 'Button', gradient: 'from-violet-500/10 to-violet-500/5' },
  { icon: Image, label: 'Image', gradient: 'from-emerald-500/10 to-emerald-500/5' },
  { icon: Minus, label: 'Divider', gradient: 'from-slate-500/10 to-slate-500/5' },
  { icon: ArrowUpDown, label: 'Spacer', gradient: 'from-amber-500/10 to-amber-500/5' },
  { icon: Table2, label: 'Info Box', gradient: 'from-cyan-500/10 to-cyan-500/5' },
  { icon: Sparkles, label: 'Hero', gradient: 'from-rose-500/10 to-rose-500/5' },
  { icon: Link2, label: 'Social', gradient: 'from-indigo-500/10 to-indigo-500/5' },
  { icon: Columns2, label: 'Columns', gradient: 'from-teal-500/10 to-teal-500/5' },
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
          <div className="grid grid-cols-[72px_1fr_200px] min-h-[380px] divide-x divide-slate-100 relative">
            {/* Left: Block Icons */}
            <div className="bg-slate-50 p-2 space-y-1.5">
              <p className="text-[10px] font-medium text-slate-400 text-center mb-2">
                {t('emailEditor.blocks')}
              </p>
              {blockIcons.map((block) => (
                <div
                  key={block.label}
                  className={`flex flex-col items-center gap-0.5 rounded-lg p-1.5 bg-gradient-to-b ${block.gradient} hover:bg-white cursor-default transition-all`}
                >
                  <block.icon className="h-4 w-4 text-slate-500" />
                  <span className="text-[8px] text-slate-400">{block.label}</span>
                </div>
              ))}
            </div>

            {/* Center: Canvas */}
            <div className="p-4 bg-[radial-gradient(circle,#e2e8f0_1px,transparent_1px)] bg-[size:16px_16px] relative overflow-hidden">
              <p className="text-[10px] font-medium text-slate-400 mb-3">{t('emailEditor.canvas')}</p>
              <div className="space-y-2 max-w-[280px] mx-auto">
                {/* Hero Block */}
                <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-violet-50 p-4 text-center relative group">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="h-5 w-5 rounded bg-blue-200" />
                    <span className="text-[9px] font-semibold text-blue-600">Trackbliss</span>
                  </div>
                  <p className="text-[11px] font-semibold text-blue-800 mb-1">{t('emailEditor.trackReturn')}</p>
                  <p className="text-[9px] text-blue-500">Order #TB-2024-0847</p>
                </div>

                {/* Insert Handle */}
                <div className="flex justify-center">
                  <div className="h-5 w-5 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center animate-insert-handle-pulse cursor-default">
                    <Plus className="h-2.5 w-2.5 text-blue-500" />
                  </div>
                </div>

                {/* Info Box Block — Selected with floating toolbar */}
                <div className="rounded-lg border-2 border-blue-400 bg-white p-2 relative shadow-sm">
                  {/* Floating Toolbar */}
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-slate-800 rounded-lg px-1.5 py-1 shadow-lg">
                    <GripVertical className="h-3 w-3 text-slate-400" />
                    <Copy className="h-3 w-3 text-slate-400" />
                    <Trash2 className="h-3 w-3 text-red-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2">
                      <span className="text-[8px] text-emerald-500 block">Return #</span>
                      <span className="text-[10px] font-semibold text-emerald-700">RET-2024-0312</span>
                    </div>
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-2">
                      <span className="text-[8px] text-amber-500 block">Status</span>
                      <span className="text-[10px] font-semibold text-amber-700">Approved</span>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="rounded-lg border border-slate-200 p-2">
                  <div className="h-px bg-slate-300 my-1" />
                </div>

                {/* Button Block */}
                <div className="rounded-lg border border-slate-200 p-3 text-center">
                  <div className="inline-flex items-center gap-1.5 h-7 px-4 rounded-md bg-blue-500 text-[9px] font-semibold text-white">
                    {t('emailEditor.trackReturn')}
                  </div>
                </div>

                {/* Social Links Block */}
                <div className="rounded-lg border border-slate-200 p-2 flex justify-center gap-2">
                  {['#3b82f6', '#8b5cf6', '#ec4899', '#10b981'].map((color) => (
                    <div key={color} className="h-5 w-5 rounded-full" style={{ backgroundColor: color, opacity: 0.7 }} />
                  ))}
                </div>
              </div>

              {/* Animated Cursor Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="animate-landing-cursor-move absolute">
                  <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
                    <path d="M1 1L1 14L4.5 10.5L8 18L10.5 17L7 9.5L12 9.5L1 1Z" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
                  </svg>
                </div>
              </div>

              {/* Drag Ghost */}
              <div className="absolute bottom-16 right-4 animate-landing-drag-float pointer-events-none">
                <div className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 shadow-lg opacity-70 rotate-2">
                  <div className="flex items-center gap-1.5">
                    <Table2 className="h-3 w-3 text-blue-400" />
                    <span className="text-[8px] font-medium text-blue-600">{t('emailEditor.dragBlock')}</span>
                  </div>
                </div>
              </div>

              {/* Color Picker Mockup */}
              <div className="absolute top-12 right-2 pointer-events-none">
                <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-lg w-24">
                  <p className="text-[7px] font-medium text-slate-400 mb-1">{t('emailEditor.colorPicker')}</p>
                  <div className="h-10 rounded-md mb-1.5" style={{
                    background: 'linear-gradient(to right, #ef4444, #f59e0b, #10b981, #3b82f6, #8b5cf6)',
                  }} />
                  <div className="flex gap-0.5">
                    {['#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#f59e0b'].map((c) => (
                      <div key={c} className="h-3 w-3 rounded-sm" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <div className="h-3 flex-1 rounded-sm border border-slate-200 flex items-center px-0.5">
                      <span className="text-[6px] text-slate-500 font-mono">#3b82f6</span>
                    </div>
                  </div>
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
                  <div className="flex items-center gap-1 mb-1">
                    <div className="h-2 w-2 rounded bg-white/50" />
                    <div className="h-1.5 w-8 rounded bg-white/50" />
                  </div>
                  <div className="h-2 w-14 rounded bg-white/30" />
                  <div className="h-1.5 w-10 rounded bg-white/20 mt-0.5" />
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div className="h-5 rounded bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <span className="text-[5px] text-emerald-600 font-medium">RET-0312</span>
                  </div>
                  <div className="h-5 rounded bg-amber-50 border border-amber-100 flex items-center justify-center">
                    <span className="text-[5px] text-amber-600 font-medium">Approved</span>
                  </div>
                </div>
                <div className="h-px bg-slate-200" />
                <div className="mx-auto h-4 w-14 rounded bg-blue-500 mt-1 flex items-center justify-center">
                  <span className="text-[5px] text-white font-medium">Track</span>
                </div>
                <div className="flex justify-center gap-1 pt-1">
                  {['#3b82f6', '#8b5cf6', '#ec4899', '#10b981'].map((c) => (
                    <div key={c} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c, opacity: 0.6 }} />
                  ))}
                </div>
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
