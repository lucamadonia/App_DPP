import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuideStepProps {
  number: number;
  title: string;
  description: string;
  detail?: string;
  gradient: string;
  delay?: number;
  isVisible: boolean;
  children?: React.ReactNode;
}

export function GuideStep({
  number,
  title,
  description,
  detail,
  gradient,
  delay = 0,
  isVisible,
  children,
}: GuideStepProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        'relative pl-12 transition-all duration-500',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Connector line */}
      <div
        className="absolute left-[18px] top-10 bottom-0 w-0.5 bg-gradient-to-b from-slate-200 to-transparent"
        style={{ transformOrigin: 'top' }}
      />

      {/* Number circle */}
      <div
        className={cn(
          'absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white shadow-md',
          gradient
        )}
      >
        {number}
      </div>

      {/* Content */}
      <div className="pb-6">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-start justify-between text-left group"
        >
          <div className="min-w-0 pr-4">
            <h4 className="text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
              {title}
            </h4>
            <p className="mt-1 text-sm text-slate-500 leading-relaxed">{description}</p>
          </div>
          {(detail || children) && (
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 mt-1 text-slate-400 transition-transform duration-200',
                expanded && 'rotate-180'
              )}
            />
          )}
        </button>

        {expanded && (detail || children) && (
          <div className="mt-3 animate-fade-in-up">
            {detail && (
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50/80 rounded-lg p-3">
                {detail}
              </p>
            )}
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
