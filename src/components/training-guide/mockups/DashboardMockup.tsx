export function DashboardMockup() {
  return (
    <div className="p-4">
      {/* Fake browser chrome */}
      <div className="rounded-t-lg bg-slate-800 px-3 py-2 flex items-center gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <div className="ml-3 h-4 flex-1 rounded bg-slate-700 max-w-[180px]" />
      </div>

      <div className="rounded-b-lg bg-slate-50 border border-t-0 border-slate-200 p-3">
        {/* KPI cards row */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: 'Products', value: '24', color: 'bg-blue-500' },
            { label: 'Batches', value: '87', color: 'bg-emerald-500' },
            { label: 'Score', value: '82%', color: 'bg-violet-500' },
            { label: 'Returns', value: '5', color: 'bg-amber-500' },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-lg bg-white p-2 border border-slate-100 shadow-sm">
              <div className={`h-1 w-6 rounded-full ${kpi.color} mb-1.5 opacity-70`} />
              <div className="text-[11px] font-bold text-slate-700">{kpi.value}</div>
              <div className="text-[8px] text-slate-400">{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Mini chart area */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-white p-2 border border-slate-100">
            <div className="h-1.5 w-16 bg-slate-200 rounded mb-2" />
            <svg viewBox="0 0 120 40" className="w-full h-8">
              <polyline
                points="0,35 20,28 40,30 60,18 80,22 100,10 120,14"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <polyline
                points="0,35 20,28 40,30 60,18 80,22 100,10 120,14"
                fill="url(#chartFill)"
                stroke="none"
              />
              <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="rounded-lg bg-white p-2 border border-slate-100">
            <div className="h-1.5 w-12 bg-slate-200 rounded mb-2" />
            <div className="flex items-end gap-1 h-8">
              {[60, 80, 45, 90, 70, 55, 85].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-gradient-to-t from-violet-500 to-violet-400 opacity-70"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
