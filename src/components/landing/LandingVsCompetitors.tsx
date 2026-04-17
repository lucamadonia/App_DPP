import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Award, ArrowRight, Check, CircleDot, Sparkles, X } from 'lucide-react';

type CompetitorId = 'trackbliss' | 'sap' | 'circularise' | 'kezzler' | 'ipoint';

type CellValue =
  | { kind: 'check'; label?: string }
  | { kind: 'cross' }
  | { kind: 'partial'; label?: string }
  | { kind: 'text'; label: string };

interface Competitor {
  id: CompetitorId;
  initials: string;
  colorClass: string;
}

interface Capability {
  key: string;
  values: Record<CompetitorId, CellValue>;
}

const COMPETITORS: Competitor[] = [
  { id: 'trackbliss', initials: 'Tb', colorClass: 'bg-gradient-to-br from-blue-500 to-violet-600' },
  { id: 'sap', initials: 'SA', colorClass: 'bg-sky-700' },
  { id: 'circularise', initials: 'Ci', colorClass: 'bg-emerald-700' },
  { id: 'kezzler', initials: 'Kz', colorClass: 'bg-indigo-700' },
  { id: 'ipoint', initials: 'iP', colorClass: 'bg-slate-700' },
];

const CAPABILITIES: Capability[] = [
  {
    key: 'setupTime',
    values: {
      trackbliss: { kind: 'text', label: 'hours' },
      sap: { kind: 'text', label: 'months6to12' },
      circularise: { kind: 'text', label: 'months3to6' },
      kezzler: { kind: 'text', label: 'months2to4' },
      ipoint: { kind: 'text', label: 'months6plus' },
    },
  },
  {
    key: 'aiCompliance',
    values: {
      trackbliss: { kind: 'check', label: 'claudeSonnet4' },
      sap: { kind: 'partial' },
      circularise: { kind: 'cross' },
      kezzler: { kind: 'cross' },
      ipoint: { kind: 'partial' },
    },
  },
  {
    key: 'returnsHub',
    values: {
      trackbliss: { kind: 'check' },
      sap: { kind: 'cross' },
      circularise: { kind: 'cross' },
      kezzler: { kind: 'cross' },
      ipoint: { kind: 'cross' },
    },
  },
  {
    key: 'emailEditor',
    values: {
      trackbliss: { kind: 'check', label: 'templates15' },
      sap: { kind: 'cross' },
      circularise: { kind: 'cross' },
      kezzler: { kind: 'cross' },
      ipoint: { kind: 'cross' },
    },
  },
  {
    key: 'customDomain',
    values: {
      trackbliss: { kind: 'check', label: 'builtIn' },
      sap: { kind: 'text', label: 'consultantSetup' },
      circularise: { kind: 'text', label: 'enterpriseTier' },
      kezzler: { kind: 'cross' },
      ipoint: { kind: 'cross' },
    },
  },
  {
    key: 'supplierPortal',
    values: {
      trackbliss: { kind: 'check' },
      sap: { kind: 'text', label: 'addOn' },
      circularise: { kind: 'cross' },
      kezzler: { kind: 'cross' },
      ipoint: { kind: 'partial' },
    },
  },
  {
    key: 'dppTemplates',
    values: {
      trackbliss: { kind: 'check', label: 'templates11NoCode' },
      sap: { kind: 'text', label: 'customDev' },
      circularise: { kind: 'text', label: 'customDev' },
      kezzler: { kind: 'check', label: 'templates3' },
      ipoint: { kind: 'text', label: 'customDev' },
    },
  },
  {
    key: 'visibilityTiers',
    values: {
      trackbliss: { kind: 'check', label: 'fields36' },
      sap: { kind: 'text', label: 'customDev' },
      circularise: { kind: 'partial' },
      kezzler: { kind: 'partial' },
      ipoint: { kind: 'cross' },
    },
  },
  {
    key: 'startingPrice',
    values: {
      trackbliss: { kind: 'text', label: 'priceFree' },
      sap: { kind: 'text', label: 'price4' },
      circularise: { kind: 'text', label: 'price3' },
      kezzler: { kind: 'text', label: 'price3' },
      ipoint: { kind: 'text', label: 'price4' },
    },
  },
  {
    key: 'deployToProd',
    values: {
      trackbliss: { kind: 'text', label: 'sameDay' },
      sap: { kind: 'text', label: 'quarters' },
      circularise: { kind: 'text', label: 'months' },
      kezzler: { kind: 'text', label: 'months' },
      ipoint: { kind: 'text', label: 'quarters' },
    },
  },
];

