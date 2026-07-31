const TABS = [
  { key: 'running',   label: 'In Progress', icon: '▶', activeClass: 'bg-[#0A1A12] text-white shadow-md' },
  { key: 'delayed',   label: 'Delayed',     icon: '⚠', activeClass: 'bg-red-500 text-white shadow-md'     },
  { key: 'completed', label: 'Completed',   icon: '✓', activeClass: 'bg-slate-800 text-white shadow-md'     },
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
                className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95
                  ${isActive
                    ? tab.activeClass
                    : 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className={`inline-flex items-center justify-center min-w-[24px] h-6 rounded-full text-xs font-black px-2
                    ${isActive 
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 text-slate-700'}
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
