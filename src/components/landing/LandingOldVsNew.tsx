import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Check,
  Database,
  FileSpreadsheet,
  FileText,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react';

const PAIN_ITEMS = [
  { key: 'spreadsheets', icon: FileSpreadsheet },
  { key: 'pdfInbox', icon: Mail },
  { key: 'suppliers', icon: Users },
  { key: 'legalCalls', icon: AlertTriangle },
  { key: 'auditsScratch', icon: Calendar },
] as const;

const WIN_ITEMS = [
  { key: 'sourceOfTruth', icon: Database },
  { key: 'aiClassify', icon: Sparkles },
  { key: 'supplierPortal', icon: Users },
  { key: 'claudeExplain', icon: ShieldCheck },
  { key: 'auditReady', icon: Zap },
] as const;

function ComplianceRing({ inView }: { inView: boolean }) {
  const reduced = useReducedMotion();
  const target = 94;
  const [score, setScore] = useState(reduced ? target : 0);

  useEffect(() => {
    if (!inView || reduced) return;
    const start = performance.now();
    const duration = 1800;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setScore(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced]);

  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (circumference * score) / 100;

  return (
    <div className="relative h-24 w-24 sm:h-28 sm:w-28">
      <svg viewBox="0 0 72 72" className="-rotate-90" role="img" aria-label={`Compliance score ${score} out of 100`}>
        <circle cx="36" cy="36" r={radius} stroke="currentColor" strokeWidth="6" fill="none" className="text-slate-200 dark:text-slate-700" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          stroke="url(#old-vs-new-gauge)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: reduced ? 'none' : 'stroke-dashoffset 80ms linear' }}
        />
        <defs>
          <linearGradient id="old-vs-new-gauge" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{score}%</span>
      </div>
    </div>
  );
}

function MessyDesktopMockup() {
  const { t } = useTranslation('landing');
  return (
    <div
      aria-hidden="true"
      className="relative h-[240px] w-full overflow-hidden rounded-2xl border border-rose-500/20 bg-slate-900"
      style={{ filter: 'saturate(0.75)' }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-transparent to-rose-900/40" />

      {/* Excel window 1 */}
      <div className="absolute left-6 top-8 w-56 -rotate-3 rounded-lg border border-slate-700 bg-slate-800/90 shadow-xl">
        <div className="flex items-center gap-1 border-b border-slate-700 px-2 py-1.5">
          <div className="h-2 w-2 rounded-full bg-rose-400" />
          <div className="h-2 w-2 rounded-full bg-amber-400" />
          <div className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="ml-2 truncate text-[10px] text-slate-400">{t('oldVsNew.old.mockupFile')}</span>
        </div>
        <div className="grid grid-cols-4 gap-px bg-slate-700/40 p-px">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-5 bg-slate-800" />
          ))}
        </div>
      </div>

      {/* Excel window 2 */}
      <div className="absolute right-4 top-16 w-48 rotate-2 rounded-lg border border-slate-700 bg-slate-800/85 shadow-xl">
        <div className="flex items-center gap-1 border-b border-slate-700 px-2 py-1.5">
          <div className="h-2 w-2 rounded-full bg-rose-400" />
          <div className="h-2 w-2 rounded-full bg-amber-400" />
          <div className="h-2 w-2 rounded-full bg-emerald-400" />
        </div>
        <div className="grid grid-cols-3 gap-px bg-slate-700/40 p-px">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-4 bg-slate-800" />
          ))}
        </div>
      </div>

      {/* Email inbox badge */}
      <div className="absolute right-6 top-4 hidden items-center gap-1.5 rounded-md border border-rose-500/40 bg-slate-900/95 px-2 py-1 shadow-lg sm:flex">
        <Mail className="h-3 w-3 text-rose-400" />
        <span className="text-[10px] font-medium text-rose-300">{t('oldVsNew.old.inboxLabel')}</span>
      </div>

      {/* Calendar */}
      <div className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-slate-900/95 px-2 py-1 shadow-lg">
        <Calendar className="h-3 w-3 text-rose-400" />
        <span className="text-[10px] font-medium text-rose-300">{t('oldVsNew.old.calendarLabel')}</span>
      </div>

      {/* Scattered PDFs */}
      <FileText className="absolute bottom-16 right-8 hidden h-6 w-6 rotate-12 text-rose-300/70 sm:block" />
      <FileText className="absolute left-28 bottom-6 hidden h-5 w-5 -rotate-6 text-rose-300/60 sm:block" />
      <FileText className="absolute right-24 bottom-20 hidden h-7 w-7 rotate-6 text-rose-300/50 sm:block" />
    </div>
  );
}

