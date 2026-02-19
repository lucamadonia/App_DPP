import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Package,
  FileWarning,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  QrCode,
  Plus,
  Sparkles,
  Sun,
  Sunrise,
  Moon,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useProducts, useDocumentStats } from '@/hooks/queries';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { ComplianceWidget } from '@/components/dashboard/ComplianceWidget';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

function AnimatedStatValue({ value }: { value: number }) {
  const prefersReduced = useReducedMotion();
  const animated = useAnimatedNumber(value, {
    duration: prefersReduced ? 0 : 800,
    delay: prefersReduced ? 0 : 200,
  });
  return <>{prefersReduced ? value : animated}</>;
}

function getGreetingKey(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getGreetingIcon(hour: number) {
  if (hour < 6) return Moon;
  if (hour < 12) return Sunrise;
  if (hour < 18) return Sun;
  return Moon;
}

export function DashboardPage() {
  const { t } = useTranslation('dashboard');
  const locale = useLocale();
  const { user } = useAuth();
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: docStats = { total: 0, valid: 0, expiring: 0, expired: 0 }, isLoading: docsLoading } = useDocumentStats();
  const isLoading = productsLoading || docsLoading;
  const prefersReduced = useReducedMotion();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const totalBatches = products.reduce((sum, p) => sum + (p.batchCount || 0), 0);
  const hour = new Date().getHours();
  const GreetingIcon = getGreetingIcon(hour);
  const displayName = user?.name || user?.email?.split('@')[0] || '';
  const isNewUser = products.length === 0 && docStats.total === 0;

  const stats = [
    {
      title: t('Active Products'),
      value: products.length,
      subtitle: products.length === 0
        ? t('No products yet')
        : `${totalBatches} ${totalBatches === 1 ? 'Batch' : 'Batches'}`,
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      href: '/products',
    },
    {
      title: t('Documents', { ns: 'common' }),
      value: docStats.total,
      subtitle: docStats.total === 0 ? t('No documents yet') : t('{{count}} valid', { count: docStats.valid }),
      icon: FileWarning,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      href: '/documents',
    },
    {
      title: t('Expiring Certificates'),
      value: docStats.expiring,
      subtitle: t('next 30 days'),
      icon: AlertTriangle,
      color: docStats.expiring > 0 ? 'text-warning' : 'text-muted-foreground',
      bgColor: docStats.expiring > 0 ? 'bg-warning/10' : 'bg-muted/50',
      href: '/documents',
    },
    {
      title: t('Expired Documents'),
      value: docStats.expired,
      subtitle: docStats.expired > 0 ? t('Action required') : t('All up to date'),
      icon: TrendingUp,
      color: docStats.expired > 0 ? 'text-destructive' : 'text-success',
      bgColor: docStats.expired > 0 ? 'bg-destructive/10' : 'bg-success/10',
      href: '/documents',
    },
  ];

  const recentProducts = products.slice(0, 4);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const MotionDiv = prefersReduced ? 'div' : motion.div;

  return (
    <div className="space-y-6">
      {/* Personalized Greeting */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        initial={prefersReduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div>
          <div className="flex items-center gap-2">
            <GreetingIcon className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">
              {displayName
                ? t(getGreetingKey(hour) + ', {{name}}!', { name: displayName })
                : t(getGreetingKey(hour) + '!')}
            </h1>
          </div>
          <p className="mt-1 text-muted-foreground">
            {isNewUser
              ? t('Get started by creating your first product')
              : t('Here is your overview for today')}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link to="/dpp/qr-generator">
              <QrCode className="mr-2 h-4 w-4" />
              {t('Generate QR')}
            </Link>
          </Button>
          <Button asChild>
            <Link to="/products/new">
              <Package className="mr-2 h-4 w-4" />
              {t('New Product')}
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* Bento Stats Grid - first card spans 2 cols */}
      <motion.div
        className="grid gap-4 grid-cols-2 lg:grid-cols-4"
        variants={prefersReduced ? undefined : staggerContainer}
        initial="initial"
        animate="animate"
      >
        {stats.map((stat, index) => (
          <MotionDiv
            key={stat.title}
            variants={prefersReduced ? undefined : staggerItem}
            className={index === 0 ? 'col-span-2 lg:col-span-1' : ''}
          >
            <Link to={stat.href} className="block h-full">
              <Card className="h-full transition-colors hover:bg-muted/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tabular-nums">
                    <AnimatedStatValue value={stat.value} />
                  </div>
                  <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                </CardContent>
              </Card>
            </Link>
          </MotionDiv>
        ))}
      </motion.div>

      {/* Onboarding CTA for new users */}
      {isNewUser && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col items-center gap-4 py-8 text-center sm:flex-row sm:text-left">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">
                  {t('Welcome to Trackbliss')}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('Create your first Digital Product Passport in minutes. Add a product, upload documents, and generate QR codes.')}
                </p>
              </div>
              <Button size="lg" onClick={() => setShowOnboarding(true)}>
                <Sparkles className="mr-2 h-4 w-4" />
                {t('Get Started')}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Onboarding Wizard */}
      <OnboardingWizard
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />

      {/* Bottom Bento Grid - 3 columns on large screens */}
      <motion.div
        className="grid gap-6 lg:grid-cols-3"
        variants={prefersReduced ? undefined : staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* Recent Products - spans 2 cols */}
        <MotionDiv variants={prefersReduced ? undefined : staggerItem} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    {t('Recent Products')}
                  </CardTitle>
                  <CardDescription>{t('Your most recently added products')}</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/products">
                    {t('View All', { ns: 'common' })}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentProducts.length === 0 ? (
                <div className="py-8 text-center">
                  <Package className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    {t('No products yet')}
                  </p>
                  <Button className="mt-4" size="sm" asChild>
                    <Link to="/products/new">
                      <Plus className="mr-2 h-4 w-4" />
                      {t('Create First Product')}
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentProducts.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={prefersReduced ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.2,
                        delay: prefersReduced ? 0 : 0.3 + index * 0.03,
                        ease: 'easeOut',
                      }}
                    >
                      <Link
                        to={`/products/${product.id}`}
                        className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{product.name}</p>
                            <Badge
                              variant={product.status === 'live' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {product.status === 'live' && (
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                              )}
                              {product.status === 'draft' && <Clock className="mr-1 h-3 w-3" />}
                              {product.status || 'draft'}
                            </Badge>
                          </div>
                          <p className="font-mono text-xs text-muted-foreground">
                            GTIN: {product.gtin} · {product.batchCount || 0} {(product.batchCount || 0) === 1 ? 'Batch' : 'Batches'}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {product.createdAt
                            ? formatDate(product.createdAt, locale)
                            : ''}
                        </span>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </MotionDiv>

        {/* Activity Feed - right column */}
        <MotionDiv variants={prefersReduced ? undefined : staggerItem}>
          <ActivityFeed className="h-full" />
        </MotionDiv>

        {/* Compliance Widget - spans 2 cols */}
        <MotionDiv variants={prefersReduced ? undefined : staggerItem} className="lg:col-span-2">
          <ComplianceWidget className="h-full" />
        </MotionDiv>

        {/* Quick Actions */}
        <MotionDiv variants={prefersReduced ? undefined : staggerItem}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{t('Quick Start')}</CardTitle>
              <CardDescription>
                {products.length === 0
                  ? t('Get started with DPP Manager')
                  : t('Frequently used features')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 grid-cols-2">
                <Button variant="outline" className="h-auto flex-col gap-2 p-4 group" asChild>
                  <Link to="/products/new">
                    <Package className="h-6 w-6 transition-transform group-hover:scale-110" />
                    <span className="text-xs">{t('Create Product')}</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto flex-col gap-2 p-4 group" asChild>
                  <Link to="/documents">
                    <FileWarning className="h-6 w-6 transition-transform group-hover:scale-110" />
                    <span className="text-xs">{t('Documents', { ns: 'common' })}</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto flex-col gap-2 p-4 group" asChild>
                  <Link to="/dpp/qr-generator">
                    <QrCode className="h-6 w-6 transition-transform group-hover:scale-110" />
                    <span className="text-xs">{t('Create QR Code')}</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto flex-col gap-2 p-4 group" asChild>
                  <Link to="/regulations">
                    <TrendingUp className="h-6 w-6 transition-transform group-hover:scale-110" />
                    <span className="text-xs">{t('Regulations', { ns: 'common' })}</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </MotionDiv>
      </motion.div>
    </div>
  );
}
