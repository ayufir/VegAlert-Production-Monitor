const TABS = [
  { key: 'running',   label: 'In Progress', icon: '▶', color: 'text-emerald-600', activeClass: 'bg-emerald-500 text-white border-emerald-500 shadow-sm' },
  { key: 'delayed',   label: 'Delayed',     icon: '⚠', color: 'text-red-500',     activeClass: 'bg-red-500 text-white border-red-500 shadow-sm'     },
  { key: 'completed', label: 'Completed',   icon: '✓', color: 'text-sky-600',     activeClass: 'bg-sky-500 text-white border-sky-500 shadow-sm'     },
]

export default function TabBar({ activeTab, onTabChange, counts = {} }) {
  return (
    <div className="bg-white border-b border-slate-200 sticky top-[104px] sm:top-[120px] z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-1 overflow-x-auto py-3 no-scrollbar">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key
            const count = counts[tab.key] ?? 0
            return (
              <button
                key={tab.key}
                onClick={() => onTabChange?.(tab.key)}
                className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl border text-base font-bold transition-all active:scale-95
                  ${isActive
                    ? tab.activeClass
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                  }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className={`inline-flex items-center justify-center min-w-[24px] h-6 rounded-full text-xs font-black px-2
                    ${isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'}
                  `}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
