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

// ─── Old Logic Retained for Backward Compatibility (TvDashboardPage) ────────
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

export function classifyDemand(demand, batchStartMs, activeTimer) {
  const processed = Number(demand.processed_qty ?? 0)
  const remaining = Number(demand.remaining_quantity ?? demand.total_demand ?? 0)
  const totalMins = Number(demand.total_time_minutes) || 0

  if (remaining === 0) {
    const allStages = computeStageTimeline(demand, batchStartMs)
    const nonZero   = allStages.filter((s) => s.durationMins > 0)
    return { status: 'completed', activeStage: nonZero[nonZero.length - 1] || allStages[0], allStages }
  }

  const allStages = computeStageTimeline(demand, batchStartMs)
  const nonZero   = allStages.filter((s) => s.durationMins > 0)
  const now = Date.now()

  if (totalMins === 0 || nonZero.length === 0) {
    const scheduledTime = allStages[0].startMs
    if (now >= scheduledTime) return { status: 'delayed', activeStage: allStages[0], allStages }
    else return { status: 'pending', activeStage: allStages[0], allStages }
  }

  if (activeTimer) {
    const processType = activeTimer.processType || ''
    const overrideStage = allStages.find((s) => s.key === processType.toLowerCase()) || nonZero[0]
    if (activeTimer.startedAt && activeTimer.endedAt) {
      overrideStage.startMs = activeTimer.startedAt
      overrideStage.endMs = activeTimer.endedAt
      overrideStage.durationMs = activeTimer.endedAt - activeTimer.startedAt
      overrideStage.durationMins = overrideStage.durationMs / 60000
    }
    const stageStatus = now > overrideStage.endMs ? 'delayed' : 'running'
    return { status: stageStatus, activeStage: overrideStage, allStages }
  }

  if (processed > 0) {
    const active = nonZero.find((s) => now >= s.startMs && now < s.endMs) || nonZero[nonZero.length - 1]
    return { status: 'delayed', activeStage: active, allStages }
  }

  if (now >= nonZero[0].endMs) {
    const overdueStage = nonZero.find((s) => now >= s.startMs && now < s.endMs) || nonZero[nonZero.length - 1]
    return { status: 'delayed', activeStage: overdueStage, allStages }
  }

  const nextStage = nonZero.find((s) => s.startMs > now)
  return { status: 'pending', activeStage: nextStage || nonZero[0], allStages }
}

export function getDemandStatus(demand, batchStartMs, activeTimer) {
  return classifyDemand(demand, batchStartMs ?? Date.now(), activeTimer).status
}
// ─────────────────────────────────────────────────────────────────────────────

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

function formatExpectedTime(mins) {
  const num = Number(mins) || 0
  if (num <= 0) return '0s'
  const totalSecs = Math.round(num * 60)
  const m = Math.floor(totalSecs / 60)
  const s = totalSecs % 60
  if (m > 0 && s > 0) return `${m}m ${s}s`
  if (m > 0) return `${m}m`
  return `${s}s`
}

