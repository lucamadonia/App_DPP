export function SettingsMockup() {
  return (
    <div className="p-4">
      <div className="rounded-t-lg bg-slate-800 px-3 py-2 flex items-center gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <div className="ml-3 h-4 flex-1 rounded bg-slate-700 max-w-[180px]" />
      </div>

      <div className="rounded-b-lg bg-slate-50 border border-t-0 border-slate-200 p-3">
        {/* Tabs */}
        <div className="flex gap-1 mb-3">
          {['Company', 'Branding', 'Users', 'Domain'].map((tab, i) => (
            <div
              key={tab}
              className={`px-2 py-1 rounded text-[7px] font-medium ${
                i === 1 ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {tab}
            </div>
          ))}
        </div>

        {/* Branding preview */}
        <div className="space-y-2">
          {/* Logo upload */}
          <div className="flex items-center gap-2 rounded-md bg-white p-2 border border-slate-100">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
              <span className="text-white text-[8px] font-bold">TB</span>
            </div>
            <div className="flex-1">
              <div className="text-[8px] font-medium text-slate-600">Logo</div>
              <div className="text-[7px] text-slate-400">Upload your brand logo</div>
            </div>
          </div>

          {/* Color picker mock */}
          <div className="rounded-md bg-white p-2 border border-slate-100">
            <div className="text-[8px] font-medium text-slate-600 mb-1">Primary Color</div>
            <div className="flex gap-1">
              {['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#6366f1'].map((c) => (
                <div
                  key={c}
                  className="h-4 w-4 rounded-full border-2 border-white shadow-sm"
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {/* Domain */}
          <div className="rounded-md bg-white p-2 border border-slate-100">
            <div className="text-[8px] font-medium text-slate-600 mb-1">Custom Domain</div>
            <div className="flex items-center gap-1">
              <div className="h-4 flex-1 rounded bg-slate-50 border border-slate-200 px-1 flex items-center">
                <span className="text-[7px] text-slate-400">dpp.your-company.de</span>
              </div>
              <div className="h-4 w-4 rounded bg-emerald-100 flex items-center justify-center">
                <span className="text-[8px] text-emerald-600">&#10003;</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
