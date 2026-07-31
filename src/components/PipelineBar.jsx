// PipelineBar component for stage visualization

const PIPELINE = [
  { key: 'soaking',   label: 'Soaking',   emoji: '🧼', color: 'emerald' },
  { key: 'cleaning',  label: 'Cleaning',  emoji: '🧽', color: 'cyan'    },
  { key: 'cutting',   label: 'Cutting',   emoji: '🔪', color: 'amber'   },
  { key: 'drying',    label: 'Drying',    emoji: '💨', color: 'purple'  },
  { key: 'weighting', label: 'Weighting', emoji: '⚖️', color: 'rose'    },
]

const COLOR_MAP = {
  emerald: { done: 'bg-emerald-500/20 border-emerald-500 text-emerald-400', current: 'bg-emerald-500/30 border-emerald-400 text-emerald-300 shadow-lg shadow-emerald-500/20', idle: 'bg-slate-800 border-slate-700 text-slate-500' },
  cyan:    { done: 'bg-cyan-500/20 border-cyan-500 text-cyan-400',       current: 'bg-cyan-500/30 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/20',       idle: 'bg-slate-800 border-slate-700 text-slate-500' },
  amber:   { done: 'bg-amber-500/20 border-amber-500 text-amber-400',    current: 'bg-amber-500/30 border-amber-400 text-amber-300 shadow-lg shadow-amber-500/20',    idle: 'bg-slate-800 border-slate-700 text-slate-500' },
  purple:  { done: 'bg-purple-500/20 border-purple-500 text-purple-400', current: 'bg-purple-500/30 border-purple-400 text-purple-300 shadow-lg shadow-purple-500/20', idle: 'bg-slate-800 border-slate-700 text-slate-500' },
  rose:    { done: 'bg-rose-500/20 border-rose-500 text-rose-400',       current: 'bg-rose-500/30 border-rose-400 text-rose-300 shadow-lg shadow-rose-500/20',       idle: 'bg-slate-800 border-slate-700 text-slate-500' },
}

export default function PipelineBar({ completedStages = [], currentStage = 'soaking' }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {PIPELINE.map((stg, idx) => {
        const isDone = completedStages.includes(stg.key)
        const isCurrent = !isDone && currentStage === stg.key
        const colors = COLOR_MAP[stg.color]
        const cls = isDone ? colors.done : isCurrent ? colors.current : colors.idle

        return (
          <div key={stg.key} className="flex items-center gap-1">
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-semibold transition-all ${cls}`}>
              <span>{isDone ? '✓' : stg.emoji}</span>
              <span className="hidden sm:inline">{stg.label}</span>
            </div>
            {idx < PIPELINE.length - 1 && (
              <span className="text-slate-700 text-xs">→</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
