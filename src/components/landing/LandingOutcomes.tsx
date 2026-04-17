import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import {
  ArrowRight,
  Brain,
  CalendarCheck,
  Check,
  Eye,
  PackageOpen,
  QrCode,
  Sparkles,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';

interface CardDef {
  key: string;
  icon: LucideIcon;
  iconChip: string; // gradient classes
  span: string; // grid span classes
  metric: string;
  visual: ReactNode;
}

// ---------- Mini Visuals ----------

function CalendarQuarters({ inView }: { inView: boolean }) {
  const reduced = useReducedMotion();
  return (
    <div className="grid grid-cols-4 gap-2">
      {['Q1', 'Q2', 'Q3', 'Q4'].map((q, i) => (
        <motion.div
          key={q}
          initial={reduced ? false : { opacity: 0, scale: 0.5 }}
          animate={inView ? { opacity: 1, scale: 1 } : undefined}
          transition={{ delay: reduced ? 0 : i * 0.15, type: 'spring', stiffness: 200, damping: 14 }}
          className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-violet-500/10 p-3"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 ring-1 ring-emerald-500/50">
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{q}</span>
        </motion.div>
      ))}
    </div>
  );
}

function AITypingBubble({ inView, t }: { inView: boolean; t: (k: string) => string }) {
  const reduced = useReducedMotion();
  return (
    <div className="space-y-2.5">
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={inView ? { opacity: 1, y: 0 } : undefined}
        transition={{ delay: reduced ? 0 : 0.2 }}
        className="inline-flex items-center gap-2 rounded-2xl rounded-tl-sm bg-slate-200 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300"
      >
        <span className="inline-flex items-center gap-0.5">
          <span className="h-1 w-1 animate-bounce rounded-full bg-slate-500 [animation-delay:0ms]" />
          <span className="h-1 w-1 animate-bounce rounded-full bg-slate-500 [animation-delay:150ms]" />
          <span className="h-1 w-1 animate-bounce rounded-full bg-slate-500 [animation-delay:300ms]" />
        </span>
        {t('outcomes.card2.typingLine1')}
      </motion.div>
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={inView ? { opacity: 1, y: 0 } : undefined}
        transition={{ delay: reduced ? 0 : 0.9, duration: 0.4 }}
        className="relative rounded-2xl rounded-tl-sm bg-gradient-to-br from-blue-500 to-violet-500 px-3 py-2 text-xs leading-relaxed text-white shadow-lg shadow-violet-500/20"
      >
        <Sparkles className="absolute -top-2 -left-2 h-4 w-4 rounded-full bg-white p-0.5 text-violet-500 shadow-md" />
        {t('outcomes.card2.typingLine2')}
      </motion.div>
    </div>
  );
}

function SupplierFlowDots({ inView, t }: { inView: boolean; t: (k: string) => string }) {
  const reduced = useReducedMotion();
  const steps = [t('outcomes.card3.stepInvite'), t('outcomes.card3.stepRegister'), t('outcomes.card3.stepApproved')];
  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex-1 text-center">
            <div
              className={`mx-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                i === 0
                  ? 'bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/40 dark:text-emerald-300'
                  : i === 1
                  ? 'bg-blue-500/15 text-blue-600 ring-1 ring-blue-500/40 dark:text-blue-300'
                  : 'bg-violet-500/15 text-violet-600 ring-1 ring-violet-500/40 dark:text-violet-300'
              }`}
            >
              {s}
            </div>
          </div>
        ))}
      </div>
      {/* connector line */}
      <div className="relative mx-2 mt-3 h-0.5 rounded-full bg-slate-300 dark:bg-slate-700">
        {!reduced && inView && (
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-gradient-to-r from-emerald-400 to-violet-500 shadow-md shadow-blue-500/50"
            initial={{ left: '0%' }}
            animate={{ left: ['0%', '50%', '100%', '0%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>
    </div>
  );
}

function DPPCardStack() {
  return (
    <div className="group relative h-24">
      {[-2, 0, 2].map((rot, i) => (
        <div
          key={i}
          className="absolute inset-x-4 top-0 rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg transition-all duration-500 dark:border-slate-700 dark:bg-slate-800"
          style={{
            transform: `rotate(${rot}deg) translateY(${i * 6}px)`,
            zIndex: 3 - i,
          }}
        >
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 flex-shrink-0 rounded bg-gradient-to-br from-cyan-400 to-blue-600 p-1">
              <div className="h-full w-full rounded-sm bg-white/20 ring-2 ring-white/40" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="h-1.5 w-full rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-1.5 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReturnsSankey({ t }: { t: (k: string) => string }) {
  const reduced = useReducedMotion();
  const nodes = [
    { label: 'Return', color: 'from-rose-500 to-rose-600' },
    { label: 'Inspection', color: 'from-amber-500 to-orange-600' },
    { label: 'Refund / Exchange', color: 'from-emerald-500 to-blue-600' },
  ];
  return (
    <div className="flex items-center gap-2">
      {nodes.map((n, i) => (
        <div key={n.label} className="flex flex-1 items-center gap-2">
          <div className={`flex-1 rounded-lg bg-gradient-to-br ${n.color} px-2 py-1.5 text-center text-[10px] font-bold text-white shadow-md`}>
            {n.label === 'Return' && t('outcomes.card5.nodeReturn')}
            {n.label === 'Inspection' && t('outcomes.card5.nodeInspection')}
            {n.label === 'Refund / Exchange' && t('outcomes.card5.nodeRefund')}
          </div>
          {i < nodes.length - 1 && (
            <svg viewBox="0 0 40 12" className="h-3 w-10 flex-shrink-0" aria-hidden="true">
              <line
                x1="2"
                y1="6"
                x2="38"
                y2="6"
                stroke="url(#sankey-grad)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="4 4"
                className={reduced ? '' : 'animate-[sankey-dash_1.5s_linear_infinite]'}
                style={{ animation: reduced ? undefined : 'sankey-dash 1.5s linear infinite' }}
              />
              <defs>
                <linearGradient id="sankey-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
            </svg>
          )}
        </div>
      ))}
      <style>{`@keyframes sankey-dash { to { stroke-dashoffset: -16; } }`}</style>
    </div>
  );
}

function VisibilityVenn({ inView, t }: { inView: boolean; t: (k: string) => string }) {
  const reduced = useReducedMotion();
  return (
    <div className="relative mx-auto h-28 w-full max-w-[220px]">
      <svg viewBox="0 0 220 120" className="h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id="venn-customs" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.15" />
          </radialGradient>
          <radialGradient id="venn-consumer" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.15" />
          </radialGradient>
          <radialGradient id="venn-internal" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.15" />
          </radialGradient>
        </defs>
        <motion.circle
          cx="80" cy="60" r="38"
          fill="url(#venn-customs)"
          stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.6"
          initial={reduced ? false : { scale: 0, opacity: 0 }}
          animate={inView ? { scale: 1, opacity: 1 } : undefined}
          transition={{ delay: 0.1, type: 'spring', stiffness: 180, damping: 16 }}
          style={{ transformOrigin: '80px 60px' }}
        />
        <motion.circle
          cx="140" cy="60" r="38"
          fill="url(#venn-consumer)"
          stroke="#06b6d4" strokeWidth="1.5" strokeOpacity="0.6"
          initial={reduced ? false : { scale: 0, opacity: 0 }}
          animate={inView ? { scale: 1, opacity: 1 } : undefined}
          transition={{ delay: 0.25, type: 'spring', stiffness: 180, damping: 16 }}
          style={{ transformOrigin: '140px 60px' }}
        />
        <motion.circle
          cx="110" cy="80" r="38"
          fill="url(#venn-internal)"
          stroke="#8b5cf6" strokeWidth="1.5" strokeOpacity="0.6"
          initial={reduced ? false : { scale: 0, opacity: 0 }}
          animate={inView ? { scale: 1, opacity: 1 } : undefined}
          transition={{ delay: 0.4, type: 'spring', stiffness: 180, damping: 16 }}
          style={{ transformOrigin: '110px 80px' }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex justify-between px-2 text-[9px] font-semibold">
        <span className="text-blue-500 dark:text-blue-400">{t('outcomes.card6.tierCustoms')}</span>
        <span className="text-violet-500 dark:text-violet-400">{t('outcomes.card6.tierInternal')}</span>
        <span className="text-cyan-500 dark:text-cyan-400">{t('outcomes.card6.tierConsumer')}</span>
      </div>
    </div>
  );
}

// ---------- Outcome Card ----------

function OutcomeCard({
  card,
  index,
  t,
}: {
  card: CardDef;
  index: number;
  t: (k: string) => string;
}) {
  const Icon = card.icon;
  const cardRef = useRef<HTMLDivElement>(null);
  const inView = useInView(cardRef, { once: true, margin: '-60px' });
  const reduced = useReducedMotion();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-100, 100], [4, -4]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-100, 100], [-4, 4]), { stiffness: 200, damping: 20 });

  const handleMove = (e: React.MouseEvent) => {
    if (reduced) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      initial={reduced ? false : { opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ delay: reduced ? 0 : index * 0.08, duration: 0.6, ease: 'easeOut' }}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 1000,
        transformStyle: 'preserve-3d',
      }}
      className={`group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-lg transition-shadow hover:shadow-2xl hover:shadow-blue-500/10 dark:border-slate-800 dark:bg-slate-900 ${card.span}`}
    >
      {/* Subtle gradient mesh */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gradient-to-br from-blue-400/10 to-violet-400/10 blur-2xl" />

      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between">
          <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${card.iconChip} shadow-lg`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <span className="landing-glass inline-flex items-center rounded-full border border-slate-200/60 bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
            {t(card.metric)}
          </span>
        </div>

        <h3 className="mt-5 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t(`outcomes.${card.key}.headline`)}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {t(`outcomes.${card.key}.copy`)}
        </p>

        <div className="mt-6 flex-1">{card.visual}</div>
      </div>
    </motion.div>
  );
}

// ---------- Main ----------

export function LandingOutcomes() {
  const { t } = useTranslation('landing');

  // Cards — the inView prop for visuals is bridged via a local wrapper per card.
  // For simplicity, visuals reuse their own card's in-view state by reading the
  // `animate-landing-reveal` class which triggers on scroll-reveal.
  // We pass a synthetic `inView={true}` to mini visuals once cards mount; they
  // animate on their own via framer-motion/IntersectionObserver if needed.

  const cards: CardDef[] = [
    {
      key: 'card1',
      icon: CalendarCheck,
      iconChip: 'from-blue-600 to-violet-600',
      span: 'sm:col-span-2 lg:col-span-2',
      metric: 'outcomes.card1.metric',
      visual: <CardVisualWrapper render={(inView) => <CalendarQuarters inView={inView} />} />,
    },
    {
      key: 'card2',
      icon: Brain,
      iconChip: 'from-violet-600 to-blue-600',
      span: 'sm:col-span-2 lg:col-span-2 lg:row-span-2',
      metric: 'outcomes.card2.metric',
      visual: <CardVisualWrapper render={(inView) => <AITypingBubble inView={inView} t={t} />} />,
    },
    {
      key: 'card3',
      icon: UserPlus,
      iconChip: 'from-emerald-500 to-blue-600',
      span: 'sm:col-span-1 lg:col-span-1',
      metric: 'outcomes.card3.metric',
      visual: <CardVisualWrapper render={(inView) => <SupplierFlowDots inView={inView} t={t} />} />,
    },
    {
      key: 'card4',
      icon: QrCode,
      iconChip: 'from-cyan-400 to-blue-600',
      span: 'sm:col-span-1 lg:col-span-1',
      metric: 'outcomes.card4.metric',
      visual: <DPPCardStack />,
    },
    {
      key: 'card5',
      icon: PackageOpen,
      iconChip: 'from-rose-500 to-violet-600',
      span: 'sm:col-span-2 lg:col-span-2',
      metric: 'outcomes.card5.metric',
      visual: <ReturnsSankey t={t} />,
    },
    {
      key: 'card6',
      icon: Eye,
      iconChip: 'from-blue-600 to-cyan-400',
      span: 'sm:col-span-2 lg:col-span-2',
      metric: 'outcomes.card6.metric',
      visual: <CardVisualWrapper render={(inView) => <VisibilityVenn inView={inView} t={t} />} />,
    },
  ];

  return (
    <section id="features" className="relative overflow-hidden py-24 bg-white dark:bg-slate-950">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-blue-400/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-violet-400/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-300">
            <ArrowRight className="h-3.5 w-3.5" />
            {t('outcomes.eyebrow')}
          </span>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl dark:text-white">
            {t('outcomes.headline')}
          </h2>
          <p className="mt-4 text-base text-slate-600 sm:text-lg dark:text-slate-400">
            {t('outcomes.sub')}
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card, i) => (
            <OutcomeCard key={card.key} card={card} index={i} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

// Helper wrapper: triggers inView for mini-visuals after card mount.
// framer-motion's useInView on the card itself could be read here, but to keep
// mini-visuals decoupled we use a simple IntersectionObserver via useInView.
function CardVisualWrapper({ render }: { render: (inView: boolean) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return <div ref={ref}>{render(inView)}</div>;
}
