import { useState, useEffect } from 'react'

const PIPELINE = [
  { key: 'soaking',   label: 'Soaking',   emoji: '🧼', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  { key: 'cleaning',  label: 'Cleaning',  emoji: '🧽', bg: 'bg-cyan-500/10',    text: 'text-cyan-400',    border: 'border-cyan-500/30'    },
  { key: 'cutting',   label: 'Cutting',   emoji: '🔪', bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/30'   },
  { key: 'drying',    label: 'Drying',    emoji: '💨', bg: 'bg-purple-500/10',  text: 'text-purple-400',  border: 'border-purple-500/30'  },
  { key: 'weighting', label: 'Weighting', emoji: '⚖️', bg: 'bg-rose-500/10',    text: 'text-rose-400',    border: 'border-rose-500/30'    },
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

function LiveTimer({ endedAt, isDelayed }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const diff = endedAt - now
  const totalSecs = Math.floor(Math.abs(diff) / 1000)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  const str = h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`

  if (isDelayed) {
    return (
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-0.5">🚨 DELAYED</span>
        <span className="text-red-400 font-black text-2xl font-mono tracking-widest animate-pulse">+{str}</span>
      </div>
    )
  }

  const nearDone = diff <= 120000 && diff > 0
  return (
    <div className="flex flex-col items-center">
      <span className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${nearDone ? 'text-amber-400' : 'text-emerald-400'}`}>
        {nearDone ? '⚡ NEAR END' : '⏳ REMAINING'}
      </span>
      <span className={`font-black text-2xl font-mono tracking-widest ${nearDone ? 'text-amber-300' : 'text-emerald-400'}`}>
        {str}
      </span>
    </div>
  )
}

function formatTime(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function TVTableView({ timers = [], onCancel, products = [] }) {
  const now = Date.now()

  // Map products by ID and name for fast lookup
  const productMap = new Map()
  products.forEach((p) => {
    if (p.id) productMap.set(String(p.id), p)
    if (p.name) productMap.set(p.name.toLowerCase().trim(), p)
  })

  return (
    <div className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Table Header */}
      <div className="grid grid-cols-[2.2fr_1.2fr_1fr_1fr_1fr_1.4fr_auto] gap-3 px-5 py-3 text-neutral-400 text-xs font-black uppercase tracking-wider bg-neutral-900/90 border-b border-neutral-800">
        <span>Vegetable / Product</span>
        <span>Stage</span>
        <span>Worker</span>
        <span>Entry</span>
        <span>Expected Exit</span>
        <span className="text-center">Timer</span>
        <span></span>
      </div>

      {/* Timer Rows */}
      <div className="divide-y divide-neutral-800/70">
        {timers.map((item, idx) => {
          const startedAt = item.startedAt || now
          const durationMs = (item.durationSeconds || 300) * 1000
          const expectedExit = item.endedAt || (startedAt + durationMs)
          const isDelayed = now > expectedExit

          const procType = (item.processType || item.process_type || 'soaking').toLowerCase()
          const stage = PIPELINE.find((p) => p.key === procType) || PIPELINE[0]

          const prodName = item.productName || item.name || 'Product'
          const matchedProd = productMap.get(String(item.productId || item.product_id)) || productMap.get(prodName.toLowerCase().trim())
          const hindiName = item.hindi_name || matchedProd?.hindi_name
          const imagePath = item.image_url || matchedProd?.image_url
          const fullImgUrl = getImageUrl(imagePath)

          const rowBg = isDelayed
            ? 'bg-red-500/5 hover:bg-red-500/10 border-l-4 border-l-red-500'
            : (expectedExit - now < 120000)
            ? 'bg-amber-500/5 hover:bg-amber-500/10 border-l-4 border-l-amber-400'
            : 'bg-black hover:bg-neutral-900/60 border-l-4 border-l-emerald-500'

          return (
            <div
              key={item.id || item._id || idx}
              className={`grid grid-cols-[2.2fr_1.2fr_1fr_1fr_1fr_1.4fr_auto] gap-3 items-center px-5 py-4 transition-colors ${rowBg}`}
            >
              {/* Product Image / Name */}
              <div className="flex items-center gap-3 min-w-0">
                {fullImgUrl ? (
                  <img
                    src={fullImgUrl}
                    alt={prodName}
                    className="w-10 h-10 rounded-xl object-cover border border-neutral-800 bg-neutral-900 shrink-0"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                ) : (
                  <span className="text-2xl shrink-0 p-1.5 rounded-xl bg-neutral-900 border border-neutral-800">{item.emoji || '🥗'}</span>
                )}
                <div className="min-w-0">
                  <div className="text-white font-bold text-base truncate">
                    {prodName}
                  </div>
                  {hindiName ? (
                    <div className="text-emerald-400 text-xs font-semibold truncate mt-0.5">
                      {hindiName}
                    </div>
                  ) : (
                    <div className="text-neutral-400 text-xs font-medium truncate mt-0.5">
                      Batch <span className="text-neutral-200 font-semibold">#{item.batchId || item.batch_id || 'ALL'}</span> &nbsp;•&nbsp;
                      <span className="text-emerald-400 font-semibold">{item.processedQty || item.quantity || '—'} {item.unit || 'gm'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stage Badge */}
              <div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-extrabold uppercase tracking-wide ${stage.bg} ${stage.text} ${stage.border}`}>
                  <span>{stage.emoji}</span>
                  <span>{stage.label}</span>
                </span>
              </div>

              {/* Worker */}
              <div className="text-neutral-200 text-sm font-semibold truncate flex items-center gap-1.5">
                <span>👷</span>
                <span>{item.employeeName || item.workerName || 'Worker'}</span>
              </div>

              {/* Entry Time */}
              <div className="text-neutral-300 text-sm font-mono font-medium">
                {formatTime(startedAt)}
              </div>

              {/* Expected Exit */}
              <div className="text-neutral-300 text-sm font-mono font-medium">
                {formatTime(expectedExit)}
              </div>

              {/* Live Timer */}
              <div className="flex justify-center">
                <LiveTimer endedAt={expectedExit} isDelayed={isDelayed} />
              </div>

              {/* Cancel Button */}
              <div className="flex justify-end">
                {onCancel && (
                  <button
                    onClick={() => onCancel(item.id || item._id)}
                    className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-red-500/20 border border-neutral-700 hover:border-red-500/40 text-neutral-400 hover:text-red-400 text-xs font-bold transition"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
