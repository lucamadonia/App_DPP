import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PhotoLightboxProps {
  photos: string[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PhotoLightbox({ photos, initialIndex = 0, open, onOpenChange }: PhotoLightboxProps) {
  const [index, setIndex] = useState(initialIndex);

  const goNext = () => setIndex((i) => (i + 1) % photos.length);
  const goPrev = () => setIndex((i) => (i - 1 + photos.length) % photos.length);

  if (photos.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 bg-black/95 border-none">
        <div className="relative flex items-center justify-center min-h-[400px]">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 text-white hover:bg-white/20 z-10"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>

          {photos.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 text-white hover:bg-white/20 z-10"
                onClick={goPrev}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 text-white hover:bg-white/20 z-10"
                onClick={goNext}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          <img
            src={photos[index]}
            alt={`Photo ${index + 1}`}
            className="max-h-[70vh] max-w-full object-contain animate-scale-in"
            key={index}
          />

          {photos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {photos.map((_, i) => (
                <button
                  key={i}
                  className={`h-2 w-2 rounded-full transition-all ${
                    i === index ? 'bg-white scale-125' : 'bg-white/40'
                  }`}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
