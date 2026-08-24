import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  FileText,
  Lightbulb,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMotionBudget } from '@/hooks/use-motion-budget';
import { routeTransition } from '@/lib/motion';
import { haptic } from '@/lib/haptics';
import { guestState } from '@/lib/guest-state';
import { buildTipDeck, dailyDeck, type TipCard, type TipKind } from '@/lib/tips-deck';

const KIND_ICON: Record<TipKind, typeof Lightbulb> = {
  tip: Lightbulb,
  penalty: AlertTriangle,
  deadline: CalendarClock,
  document: FileText,
};

const KIND_TONE: Record<TipKind, string> = {
  tip: 'from-blue-500/15 to-violet-500/15 text-primary',
  penalty: 'from-red-500/15 to-orange-500/15 text-destructive',
  deadline: 'from-amber-500/15 to-yellow-500/15 text-warning',
  document: 'from-emerald-500/15 to-teal-500/15 text-success',
};

/**
 * Swipeable stack of compliance knowledge.
 *
 * There is no carousel primitive in components/ui, so this is hand-rolled on the
 * same flick heuristic as the intro pager (commit past 72px OR velocity 500) so
 * both surfaces feel identical under the thumb.
 *
 * `data-no-swipe-back` is load-bearing: SwipeBackLayer arms on the left 24px
 * edge and would otherwise steal a horizontal drag that starts near it.
 *
 * Only transform and opacity animate — a card stack that animates blur or
 * box-shadow will drop frames in a WebView.
 */
export function TipDeck({ size = 7 }: { size?: number }) {
  const { t, i18n } = useTranslation('journey');
  const budget = useMotionBudget();
  const [index, setIndex] = useState(0);
  const [seen, setSeen] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    void guestState.tips.load().then((s) => {
      if (!cancelled) setSeen(s.seen);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const deck = useMemo(() => {
    const locale: 'en' | 'de' = i18n.language.startsWith('de') ? 'de' : 'en';
    // The date is read here because this is the live surface; the pure functions
    // in tips-deck.ts take `today` as an argument so they stay unit-testable.
    const today = new Date().toISOString().slice(0, 10);
    const ctx = { locale, countries: [], categoryHints: [], seen, today };
    return dailyDeck(buildTipDeck(ctx), ctx, size);
  }, [i18n.language, seen, size]);

  const commit = useCallback(
    (dir: 1 | -1) => {
      setIndex((i) => {
        const next = Math.max(0, Math.min(deck.length, i + dir));
        if (next !== i) haptic.light();
        if (next === deck.length) haptic.success();
        return next;
      });
    },
    [deck.length]
  );

  // Record what was actually shown, so tomorrow's deck can demote it.
  const current = deck[index];
  useEffect(() => {
    if (!current) return;
    const today = new Date().toISOString().slice(0, 10);
    if (seen[current.id] === today) return;
    void guestState.tips
      .load()
      .then((s) => guestState.tips.save({ ...s, seen: { ...s.seen, [current.id]: today } }));
  }, [current, seen]);

  const handleDragEnd = useCallback(
    (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x <= -72 || info.velocity.x < -500) commit(1);
      else if (info.offset.x >= 72 || info.velocity.x > 500) commit(-1);
    },
    [commit]
  );

  if (deck.length === 0) return null;

  const reduced = budget === 'reduced';

  if (index >= deck.length) {
    return (
      <div className="rounded-2xl border border-dashed p-7 text-center">
        <p className="text-body font-medium">{t('discover.tips.done')}</p>
        <Button variant="ghost" className="mt-2" onClick={() => setIndex(0)}>
          <RotateCcw className="mr-1.5 size-4" />
          {t('discover.tips.again')}
        </Button>
      </div>
    );
  }

  return (
    <section aria-label={t('discover.tools.tips.title')} className="space-y-3">
      <div className="relative h-52" data-no-swipe-back>
        {/* Only the top three render; the two behind exist purely as depth.
            Reversed so the topmost card is last in DOM order and therefore
            wins the hit test without relying on z-index alone. */}
        {deck
          .slice(index, index + 3)
          .map((card, offset) => (
            <TipCardView
              key={card.id}
              card={card}
              offset={offset}
              reduced={reduced}
              draggable={offset === 0 && !reduced}
              onDragEnd={handleDragEnd}
              t={t}
            />
          ))
          .reverse()}
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="touch-target"
          onClick={() => commit(-1)}
          disabled={index === 0}
          aria-label={t('discover.tips.previous')}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-caption tabular-nums text-muted-foreground">
          {index + 1} / {deck.length}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="touch-target"
          onClick={() => commit(1)}
          aria-label={t('discover.tips.next')}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </section>
  );
}

function TipCardView({
  card,
  offset,
  reduced,
  draggable,
  onDragEnd,
  t,
}: {
  card: TipCard;
  offset: number;
  reduced: boolean;
  draggable: boolean;
  onDragEnd: (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
  t: (key: string) => string;
}) {
  const Icon = KIND_ICON[card.kind];
  const source = card.authority
    ? `${card.requirementName} · ${card.authority}`
    : card.requirementName;

  return (
    <motion.article
      className="absolute inset-0 flex flex-col gap-2.5 rounded-2xl border bg-card p-5 shadow-sm"
      style={{ zIndex: 10 - offset }}
      initial={reduced ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1 - offset * 0.25, scale: 1 - offset * 0.04, y: offset * 10 }}
      transition={routeTransition(reduced ? 'reduced' : 'full')}
      drag={draggable ? 'x' : false}
      dragDirectionLock
      dragMomentum={false}
      dragElastic={0.15}
      onDragEnd={draggable ? onDragEnd : undefined}
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex size-8 items-center justify-center rounded-lg bg-gradient-to-br ${KIND_TONE[card.kind]}`}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
          {t(`discover.tips.kind.${card.kind}`)}
        </span>
      </div>

      <p className="line-clamp-4 text-body leading-relaxed">{card.text}</p>

      <p className="mt-auto truncate text-caption text-muted-foreground">{source}</p>
    </motion.article>
  );
}
