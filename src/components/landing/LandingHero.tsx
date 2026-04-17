import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  animate,
} from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  BatteryCharging,
  ChevronDown,
  FlaskConical,
  PlayCircle,
  QrCode,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

const REGULATIONS = [
  { key: 'regESPR', score: 94, color: '#3b82f6' },
  { key: 'regREACH', score: 82, color: '#8b5cf6' },
  { key: 'regPPWR', score: 85, color: '#06b6d4' },
] as const;

const CRED_STATS = [
  { to: 87, suffix: '%', key: 'creds.score', icon: TrendingUp, decimals: 0 },
  { to: 2.3, suffix: 's', key: 'creds.time', icon: Sparkles, decimals: 1 },
  { to: 11, suffix: '', key: 'creds.templates', icon: ShieldCheck, decimals: 0 },
] as const;

const FLOATING_CHIPS = [
  { key: 'chip.espr', icon: ShieldCheck, color: '#3b82f6', top: '12%', left: '6%', delay: '0s' },
  { key: 'chip.reach', icon: FlaskConical, color: '#8b5cf6', top: '68%', left: '4%', delay: '1.8s' },
  { key: 'chip.gs1', icon: QrCode, color: '#06b6d4', top: '22%', right: '4%', delay: '0.8s' },
  { key: 'chip.gpsr', icon: AlertTriangle, color: '#f59e0b', top: '78%', right: '8%', delay: '2.6s' },
  { key: 'chip.battery', icon: BatteryCharging, color: '#10b981', top: '46%', left: '2%', delay: '3.2s' },
] as const;

const PARTICLES = [
  { size: 4, color: 'bg-blue-400/60', top: '18%', left: '22%', delay: '0s' },
  { size: 3, color: 'bg-violet-400/50', top: '72%', left: '78%', delay: '1s' },
  { size: 5, color: 'bg-cyan-400/40', top: '34%', left: '8%', delay: '2s' },
  { size: 3, color: 'bg-emerald-400/40', top: '58%', left: '92%', delay: '3s' },
  { size: 4, color: 'bg-blue-300/40', top: '86%', left: '38%', delay: '4s' },
  { size: 3, color: 'bg-violet-300/50', top: '10%', left: '62%', delay: '1.5s' },
];

function AnimatedCounter({
  to,
  decimals = 0,
  suffix = '',
  duration = 1.6,
}: {
  to: number;
  decimals?: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10%' });
  const reduced = useReducedMotion();
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setVal(to);
      return;
    }
    const controls = animate(0, to, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setVal(v),
    });
    return () => controls.stop();
  }, [inView, to, duration, reduced]);

  return (
    <span ref={ref} className="tabular-nums">
      {val.toFixed(decimals)}
      {suffix}
    </span>
  );
}