function CompetitorLogo({ c, t }: { c: Competitor; t: (k: string) => string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold text-white shadow-lg ${c.colorClass}`}>
        {c.initials}
      </div>
      <span className={`text-center text-[11px] font-semibold leading-tight ${c.id === 'trackbliss' ? 'text-white' : 'text-slate-300'}`}>
        {t(`vsCompetitors.brands.${c.id}`)}
      </span>
    </div>
  );
}

function Cell({
  value,
  isTrackbliss,
  t,
}: {
  value: CellValue;
  isTrackbliss: boolean;
  t: (k: string) => string;
}) {
  if (value.kind === 'cross') {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/10 ring-1 ring-rose-500/30">
        <X className="h-4 w-4 text-rose-400" />
      </div>
    );
  }
  if (value.kind === 'partial') {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/30">
          <CircleDot className="h-4 w-4 text-amber-400" />
        </div>
        {value.label && (
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 ring-1 ring-slate-700">
            {t(`vsCompetitors.values.${value.label}`)}
          </span>
        )}
      </div>
    );
  }
  if (value.kind === 'check') {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full ring-1 ${
          isTrackbliss
            ? 'bg-gradient-to-br from-emerald-400/30 to-blue-400/30 ring-emerald-400/50'
            : 'bg-emerald-500/10 ring-emerald-500/30'
        }`}>
          <Check className="h-4 w-4 text-emerald-400" />
        </div>
        {value.label && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            isTrackbliss
              ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-md shadow-blue-500/20'
              : 'bg-slate-800 text-slate-300 ring-1 ring-slate-700'
          }`}>
            {t(`vsCompetitors.values.${value.label}`)}
          </span>
        )}
      </div>
    );
  }
  // text
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
      isTrackbliss
        ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-md shadow-blue-500/20'
        : 'bg-slate-800 text-slate-300 ring-1 ring-slate-700'
    }`}>
      {t(`vsCompetitors.values.${value.label}`)}
    </span>
  );
}