function LiveCountdown({ startMs, expectedMs = 0 }) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // If expectedMs is not provided or 0, fallback to 5 mins (300,000 ms)
  const targetDurationMs = expectedMs > 0 ? expectedMs : 5 * 60 * 1000
  const targetEndMs = startMs + targetDurationMs
  const remainingMs = targetEndMs - now
  const isOverTime = remainingMs <= 0
  const nearCompletion = remainingMs > 0 && remainingMs <= 120000

  if (isOverTime) {
    const overTimeMs = Math.abs(remainingMs)
    return (
      <div className="flex flex-col items-end">
        <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider animate-pulse flex items-center gap-1">
          <span>🚨</span> Overtime
        </span>
        <span className="text-red-500 font-black text-lg font-mono tracking-tight leading-none animate-pulse">
          +{msToStr(overTimeMs)}
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end">
      <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
        nearCompletion ? 'text-amber-600' : 'text-emerald-600'
      }`}>
        <span>{nearCompletion ? '⚡' : '⏳'}</span>
        {nearCompletion ? 'Near End' : 'Remaining'}
      </span>
      <span className={`font-black text-lg font-mono tracking-tight leading-none ${
        nearCompletion ? 'text-amber-600' : 'text-emerald-600'
      }`}>
        {msToStr(remainingMs)}
      </span>
    </div>
  )
}

function VegRow({ log, idx }) {
  const isRunning = log.start_time && !log.end_time
  const isCompleted = !!log.end_time

  const stageInfo = STAGES.find((s) => s.key === log.process_type) || STAGES[0]
  const emoji = getVegEmoji(log.product_name)

  const processed = Number(log.processed_qty_gm ?? 0)
  
  const expectedMins = Number(log.expected_time_taken_minutes) || Number(log.duration_minutes) || (log.duration_seconds ? Math.round(log.duration_seconds / 60) : 0) || 0
  const expectedMs = expectedMins > 0 ? expectedMins * 60 * 1000 : 5 * 60 * 1000

  const actualMins = Number(log.time_taken_minutes) || 0

  // Check if task was cancelled/stopped mid-way before full expected duration
  const isCancelled =
    log.status === 'cancelled' ||
    log.status === 'stopped' ||
    log.status === 'aborted' ||
    log.is_cancelled === true ||
    log.type === 'cancel' ||
    Boolean(isCompleted && expectedMins > 0.15 && actualMins < (expectedMins * 0.85))

  return (
    <div
      className={[
        'row-enter px-4 sm:px-5 py-4 border-b border-slate-100 transition-colors relative',
        'flex sm:grid sm:grid-cols-[1fr_160px_100px_120px] flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4',
        isRunning   ? 'bg-blue-50/50 hover:bg-blue-50' : '',
        isCancelled ? 'bg-rose-50/30 hover:bg-rose-50/60' : (isCompleted ? 'bg-slate-50/60 hover:bg-slate-100/60' : ''),
      ].join(' ')}
      style={{ animationDelay: `${idx * 0.04}s` }}
    >
      {/* ── Name + quantity ── */}
      <div className="flex items-start sm:items-center gap-3 flex-1 sm:flex-none min-w-[200px] sm:min-w-0 w-full sm:w-auto">
        {log.image_url ? (
          <img 
            src={`${import.meta.env.VITE_API_BASE_URL || 'https://rambhaji.backend.shreenari.com'}${log.image_url}`} 
            alt={log.product_name} 
            className="w-10 h-10 rounded-full object-cover shrink-0 mt-0.5 sm:mt-0" 
          />
        ) : (
          <span className="text-2xl sm:text-xl shrink-0 mt-0.5 sm:mt-0">{emoji}</span>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-slate-900 font-black text-base sm:text-sm truncate leading-tight">
            {log.product_name}
            {log.hindi_name && <span className="text-emerald-600 text-sm font-semibold ml-1.5">({log.hindi_name})</span>}
          </div>
          <div className="text-slate-500 text-xs font-medium mt-1 flex items-center gap-2 flex-wrap">
            <span>{processed} {log.unit || 'gm'} processed</span>
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
        {isCompleted ? (
          <div className="flex flex-col">
            <span className={isCancelled ? "text-rose-600 font-bold" : ""}>
              {Math.floor(actualMins)}<span className="text-xs text-slate-400 font-medium mx-0.5">m</span>
              {Math.round((actualMins % 1) * 60)}<span className="text-xs text-slate-400 font-medium ml-0.5">s</span>
              {isCancelled && <span className="text-[10px] text-rose-500 font-semibold ml-1.5">(Stopped)</span>}
            </span>
            <span className="text-[10px] text-slate-400 font-medium leading-none mt-1">Expected: {formatExpectedTime(expectedMins)}</span>
          </div>
        ) : (
          <div className="flex flex-col">
              <span className="text-slate-400">Running...</span>
              <span className="text-[10px] text-slate-400 font-medium leading-none mt-1">Expected: {formatExpectedTime(expectedMins)}</span>
          </div>
        )}
      </div>

      {/* ── Timer ── */}
      <div className="absolute sm:relative right-4 top-4 sm:right-auto sm:top-auto text-right">
        {isCancelled ? (
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
              Cancelled
            </span>
            <span className="text-slate-500 font-bold text-xs mt-1">
              At {formatTime(new Date(log.end_time).getTime())}
            </span>
          </div>
        ) : isCompleted ? (
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-sky-600 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
              Completed
            </span>
            <span className="text-slate-500 font-bold text-xs mt-1">
              At {formatTime(new Date(log.end_time).getTime())}
            </span>
          </div>
        ) : isRunning ? (
          <LiveCountdown startMs={new Date(log.start_time).getTime()} expectedMs={expectedMs} />
        ) : (
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Waiting</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function VegList({ logs = [], tab = 'soaking', statusFilter = 'ALL' }) {
  
  if (logs.length === 0 && statusFilter === 'ALL') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <span className="text-5xl opacity-40">🥗</span>
        <p className="text-slate-500 font-semibold text-base">No processing logs found for this batch/date</p>
      </div>
    )
  }

  // Filter logs by tab (stage) and status
  const filtered = logs.filter(log => {
    // Stage check
    if (log.process_type !== tab) return false
    
    // Status check
    if (statusFilter !== 'ALL') {
      const isRunning = log.start_time && !log.end_time
      const isCompleted = !!log.end_time
      if (statusFilter === 'running' && !isRunning) return false
      if (statusFilter === 'completed' && !isCompleted) return false
      // For now, if the status filter is 'delayed' or 'pending', we may filter them out entirely,
      // because processing-logs don't naturally map to these old statuses.
      if (statusFilter === 'delayed' || statusFilter === 'pending') return false 
    }
    
    return true
  })

  if (filtered.length === 0) {
    if (statusFilter !== 'ALL') {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl bg-slate-50 border border-slate-100">
            {statusFilter === 'running' ? '⚙️' : statusFilter === 'delayed' ? '⚠️' : '📋'}
          </div>
          <p className="text-slate-700 font-bold text-base">No {statusFilter} logs right now</p>
        </div>
      )
    }

    const EMPTY = {
      soaking:   { icon: '🧼', msg: 'No vegetables in Soaking stage right now' },
      cleaning:  { icon: '🧽', msg: 'No vegetables in Cleaning stage right now' },
      cutting:   { icon: '🔪', msg: 'No vegetables in Cutting stage right now' },
      drying:    { icon: '💨', msg: 'No vegetables in Drying stage right now' },
      weighting: { icon: '⚖️', msg: 'No vegetables in Weighting stage right now' },
    }
    const em = EMPTY[tab] || { icon: '📋', msg: 'No vegetables in this stage right now' }
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl bg-slate-50 border border-slate-100">
          {em.icon}
        </div>
        <p className="text-slate-700 font-bold text-base">{em.msg}</p>
        <p className="text-slate-400 text-sm max-w-xs">Processing logs will appear here when they reach this stage</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-slate-100">
      {filtered.map((log, idx) => (
        <VegRow key={log.id || idx} log={log} idx={idx} />
      ))}
    </div>
  )
}
