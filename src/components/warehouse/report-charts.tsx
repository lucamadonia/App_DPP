/**
 * Dashboard chart sections for the shipment reports page.
 * Gradient-filled Recharts, scroll-reveal sections, unified tooltips and
 * reduced-motion aware entrance animations.
 */
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from 'framer-motion';
import { Clock, MapPin, TrendingUp, Truck, Users } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { cn } from '@/lib/utils';
import { fmtEuro, type Analytics, type LeadStageKey } from './report-analytics';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  '#06B6D4',
  '#F97316',
  '#64748B',
];

const ZONE_COLORS = { domestic: '#10B981', eu: '#F59E0B', world: '#EF4444' } as const;

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: 'var(--popover)',
  color: 'var(--popover-foreground)',
  border: '1px solid var(--border)',
  borderRadius: '0.5rem',
  fontSize: 12,
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
};

const TOOLTIP_LABEL_STYLE: React.CSSProperties = {
  color: 'var(--muted-foreground)',
  fontSize: 11,
  marginBottom: 2,
};

const AXIS_TICK = { fontSize: 11, fill: 'var(--muted-foreground)' } as const;

/** Section wrapper: soft fade/translate reveal once scrolled into view. */
export function RevealSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const { ref, isVisible } = useScrollReveal();
  const prefersReduced = useReducedMotion();
  return (
    <div
      ref={ref}
      className={cn(
        !prefersReduced && 'transition-all duration-700 ease-out will-change-transform',
        prefersReduced || isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
        className,
      )}
    >
      {children}
    </div>
  );
}

const CHART_HEIGHT = 'h-56 sm:h-64';

interface ReportChartsProps {
  analytics: Analytics;
}

export function ReportCharts({ analytics }: ReportChartsProps) {
  const { t } = useTranslation('warehouse');
  const prefersReduced = useReducedMotion();
  const animate = !prefersReduced;

  const stageLabel = (stage: LeadStageKey) =>
    stage === 'createdToShipped' ? t('Created → Shipped') : t('Shipped → Delivered');

  const leadTimeData = analytics.leadTimeByStage.map(e => ({ ...e, label: stageLabel(e.stage) }));

  return (
    <>
      <RevealSection className="grid gap-4 lg:grid-cols-2">
        {/* Volume over time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              {t('Shipments over time')}
            </CardTitle>
            <CardDescription>{t('Created per day')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={CHART_HEIGHT}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.timeline}>
                  <defs>
                    <linearGradient id="rptTimeline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis dataKey="day" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} width={32} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fill="url(#rptTimeline)"
                    dot={false}
                    name={t('Shipments')}
                    isAnimationActive={animate}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('Status distribution')}</CardTitle>
            <CardDescription>{t('Where shipments currently sit in the pipeline')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={CHART_HEIGHT}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.statusBreakdown}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius="42%"
                    outerRadius="70%"
                    paddingAngle={2}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label={(entry: any) => `${t(entry.status)}: ${entry.count}`}
                    labelLine={false}
                    isAnimationActive={animate}
                  >
                    {analytics.statusBreakdown.map((s, i) => (
                      <Cell key={s.status} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="var(--card)" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelStyle={TOOLTIP_LABEL_STYLE}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any, name: any) => [value, t(String(name))]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Carrier breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              {t('Carrier breakdown')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={CHART_HEIGHT}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.carrierBreakdown}>
                  <defs>
                    {Object.entries(ZONE_COLORS).map(([zone, color]) => (
                      <linearGradient key={zone} id={`rptZone-${zone}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.95} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.55} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis dataKey="carrier" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} width={32} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} cursor={{ fill: 'var(--muted)', opacity: 0.35 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="domestic" stackId="a" fill="url(#rptZone-domestic)" name={t('Domestic')} isAnimationActive={animate} />
                  <Bar dataKey="eu" stackId="a" fill="url(#rptZone-eu)" name={t('EU')} isAnimationActive={animate} />
                  <Bar dataKey="world" stackId="a" fill="url(#rptZone-world)" name={t('Worldwide')} radius={[4, 4, 0, 0]} isAnimationActive={animate} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top countries */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              {t('Top destinations')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={CHART_HEIGHT}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.topCountries} layout="vertical">
                  <defs>
                    <linearGradient id="rptCountries" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="var(--chart-4)" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0.45} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="country" tick={AXIS_TICK} tickLine={false} axisLine={false} width={56} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} cursor={{ fill: 'var(--muted)', opacity: 0.35 }} />
                  <Bar dataKey="count" fill="url(#rptCountries)" name={t('Shipments')} radius={[0, 4, 4, 0]} isAnimationActive={animate} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </RevealSection>

      <RevealSection className="grid gap-4 lg:grid-cols-2">
        {/* Top recipients */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              {t('Top recipients')}
            </CardTitle>
            <CardDescription>{t('By number of shipments')}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Recipient')}</TableHead>
                    <TableHead className="text-right">{t('Shipments')}</TableHead>
                    <TableHead className="text-right">{t('Items')}</TableHead>
                    <TableHead className="text-right">{t('Cost')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.topRecipients.slice(0, 10).map(r => (
                    <TableRow key={r.email + r.name}>
                      <TableCell>
                        <div className="text-sm font-medium">{r.name}</div>
                        {r.email && <div className="text-xs text-muted-foreground">{r.email}</div>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.items}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtEuro(r.cost)}</TableCell>
                    </TableRow>
                  ))}
                  {analytics.topRecipients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                        {t('No data in range')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Lead time by stage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              {t('Lead time by stage')}
            </CardTitle>
            <CardDescription>{t('Average days between status transitions')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={CHART_HEIGHT}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadTimeData}>
                  <defs>
                    <linearGradient id="rptLeadTime" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.45} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={32} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} cursor={{ fill: 'var(--muted)', opacity: 0.35 }} />
                  <Bar dataKey="days" fill="url(#rptLeadTime)" name={t('days')} radius={[4, 4, 0, 0]} isAnimationActive={animate} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </RevealSection>
    </>
  );
}
