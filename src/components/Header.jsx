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
    <header className="bg-[#0A1A12] shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top Row */}
        <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[#A3D61B] flex items-center justify-center text-lg shadow-sm shrink-0">
              🥬
            </div>
            <div className="hidden sm:block">
              <div className="text-white font-black text-xl tracking-tight leading-none">VegAlert</div>
              <div className="text-[#A3D61B] text-xs font-bold leading-none mt-1">Production Monitor</div>
            </div>
          </div>

          {/* Live badge */}
          <div className="hidden md:flex items-center gap-1.5 bg-white/5 border border-white/5 rounded-full px-3 py-1">
            <div className="live-dot w-2 h-2 rounded-full bg-[#A3D61B]" />
            <span className="text-[#A3D61B] text-sm font-bold uppercase tracking-wider">Live</span>
          </div>

          {/* Clock */}
          <div className="text-right hidden sm:block">
            <div className="text-white font-black text-xl font-mono tracking-tight leading-none flex items-center gap-0.5">
              <span>{pad(h12)}</span>
              <span className="timer-colon text-white/20">:</span>
              <span>{pad(m)}</span>
              <span className="timer-colon text-white/20">:</span>
              <span className="text-slate-300 text-lg">{pad(s)}</span>
              <span className="text-sm text-[#A3D61B] font-bold ml-1">{ampm}</span>
            </div>
            <div className="text-[#A3D61B] opacity-80 text-xs font-medium">{dateStr}</div>
          </div>

          {/* User + Logout */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-3 py-1.5">
              <div className="w-6 h-6 rounded-full bg-[#A3D61B] flex items-center justify-center text-xs font-black text-[#0A1A12]">
                {(user.name || user.email || 'S').charAt(0).toUpperCase()}
              </div>
              <span className="text-white text-sm font-semibold max-w-[120px] truncate">
                {user.name || user.email || 'Supervisor'}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent text-slate-300 hover:text-white text-sm font-bold transition-all active:scale-95"
            >
              <span>←</span>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Batch + Date Row (Hidden as per request) */}
        {/* 
        <div className="flex items-center gap-3 pb-3 flex-wrap overflow-x-auto">
          ...
        </div>
        */}
      </div>
    </header>
  )
}
