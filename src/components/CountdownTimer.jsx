import { useEffect, useState } from 'react'

function pad(n) {
  return String(Math.floor(n)).padStart(2, '0')
}

function formatMs(ms) {
  const totalSecs = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}

/**
 * A live countdown or delay timer that ticks every second in the browser.
 * @param {number} endedAt   - Unix ms timestamp when timer should end
 * @param {boolean} isDelayed - If true, shows elapsed delay time instead of countdown
 */
export default function CountdownTimer({ endedAt, isDelayed }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const remaining = endedAt - now
  const delay = now - endedAt

  if (isDelayed) {
    return (
      <div className="flex flex-col items-center justify-center bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 min-w-[120px]">
        <span className="text-red-400 text-xs font-bold uppercase tracking-wider mb-1">🚨 Delay</span>
        <span className="text-red-400 font-black text-xl font-mono tracking-widest">+{formatMs(delay)}</span>
      </div>
    )
  }

  const nearCompletion = remaining <= 120000 && remaining > 0

  return (
    <div className={`flex flex-col items-center justify-center rounded-xl px-4 py-3 min-w-[120px] border ${
      nearCompletion
        ? 'bg-amber-500/10 border-amber-500/30'
        : 'bg-emerald-500/10 border-emerald-500/30'
    }`}>
      <span className={`text-xs font-bold uppercase tracking-wider mb-1 ${nearCompletion ? 'text-amber-400' : 'text-emerald-400'}`}>
        ⏳ Remaining
      </span>
      <span className={`font-black text-xl font-mono tracking-widest ${nearCompletion ? 'text-amber-300' : 'text-emerald-300'}`}>
        {formatMs(remaining)}
      </span>
    </div>
  )
}
