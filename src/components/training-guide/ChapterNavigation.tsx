import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Package,
  QrCode,
  FolderArchive,
  Truck,
  ShieldCheck,
  RotateCcw,
  Globe,
  Settings,
  CreditCard,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChapterId } from '@/hooks/useTrainingGuideProgress';
import { ALL_CHAPTERS } from '@/hooks/useTrainingGuideProgress';

const CHAPTER_ICONS: Record<ChapterId, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  products: Package,
  dpp: QrCode,
  documents: FolderArchive,
  'supply-chain': Truck,
  compliance: ShieldCheck,
  returns: RotateCcw,
  portals: Globe,
  settings: Settings,
  billing: CreditCard,
};

interface ChapterNavigationProps {
  completed: Set<ChapterId>;
}

export function ChapterNavigation({ completed }: ChapterNavigationProps) {
  const { t } = useTranslation('training-guide');
  const [activeChapter, setActiveChapter] = useState<ChapterId>('dashboard');
  const navRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // IntersectionObserver to track which chapter is in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-chapter') as ChapterId;
            if (id) setActiveChapter(id);
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );

    ALL_CHAPTERS.forEach((id) => {
      const el = document.getElementById(`chapter-${id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Auto-scroll nav to keep active pill visible
  useEffect(() => {
    const pill = pillRefs.current[activeChapter];
    if (pill && navRef.current) {
      pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeChapter]);

  const scrollToChapter = (id: ChapterId) => {
    const el = document.getElementById(`chapter-${id}`);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <div className="sticky top-14 z-20 bg-white/90 backdrop-blur-md border-b border-slate-100">
      <div
        ref={navRef}
        className="mx-auto max-w-5xl flex gap-1.5 overflow-x-auto px-4 py-2.5 scrollbar-none"
        style={{ scrollbarWidth: 'none' }}
      >
        {ALL_CHAPTERS.map((id) => {
          const Icon = CHAPTER_ICONS[id];
          const isActive = activeChapter === id;
          const isDone = completed.has(id);

          return (
            <button
              key={id}
              ref={(el) => { pillRefs.current[id] = el; }}
              onClick={() => scrollToChapter(id)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                isActive
                  ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-200 animate-guide-pill-active'
                  : isDone
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              )}
            >
              {isDone ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{t(`${id}.title`)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
