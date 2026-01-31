import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PackagePlus, Search, ClipboardList, Truck, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useReturnsPortal } from '@/hooks/useReturnsPortal';

export function PublicReturnPortalPage() {
  const { t } = useTranslation('returns');
  const navigate = useNavigate();
  const { tenantSlug, tenantName, primaryColor } = useReturnsPortal();

  return (
    <div className="animate-fade-in-up">
      {/* Hero Section */}
      <section
        className="py-16 sm:py-24"
        style={{ background: `linear-gradient(135deg, ${primaryColor}10 0%, ${primaryColor}05 100%)` }}
      >
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {t('Welcome to the Returns Portal of {{name}}', { name: tenantName || t('Returns Hub') })}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('Easy returns in 3 simple steps')}
          </p>
        </div>
      </section>

      {/* CTA Cards */}
      <section className="max-w-4xl mx-auto px-4 -mt-8 sm:-mt-12 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-primary/30"
            onClick={() => navigate(`/returns/register/${tenantSlug}`)}
          >
            <CardContent className="p-6 sm:p-8 text-center">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-white mx-auto mb-4 group-hover:scale-110 transition-transform"
                style={{ backgroundColor: primaryColor }}
              >
                <PackagePlus className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-semibold mb-2">{t('Start a New Return')}</h2>
              <p className="text-sm text-muted-foreground mb-5">
                {t('Register your return quickly and easily')}
              </p>
              <Button className="w-full" style={{ backgroundColor: primaryColor }}>
                {t('Start Return')}
              </Button>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-primary/30"
            onClick={() => navigate('/returns/track')}
          >
            <CardContent className="p-6 sm:p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-foreground mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Search className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-semibold mb-2">{t('Track Your Return')}</h2>
              <p className="text-sm text-muted-foreground mb-5">
                {t('Check the current status of your return')}
              </p>
              <Button variant="outline" className="w-full">
                {t('Track Status')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-4xl mx-auto px-4 py-16 sm:py-20">
        <h2 className="text-2xl font-bold text-center mb-10">{t('How It Works')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            { step: t('Step 1'), title: t('Register'), desc: t('Fill out the return form with your order details'), Icon: ClipboardList },
            { step: t('Step 2'), title: t('Ship'), desc: t('Send the items back using the provided label'), Icon: Truck },
            { step: t('Step 3'), title: t('Done'), desc: t('Receive your refund or exchange'), Icon: CheckCircle2 },
          ].map((item, i) => (
            <div key={i} className="text-center group">
              <div className="relative mx-auto mb-4">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full text-white mx-auto group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: primaryColor }}
                >
                  <item.Icon className="h-7 w-7" />
                </div>
                <span
                  className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {i + 1}
                </span>
              </div>
              <h3 className="font-semibold mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 pb-16 sm:pb-20">
        <h2 className="text-2xl font-bold text-center mb-8">{t('Frequently Asked Questions')}</h2>
        <Accordion type="single" collapsible className="w-full">
          {[
            { q: t('How long does a return take?'), a: t('Returns are typically processed within 5-7 business days after we receive your items.') },
            { q: t('What items can I return?'), a: t('Most items can be returned within the return window. Items must be in their original condition.') },
            { q: t('How will I receive my refund?'), a: t('Refunds are issued to your original payment method within 3-5 business days after approval.') },
            { q: t('Can I exchange instead of returning?'), a: t('Yes, you can select exchange as your preferred solution during the return registration.') },
          ].map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
