export function DPPMockup() {
  return (
    <div className="p-4">
      <div className="rounded-t-lg bg-slate-800 px-3 py-2 flex items-center gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <div className="ml-3 h-4 flex-1 rounded bg-slate-700 max-w-[180px]" />
      </div>

      <div className="rounded-b-lg bg-slate-50 border border-t-0 border-slate-200 p-3">
        {/* Mini DPP card preview */}
        <div className="rounded-lg bg-white border border-slate-200 overflow-hidden">
          {/* Hero */}
          <div className="h-12 bg-gradient-to-r from-violet-500 to-purple-600 relative">
            <div className="absolute inset-0 flex items-center px-3">
              <div className="h-2 w-24 rounded bg-white/40" />
            </div>
          </div>
          {/* Content */}
          <div className="p-2.5 space-y-2">
            <div className="flex gap-2">
              <div className="h-10 w-10 rounded-md bg-violet-100 shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-2.5 w-24 rounded bg-slate-200" />
                <div className="h-2 w-16 rounded bg-slate-100" />
              </div>
            </div>

            {/* QR code mock */}
            <div className="flex items-center gap-2 p-1.5 rounded bg-slate-50 border border-slate-100">
              <div className="h-10 w-10 shrink-0 grid grid-cols-5 grid-rows-5 gap-px p-0.5">
                {Array.from({ length: 25 }).map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-[1px] ${Math.random() > 0.4 ? 'bg-slate-800' : 'bg-transparent'}`}
                  />
                ))}
              </div>
              <div className="space-y-1 flex-1">
                <div className="h-1.5 w-14 rounded bg-slate-200" />
                <div className="h-1.5 w-20 rounded bg-slate-100" />
              </div>
            </div>

            {/* Template pills */}
            <div className="flex gap-1 flex-wrap">
              {['Modern', 'Classic', 'Eco'].map((t, i) => (
                <div
                  key={t}
                  className={`px-2 py-0.5 rounded-full text-[7px] font-medium ${
                    i === 0 ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
