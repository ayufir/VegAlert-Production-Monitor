import { useEffect, useState } from 'react'

function pad(n) {
  return String(Math.floor(n)).padStart(2, '0')
}

export default function Header({ user = {}, onLogout, selectedBatch, batches = [], onBatchChange, selectedDate, onDateChange }) {
  const [now, setNow] = useState(new Date())
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const h = now.getHours()
  const m = now.getMinutes()
  const s = now.getSeconds()
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  const timeStr = `${pad(h12)}:${pad(m)}:${pad(s)}`
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top Row */}
        <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-lg shadow-sm shrink-0">
              🥬
            </div>
            <div className="hidden sm:block">
              <div className="text-slate-900 font-black text-xl tracking-tight leading-none">VegAlert</div>
              <div className="text-slate-400 text-xs font-medium leading-none mt-1">Production Monitor</div>
            </div>
          </div>

          {/* Live badge */}
          <div className="hidden md:flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
            <div className="live-dot w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-emerald-700 text-sm font-bold uppercase tracking-wider">Live</span>
          </div>

          {/* Clock */}
          <div className="text-right hidden sm:block">
            <div className="text-slate-900 font-black text-xl font-mono tracking-tight leading-none flex items-center gap-0.5">
              <span>{pad(h12)}</span>
              <span className="timer-colon text-slate-400">:</span>
              <span>{pad(m)}</span>
              <span className="timer-colon text-slate-400">:</span>
              <span className="text-slate-500 text-lg">{pad(s)}</span>
              <span className="text-sm text-emerald-600 font-bold ml-1">{ampm}</span>
            </div>
            <div className="text-slate-400 text-xs font-medium">{dateStr}</div>
          </div>

          {/* User + Logout */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <div className="w-6 h-6 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-xs font-black text-emerald-700">
                {(user.name || user.email || 'S').charAt(0).toUpperCase()}
              </div>
              <span className="text-slate-700 text-sm font-semibold max-w-[120px] truncate">
                {user.name || user.email || 'Supervisor'}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-500 text-sm font-bold transition-all active:scale-95"
            >
              <span>←</span>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Batch + Date Row */}
        <div className="flex items-center gap-3 pb-3 flex-wrap overflow-x-auto">
          {/* Date picker */}
          <div className="relative shrink-0 flex">
            <label
              htmlFor="hdr-date"
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white transition cursor-pointer"
            >
              📅 <span>{selectedDate || today}</span>
            </label>
            <input
              id="hdr-date"
              type="date"
              value={selectedDate || today}
              max={today}
              onChange={(e) => e.target.value && onDateChange?.(e.target.value)}
              onClick={(e) => {
                try {
                  e.target.showPicker();
                } catch (err) {
                  // Ignore if showPicker is not supported
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          {/* Batch pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider shrink-0">Batch:</span>
            <button
              onClick={() => onBatchChange?.('ALL')}
              className={`shrink-0 px-4 py-2 rounded-lg border text-sm font-bold transition-all ${
                selectedBatch === 'ALL'
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              All
            </button>
            {batches.map((b) => {
              const bid = String(b.id || b._id)
              const label = b.name || b.batch_name || b.batch_number || `#${bid}`
              const slot = b.time_range || b.timeRange || b.slot || ''
              const isActive = selectedBatch === bid
              return (
                <button
                  key={bid}
                  onClick={() => onBatchChange?.(bid)}
                  className={`shrink-0 px-4 py-2 rounded-lg border text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {label}{slot ? ` · ${slot}` : ''}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </header>
  )
}
