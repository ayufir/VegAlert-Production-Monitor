import { useState, useEffect, useRef } from 'react'

const PIPELINE = [
  { key: 'soaking',   label: 'SOAKING',   labelHi: 'भिगोना',    emoji: '🧼', color: 'text-emerald-400', border: 'border-emerald-500', bg: 'bg-emerald-950/60' },
  { key: 'cleaning',  label: 'CLEANING',  labelHi: 'सफाई',      emoji: '🧽', color: 'text-cyan-400',    border: 'border-cyan-500',    bg: 'bg-cyan-950/60'    },
  { key: 'cutting',   label: 'CUTTING',   labelHi: 'कटाई',      emoji: '🔪', color: 'text-amber-400',   border: 'border-amber-500',   bg: 'bg-amber-950/60'   },
  { key: 'drying',    label: 'DRYING',    labelHi: 'सुखाना',    emoji: '💨', color: 'text-purple-400',  border: 'border-purple-500',  bg: 'bg-purple-950/60'  },
  { key: 'weighting', label: 'WEIGHTING', labelHi: 'वजन करना', emoji: '⚖️', color: 'text-rose-400',    border: 'border-rose-500',    bg: 'bg-rose-950/60'    },
]

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://rambhaji.backend.shreenari.com'

function getImageUrl(url) {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

function pad(n) {
  return String(Math.floor(Math.abs(n))).padStart(2, '0')
}

function formatTime(ts) {
  if (!ts) return '--:--'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return '--:--'
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

// Render split-flap styled text box
function SplitFlapText({ text, className = '', color = 'text-amber-300' }) {
  const chars = String(text || '').toUpperCase().split('')
  return (
    <div className={`flex items-center gap-[2px] font-mono select-none ${className}`}>
      {chars.map((ch, idx) => (
        <span
          key={idx}
          className={`relative inline-flex items-center justify-center px-1.5 py-0.5 min-w-[20px] h-7 bg-neutral-900 border border-neutral-700/80 rounded text-center text-sm font-black tracking-widest shadow-inner ${color}`}
          style={{
            backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.7) 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 4px rgba(0,0,0,0.8)'
          }}
        >
          {/* Split line */}
          <span className="absolute inset-x-0 top-1/2 h-[1px] bg-black/80 shadow-[0_1px_0_rgba(255,255,255,0.1)] z-10 pointer-events-none" />
          <span className="z-0 drop-shadow-[0_0_8px_currentColor]">{ch}</span>
        </span>
      ))}
    </div>
  )
}

function StationClock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const hours = pad(time.getHours())
  const mins = pad(time.getMinutes())
  const secs = pad(time.getSeconds())

  return (
    <div className="flex items-center gap-3 bg-black/80 px-4 py-2 rounded-xl border-2 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
      <div className="text-right">
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400/80">INDIAN RAILWAYS TIME</div>
        <div className="flex items-center gap-1 font-mono text-2xl font-black text-amber-400 tracking-wider">
          <span className="bg-neutral-900 px-2 py-0.5 rounded border border-amber-500/30">{hours}</span>
          <span className="animate-pulse text-amber-300">:</span>
          <span className="bg-neutral-900 px-2 py-0.5 rounded border border-amber-500/30">{mins}</span>
          <span className="animate-pulse text-amber-300">:</span>
          <span className="bg-neutral-900 px-2 py-0.5 rounded border border-amber-500/30 text-amber-300">{secs}</span>
        </div>
      </div>
    </div>
  )
}

