export function ReturnsHubMockup() {
  return (
    <div className="p-4">
      <div className="rounded-t-lg bg-slate-800 px-3 py-2 flex items-center gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <div className="ml-3 h-4 flex-1 rounded bg-slate-700 max-w-[180px]" />
      </div>

      <div className="rounded-b-lg bg-slate-50 border border-t-0 border-slate-200 p-3">
        {/* KPI row */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {[
            { label: 'Open', value: '12', color: 'text-rose-600' },
            { label: 'Today', value: '3', color: 'text-blue-600' },
            { label: 'Avg Days', value: '2.4', color: 'text-emerald-600' },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-md bg-white p-1.5 border border-slate-100 text-center">
              <div className={`text-[11px] font-bold ${kpi.color}`}>{kpi.value}</div>
              <div className="text-[7px] text-slate-400">{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Return items */}
        <div className="space-y-1.5">
          {[
            { num: 'RET-20260201-A3K', status: 'Approved', statusColor: 'bg-emerald-100 text-emerald-700' },
            { num: 'RET-20260201-B7M', status: 'Pending', statusColor: 'bg-amber-100 text-amber-700' },
            { num: 'RET-20260131-C2X', status: 'Shipped', statusColor: 'bg-blue-100 text-blue-700' },
          ].map((ret) => (
            <div key={ret.num} className="flex items-center gap-2 rounded-md bg-white px-2 py-1.5 border border-slate-100">
              <div className="h-5 w-5 rounded bg-rose-100 flex items-center justify-center">
                <span className="text-[8px] text-rose-500">&#8634;</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[8px] font-mono font-medium text-slate-600 truncate">{ret.num}</div>
              </div>
              <div className={`px-1.5 py-0.5 rounded-full text-[6px] font-semibold ${ret.statusColor}`}>
                {ret.status}
              </div>
            </div>
          ))}
        </div>

        {/* Mini ticket area */}
        <div className="mt-2 rounded-md bg-white p-2 border border-slate-100">
          <div className="flex items-center gap-1 mb-1">
            <div className="h-2 w-2 rounded-full bg-violet-400" />
            <div className="text-[7px] font-semibold text-slate-600">Ticket Queue</div>
          </div>
          <div className="flex gap-1">
            {['Open', 'In Progress', 'Waiting'].map((s) => (
              <div key={s} className="flex-1 rounded bg-slate-50 p-1 text-center">
                <div className="text-[9px] font-bold text-slate-700">{Math.floor(Math.random() * 8 + 1)}</div>
                <div className="text-[6px] text-slate-400">{s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
