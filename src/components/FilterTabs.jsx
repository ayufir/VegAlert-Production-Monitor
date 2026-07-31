const TABS = [
  { key: 'running',   label: '▶ Running',        activeClass: 'bg-white text-black font-black border-white shadow-sm' },
  { key: 'delayed',   label: '🚨 Delayed',        activeClass: 'bg-red-500 text-white font-black border-red-500 shadow-sm shadow-red-500/20' },
  { key: 'completed', label: '✅ Completed Today', activeClass: 'bg-sky-500 text-white font-black border-sky-500 shadow-sm shadow-sky-500/20' },
]

const STAGE_FILTERS = [
  { key: 'ALL',       label: 'All Stages' },
  { key: 'soaking',   label: '🧼 Soaking'   },
  { key: 'cleaning',  label: '🧽 Cleaning'  },
  { key: 'cutting',   label: '🔪 Cutting'   },
  { key: 'drying',    label: '💨 Drying'    },
  { key: 'weighting', label: '⚖️ Weighting' },
]

export default function FilterTabs({ activeTab, setActiveTab, stageFilter, setStageFilter, search, setSearch }) {
  return (
    <div className="px-6 pt-4 flex flex-col gap-3">
      {/* Main Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 px-4 py-2 rounded-xl border text-xs tracking-wide uppercase transition-all duration-200 ${
                  isActive
                    ? tab.activeClass
                    : 'bg-neutral-900/90 border-neutral-800 text-neutral-400 font-bold hover:text-white hover:border-neutral-700'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Search Input */}
        <div className="relative shrink-0 sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, batch, worker..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-white text-xs font-medium placeholder-neutral-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition"
          />
          <span className="absolute left-3 top-2.5 text-neutral-500 text-xs">🔍</span>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-2 text-neutral-500 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Stage Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-neutral-500 text-[11px] font-bold uppercase tracking-wider mr-1">Filter:</span>
        {STAGE_FILTERS.map((stg) => {
          const isActive = stageFilter === stg.key
          return (
            <button
              key={stg.key}
              onClick={() => setStageFilter(stg.key)}
              className={`shrink-0 px-3 py-1 rounded-lg border text-xs font-semibold transition ${
                isActive
                  ? 'bg-neutral-800 border-neutral-600 text-white font-bold'
                  : 'bg-neutral-950 border-neutral-900 text-neutral-400 hover:text-neutral-200 hover:border-neutral-800'
              }`}
            >
              {stg.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
