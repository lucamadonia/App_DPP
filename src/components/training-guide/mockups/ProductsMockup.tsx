export function ProductsMockup() {
  return (
    <div className="p-4">
      <div className="rounded-t-lg bg-slate-800 px-3 py-2 flex items-center gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <div className="ml-3 h-4 flex-1 rounded bg-slate-700 max-w-[180px]" />
      </div>

      <div className="rounded-b-lg bg-slate-50 border border-t-0 border-slate-200 p-3">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-3">
          <div className="h-3 w-20 rounded bg-slate-200" />
          <div className="h-6 w-20 rounded-md bg-emerald-500 flex items-center justify-center">
            <span className="text-[7px] text-white font-semibold">+ New</span>
          </div>
        </div>

        {/* Product table */}
        <div className="space-y-1.5">
          {/* Header */}
          <div className="grid grid-cols-5 gap-2 px-2 py-1">
            {['Image', 'Name', 'GTIN', 'Status', 'Score'].map((h) => (
              <div key={h} className="text-[7px] font-semibold text-slate-400 uppercase">{h}</div>
            ))}
          </div>
          {/* Rows */}
          {[
            { color: 'bg-blue-100', status: 'bg-emerald-500', score: '92%' },
            { color: 'bg-violet-100', status: 'bg-amber-500', score: '74%' },
            { color: 'bg-emerald-100', status: 'bg-emerald-500', score: '88%' },
          ].map((row, i) => (
            <div key={i} className="grid grid-cols-5 gap-2 rounded-md bg-white px-2 py-1.5 border border-slate-100 items-center">
              <div className={`h-6 w-6 rounded ${row.color}`} />
              <div className="h-2 w-14 rounded bg-slate-200" />
              <div className="h-2 w-16 rounded bg-slate-100 font-mono text-[7px] text-slate-400">49001234...</div>
              <div className={`h-3 w-10 rounded-full ${row.status} opacity-80`} />
              <div className="text-[9px] font-semibold text-slate-600">{row.score}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
