interface LandingBrandProps {
  /**
   * `light`: white wordmark for dark surfaces (hero, footer).
   * `auto`: slate wordmark that turns white in dark mode.
   */
  tone?: 'light' | 'auto';
  /** Mark edge length in px. */
  size?: number;
  className?: string;
}

/**
 * Trackbliss logo lockup: the app-icon mark (dark tile, so it reads on light
 * and dark backgrounds alike) plus a live-text wordmark. Replaces the 512px
 * square PNG whose padded artwork shrank to a ~20px mark with unreadable text.
 */
export function LandingBrand({ tone = 'auto', size = 36, className = '' }: LandingBrandProps) {
  const wordmark =
    tone === 'light' ? 'text-white' : 'text-slate-900 dark:text-white';
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <img
        src="/icons/icon-96.png"
        alt=""
        width={size}
        height={size}
        className="rounded-[10px] shadow-md shadow-blue-900/30 ring-1 ring-white/10 transition-transform group-hover:scale-105"
        style={{ width: size, height: size }}
      />
      <span className={`text-lg font-bold tracking-tight ${wordmark}`}>Trackbliss</span>
    </span>
  );
}
