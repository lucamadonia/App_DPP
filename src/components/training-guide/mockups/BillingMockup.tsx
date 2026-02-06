export function BillingMockup() {
  return (
    <div className="p-4">
      <div className="rounded-t-lg bg-slate-800 px-3 py-2 flex items-center gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <div className="ml-3 h-4 flex-1 rounded bg-slate-700 max-w-[180px]" />
      </div>

      <div className="rounded-b-lg bg-slate-50 border border-t-0 border-slate-200 p-3">
        {/* Plan cards */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {[
            { name: 'Free', price: '€0', active: false },
            { name: 'Pro', price: '€49', active: true },
            { name: 'Enterprise', price: '€149', active: false },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`rounded-lg p-1.5 text-center border ${
                plan.active
                  ? 'bg-gradient-to-b from-pink-50 to-rose-50 border-pink-300 ring-1 ring-pink-200'
                  : 'bg-white border-slate-100'
              }`}
            >
              <div className={`text-[8px] font-bold ${plan.active ? 'text-pink-600' : 'text-slate-600'}`}>
                {plan.name}
              </div>
              <div className={`text-[11px] font-bold ${plan.active ? 'text-pink-700' : 'text-slate-700'}`}>
                {plan.price}
              </div>
              <div className="text-[6px] text-slate-400">/month</div>
            </div>
          ))}
        </div>

        {/* Credits */}
        <div className="rounded-md bg-white p-2 border border-slate-100 mb-2">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[8px] font-semibold text-slate-600">AI Credits</div>
            <div className="text-[9px] font-bold text-pink-600">18/25</div>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100">
            <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-pink-500 to-rose-500" />
          </div>
        </div>

        {/* Modules */}
        <div className="grid grid-cols-2 gap-1">
          {['Returns Hub', 'Supplier Portal', 'Custom Domain', 'Customer Portal'].map((mod) => (
            <div key={mod} className="flex items-center gap-1 rounded bg-white px-1.5 py-1 border border-slate-100">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <div className="text-[7px] text-slate-600">{mod}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