function CleanDashboardMockup({ inView }: { inView: boolean }) {
  const { t } = useTranslation('landing');
  const reduced = useReducedMotion();
  const regs = [
    { name: 'ESPR', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' },
    { name: 'REACH', color: 'text-blue-500 bg-blue-500/10 border-blue-500/30' },
    { name: 'PPWR', color: 'text-violet-500 bg-violet-500/10 border-violet-500/30' },
    { name: 'CE', color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30' },
  ];
  return (
    <div className="landing-glass rounded-2xl border border-emerald-500/20 bg-white/90 p-4 shadow-lg dark:bg-slate-900/70">
      {/* Product row */}
      <div className="flex items-center gap-3 border-b border-slate-200/70 pb-3 dark:border-slate-700/60">
        <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 shadow-md" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{t('oldVsNew.new.productName')}</div>
          <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">GTIN 4061234 · {t('oldVsNew.new.batch')}</div>
        </div>
        <span className="hidden rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-300 sm:inline">
          Verified
        </span>
      </div>

      {/* Regulation badges */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {regs.map((r) => (
          <span
            key={r.name}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${r.color}`}
          >
            <Check className="h-2.5 w-2.5" />
            {r.name}
          </span>
        ))}
      </div>

      {/* Gauge + metrics */}
      <div className="mt-4 grid grid-cols-[auto_1fr] gap-4 items-center">
        <ComplianceRing inView={inView} />
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
            <Check className="h-3 w-3 text-emerald-500" />
            <span>{t('oldVsNew.new.docsLabel')}: 12/12</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
            <Check className="h-3 w-3 text-emerald-500" />
            <span>{t('oldVsNew.new.suppliersLabel')}: 8/8</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
            <Check className="h-3 w-3 text-emerald-500" />
            <span>{t('oldVsNew.new.lastCheckLabel')}: {t('oldVsNew.new.lastCheckValue')}</span>
          </div>
        </div>
      </div>

      {/* Audit-ready pill */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={inView ? { opacity: 1, y: 0 } : undefined}
        transition={{ delay: reduced ? 0 : 1.2, duration: 0.4 }}
        className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500/15 to-blue-500/15 px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-300"
      >
        <Zap className="h-3.5 w-3.5" />
        {t('oldVsNew.new.auditPill')}
      </motion.div>
    </div>
  );
}

export function LandingOldVsNew() {
  const { t } = useTranslation('landing');
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: '-80px' });
  const reduced = useReducedMotion();

  const col = (dir: -1 | 1) => ({
    hidden: { opacity: 0, x: reduced ? 0 : 40 * dir },
    visible: { opacity: 1, x: 0 },
  });

  return (
    <section
      id="old-vs-new"
      ref={sectionRef}
      className="relative overflow-hidden py-24 bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
    >
      {/* Decorative background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-rose-500/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-300/70 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-600 backdrop-blur dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-landing-pulse-dot rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-500" />
            </span>
            {t('oldVsNew.eyebrow')}
          </span>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl dark:text-white">
            {t('oldVsNew.headline')}
          </h2>
          <p className="mt-4 text-base text-slate-600 sm:text-lg dark:text-slate-400">
            {t('oldVsNew.subheadline')}
          </p>
        </div>

        {/* Split grid */}
        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          {/* OLD WAY COLUMN */}
          <motion.div
            variants={col(-1)}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            transition={{ duration: reduced ? 0 : 0.6, ease: 'easeOut' }}
            className="relative rounded-3xl border border-rose-500/20 bg-slate-950 p-6 shadow-[0_0_60px_-15px_rgba(244,63,94,0.3)] sm:p-8"
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-landing-pulse-dot rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                </span>
                <h3 className="text-xl font-bold text-white">{t('oldVsNew.old.title')}</h3>
              </div>
              <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-300">
                {t('oldVsNew.old.tag')}
              </span>
            </div>

            <MessyDesktopMockup />

            <ul className="mt-8 space-y-3">
              {PAIN_ITEMS.map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.li
                    key={item.key}
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={inView ? { opacity: 1, y: 0 } : undefined}
                    transition={{ delay: reduced ? 0 : 0.4 + i * 0.08, duration: 0.4 }}
                    className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3"
                  >
                    <div className="flex-shrink-0 rounded-lg bg-rose-500/10 p-1.5 text-rose-400">
                      <X className="h-4 w-4" />
                    </div>
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <Icon aria-hidden="true" className="h-4 w-4 text-rose-300/60 flex-shrink-0" />
                      <span className="text-sm font-semibold text-white">{t(`oldVsNew.pain.${item.key}.title`)}</span>
                    </div>
                    <span className="flex-shrink-0 rounded-full bg-rose-500/15 px-2.5 py-1 font-mono text-[10px] font-semibold text-rose-300">
                      {t(`oldVsNew.pain.${item.key}.badge`)}
                    </span>
                  </motion.li>
                );
              })}
            </ul>

            <p className="mt-6 text-center text-xs italic text-slate-500">{t('oldVsNew.old.watermark')}</p>
          </motion.div>

          {/* NEW WAY COLUMN */}
          <motion.div
            variants={col(1)}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            transition={{ duration: reduced ? 0 : 0.6, ease: 'easeOut', delay: reduced ? 0 : 0.2 }}
            className="relative rounded-3xl border border-emerald-500/30 bg-white p-6 shadow-[0_0_60px_-15px_rgba(16,185,129,0.35)] sm:p-8 dark:bg-slate-900"
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-landing-pulse-dot rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('oldVsNew.new.title')}</h3>
              </div>
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                {t('oldVsNew.new.tag')}
              </span>
            </div>

            <CleanDashboardMockup inView={inView} />

            <ul className="mt-8 space-y-3">
              {WIN_ITEMS.map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.li
                    key={item.key}
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={inView ? { opacity: 1, y: 0 } : undefined}
                    transition={{ delay: reduced ? 0 : 0.6 + i * 0.08, duration: 0.4 }}
                    className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3"
                  >
                    <div className="flex-shrink-0 rounded-lg bg-emerald-500/15 p-1.5 text-emerald-600 dark:text-emerald-400">
                      <Check className="h-4 w-4" />
                    </div>
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <Icon aria-hidden="true" className="h-4 w-4 text-emerald-500/70 flex-shrink-0" />
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {t(`oldVsNew.win.${item.key}.title`)}
                      </span>
                    </div>
                    <span className="flex-shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 font-mono text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                      {t(`oldVsNew.win.${item.key}.badge`)}
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          </motion.div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : undefined}
          transition={{ delay: reduced ? 0 : 1.2, duration: 0.6 }}
          className="mt-16 flex flex-col items-center gap-5 text-center"
        >
          <p className="max-w-3xl text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl dark:text-white">
            {t('oldVsNew.footerTagline')}
          </p>
          <button
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:-translate-y-0.5 hover:shadow-violet-600/40"
          >
            {t('oldVsNew.cta')}
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
