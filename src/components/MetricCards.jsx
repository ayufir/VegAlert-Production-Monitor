const METRICS = [
  {
    key: 'running',
    label: 'In Progress',
    icon: '▶',
    iconBg: 'bg-[#F2FCE3]',
    iconColor: 'text-[#4D7C0F]',
    valueColor: 'text-slate-900',
    border: 'border-t-[#A3D61B]',
    cardBg: 'bg-white',
    labelColor: 'text-slate-500',
  },
  {
    key: 'delayed',
    label: 'Delayed',
    icon: '⚠',
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
    valueColor: 'text-slate-900',
    border: 'border-t-red-500',
    cardBg: 'bg-white',
    labelColor: 'text-slate-500',
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: '✓',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    valueColor: 'text-slate-900',
    border: 'border-t-slate-300',
    cardBg: 'bg-white',
    labelColor: 'text-slate-500',
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
          className={`${m.cardBg} rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-all active:scale-[0.97] text-left cursor-pointer relative overflow-hidden`}
        >
          <div className={`absolute top-0 left-0 w-full h-1 ${m.border}`} />
          <div className="flex items-center justify-between mb-3">
            <span className={`${m.labelColor} text-xs font-bold uppercase tracking-wider`}>{m.label}</span>
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
