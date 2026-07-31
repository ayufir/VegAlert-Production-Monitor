import { useState, useEffect } from 'react'

// ─── Stage configuration ───────────────────────────────────────────────────
export const STAGES = [
  { key: 'soaking',   label: 'Soaking',   emoji: '🧼', color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-200',   dot: 'bg-blue-500'   },
  { key: 'cleaning',  label: 'Cleaning',  emoji: '🧽', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  { key: 'cutting',   label: 'Cutting',   emoji: '🔪', color: 'text-amber-700',  bg: 'bg-amber-50',   border: 'border-amber-200',   dot: 'bg-amber-500'  },
  { key: 'drying',    label: 'Drying',    emoji: '💨', color: 'text-purple-600', bg: 'bg-purple-50',  border: 'border-purple-200',  dot: 'bg-purple-500' },
  { key: 'weighting', label: 'Weighting', emoji: '⚖️', color: 'text-rose-600',   bg: 'bg-rose-50',    border: 'border-rose-200',    dot: 'bg-rose-500'   },
]

// Maps stage key → API field name
export const STAGE_TIME_KEYS = {
  soaking:   'total_soaking_time',
  cleaning:  'total_cleaning_time',
  cutting:   'total_cutting_time',
  drying:    'total_drying_time',
  weighting: 'total_weighting_time',
}

// ─── Build full timeline for a demand anchored to batchStartMs (IST) ────────
export function computeStageTimeline(demand, batchStartMs) {
  const stages = []
  let cursor = batchStartMs

  for (const stg of STAGES) {
    const durationMins = Number(demand[STAGE_TIME_KEYS[stg.key]]) || 0
    const durationMs   = durationMins * 60 * 1000
    stages.push({ ...stg, durationMins, durationMs, startMs: cursor, endMs: cursor + durationMs })
    cursor += durationMs
  }

  return stages
}

// ─── Core classification: IST clock + stage windows + API qty ───────────────
/**
 * Returns { status, activeStage, allStages }
 *
 * Status rules (in priority order):
 *   'completed' → remaining_quantity === 0
 *   'pending'   → no time data  OR  now < first stage start
 *   'running'   → mobile timer active OR within first stage window
 *   'delayed'   → stopped manually (processed > 0 but no active timer) OR past first stage window
 *
 * activeStage is always IST-window-based (drives timer + stage badge).
 */
export function classifyDemand(demand, batchStartMs, activeTimerStage) {
  const processed = Number(demand.processed_qty ?? 0)
  const remaining = Number(demand.remaining_quantity ?? demand.total_demand ?? 0)
  const totalMins = Number(demand.total_time_minutes) || 0

  // 1. Fully completed
  if (remaining === 0) {
    const allStages = computeStageTimeline(demand, batchStartMs)
    const nonZero   = allStages.filter((s) => s.durationMins > 0)
    return { status: 'completed', activeStage: nonZero[nonZero.length - 1] || allStages[0], allStages }
  }

  const allStages = computeStageTimeline(demand, batchStartMs)
  const nonZero   = allStages.filter((s) => s.durationMins > 0)
  const now = Date.now()

  // 2. Fallback for 0-minute tasks: transition to delayed when their time passes
  if (totalMins === 0 || nonZero.length === 0) {
    const scheduledTime = allStages[0].startMs
    if (now >= scheduledTime) {
      return { status: 'delayed', activeStage: allStages[0], allStages }
    } else {
      return { status: 'pending', activeStage: allStages[0], allStages }
    }
  }

  // 3. Mobile-app timer active → trust the timer (worker is on it)
  if (activeTimerStage) {
    const overrideStage = allStages.find((s) => s.key === activeTimerStage.toLowerCase()) || nonZero[0]
    const stageStatus   = now > overrideStage.endMs ? 'delayed' : 'running'
    return { status: stageStatus, activeStage: overrideStage, allStages }
  }

  // 4. No active timer, but partially processed → worker stopped/paused it
  // It should go to Delayed immediately and not bounce back to In Progress.
  if (processed > 0) {
    const active = nonZero.find((s) => now >= s.startMs && now < s.endMs) || nonZero[nonZero.length - 1]
    return { status: 'delayed', activeStage: active, allStages }
  }

  // 5. Not started yet (processed === 0).
  // If time has passed the FIRST stage's deadline, they are delayed.
  if (now >= nonZero[0].endMs) {
    const overdueStage = nonZero.find((s) => now >= s.startMs && now < s.endMs) || nonZero[nonZero.length - 1]
    return { status: 'delayed', activeStage: overdueStage, allStages }
  }

  // 6. Within the first stage window
  const inWindowStage = nonZero.find((s) => now >= s.startMs && now < s.endMs)
  if (inWindowStage) {
    return { status: 'running', activeStage: inWindowStage, allStages }
  }

  // 7. Between stage windows or before first start
  const nextStage = nonZero.find((s) => s.startMs > now)
  return { status: 'pending', activeStage: nextStage || nonZero[0], allStages }
}

// ─── Exported simple status (used by DashboardPage for counts) ──────────────
export function getDemandStatus(demand, batchStartMs, activeTimerStage) {
  return classifyDemand(demand, batchStartMs ?? Date.now(), activeTimerStage).status
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function pad(n) { return String(Math.floor(Math.abs(n))).padStart(2, '0') }

function msToStr(ms) {
  const total = Math.floor(Math.abs(ms) / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

function formatTime(ms) {
  if (!ms) return '--'
  return new Date(ms).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

// ─── Timer: countdown to a real IST endMs ───────────────────────────────────
/**
 * Counts DOWN to `endMs` (real unix ms from batchStartMs + stage durations).
 * Shows "Almost done" pulse below 2 min.
 */
function LiveCountdown({ endMs }) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const diff    = endMs - now
  const isOver  = diff <= 0
  const nearEnd = !isOver && diff < 120_000

  if (isOver) {
    // Should not normally render in 'running' state, but guard anyway
    return (
      <div className="flex flex-col items-end">
        <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Overrun</span>
        <span className="text-red-500 font-black text-lg font-mono tracking-tight leading-none">+{msToStr(diff)}</span>
      </div>
    )
  }
  if (nearEnd) {
    return (
      <div className="flex flex-col items-end">
        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider animate-pulse">Almost done</span>
        <span className="text-amber-600 font-black text-lg font-mono tracking-tight leading-none animate-pulse">{msToStr(diff)}</span>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-end">
      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Remaining</span>
      <span className="text-emerald-700 font-black text-lg font-mono tracking-tight leading-none">{msToStr(diff)}</span>
    </div>
  )
}

// ─── Timer: delay static state ───────────────────────────────────────────────
/**
 * Shows a static stopped state for delayed items instead of a running timer.
 */
function DelayTimer({ processed }) {
  const isStopped = processed > 0
  return (
    <div className="flex flex-col items-end">
      <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">
        {isStopped ? 'Paused' : 'Delayed'}
      </span>
      <span className="text-red-500 font-black text-[17px] font-mono tracking-tight leading-none">
        {isStopped ? 'STOPPED' : 'MISSED'}
      </span>
    </div>
  )
}

// ─── Timer: pending start countdown ─────────────────────────────────────────
function PendingTimer({ startMs }) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const diff = startMs - now
  const inFuture = diff > 0

  return (
    <div className="flex flex-col items-end">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        {inFuture ? 'Starts in' : 'Starts at'}
      </span>
      <span className="text-slate-500 font-bold text-xs font-mono">
        {inFuture ? msToStr(diff) : formatTime(startMs)}
      </span>
    </div>
  )
}

// ─── Veggie emoji lookup ──────────────────────────────────────────────────────
const VEG_EMOJIS = {
  potato: '🥔', onion: '🧅', tomato: '🍅', cucumber: '🥒',
  lemon: '🍋',  garlic: '🧄', ginger: '🫚', coriander: '🌿',
  chilli: '🌶️', spinach: '🥬', carrot: '🥕', cabbage: '🥬',
  cauliflower: '🥦', peas: '🫛', brinjal: '🍆',
}
function getVegEmoji(name = '') {
  const lower = name.toLowerCase()
  return Object.entries(VEG_EMOJIS).find(([k]) => lower.includes(k))?.[1] || '🥗'
}

// ─── Single demand row ────────────────────────────────────────────────────────
function VegRow({ demand, classification, idx }) {
  const { status, activeStage, allStages } = classification

  const isRunning   = status === 'running'
  const isDelayed   = status === 'delayed'
  const isCompleted = status === 'completed'
  const isPending   = status === 'pending'

  const stageInfo = STAGES.find((s) => s.key === activeStage?.key) || STAGES[0]
  const emoji     = getVegEmoji(demand.product_name)

  const processed   = Number(demand.processed_qty ?? 0)
  const total       = Number(demand.total_demand ?? 1)
  const progressPct = total > 0 ? Math.round((processed / total) * 100) : 0

  return (
    <div
      className={[
        'row-enter px-4 sm:px-5 py-4 border-b border-slate-100 transition-colors relative',
        'flex sm:grid sm:grid-cols-[auto_1fr_160px_100px_120px] flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4',
        isDelayed   ? 'bg-red-50/70 hover:bg-red-50'         : '',
        isRunning   ? 'bg-emerald-50/50 hover:bg-emerald-50/90' : '',
        isPending   ? 'bg-white hover:bg-slate-50/70 opacity-70' : '',
        isCompleted ? 'bg-slate-50/60 hover:bg-slate-100/60' : '',
      ].join(' ')}
      style={{ animationDelay: `${idx * 0.04}s` }}
    >
      {/* ── Index + pulse dot ── */}
      <div className="flex flex-col items-center gap-0.5 shrink-0 w-6 sm:w-7 self-start sm:self-auto mt-1 sm:mt-0">
        <span className="text-slate-300 text-xs font-bold tabular-nums">{idx + 1}</span>
        <div className={[
          'w-1.5 h-1.5 rounded-full',
          isDelayed   ? 'bg-red-500'                : '',
          isRunning   ? 'bg-emerald-500 animate-pulse' : '',
          isCompleted ? 'bg-sky-400'                : '',
          isPending   ? 'bg-slate-300'              : '',
        ].join(' ')} />
      </div>

      {/* ── Name + quantity + progress ── */}
      <div className="flex items-start sm:items-center gap-3 flex-1 sm:flex-none min-w-[200px] sm:min-w-0 w-full sm:w-auto">
        <span className="text-2xl sm:text-xl shrink-0 mt-0.5 sm:mt-0">{emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="text-slate-900 font-black text-base sm:text-sm truncate leading-tight">
            {demand.product_name}
          </div>
          <div className="text-slate-500 text-xs font-medium mt-1 flex items-center gap-2 flex-wrap">
            <span>{demand.total_demand} {demand.unit || 'gm'}</span>

            {/* Progress for partially-processed items */}
            {processed > 0 && !isCompleted && (
              <>
                <span className={isRunning ? 'text-emerald-600 font-semibold' : 'text-slate-500 font-semibold'}>
                  • {processed}/{total} gm done
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-14 h-1.5 bg-slate-200 rounded-full overflow-hidden inline-block align-middle">
                    <span
                      className={`h-full rounded-full block transition-all ${isRunning ? 'bg-emerald-500' : 'bg-slate-400'}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </span>
                  <span className={`font-bold ${isRunning ? 'text-emerald-600' : 'text-slate-500'}`}>{progressPct}%</span>
                </span>
              </>
            )}

            {isDelayed && (
              <span className="text-red-500 font-semibold">• Not yet started</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Stage badge ── */}
      <div className="w-1/2 sm:w-auto mt-2 sm:mt-0">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-bold
          ${stageInfo.bg} ${stageInfo.color} ${stageInfo.border}`}>
          <span>{stageInfo.emoji}</span>
          <span>{stageInfo.label}</span>
        </div>
      </div>

      {/* ── Total Time ── */}
      <div className="w-1/3 sm:w-auto mt-2 sm:mt-0 text-left text-slate-700 font-bold text-sm">
        {demand.total_time_minutes > 0 ? (
          <span>
            {Math.floor(demand.total_time_minutes)}<span className="text-xs text-slate-400 font-medium mx-0.5">m</span>
            {Math.round((demand.total_time_minutes % 1) * 60)}<span className="text-xs text-slate-400 font-medium ml-0.5">s</span>
          </span>
        ) : (
          <span className="text-slate-400">--</span>
        )}
      </div>



      {/* ── Timer ── */}
      <div className="absolute sm:relative right-4 top-4 sm:right-auto sm:top-auto text-right">
        {isCompleted && (
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">Done</span>
            <span className="text-sky-500 font-black text-xl leading-none">✓</span>
          </div>
        )}

        {/* Running: countdown to this stage's real endMs */}
        {isRunning && activeStage && (
          <LiveCountdown endMs={activeStage.endMs} />
        )}

        {/* Delayed: show static stopped state */}
        {isDelayed && activeStage && (
          <DelayTimer processed={processed} />
        )}

        {/* Pending: show when it will start */}
        {isPending && activeStage && (
          <div className="flex flex-col sm:items-end gap-2">
            <PendingTimer startMs={activeStage.startMs} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Stage progress bar (mini timeline) ─────────────────────────────────────
function StageMiniBar({ allStages, activeStageKey, status }) {
  const nonZero = allStages.filter((s) => s.durationMins > 0)
  if (nonZero.length === 0) return null

  const now        = Date.now()
  const firstStart = nonZero[0].startMs
  const lastEnd    = nonZero[nonZero.length - 1].endMs
  const span       = lastEnd - firstStart

  return (
    <div className="flex items-center gap-0.5 mt-1">
      {nonZero.map((stg) => {
        const widthPct = span > 0 ? (stg.durationMs / span) * 100 : 20
        const isPast   = now > stg.endMs
        const isActive = stg.key === activeStageKey && status === 'running'
        const stgInfo  = STAGES.find((s) => s.key === stg.key)
        return (
          <div
            key={stg.key}
            className={[
              'h-1 rounded-full transition-all',
              isActive ? `${stgInfo?.dot || 'bg-emerald-500'} animate-pulse` :
              isPast   ? 'bg-slate-300' : 'bg-slate-100',
            ].join(' ')}
            style={{ width: `${widthPct}%` }}
            title={`${stg.label}: ${formatTime(stg.startMs)} – ${formatTime(stg.endMs)}`}
          />
        )
      })}
    </div>
  )
}



// ─── Main VegList ─────────────────────────────────────────────────────────────
export default function VegList({ demands = [], activeTimers = [], batchStartMs, tab = 'running' }) {
  const [now, setNow] = useState(Date.now())

  // Global ticker: Forces the entire list to re-evaluate IST time every second.
  // This is what makes the timers automatically transition from "Pending" to "Running".
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  if (!batchStartMs) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <span className="text-5xl">🕐</span>
        <p className="text-slate-500 font-semibold text-base">Select a batch to view the schedule</p>
        <p className="text-slate-400 text-sm max-w-sm">Choose a batch above to see the vegetable processing timeline</p>
      </div>
    )
  }

  if (demands.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <span className="text-5xl opacity-40">🥗</span>
        <p className="text-slate-500 font-semibold text-base">No demands found for this batch/date</p>
      </div>
    )
  }

  // Build timer lookup (from mobile app active timers)
  const timerByProductId = new Map()
  activeTimers.forEach((t) => {
    if (t.productId) timerByProductId.set(String(t.productId), t)
    if (t.productName) timerByProductId.set((t.productName || '').toLowerCase().trim(), t)
  })

  // Classify every demand using IST real-time vs stage windows
  // Calculate sequentially: each vegetable's schedule starts when the previous one ends
  let currentStartMs = batchStartMs

  const rows = demands.map((demand) => {
    const activeTimer = timerByProductId.get(String(demand.product_id))
      || timerByProductId.get((demand.product_name || '').toLowerCase().trim())

    const classification = classifyDemand(
      demand,
      currentStartMs,
      activeTimer?.processType || null
    )

    // Advance start time for the next item in the queue ONLY if this item is still in the active timeline
    if (classification.status === 'running' || classification.status === 'pending') {
      const totalMins = Number(demand.total_time_minutes) || 0
      currentStartMs += totalMins * 60 * 1000
    }

    return { demand, classification, activeTimer }
  })

  // Filter by active tab
  const filtered = rows.filter(({ classification }) => {
    if (tab === 'running')   return classification.status === 'running' || classification.status === 'pending'
    if (tab === 'delayed')   return classification.status === 'delayed'
    if (tab === 'completed') return classification.status === 'completed'
    return true
  })

  if (filtered.length === 0) {
    const EMPTY = {
      running:   { icon: '▶', msg: 'No vegetables in progress or upcoming right now', sub: 'Items will show here when their scheduled time window is active or upcoming'  },
      delayed:   { icon: '⚠', msg: 'No delayed items — great job! 🎉',      sub: 'All vegetables are on schedule'                              },
      completed: { icon: '✓', msg: 'No completed items yet',                 sub: 'Completed vegetables will appear here'                      },
    }
    const em = EMPTY[tab] || EMPTY.running
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <div className={[
          'w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black',
          tab === 'running'   ? 'bg-emerald-100 text-emerald-600' : '',
          tab === 'delayed'   ? 'bg-red-100 text-red-500'         : '',
          tab === 'completed' ? 'bg-sky-100 text-sky-600'         : '',
        ].join(' ')}>
          {em.icon}
        </div>
        <p className="text-slate-700 font-bold text-base">{em.msg}</p>
        <p className="text-slate-400 text-sm max-w-xs">{em.sub}</p>
      </div>
    )
  }



  // ── All other tabs: standard row list ─────────────────────────────────────
  return (
    <div className="divide-y divide-slate-100">
      {filtered.map(({ demand, classification }, idx) => (
        <VegRow key={demand.product_id || idx} demand={demand} classification={classification} idx={idx} />
      ))}
    </div>
  )
}
