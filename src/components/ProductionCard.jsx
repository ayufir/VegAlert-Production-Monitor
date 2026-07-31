import PipelineBar from './PipelineBar'
import CountdownTimer from './CountdownTimer'

function formatTime(ts) {
  if (!ts) return 'N/A'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return 'N/A'
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ProductionCard({ item, isCompleted, demand, onCancel }) {
  const now = Date.now()
  const startedAt = item.startedAt || now
  const durationMs = (item.durationSeconds || 300) * 1000
  const expectedExit = item.endedAt || (startedAt + durationMs)
  const isDelayed = !isCompleted && now > expectedExit

  const processType = (item.processType || item.process_type || 'soaking').toLowerCase()
  const completedStages = Array.isArray(item.completedStages) ? item.completedStages : []

  const demandedQty = demand ? (demand.total_demand ?? demand.total_quantity ?? demand.quantity) : null
  const processedQty = demand ? (demand.processed_qty ?? 0) : 0
  const remainingQty = demandedQty != null ? Math.max(0, Number(demandedQty) - processedQty) : null

  let borderColor = 'border-neutral-800'
  let glowColor = 'bg-emerald-500'
  let badgeClass = 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
  let badgeLabel = '▶ RUNNING'

  if (isCompleted) {
    borderColor = 'border-sky-500/30'
    glowColor = 'bg-sky-500'
    badgeClass = 'bg-sky-500/20 border-sky-500/40 text-sky-400'
    badgeLabel = '✅ COMPLETED'
  } else if (isDelayed) {
    borderColor = 'border-red-500/40'
    glowColor = 'bg-red-500'
    badgeClass = 'bg-red-500/20 border-red-500/40 text-red-400'
    badgeLabel = '🚨 DELAYED'
  } else if ((expectedExit - now) < 120000) {
    borderColor = 'border-amber-500/40'
    glowColor = 'bg-amber-400'
    badgeClass = 'bg-amber-500/20 border-amber-500/40 text-amber-400'
    badgeLabel = '⏳ NEAR DONE'
  }

  return (
    <div className={`card-enter relative bg-neutral-950 border ${borderColor} rounded-2xl overflow-hidden shadow-lg`}>
      <div className={`h-0.5 w-full ${glowColor}`} />

      <div className="p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-2xl p-1.5 rounded-xl bg-neutral-900 border border-neutral-800 shrink-0">{item.emoji || '🥗'}</div>
            <div className="min-w-0">
              <div className="text-white font-black text-sm leading-tight truncate">
                {item.productName || item.name || 'Production Item'}
              </div>
              <div className="text-neutral-400 text-xs mt-0.5 truncate font-medium">
                Batch #{item.batchId || item.batch_id || 'ALL'} &nbsp;•&nbsp;
                <span className="text-emerald-400 font-semibold">{item.processedQty || item.quantity || '—'} {item.unit || 'gm'}</span>
              </div>
            </div>
          </div>
          <div className={`shrink-0 px-2.5 py-1 rounded-xl border text-[10px] font-black uppercase tracking-wider ${badgeClass}`}>
            {badgeLabel}
          </div>
        </div>

        {/* Pipeline Bar */}
        <PipelineBar completedStages={completedStages} currentStage={processType} />

        {/* Demand Progress Bar */}
        {demandedQty != null && (
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-neutral-400 font-medium">
                Demand: <span className="text-emerald-400 font-bold">{processedQty}</span> / {demandedQty} {demand?.unit || 'gm'}
              </span>
              {remainingQty != null && (
                <span className="text-neutral-400">⏳ {remainingQty} {demand?.unit || 'gm'} left</span>
              )}
            </div>
            <div className="h-1.5 rounded-full bg-neutral-900 overflow-hidden border border-neutral-800">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (processedQty / Number(demandedQty)) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Data Grid */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-2">
            <div className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">Worker</div>
            <div className="text-white font-semibold truncate">👷 {item.employeeName || item.workerName || 'Worker'}</div>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-2">
            <div className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">Entry</div>
            <div className="text-neutral-200 font-mono font-medium">{formatTime(startedAt)}</div>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-2">
            <div className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">Expected Exit</div>
            <div className="text-neutral-200 font-mono font-medium">{formatTime(expectedExit)}</div>
          </div>
        </div>

        {/* Countdown */}
        {!isCompleted && (
          <div className="flex justify-center">
            <CountdownTimer endedAt={expectedExit} isDelayed={isDelayed} />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between flex-wrap gap-1 pt-2 border-t border-neutral-900">
          <span className="text-neutral-400 text-xs font-semibold">
            ⏱️ <span className="text-white uppercase font-bold">{item.processName || processType}</span>
            {' '}({Math.round(durationMs / 60000)}m)
          </span>

          <div className="flex items-center gap-2">
            {item.finalWeight ? (
              <span className="text-emerald-400 text-xs font-bold">
                ⚖️ {item.finalWeight} {item.unit || 'gm'}
              </span>
            ) : null}

            {onCancel && (
              <button
                onClick={() => onCancel(item.id || item._id)}
                className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-red-500/20 border border-neutral-800 hover:border-red-500/40 text-neutral-400 hover:text-red-400 text-xs font-bold transition"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
