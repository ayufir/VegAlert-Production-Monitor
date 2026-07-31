const METRICS = [
  {
    key: 'running',
    label: 'In Progress',
    icon: '▶',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    valueColor: 'text-emerald-700',
    border: 'border-t-emerald-500',
  },
  {
    key: 'delayed',
    label: 'Delayed',
    icon: '⚠',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    valueColor: 'text-red-700',
    border: 'border-t-red-500',
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: '✓',
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
    valueColor: 'text-sky-700',
    border: 'border-t-sky-500',
  },
]

export default function MetricCards({ running = 0, delayed = 0, completed = 0, onTabChange }) {
  const values = { running, delayed, completed }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-4 sm:px-6 py-4 max-w-7xl mx-auto w-full">
      {METRICS.map((m) => (
        <button
          key={m.key}
          onClick={() => onTabChange?.(m.key)}
          className={`glass-card rounded-2xl p-4 border-t-4 ${m.border} shadow-sm hover:shadow-md transition-all active:scale-[0.97] text-left cursor-pointer`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">{m.label}</span>
            <span className={`w-8 h-8 rounded-lg ${m.iconBg} ${m.iconColor} flex items-center justify-center text-base font-black`}>
              {m.icon}
            </span>
          </div>
          <div className={`text-4xl sm:text-5xl font-black ${m.valueColor} tracking-tight font-mono`}>
            {values[m.key]}
          </div>
        </button>
      ))}
    </div>
  )
}
