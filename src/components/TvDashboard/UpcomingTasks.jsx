import { classifyDemand, STAGES } from '../VegList'

function formatFutureTime(ms) {
  if (!ms) return '--'
  return new Date(ms).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function UpcomingTasks({ demands = [], activeTimers = [], batchStartMs, now }) {
  if (!batchStartMs || demands.length === 0) return null

  const timerByProductId = new Map()
  activeTimers.forEach((t) => {
    if (t.productId) timerByProductId.set(String(t.productId), t)
    if (t.productName) timerByProductId.set((t.productName || '').toLowerCase().trim(), t)
  })

  let currentStartMs = batchStartMs
  const upcoming = []

  demands.forEach((demand) => {
    const activeTimer = timerByProductId.get(String(demand.product_id))
      || timerByProductId.get((demand.product_name || '').toLowerCase().trim())

    const classification = classifyDemand(demand, currentStartMs, activeTimer || null)

    if (classification.status === 'running' || classification.status === 'pending') {
      const totalMins = Number(demand.total_time_minutes) || 0
      currentStartMs += totalMins * 60 * 1000
    }

    // Add to upcoming if pending, or if running but has next stages
    if (classification.status === 'pending') {
      upcoming.push({
        type: 'start',
        timeMs: classification.activeStage?.startMs,
        name: demand.product_name,
        hindiName: demand.hindi_name,
        image: demand.product_image,
        stage: classification.activeStage,
      })
    } else if (classification.status === 'running') {
      const activeIdx = classification.allStages.findIndex(s => s.key === classification.activeStage?.key)
      if (activeIdx >= 0 && activeIdx < classification.allStages.length - 1) {
        const nextStage = classification.allStages.find((s, idx) => idx > activeIdx && s.durationMins > 0)
        if (nextStage) {
          upcoming.push({
            type: 'transition',
            timeMs: classification.activeStage.endMs,
            name: demand.product_name,
            hindiName: demand.hindi_name,
            image: demand.product_image,
            stage: nextStage,
          })
        }
      }
    }
  })

  // Sort by time
  upcoming.sort((a, b) => a.timeMs - b.timeMs)

  return (
    <div className="bg-[#111827] rounded-3xl overflow-hidden shadow-2xl border border-white/10 h-full flex flex-col">
      <div className="px-6 py-5 bg-[#1F2937] border-b border-white/5">
        <h3 className="text-white font-black text-lg flex items-center gap-2">
          <span className="text-2xl">⏳</span> Upcoming Tasks
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {upcoming.length === 0 ? (
          <div className="text-slate-400 text-center mt-10 font-bold">No upcoming tasks.</div>
        ) : (
          upcoming.slice(0, 8).map((task, idx) => {
            const isTransition = task.type === 'transition'
            const timeDiff = task.timeMs - now
            const isSoon = timeDiff > 0 && timeDiff < 300000 // less than 5 mins
            
            return (
              <div key={idx} className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center gap-4">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isTransition ? 'bg-purple-400' : 'bg-blue-400'} ${isSoon ? 'animate-ping' : ''}`} />
                {task.image ? (
                  <img 
                    src={`${import.meta.env.VITE_API_BASE_URL || 'https://rambhaji.backend.shreenari.com'}${task.image}`} 
                    alt={task.name} 
                    className="w-10 h-10 rounded-full object-cover shadow-sm border border-white/10 shrink-0" 
                  />
                ) : null}
                <div className="flex-1">
                  <div className="text-slate-300 font-bold text-base leading-tight">
                    {isTransition ? 'Transition to ' : 'Start '}<span className="text-white">{task.stage?.label}</span>
                  </div>
                  <div className="text-slate-400 text-sm mt-1">
                    {task.name} {task.hindiName && <span className="text-emerald-400/80 font-medium">({task.hindiName})</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-mono font-bold text-sm ${isSoon ? 'text-amber-400' : 'text-slate-400'}`}>
                    {formatFutureTime(task.timeMs)}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
