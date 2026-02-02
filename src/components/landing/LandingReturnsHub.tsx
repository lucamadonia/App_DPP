import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { RotateCcw, MessageSquare, Globe } from 'lucide-react';

type TabKey = 'returns' | 'tickets' | 'portal';

const tabConfig: { key: TabKey; icon: typeof RotateCcw; color: string }[] = [
  { key: 'returns', icon: RotateCcw, color: 'text-rose-400' },
  { key: 'tickets', icon: MessageSquare, color: 'text-blue-400' },
  { key: 'portal', icon: Globe, color: 'text-emerald-400' },
];

export function LandingReturnsHub() {
  const { t } = useTranslation('landing');
  const { ref, isVisible } = useScrollReveal();
  const [activeTab, setActiveTab] = useState<TabKey>('returns');

  return (
    <section id="returns" className="py-24 bg-slate-900 text-white">
      <div ref={ref} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-12 ${isVisible ? 'animate-landing-reveal' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl sm:text-4xl font-bold">
            {t('returnsHub.title')}
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            {t('returnsHub.subtitle')}
          </p>
        </div>

        {/* Tab Buttons */}
        <div className={`flex justify-center gap-2 mb-8 ${isVisible ? 'animate-landing-reveal [animation-delay:0.2s]' : 'opacity-0'}`}>
          {tabConfig.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-slate-900 shadow-lg'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              <tab.icon className={`h-4 w-4 ${activeTab === tab.key ? 'text-slate-700' : tab.color}`} />
              {t(`returnsHub.tab.${tab.key}`)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className={`rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden max-w-4xl mx-auto ${
          isVisible ? 'animate-landing-reveal [animation-delay:0.4s]' : 'opacity-0'
        }`}>
          {/* Toolbar */}
          <div className="flex items-center gap-1.5 border-b border-slate-700 px-4 py-2.5 bg-slate-800">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
            <span className="ml-3 text-xs text-slate-500">{t(`returnsHub.tab.${activeTab}`)}</span>
          </div>

          <div className="p-5 min-h-[320px]">
            {activeTab === 'returns' && <ReturnsTab t={t} />}
            {activeTab === 'tickets' && <TicketsTab t={t} />}
            {activeTab === 'portal' && <PortalTab t={t} />}
          </div>
        </div>
      </div>
    </section>
  );
}

function ReturnsTab({ t }: { t: (key: string) => string }) {
  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { key: 'open', value: '24', color: 'text-rose-400' },
          { key: 'today', value: '7', color: 'text-blue-400' },
          { key: 'avgDays', value: '3.2d', color: 'text-amber-400' },
          { key: 'rate', value: '4.8%', color: 'text-emerald-400' },
        ].map((kpi) => (
          <div key={kpi.key} className="rounded-xl bg-slate-900 border border-slate-700 p-3 text-center">
            <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{t(`returnsHub.returns.kpi.${kpi.key}`)}</p>
          </div>
        ))}
      </div>

      {/* Mini Bar Chart */}
      <div className="rounded-xl bg-slate-900 border border-slate-700 p-3">
        <div className="flex items-end justify-between h-16 gap-2">
          {[40, 65, 80, 55, 70, 90, 45].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t bg-gradient-to-t from-blue-500 to-violet-500" style={{ height: `${h}%` }} />
              <span className="text-[8px] text-slate-600">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Returns Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-700 overflow-hidden">
        {[
          { id: 'RET-041', status: 'Approved', statusColor: 'bg-emerald-500/20 text-emerald-400', customer: 'Sarah M.', date: '31.01.2026', amount: '€89.90' },
          { id: 'RET-040', status: 'Shipped', statusColor: 'bg-blue-500/20 text-blue-400', customer: 'Thomas K.', date: '30.01.2026', amount: '€145.00' },
          { id: 'RET-039', status: 'Inspection', statusColor: 'bg-amber-500/20 text-amber-400', customer: 'Lisa W.', date: '29.01.2026', amount: '€67.50' },
          { id: 'RET-038', status: 'Completed', statusColor: 'bg-slate-500/20 text-slate-400', customer: 'Max B.', date: '28.01.2026', amount: '€234.00' },
          { id: 'RET-037', status: 'Refunded', statusColor: 'bg-violet-500/20 text-violet-400', customer: 'Anna S.', date: '27.01.2026', amount: '€56.80' },
        ].map((row) => (
          <div key={row.id} className="flex items-center gap-4 px-4 py-2.5 border-t border-slate-800 first:border-t-0">
            <span className="text-xs font-mono text-slate-400 w-16">{row.id}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${row.statusColor}`}>{row.status}</span>
            <span className="text-xs text-slate-300 flex-1">{row.customer}</span>
            <span className="text-xs text-slate-500">{row.date}</span>
            <span className="text-xs font-medium text-slate-300 w-16 text-right">{row.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TicketsTab({ t }: { t: (key: string) => string }) {
  const columns: { key: string; cards: { title: string; priority: string; priorityColor: string; sla: number }[] }[] = [
    {
      key: 'open',
      cards: [
        { title: 'Wrong size received', priority: 'High', priorityColor: 'bg-red-500', sla: 30 },
        { title: 'Missing item in order', priority: 'Normal', priorityColor: 'bg-blue-500', sla: 65 },
      ],
    },
    {
      key: 'inProgress',
      cards: [
        { title: 'Refund not received', priority: 'Urgent', priorityColor: 'bg-red-600', sla: 15 },
        { title: 'Damaged packaging', priority: 'Normal', priorityColor: 'bg-blue-500', sla: 80 },
        { title: 'Exchange request', priority: 'Low', priorityColor: 'bg-slate-400', sla: 90 },
      ],
    },
    {
      key: 'waiting',
      cards: [
        { title: 'Customer photo pending', priority: 'Normal', priorityColor: 'bg-blue-500', sla: 45 },
      ],
    },
    {
      key: 'resolved',
      cards: [
        { title: 'Color mismatch', priority: 'Low', priorityColor: 'bg-slate-400', sla: 100 },
        { title: 'Delivery delay', priority: 'Normal', priorityColor: 'bg-blue-500', sla: 100 },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {columns.map((col) => (
        <div key={col.key}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">{t(`returnsHub.tickets.col.${col.key}`)}</span>
            <span className="text-[10px] text-slate-600 bg-slate-700 rounded-full px-1.5">{col.cards.length}</span>
          </div>
          <div className="space-y-2">
            {col.cards.map((card, i) => (
              <div key={i} className="rounded-lg bg-slate-900 border border-slate-700 p-2.5">
                <p className="text-[11px] font-medium text-slate-200 mb-2 leading-tight">{card.title}</p>
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${card.priorityColor}`} />
                  <span className="text-[9px] text-slate-500">{card.priority}</span>
                </div>
                <div className="mt-2 h-1 w-full rounded-full bg-slate-800">
                  <div
                    className={`h-1 rounded-full ${card.sla > 60 ? 'bg-emerald-500' : card.sla > 30 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${card.sla}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PortalTab({ t }: { t: (key: string) => string }) {
  return (
    <div className="max-w-md mx-auto">
      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-6">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center">
            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-medium ${
              i < 2 ? 'bg-emerald-500 text-white' : i === 2 ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-500'
            }`}>
              {i < 2 ? '✓' : i + 1}
            </div>
            {i < 6 && <div className={`h-0.5 w-4 sm:w-6 ${i < 2 ? 'bg-emerald-500' : 'bg-slate-700'}`} />}
          </div>
        ))}
      </div>

      <p className="text-xs font-medium text-slate-400 mb-3">
        Step 3: {t('returnsHub.portal.selectItems')}
      </p>

      {/* Product Cards */}
      <div className="space-y-2">
        {[
          { name: 'Cotton T-Shirt (L)', sku: 'TS-001-L', selected: true },
          { name: 'Denim Jacket (M)', sku: 'DJ-002-M', selected: false },
          { name: 'Wool Sweater (S)', sku: 'WS-003-S', selected: true },
        ].map((item) => (
          <div key={item.sku} className={`rounded-xl border p-3 flex items-center gap-3 transition-all ${
            item.selected ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-900'
          }`}>
            <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
              item.selected ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
            }`}>
              {item.selected && (
                <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="h-8 w-8 rounded-lg bg-slate-700" />
            <div className="flex-1">
              <p className="text-xs font-medium text-slate-200">{item.name}</p>
              <p className="text-[10px] text-slate-500">{item.sku}</p>
            </div>
            <span className="text-[10px] text-slate-500">Qty: 1</span>
          </div>
        ))}
      </div>

      {/* Next Button */}
      <button className="mt-4 w-full rounded-xl bg-blue-500 py-2.5 text-sm font-semibold text-white">
        {t('returnsHub.portal.next')}
      </button>
    </div>
  );
}
