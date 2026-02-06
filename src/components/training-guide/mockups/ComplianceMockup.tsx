export function ComplianceMockup() {
  return (
    <div className="p-4">
      <div className="rounded-t-lg bg-slate-800 px-3 py-2 flex items-center gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <div className="ml-3 h-4 flex-1 rounded bg-slate-700 max-w-[180px]" />
      </div>

      <div className="rounded-b-lg bg-slate-50 border border-t-0 border-slate-200 p-3">
        {/* Score gauge */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative h-14 w-14 shrink-0">
            <svg viewBox="0 0 48 48" className="h-full w-full">
              <circle cx="24" cy="24" r="20" fill="none" stroke="#e2e8f0" strokeWidth="4" />
              <circle
                cx="24" cy="24" r="20" fill="none" stroke="#3b82f6" strokeWidth="4"
                strokeLinecap="round" strokeDasharray="126" strokeDashoffset="22"
                transform="rotate(-90 24 24)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-blue-600">
              82%
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-slate-700">AI Compliance Score</div>
            <div className="text-[8px] text-slate-400">3-Phase Analysis</div>
            <div className="mt-1 flex gap-1">
              <div className="h-1.5 w-8 rounded-full bg-emerald-400" />
              <div className="h-1.5 w-8 rounded-full bg-emerald-400" />
              <div className="h-1.5 w-8 rounded-full bg-slate-200" />
            </div>
          </div>
        </div>

        {/* Findings */}
        <div className="space-y-1">
          {[
            { label: 'ESPR 2024/1781', severity: 'bg-emerald-500', text: 'Compliant' },
            { label: 'Battery Regulation', severity: 'bg-amber-500', text: 'Minor gaps' },
            { label: 'CE Marking', severity: 'bg-emerald-500', text: 'Valid' },
            { label: 'REACH/RoHS', severity: 'bg-red-500', text: 'Missing docs' },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md bg-white px-2 py-1 border border-slate-100">
              <div className={`h-2 w-2 rounded-full ${f.severity}`} />
              <div className="flex-1 text-[8px] font-medium text-slate-600">{f.label}</div>
              <div className="text-[7px] text-slate-400">{f.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
