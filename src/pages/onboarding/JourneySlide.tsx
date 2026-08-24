import { motion, useTransform, type MotionValue } from 'framer-motion';
import type { TFunction } from 'i18next';
import type { MotionBudget } from '@/hooks/use-motion-budget';
import { LQIP } from '@/components/first-run/lqip.generated';
import { OnboardingIllustration } from './OnboardingIllustration';
import type { JourneySlideSpec } from './journey-slides';
import { assetUrl, type ImageState } from './use-journey-images';

/**
 * How far the backdrop lags the foreground. 0.25 means the photo travels at
 * 0.75x, which needs 25% overshoot per side — hence `.fr-backdrop` being 150%
 * wide. A more dramatic 0.65 would need a 230%-wide image, which is why this
 * number is what it is.
 */
const PARALLAX_LAG = 0.25;

export interface JourneySlideProps {
  slide: JourneySlideSpec;
  indexInTrack: number;
  x: MotionValue<number>;
  width: number;
  active: boolean;
  budget: MotionBudget;
  imageState: ImageState;
  t: TFunction;
}

export function JourneySlide({
  slide,
  indexInTrack,
  x,
  width,
  active,
  budget,
  imageState,
  t,
}: JourneySlideProps) {
  const w = width || 1;
  // Exactly two MotionValue subscriptions per slide. Keep it at two — more
  // subscribers is the first thing that makes the drag stutter.
  const offset = useTransform(x, (v) => v + indexInTrack * w);
  const backdropX = useTransform(offset, (v) => -v * PARALLAX_LAG);

  const showPhoto = imageState !== 'failed' && budget !== 'minimal';
  const parallax = budget === 'full' && width > 0;

  return (
    <div className="relative h-full w-full select-none overflow-hidden">
      {showPhoto ? (
        <>
          <motion.div
            aria-hidden
            className={`fr-backdrop ${active && budget === 'full' ? 'fr-kenburns' : ''}`}
            style={{
              x: parallax ? backdropX : 0,
              // The inlined LQIP paints instantly, so a slide is never empty
              // while the full backdrop decodes. Upscaling 24px to full screen
              // is the blur, for free, on the GPU.
              backgroundImage: `url("${LQIP[slide.image]}")`,
            }}
          >
            {imageState === 'ready' && (
              <motion.img
                src={assetUrl(slide.image)}
                alt=""
                className="h-full w-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            )}
          </motion.div>
          <div aria-hidden className="fr-scrim" />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center px-8">
          <div className="h-56 w-full">
            <OnboardingIllustration
              icon={slide.icon}
              satellites={slide.satellites}
              tint={slide.tint}
              active={active}
              budget={budget}
            />
          </div>
        </div>
      )}

      {/* Bottom-anchored card. Deliberately NOT .glass-surface: that is
          backdrop-filter: blur(16px), and a blurring backdrop-filter stacked
          over a moving photograph is the fastest way to drop a mid-range
          Android to 30fps. Opaque here; real glass is for the static finish. */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-3 px-7 pb-10">
        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-micro font-medium uppercase tracking-wider text-white/90">
          {t(slide.proofKey)}
        </span>
        <h1 className="text-balance text-title-lg font-bold leading-tight tracking-tight text-white">
          {t(slide.titleKey)}
        </h1>
        <p className="text-pretty text-body leading-relaxed text-white/85">
          {t(slide.lineKeys[0])}
        </p>
        <p className="text-pretty text-caption leading-relaxed text-white/65">
          {t(slide.lineKeys[1])}
        </p>
      </div>
    </div>
  );
}