function ScoreRing({ value, size = 180 }: { value: number; size?: number }) {
  const reduced = useReducedMotion();
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const target = circ * (1 - value / 100);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="score-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <filter id="score-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#score-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          filter="url(#score-glow)"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: reduced ? target : circ }}
          animate={{ strokeDashoffset: target }}
          transition={{ duration: reduced ? 0 : 1.8, ease: [0.34, 1.56, 0.64, 1], delay: 0.4 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-5xl font-bold tracking-tight text-white tabular-nums">
          <AnimatedCounter to={value} duration={1.8} />
        </div>
        <div className="mt-0.5 text-xs font-medium text-slate-400">/ 100</div>
      </div>
    </div>
  );
}

function MiniBar({
  label,
  score,
  color,
  delay,
}: {
  label: string;
  score: number;
  color: string;
  delay: number;
}) {
  const reduced = useReducedMotion();
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-300">{label}</span>
        <span className="tabular-nums font-semibold text-white">
          <AnimatedCounter to={score} duration={1.2} />
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}dd)` }}
          initial={{ width: reduced ? `${score}%` : 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: reduced ? 0 : 1.2, ease: 'easeOut', delay }}
        />
      </div>
    </div>
  );
}

function LiveScoreWidget({ t }: { t: (k: string) => string }) {
  const reduced = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-150, 150], [6, -6]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-150, 150], [-6, 6]), { stiffness: 150, damping: 20 });

  const handleMove = (e: React.MouseEvent) => {
    if (reduced) return;
    if (typeof window !== 'undefined' && window.innerWidth < 1024) return;
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
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: 'easeOut', delay: 0.5 }}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 1200,
        transformStyle: 'preserve-3d',
      }}
      className="landing-glass relative rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl shadow-blue-900/20 backdrop-blur-xl"
    >
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/10 via-transparent to-violet-500/10" />
      <div className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-br from-white/10 via-transparent to-transparent" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-landing-pulse-dot rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              {t('hero.scoreWidget.title')}
            </span>
          </div>
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
            {t('hero.scoreWidget.badge')}
          </span>
        </div>

        <div className="mt-6 flex justify-center">
          <ScoreRing value={87} size={180} />
        </div>

        <div className="mt-7 space-y-4">
          {REGULATIONS.map((r, i) => (
            <MiniBar
              key={r.key}
              label={t(`hero.scoreWidget.${r.key}`)}
              score={r.score}
              color={r.color}
              delay={0.8 + i * 0.2}
            />
          ))}
        </div>

        <div className="mt-7 flex items-center gap-2 border-t border-white/5 pt-4 text-xs text-slate-500">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          <span>{t('hero.scoreWidget.analyzed')}</span>
        </div>
      </div>
    </motion.div>
  );
}

function FloatingChip({
  label,
  icon: Icon,
  color,
  position,
  delay,
}: {
  label: string;
  icon: typeof ShieldCheck;
  color: string;
  position: React.CSSProperties;
  delay: string;
}) {
  return (
    <div
      className="landing-glass absolute z-10 hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 shadow-xl backdrop-blur-lg animate-landing-float lg:flex"
      style={{ ...position, animationDelay: delay, borderLeft: `2px solid ${color}` }}
    >
      <Icon className="h-3.5 w-3.5" style={{ color }} />
      <span className="text-xs font-semibold text-slate-200">{label}</span>
    </div>
  );
}

function PainStat({ value }: { value: string }) {
  const first = value.charAt(0);
  const rest = value.slice(1);
  return (
    <div className="flex items-baseline font-bold tracking-tight text-white">
      <span className="text-4xl sm:text-5xl leading-none bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
        {first}
      </span>
      <span className="text-2xl sm:text-3xl leading-none text-slate-300">{rest}</span>
    </div>
  );
}

function ScrollCue({ text }: { text: string }) {
  return (
    <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 md:flex">
      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">{text}</span>
      <div className="relative h-12 w-px overflow-hidden bg-white/10">
        <motion.div
          className="absolute left-1/2 top-0 h-3 w-1 -translate-x-1/2 rounded-full bg-gradient-to-b from-blue-400 to-violet-500"
          animate={{ y: [0, 36, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <ChevronDown className="h-3 w-3 text-slate-600" />
    </div>
  );
}

export function LandingHero() {
  const { t } = useTranslation('landing');
  const navigate = useNavigate();

  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#1e1b4b_0%,#020617_50%,#000_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        <div className="absolute -top-24 -left-24 h-[520px] w-[520px] rounded-full bg-blue-600/25 blur-[120px] animate-landing-gradient-mesh" />
        <div className="absolute top-1/4 -right-24 h-[480px] w-[480px] rounded-full bg-violet-600/25 blur-[120px] animate-landing-gradient-mesh [animation-delay:2s]" />
        <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-cyan-500/15 blur-[110px] animate-landing-gradient-mesh [animation-delay:4s]" />
        <div className="absolute top-1/2 left-1/4 h-[320px] w-[320px] rounded-full bg-fuchsia-500/15 blur-[100px] animate-landing-gradient-mesh [animation-delay:6s]" />
        <svg className="absolute inset-0 h-full w-full opacity-[0.04] mix-blend-overlay" xmlns="http://www.w3.org/2000/svg">
          <filter id="hero-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#hero-noise)" />
        </svg>
      </div>

      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className={`landing-particle ${p.color}`}
          style={{
            width: p.size,
            height: p.size,
            top: p.top,
            left: p.left,
            animationDelay: p.delay,
            animationDuration: `${5 + i * 0.7}s`,
          }}
        />
      ))}

      {FLOATING_CHIPS.map((c) => {
        const position: React.CSSProperties = { top: c.top };
        if ('left' in c && c.left) position.left = c.left;
        if ('right' in c && c.right) position.right = c.right;
        return (
          <FloatingChip
            key={c.key}
            label={t(`hero.${c.key}`)}
            icon={c.icon}
            color={c.color}
            position={position}
            delay={c.delay}
          />
        );
      })}

      <div className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="landing-glass inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-slate-300 backdrop-blur-lg"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-landing-pulse-dot rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
              </span>
              <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
              {t('hero.eyebrow')}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
              className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
            >
              <span className="block bg-gradient-to-br from-white via-white to-slate-400 bg-clip-text text-transparent">
                {t('hero.headline').replace(t('hero.headlineHighlight'), '').replace(/\.\s*$/, '').trim()}
              </span>
              <span className="mt-1 block landing-text-shimmer">
                {t('hero.headlineHighlight')}.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.3 }}
              className="mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg"
            >
              {t('hero.sub1')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.45 }}
              className="mt-10 flex flex-wrap items-end gap-6 sm:gap-8"
            >
              <PainStat value={t('hero.painStat.skus')} />
              <div className="hidden h-12 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent sm:block" />
              <PainStat value={t('hero.painStat.regs')} />
              <div className="hidden h-12 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent sm:block" />
              <PainStat value={t('hero.painStat.weeks')} />
              <span className="ml-auto hidden text-sm font-medium italic text-slate-500 sm:inline">
                {t('hero.painStat.label')}
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.6 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <motion.button
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                onClick={() => navigate('/login')}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/40 animate-landing-cta-glow hover:shadow-violet-600/50"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-violet-600 to-blue-600 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <span className="relative">{t('hero.cta.primary')}</span>
                <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-1" />
              </motion.button>
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="landing-glass inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-7 py-3.5 text-base font-semibold text-white backdrop-blur-lg transition-colors hover:bg-white/[0.08]"
              >
                <PlayCircle className="h-4 w-4 text-violet-300" />
                {t('hero.cta.secondary')}
              </motion.button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.9 }}
              className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-400"
            >
              {CRED_STATS.map((s, i) => (
                <div key={s.key} className="flex items-center gap-2">
                  <s.icon className="h-3.5 w-3.5 text-blue-400" />
                  <span className="font-semibold text-white">
                    <AnimatedCounter to={s.to} suffix={s.suffix} decimals={s.decimals} />
                  </span>
                  <span>{t(`hero.${s.key}`)}</span>
                  {i < CRED_STATS.length - 1 && <span className="ml-3 text-slate-700">·</span>}
                </div>
              ))}
            </motion.div>
          </div>

          <div className="lg:col-span-5">
            <LiveScoreWidget t={t} />
          </div>
        </div>
      </div>

      <ScrollCue text={t('hero.scrollCue')} />
    </section>
  );
}