export function LandingVsCompetitors() {
  const { t } = useTranslation('landing');
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.15 });
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (inView && !reduced) {
      const t1 = setTimeout(() => setPulse(true), 1500);
      const t2 = setTimeout(() => setPulse(false), 3500);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [inView, reduced]);

  const rowVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section
      ref={sectionRef}
      id="vs-competitors"
      className="relative overflow-hidden bg-slate-950 py-24 text-white"
    >
      {/* Ambient blobs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/4 h-[480px] w-[480px] rounded-full bg-blue-600/20 blur-[120px] animate-landing-gradient-mesh" />
        <div className="absolute bottom-0 right-1/4 h-[420px] w-[420px] rounded-full bg-violet-600/20 blur-[120px] animate-landing-gradient-mesh [animation-delay:2s]" />
        <div className="absolute top-1/2 left-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[110px] animate-landing-gradient-mesh [animation-delay:4s]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-300">
            <Award className="h-3.5 w-3.5" />
            {t('vsCompetitors.eyebrow')}
          </span>
          <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {t('vsCompetitors.headline')}
          </h2>
          <p className="mt-4 text-base text-slate-400 sm:text-lg">
            {t('vsCompetitors.subtitle')}
          </p>
        </motion.div>

        {/* Matrix - Desktop */}
        <div className="relative mt-16 hidden lg:block">
          {/* Trackbliss column highlight overlay */}
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0, y: 0 }}
            animate={inView ? { opacity: 1, y: reduced ? 0 : -8 } : undefined}
            transition={{ delay: 0.5, duration: 0.7 }}
            className="pointer-events-none absolute inset-y-[-12px] z-0"
            style={{ left: 'calc(33.333% + ((66.666% / 5) * 0))', width: 'calc(66.666% / 5)' }}
          >
            <div className={`h-full rounded-3xl bg-gradient-to-b from-blue-500/40 via-violet-500/30 to-blue-500/40 p-[1.5px] ${pulse ? 'animate-landing-glow-pulse' : ''}`}>
              <div className="h-full rounded-3xl bg-slate-900/80 shadow-[0_0_60px_-15px_rgba(139,92,246,0.5)] backdrop-blur" />
            </div>
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
                <Sparkles className="h-3 w-3" />
                {t('vsCompetitors.recommended')}
              </span>
            </div>
          </motion.div>

          <div className="relative z-10 grid" style={{ gridTemplateColumns: '2fr repeat(5, 1fr)' }}>
            {/* Header row */}
            <div className="p-4" />
            {COMPETITORS.map((c) => (
              <div key={c.id} className="flex justify-center px-2 pt-6 pb-4">
                <CompetitorLogo c={c} t={t} />
              </div>
            ))}

            {/* Capability rows */}
            {CAPABILITIES.map((cap, i) => (
              <motion.div
                key={cap.key}
                variants={rowVariants}
                initial="hidden"
                animate={inView ? 'visible' : 'hidden'}
                transition={{ delay: reduced ? 0 : 0.3 + i * 0.06, duration: 0.5 }}
                className="contents"
              >
                <div className="flex items-center border-t border-slate-800/70 px-4 py-4 text-sm font-medium text-slate-300">
                  {t(`vsCompetitors.capabilities.${cap.key}`)}
                </div>
                {COMPETITORS.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-center border-t border-slate-800/70 px-2 py-4"
                  >
                    <Cell value={cap.values[c.id]} isTrackbliss={c.id === 'trackbliss'} t={t} />
                  </div>
                ))}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Matrix - Mobile (horizontal scroll) */}
        <div className="relative mt-12 lg:hidden">
          <div className="relative overflow-x-auto">
            <div className="flex min-w-max">
              {/* Capability labels column (sticky left) */}
              <div className="sticky left-0 z-20 bg-slate-950 pr-3">
                <div className="h-[88px]" />
                {CAPABILITIES.map((cap) => (
                  <div
                    key={cap.key}
                    className="flex h-24 items-center border-t border-slate-800/70 pr-2 text-xs font-medium text-slate-400"
                  >
                    {t(`vsCompetitors.capabilities.${cap.key}`)}
                  </div>
                ))}
              </div>
              {/* Competitor columns */}
              {COMPETITORS.map((c) => (
                <div
                  key={c.id}
                  className={`flex w-[140px] snap-center flex-col ${
                    c.id === 'trackbliss'
                      ? 'rounded-2xl bg-gradient-to-b from-blue-500/15 via-violet-500/10 to-blue-500/15 ring-1 ring-violet-500/40'
                      : ''
                  }`}
                >
                  <div className="flex h-[88px] items-center justify-center px-2 py-4">
                    <CompetitorLogo c={c} t={t} />
                  </div>
                  {CAPABILITIES.map((cap) => (
                    <div
                      key={cap.key}
                      className="flex h-24 items-center justify-center border-t border-slate-800/70 px-2 py-3"
                    >
                      <Cell value={cap.values[c.id]} isTrackbliss={c.id === 'trackbliss'} t={t} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-slate-500">{t('vsCompetitors.scrollHint')}</p>
        </div>

        {/* Footer */}
        <div className="mt-16 flex flex-col items-center gap-6 text-center">
          <p className="max-w-2xl text-xs text-slate-500">{t('vsCompetitors.footer.disclaimer')}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/40 transition-all hover:-translate-y-0.5 hover:shadow-violet-600/50"
            >
              {t('vsCompetitors.footer.primaryCta')}
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-all hover:bg-white/10"
            >
              {t('vsCompetitors.footer.secondaryCta')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
