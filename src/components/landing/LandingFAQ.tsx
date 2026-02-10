import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { HelpCircle, ChevronDown } from 'lucide-react';

const faqKeys = ['dpp', 'who', 'espr', 'ai', 'pricing', 'returns', 'security', 'trial'] as const;

function FAQItem({
  questionKey,
  isOpen,
  onToggle,
}: {
  questionKey: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation('landing');

  return (
    <div className="border-b border-slate-200 last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between py-5 text-left transition-colors hover:text-blue-600"
      >
        <span className="text-base font-medium text-slate-900 pr-4">
          {t(`faq.${questionKey}.q`)}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ${
          isOpen ? 'grid-rows-[1fr] pb-5' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <p className="text-sm text-slate-600 leading-relaxed">
            {t(`faq.${questionKey}.a`)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function LandingFAQ() {
  const { t } = useTranslation('landing');
  const { ref, isVisible } = useScrollReveal();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (i: number) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  // Build JSON-LD FAQ Schema
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqKeys.map((key) => ({
      '@type': 'Question',
      name: t(`faq.${key}.q`),
      acceptedAnswer: {
        '@type': 'Answer',
        text: t(`faq.${key}.a`),
      },
    })),
  };

  return (
    <section id="faq" className="py-24 bg-slate-50">
      {/* JSON-LD FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div ref={ref} className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={`text-center mb-14 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-4 py-1.5 text-sm font-medium text-blue-700 mb-4">
            <HelpCircle className="h-4 w-4" />
            {t('faq.badge')}
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            {t('faq.headline')}
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            {t('faq.subtitle')}
          </p>
        </div>

        {/* Accordion */}
        <div
          className={`rounded-2xl border border-slate-200 bg-white px-6 shadow-sm transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
          style={{ transitionDelay: '200ms' }}
        >
          {faqKeys.map((key, i) => (
            <FAQItem
              key={key}
              questionKey={key}
              isOpen={openIndex === i}
              onToggle={() => toggle(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
