import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Expand, Package } from 'lucide-react';
import { useReducedMotion } from '@/lib/motion';
import { IconTile } from '@/components/ui/icon-tile';
import { PhotoLightbox } from '@/components/returns/PhotoLightbox';
import type { ProductImage } from '@/types/database';
import { cn } from '@/lib/utils';
import { SafeHtml } from '@/components/ui/safe-html';

// ---------------------------------------------------------------------------
// Fade-in image
// ---------------------------------------------------------------------------

interface ProductFadeImageProps {
  src: string;
  alt: string;
  className?: string;
  /** The above-the-fold hero image loads eagerly; everything else is lazy. */
  priority?: boolean;
}

/**
 * Product photo that fades in once decoded. The parent always reserves the
 * aspect ratio, so the fade is opacity-only and never shifts layout.
 */
export function ProductFadeImage({ src, alt, className, priority = false }: ProductFadeImageProps) {
  const { t } = useTranslation('products');
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // Cached images can finish before React attaches onLoad — check on mount.
  const imgRef = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth > 0) setLoaded(true);
  }, []);

  // A dead link (e.g. an image deleted at its external host) shows a calm
  // placeholder in the same box instead of the browser's broken-image glyph.
  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn('flex flex-col items-center justify-center gap-2 bg-muted/60 text-muted-foreground', className)}
      >
        <Package className="h-6 w-6" aria-hidden="true" />
        <span className="px-2 text-center text-xs">{t('Image unavailable')}</span>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      // React 19 forwards fetchPriority to the DOM attribute.
      fetchPriority={priority ? 'high' : 'auto'}
      draggable={false}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      className={cn(
        'transition-opacity duration-200 ease-out motion-reduce:transition-none',
        loaded ? 'opacity-100' : 'opacity-0',
        className,
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

/** Primary image first, then the rest in their saved order. */
export function orderProductImages(images: ProductImage[], fallbackUrl?: string): string[] {
  if (images.length === 0) return fallbackUrl ? [fallbackUrl] : [];
  const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
  const primary = sorted.find((img) => img.isPrimary);
  const ordered = primary ? [primary, ...sorted.filter((img) => img !== primary)] : sorted;
  return ordered.map((img) => img.url);
}

interface ProductGalleryProps {
  urls: string[];
  name: string;
}

function ProductGallery({ urls, name }: ProductGalleryProps) {
  const { t } = useTranslation('products');
  const prefersReduced = useReducedMotion();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next !== active) setActive(next);
  };

  const goTo = (index: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: prefersReduced ? 'auto' : 'smooth' });
    setActive(index);
  };

  // Frame shared by the photo and the empty state so both reserve the same box.
  const frame =
    'relative overflow-hidden rounded-2xl bg-muted/60 ring-1 ring-inset ring-border/60 aspect-[4/3] lg:aspect-square';

  if (urls.length === 0) {
    return (
      <div className={cn(frame, 'flex flex-col items-center justify-center gap-3')}>
        <IconTile icon={Package} size="lg" tone="muted" />
        <p className="text-sm text-muted-foreground">{t('No product image yet')}</p>
      </div>
    );
  }

  const multiple = urls.length > 1;

  return (
    <div className="space-y-3">
      <div className={frame}>
        <div
          ref={scrollerRef}
          onScroll={multiple ? handleScroll : undefined}
          className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-roledescription={multiple ? 'carousel' : undefined}
          aria-label={t('Product images')}
        >
          {urls.map((url, i) => (
            <button
              key={url + i}
              type="button"
              onClick={() => setLightboxIndex(i)}
              className="group/slide relative h-full w-full shrink-0 snap-center cursor-zoom-in outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50"
              aria-label={t('Open image {{current}} of {{total}}', { current: i + 1, total: urls.length })}
            >
              <ProductFadeImage
                src={url}
                alt={i === 0 ? name : `${name} (${i + 1})`}
                priority={i === 0}
                className="h-full w-full object-contain p-6 sm:p-8"
              />
            </button>
          ))}
        </div>

        {/* Quiet affordances — decorative, the slides themselves are the buttons. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-xs ring-1 ring-border/60 backdrop-blur-sm"
        >
          <Expand className="size-3.5" />
        </span>
        {multiple && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-background/80 px-2.5 py-1 text-xs font-medium tabular-nums text-foreground shadow-xs ring-1 ring-border/60 backdrop-blur-sm"
          >
            {active + 1} / {urls.length}
          </span>
        )}
      </div>

      {multiple && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {urls.map((url, i) => (
            <button
              key={url + i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={t('Show image {{current}} of {{total}}', { current: i + 1, total: urls.length })}
              aria-current={i === active}
              className={cn(
                'relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted/60 ring-1 ring-inset',
                'transition-[box-shadow,opacity,scale] duration-150 ease-out active:scale-[0.97] motion-reduce:active:scale-100',
                'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                i === active ? 'ring-2 ring-primary' : 'opacity-70 ring-border/60 hover:opacity-100',
              )}
            >
              <ProductFadeImage src={url} alt="" className="h-full w-full object-contain p-1" />
            </button>
          ))}
        </div>
      )}

      {lightboxIndex !== null && (
        <PhotoLightbox
          key={lightboxIndex}
          photos={urls}
          initialIndex={lightboxIndex}
          open
          onOpenChange={(open) => !open && setLightboxIndex(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

export interface ProductHeroFact {
  label: string;
  value: ReactNode;
  /** Monospaced, for identifiers such as GTINs. */
  mono?: boolean;
}

interface ProductHeroProps {
  name: string;
  images: ProductImage[];
  fallbackImageUrl?: string;
  /** Small line above the name, e.g. the category. */
  eyebrow?: ReactNode;
  /** Muted line below the name, e.g. manufacturer. */
  meta?: ReactNode;
  /** A single status badge. */
  status?: ReactNode;
  description?: string;
  facts: ProductHeroFact[];
  /** Primary action row. */
  actions: ReactNode;
  /** Secondary, quieter content under the actions (e.g. compliance hint). */
  footer?: ReactNode;
}

/**
 * Top-of-page product preview: a large, calm image stage with swipeable
 * slides and a full-screen viewer, next to the essentials and actions.
 */
export function ProductHero({
  name,
  images,
  fallbackImageUrl,
  eyebrow,
  meta,
  status,
  description,
  facts,
  actions,
  footer,
}: ProductHeroProps) {
  const urls = useMemo(() => orderProductImages(images, fallbackImageUrl), [images, fallbackImageUrl]);

  return (
    // minmax(0,1fr): without an explicit track the implicit column sizes to
    // its widest child (the thumbnail strip), pushing the whole hero —
    // gallery, text and action buttons — past the phone's right edge.
    <section className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-12 lg:gap-10">
      <div className="min-w-0 lg:col-span-5">
        <ProductGallery urls={urls} name={name} />
      </div>

      <div className="flex min-w-0 flex-col gap-6 lg:col-span-7 lg:py-2">
        <div className="space-y-2">
          {eyebrow && <div className="text-sm text-muted-foreground">{eyebrow}</div>}
          <h1 className="text-2xl font-semibold tracking-tight text-balance break-words text-foreground lg:text-3xl">
            {name}
          </h1>
          {meta && <div className="text-sm text-muted-foreground">{meta}</div>}
          {status && <div className="pt-1">{status}</div>}
        </div>

        {description && (
          // Descriptions come from the rich-text editor (HTML); render them
          // sanitised instead of showing the raw tags.
          <SafeHtml
            html={description}
            className="max-w-prose break-words text-sm leading-relaxed text-muted-foreground text-pretty line-clamp-3 [&_p]:inline [&_p]:after:content-['_']"
          />
        )}

        {facts.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-border/60 py-4 sm:grid-cols-3">
            {facts.map((fact) => (
              <div key={fact.label} className="min-w-0 space-y-1">
                <dt className="text-xs text-muted-foreground">{fact.label}</dt>
                <dd
                  className={cn(
                    'text-sm font-medium tabular-nums text-foreground break-words',
                    fact.mono && 'font-mono tracking-tight break-all',
                  )}
                >
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {actions}

        {footer}
      </div>
    </section>
  );
}
