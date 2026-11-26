import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PhotoLightboxProps {
  photos: string[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PhotoLightbox({ photos, initialIndex = 0, open, onOpenChange }: PhotoLightboxProps) {
  const { t } = useTranslation('returns');
  const [index, setIndex] = useState(initialIndex);

  const goNext = () => setIndex((i) => (i + 1) % photos.length);
  const goPrev = () => setIndex((i) => (i - 1 + photos.length) % photos.length);

  if (photos.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* The built-in close button is suppressed: it sits on the dark backdrop
          with the wrong contrast. Our own one below is white and 44px. The
          content is height-bounded (≤ 70dvh) so the centred box — and its
          close button — always clear the status bar / notch. */}
      <DialogContent showCloseButton={false} className="max-w-[95vw] sm:max-w-3xl p-0 bg-black/95 border-none">
        <DialogTitle className="sr-only">{`${index + 1} / ${photos.length}`}</DialogTitle>
        <div className="relative flex items-center justify-center min-h-[min(400px,60dvh)]">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-11 w-11 text-white hover:bg-white/20 hover:text-white z-10"
            aria-label={t('Close')}
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>

          {photos.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 h-11 w-11 text-white hover:bg-white/20 hover:text-white z-10"
                aria-label={t('Previous')}
                onClick={goPrev}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 h-11 w-11 text-white hover:bg-white/20 hover:text-white z-10"
                aria-label={t('Next')}
                onClick={goNext}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          <img
            src={photos[index]}
            alt={`${index + 1} / ${photos.length}`}
            className="max-h-[70dvh] max-w-full object-contain animate-scale-in"
            key={index}
          />

          {photos.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex">
              {photos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className="flex h-8 w-8 items-center justify-center"
                  aria-label={`${i + 1} / ${photos.length}`}
                  aria-current={i === index}
                  onClick={() => setIndex(i)}
                >
                  <span
                    className={`h-2 w-2 rounded-full transition-[scale,background-color] duration-150 ${
                      i === index ? 'bg-white scale-125' : 'bg-white/40'
                    }`}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
