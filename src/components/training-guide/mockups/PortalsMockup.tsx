export function PortalsMockup() {
  return (
    <div className="p-4">
      <div className="rounded-t-lg bg-slate-800 px-3 py-2 flex items-center gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <div className="ml-3 h-4 flex-1 rounded bg-slate-700 max-w-[180px]" />
      </div>

      <div className="rounded-b-lg bg-slate-50 border border-t-0 border-slate-200 p-3">
        {/* Two portal cards side-by-side */}
        <div className="grid grid-cols-2 gap-2">
          {/* Customer Portal */}
          <div className="rounded-lg bg-white border border-indigo-200 p-2">
            <div className="flex items-center gap-1 mb-2">
              <div className="h-4 w-4 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-[7px] text-indigo-600">&#9787;</span>
              </div>
              <div className="text-[8px] font-semibold text-indigo-700">Customer</div>
            </div>
            <div className="space-y-1">
              <div className="h-5 rounded bg-indigo-50 flex items-center px-1.5">
                <div className="h-1 w-10 rounded bg-indigo-200" />
              </div>
              <div className="h-5 rounded bg-indigo-50 flex items-center px-1.5">
                <div className="h-1 w-8 rounded bg-indigo-200" />
              </div>
              <div className="h-5 rounded bg-indigo-50 flex items-center px-1.5">
                <div className="h-1 w-12 rounded bg-indigo-200" />
              </div>
            </div>
            <div className="mt-2 h-4 rounded bg-indigo-500 flex items-center justify-center">
              <span className="text-[6px] text-white font-semibold">Login</span>
            </div>
          </div>

          {/* Supplier Portal */}
          <div className="rounded-lg bg-white border border-blue-200 p-2">
            <div className="flex items-center gap-1 mb-2">
              <div className="h-4 w-4 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-[7px] text-blue-600">&#9881;</span>
              </div>
              <div className="text-[8px] font-semibold text-blue-700">Supplier</div>
            </div>
            {/* Wizard steps */}
            <div className="flex items-center gap-0.5 mb-2 px-1">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="flex items-center">
                  <div className={`h-3 w-3 rounded-full flex items-center justify-center text-[5px] font-bold ${
                    n <= 2 ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {n}
                  </div>
                  {n < 4 && <div className={`h-px w-2 ${n < 2 ? 'bg-blue-400' : 'bg-slate-200'}`} />}
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <div className="h-4 rounded bg-blue-50 flex items-center px-1.5">
                <div className="h-1 w-12 rounded bg-blue-200" />
              </div>
              <div className="h-4 rounded bg-blue-50 flex items-center px-1.5">
                <div className="h-1 w-8 rounded bg-blue-200" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
