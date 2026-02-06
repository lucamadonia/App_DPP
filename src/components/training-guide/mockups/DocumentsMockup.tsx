export function DocumentsMockup() {
  return (
    <div className="p-4">
      <div className="rounded-t-lg bg-slate-800 px-3 py-2 flex items-center gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <div className="ml-3 h-4 flex-1 rounded bg-slate-700 max-w-[180px]" />
      </div>

      <div className="rounded-b-lg bg-slate-50 border border-t-0 border-slate-200 p-3">
        {/* Upload zone */}
        <div className="rounded-lg border-2 border-dashed border-amber-300 bg-amber-50/50 p-3 mb-3 flex flex-col items-center">
          <div className="h-6 w-6 rounded-full bg-amber-200 flex items-center justify-center mb-1">
            <span className="text-amber-600 text-[10px]">&#8593;</span>
          </div>
          <div className="h-1.5 w-20 rounded bg-amber-200 mb-0.5" />
          <div className="h-1 w-14 rounded bg-amber-100" />
        </div>

        {/* Document list */}
        <div className="space-y-1.5">
          {[
            { icon: 'PDF', color: 'bg-red-100 text-red-600', name: 'CE Declaration', category: 'Certificate' },
            { icon: 'PDF', color: 'bg-red-100 text-red-600', name: 'Test Report EN 62...', category: 'Test Report' },
            { icon: 'IMG', color: 'bg-blue-100 text-blue-600', name: 'Product Label', category: 'Label' },
          ].map((doc, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md bg-white px-2 py-1.5 border border-slate-100">
              <div className={`h-6 w-7 rounded text-[6px] font-bold flex items-center justify-center ${doc.color}`}>
                {doc.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[9px] font-medium text-slate-700 truncate">{doc.name}</div>
                <div className="text-[7px] text-slate-400">{doc.category}</div>
              </div>
              <div className="h-3 w-8 rounded-full bg-emerald-100 text-[6px] text-emerald-600 flex items-center justify-center font-medium">
                OK
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
