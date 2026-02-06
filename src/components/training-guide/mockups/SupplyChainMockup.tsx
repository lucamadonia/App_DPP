export function SupplyChainMockup() {
  const steps = [
    { label: 'Raw Material', color: '#3b82f6' },
    { label: 'Manufacturing', color: '#8b5cf6' },
    { label: 'Assembly', color: '#10b981' },
    { label: 'Distribution', color: '#f59e0b' },
  ];

  return (
    <div className="p-4">
      <div className="rounded-t-lg bg-slate-800 px-3 py-2 flex items-center gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <div className="ml-3 h-4 flex-1 rounded bg-slate-700 max-w-[180px]" />
      </div>

      <div className="rounded-b-lg bg-slate-50 border border-t-0 border-slate-200 p-3">
        {/* Supply chain flow */}
        <div className="flex items-center justify-between mb-4 px-1">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[8px] font-bold shadow-sm"
                  style={{ background: step.color }}
                >
                  {i + 1}
                </div>
                <div className="text-[7px] text-slate-500 mt-1 text-center max-w-[50px]">{step.label}</div>
              </div>
              {i < steps.length - 1 && (
                <div className="h-0.5 w-4 sm:w-6 bg-slate-200 mx-0.5 mt-[-12px]" />
              )}
            </div>
          ))}
        </div>

        {/* Mini table */}
        <div className="space-y-1">
          {[
            { from: 'DE', to: 'DE', type: 'Truck', co2: '12kg' },
            { from: 'CN', to: 'DE', type: 'Ship', co2: '340kg' },
          ].map((row, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md bg-white px-2 py-1.5 border border-slate-100 text-[8px]">
              <div className="w-8 text-slate-600 font-medium">{row.from}</div>
              <div className="text-slate-300">&rarr;</div>
              <div className="w-8 text-slate-600 font-medium">{row.to}</div>
              <div className="flex-1 text-slate-400">{row.type}</div>
              <div className="text-emerald-600 font-medium">{row.co2} CO₂</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
