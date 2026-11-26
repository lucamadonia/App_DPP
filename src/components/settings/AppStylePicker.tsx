import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';
import { useTheme, type Theme } from '@/hooks/use-theme';
import { originFromElement, transitionAppearance } from '@/lib/appearance-transition';
import {
  APP_STYLES,
  getStoredAppStyle,
  setAppStyle,
  subscribeAppStyle,
  type AppStyleDefinition,
  type AppStyleId,
} from '@/lib/app-styles';

/** Miniature of the app shell painted with the style's real tokens. */
function StylePreview({ style, dark }: { style: AppStyleDefinition; dark: boolean }) {
  const t = dark ? style.dark : style.light;
  const inner = `calc(${style.radius} * 0.6)`;
  return (
    <div
      aria-hidden
      data-style-preview
      className="flex h-20 w-full overflow-hidden border sm:h-24"
      style={{ background: t.background, borderColor: t.border, borderRadius: style.radius }}
    >
      <div className="flex w-6 shrink-0 flex-col items-center gap-1.5 py-2 sm:w-7" style={{ background: t.sidebar }}>
        <span className="size-2.5 rounded-full sm:size-3" style={{ background: 'var(--primary)' }} />
        {[0.9, 0.45, 0.45].map((o, i) => (
          <span key={i} className="h-1 w-3 rounded-full sm:w-3.5" style={{ background: t.sidebarForeground, opacity: o }} />
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-1.5 sm:p-2">
        <span className="h-1.5 w-1/2 rounded-full" style={{ background: t.foreground }} />
        <div className="flex flex-1 gap-1.5">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex min-w-0 flex-1 flex-col justify-between border p-1.5"
              style={{ background: t.card, borderColor: t.border, borderRadius: inner }}
            >
              <span className="h-1 w-3/4 rounded-full" style={{ background: t.cardForeground }} />
              <span className="h-1 w-1/2 rounded-full" style={{ background: t.mutedForeground }} />
              {i === 0 && <span className="h-1.5 w-6 rounded-full" style={{ background: 'var(--primary)' }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const MODES: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

/** Light / dark / system as one segmented control with a gliding thumb. */
function ModeSegment() {
  const { t } = useTranslation('settings');
  const { theme, setTheme } = useTheme();
  const reduce = useReducedMotion();

  return (
    <div role="radiogroup" aria-label={t('Appearance')} className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
      {MODES.map(({ value, label, icon: Icon }) => {
        const selected = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={(e) => {
              if (selected) return;
              haptic.light();
              setTheme(value, originFromElement(e.currentTarget));
            }}
            className={cn(
              'relative flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium outline-none',
              'transition-[color,transform] duration-150 ease-(--ease-out) active:scale-[0.97]',
              'focus-visible:ring-[3px] focus-visible:ring-ring/50',
              selected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {selected && (
              <motion.span
                layoutId="appearance-mode-thumb"
                className="absolute inset-0 rounded-lg bg-card shadow-sm ring-1 ring-border"
                transition={reduce ? { duration: 0 } : { type: 'spring', duration: 0.3, bounce: 0 }}
              />
            )}
            <Icon className="relative size-4 shrink-0" />
            <span className="relative truncate">{t(label)}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Appearance settings: light/dark mode plus one of five app styles. Applies
 * instantly with a circular reveal from the tapped card; no save button.
 */
export function AppStylePicker() {
  const { t } = useTranslation('settings');
  const { resolvedTheme } = useTheme();
  const reduce = useReducedMotion();
  const [active, setActive] = useState<AppStyleId>(() => getStoredAppStyle());
  const previews = useRef(new Map<AppStyleId, HTMLButtonElement>());

  useEffect(() => subscribeAppStyle(setActive), []);

  const choose = (id: AppStyleId) => {
    if (id === active) return;
    haptic.light();
    const card = previews.current.get(id);
    transitionAppearance(
      () => {
        setAppStyle(id);
        flushSync(() => setActive(id));
      },
      originFromElement(card?.querySelector('[data-style-preview]') ?? card)
    );
  };

  return (
    <div className="space-y-5">
      <ModeSegment />

      <div
        role="radiogroup"
        aria-label={t('App Style')}
        className="grid grid-cols-1 gap-3 min-[340px]:grid-cols-2 lg:grid-cols-3"
      >
        {APP_STYLES.map((style) => {
          const selected = style.id === active;
          return (
            <button
              key={style.id}
              ref={(el) => {
                if (el) previews.current.set(style.id, el);
                else previews.current.delete(style.id);
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => choose(style.id)}
              className={cn(
                'relative flex min-h-11 w-full min-w-0 flex-col gap-2.5 rounded-xl border bg-card p-2.5 text-left outline-none sm:p-3',
                'transition-[border-color,box-shadow,transform] duration-150 ease-(--ease-out) active:scale-[0.97]',
                'focus-visible:ring-[3px] focus-visible:ring-ring/50',
                selected
                  ? 'border-primary shadow-[0_0_0_1px_var(--primary)]'
                  : '[@media(hover:hover)]:hover:border-foreground/25'
              )}
            >
              <StylePreview style={style} dark={resolvedTheme === 'dark'} />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-card-foreground">{t(style.name)}</p>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground text-pretty">{t(style.description)}</p>
                </div>
                <span
                  className={cn(
                    'relative mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border',
                    selected ? 'border-primary' : 'border-border'
                  )}
                >
                  <AnimatePresence initial={false}>
                    {selected && (
                      <motion.span
                        key="check"
                        className="absolute inset-[-1px] flex items-center justify-center rounded-full bg-primary text-primary-foreground"
                        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.1 } }}
                        transition={reduce ? { duration: 0.15 } : { type: 'spring', duration: 0.3, bounce: 0.25 }}
                      >
                        <Check className="size-3" strokeWidth={3} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        {t('Applies to this device only. Light and dark mode and your brand colour work with every style.')}
      </p>
    </div>
  );
}