export default function IRCTCStationDisplay({ timers = [], products = [], onCancel, onSwitchView }) {
  const [now, setNow] = useState(Date.now())
  const [refreshCountdown, setRefreshCountdown] = useState(30)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [lastTimerCount, setLastTimerCount] = useState(timers.length)
  const [newlyAddedId, setNewlyAddedId] = useState(null)
  const previousIdsRef = useRef(new Set(timers.map((t) => String(t.id || t._id))))

  // 1-second live countdown and 30s refresh ticker
  useEffect(() => {
    const ticker = setInterval(() => {
      setNow(Date.now())
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          return 30
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(ticker)
  }, [])

  // Detect when new product timer is added
  useEffect(() => {
    const currentIds = new Set(timers.map((t) => String(t.id || t._id)))
    const addedId = timers.find((t) => !previousIdsRef.current.has(String(t.id || t._id)))?.id

    if (addedId) {
      setNewlyAddedId(addedId)
      if (soundEnabled) {
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)()
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15) // A5 station chime
          gain.gain.setValueAtTime(0.15, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start()
          osc.stop(ctx.currentTime + 0.5)
        } catch (_e) {}
      }

      const timer = setTimeout(() => setNewlyAddedId(null), 6000)
      return () => clearTimeout(timer)
    }

    previousIdsRef.current = currentIds
    setLastTimerCount(timers.length)
  }, [timers, soundEnabled])

  // Map products by ID & name
  const productMap = new Map()
  products.forEach((p) => {
    if (p.id) productMap.set(String(p.id), p)
    if (p.name) productMap.set(p.name.toLowerCase().trim(), p)
  })

  return (
    <div className="w-full bg-slate-950 border-4 border-amber-600/60 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.9)] flex flex-col font-sans select-none">
      {/* IRCTC Station Top Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 border-b-4 border-amber-500/80 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        {/* Left Branding */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center text-3xl shadow-[0_0_15px_rgba(245,158,11,0.4)] shrink-0">
            🚂
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-amber-400 font-black text-2xl tracking-wider font-mono uppercase drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]">
                VEGALERT IRCTC DISPLAY BOARD
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-black uppercase tracking-widest animate-pulse">
                LIVE
              </span>
            </div>
            <p className="text-slate-300 text-xs font-bold tracking-widest uppercase mt-0.5">
              भारतीय रेल - वेज अलर्ट लाइव उत्पादन डिस्प्ले बोर्ड (EVERY 30 SEC UPDATE)
            </p>
          </div>
        </div>

        {/* Center: 30-Second Refresh Meter & Station Clock */}
        <div className="flex items-center gap-5 flex-wrap">
          {/* Refresh Progress Bar */}
          <div className="flex flex-col items-center bg-black/60 px-4 py-2 rounded-xl border border-amber-500/30 min-w-[200px]">
            <div className="flex items-center justify-between w-full text-[10px] font-black uppercase text-amber-300 tracking-wider mb-1">
              <span>🔄 30s IRCTC Refresh</span>
              <span className="font-mono text-white text-xs">{refreshCountdown}s</span>
            </div>
            <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden border border-neutral-700">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-1000 ease-linear shadow-[0_0_8px_#f59e0b]"
                style={{ width: `${(refreshCountdown / 30) * 100}%` }}
              />
            </div>
          </div>

          {/* IRCTC Railway Clock */}
          <StationClock />

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition ${
              soundEnabled
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-neutral-900 border-neutral-800 text-neutral-500'
            }`}
            title={soundEnabled ? 'Station Chime Sound On' : 'Station Chime Sound Muted'}
          >
            {soundEnabled ? '🔔' : '🔕'}
          </button>

          {/* Switch Back / Standard View Toggle */}
          {onSwitchView && (
            <button
              onClick={onSwitchView}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-black text-xs uppercase tracking-wider rounded-xl transition shadow-[0_0_15px_rgba(245,158,11,0.4)] flex items-center gap-1.5"
            >
              <span>📊</span>
              <span>STANDARD VIEW</span>
            </button>
          )}
        </div>
      </div>

      {/* Railway Board Table Grid Header */}
      <div className="grid grid-cols-[0.6fr_2fr_1.2fr_1fr_0.9fr_0.9fr_1.4fr_auto] gap-2 px-5 py-3.5 bg-amber-500 text-black text-xs font-black uppercase tracking-widest border-b-2 border-black">
        <span className="text-center">TRAIN/BATCH</span>
        <span>VEGETABLE / ITEM (सब्जी का नाम)</span>
        <span>STAGE (प्रोसेस)</span>
        <span>OPERATOR (ऑपरेटर)</span>
        <span className="text-center">ENTRY (प्रवेश)</span>
        <span className="text-center">EXIT (निकासी)</span>
        <span className="text-center">STATUS / TIMER (स्थिति)</span>
        <span>ACTION</span>
      </div>

      {/* Train / Product Display Rows */}
      <div className="divide-y-2 divide-neutral-800 bg-black min-h-[350px]">
        {timers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center bg-neutral-950">
            <div className="text-6xl animate-bounce">🚂</div>
            <div className="font-mono text-amber-400 font-black text-xl uppercase tracking-widest">
              NO ACTIVE TRAINS / PRODUCTION TIMERS
            </div>
            <p className="text-neutral-400 text-sm max-w-md">
              जैसे ही मोबाइल ऐप से कोई सब्जी / प्रोडक्ट स्टार्ट होगा, 30 सेकंड ऑटो अपडेट के साथ यहाँ IRCTC स्टाइल में तुरंत दिखेगा!
            </p>
          </div>
        ) : (
          timers.map((item, idx) => {
            const startedAt = item.startedAt || now
            const durationMs = (item.durationSeconds || 300) * 1000
            const expectedExit = item.endedAt || (startedAt + durationMs)
            const isDelayed = now > expectedExit
            const diff = expectedExit - now
            const totalSecs = Math.floor(Math.abs(diff) / 1000)
            const h = Math.floor(totalSecs / 3600)
            const m = Math.floor((totalSecs % 3600) / 60)
            const s = totalSecs % 60
            const timerStr = h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`

            const procType = (item.processType || item.process_type || 'soaking').toLowerCase()
            const stage = PIPELINE.find((p) => p.key === procType) || PIPELINE[0]

            const prodName = item.productName || item.name || 'PRODUCT'
            const matchedProd = productMap.get(String(item.productId || item.product_id)) || productMap.get(prodName.toLowerCase().trim())
            const hindiName = item.hindi_name || matchedProd?.hindi_name
            const imagePath = item.image_url || matchedProd?.image_url
            const fullImgUrl = getImageUrl(imagePath)
            const batchNum = item.batchId || item.batch_id || `0${idx + 1}`

            const isNew = String(item.id || item._id) === String(newlyAddedId)

            return (
              <div
                key={item.id || item._id || idx}
                className={`grid grid-cols-[0.6fr_2fr_1.2fr_1fr_0.9fr_0.9fr_1.4fr_auto] gap-2 items-center px-5 py-3.5 transition-all duration-500 ${
                  isNew
                    ? 'bg-amber-500/20 border-l-8 border-l-amber-400 ring-2 ring-amber-400 animate-pulse'
                    : isDelayed
                    ? 'bg-red-950/30 hover:bg-red-950/50 border-l-8 border-l-red-500'
                    : diff <= 120000
                    ? 'bg-amber-950/30 hover:bg-amber-950/50 border-l-8 border-l-amber-400'
                    : idx % 2 === 0
                    ? 'bg-neutral-950 hover:bg-neutral-900 border-l-8 border-l-emerald-500'
                    : 'bg-black hover:bg-neutral-900 border-l-8 border-l-emerald-500'
                }`}
              >
                {/* Batch / Train Number Badge */}
                <div className="flex justify-center">
                  <div className="bg-neutral-900 border border-amber-500/40 px-2.5 py-1 rounded font-mono font-black text-amber-300 text-sm tracking-widest shadow-inner text-center">
                    #{batchNum}
                  </div>
                </div>

                {/* Vegetable / Product Details */}
                <div className="flex items-center gap-3 min-w-0">
                  {fullImgUrl ? (
                    <img
                      src={fullImgUrl}
                      alt={prodName}
                      className="w-11 h-11 rounded-lg object-cover border-2 border-amber-500/40 bg-neutral-900 shrink-0 shadow-md"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  ) : (
                    <span className="text-2xl shrink-0 p-1 bg-neutral-900 rounded-lg border border-neutral-800">{item.emoji || '🥗'}</span>
                  )}
                  <div className="min-w-0">
                    <div className="text-amber-300 font-mono font-black text-lg truncate tracking-wide uppercase drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]">
                      {prodName}
                    </div>
                    <div className="text-slate-300 text-xs font-bold truncate flex items-center gap-2">
                      {hindiName && <span className="text-emerald-400 font-extrabold">{hindiName}</span>}
                      <span className="text-amber-200/70 font-mono text-[11px]">
                        [{item.processedQty || item.quantity || '1000'} {item.unit || 'gm'}]
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stage Badge */}
                <div>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 font-mono text-xs font-black uppercase tracking-wider ${stage.bg} ${stage.color} ${stage.border}`}>
                    <span>{stage.emoji}</span>
                    <span>{stage.label}</span>
                  </div>
                </div>

                {/* Operator / Worker */}
                <div className="font-mono text-slate-200 text-sm font-bold truncate flex items-center gap-1.5">
                  <span className="text-amber-400">👷</span>
                  <span>{item.employeeName || item.workerName || 'WORKER 1'}</span>
                </div>

                {/* Entry Time */}
                <div className="text-center font-mono font-bold text-amber-200 text-base tracking-widest bg-neutral-900/80 px-2 py-1 rounded border border-neutral-800">
                  {formatTime(startedAt)}
                </div>

                {/* Expected Exit Time */}
                <div className="text-center font-mono font-bold text-cyan-300 text-base tracking-widest bg-neutral-900/80 px-2 py-1 rounded border border-neutral-800">
                  {formatTime(expectedExit)}
                </div>

                {/* Status & Live Countdown Timer */}
                <div className="flex flex-col items-center justify-center">
                  {isDelayed ? (
                    <div className="flex items-center gap-2 bg-red-950/80 border-2 border-red-500 px-3 py-1 rounded-xl animate-pulse">
                      <span className="text-red-400 text-xs font-black tracking-widest">🚨 DELAYED</span>
                      <span className="font-mono text-red-300 text-lg font-black tracking-widest">+{timerStr}</span>
                    </div>
                  ) : (
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-xl border-2 ${diff <= 120000 ? 'bg-amber-950/80 border-amber-500' : 'bg-emerald-950/80 border-emerald-500'}`}>
                      <span className={`text-[10px] font-black tracking-widest uppercase ${diff <= 120000 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {diff <= 120000 ? '⚡ NEAR DONE' : '⏳ RUNNING'}
                      </span>
                      <span className={`font-mono text-xl font-black tracking-widest ${diff <= 120000 ? 'text-amber-300' : 'text-emerald-300'}`}>
                        {timerStr}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action / Cancel Button */}
                <div className="flex justify-end">
                  {onCancel && (
                    <button
                      onClick={() => onCancel(item.id || item._id)}
                      className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-red-500/30 border border-neutral-700 hover:border-red-500 text-neutral-400 hover:text-red-400 text-xs font-bold font-mono transition"
                      title="Cancel timer"
                    >
                      ✕ CANCEL
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer Ticker / IRCTC Helpline & Status */}
      <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 px-6 py-2 flex items-center justify-between text-black font-black text-xs uppercase tracking-widest border-t-2 border-black">
        <div className="flex items-center gap-3">
          <span>📢 NOTICE:</span>
          <span className="font-mono animate-pulse">
            EVERY 30 SEC AUTO-REFRESH ACTIVE • AUTONOMOUS LIVE MONITORING
          </span>
        </div>
        <div className="font-mono text-xs">
          TOTAL ACTIVE TIMERS: <span className="bg-black text-amber-400 px-2 py-0.5 rounded font-black">{timers.length}</span>
        </div>
      </div>
    </div>
  )
}
