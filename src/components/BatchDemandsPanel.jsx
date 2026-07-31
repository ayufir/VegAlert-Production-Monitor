const STAGE_ORDER = ['soaking', 'cleaning', 'cutting', 'drying', 'weighting']

const STAGE_META = {
  soaking:   { label: 'Soaking',   emoji: '🧼', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  cleaning:  { label: 'Cleaning',  emoji: '🧽', bg: 'bg-cyan-500/10',    text: 'text-cyan-400',    border: 'border-cyan-500/30'    },
  cutting:   { label: 'Cutting',   emoji: '🔪', bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/30'   },
  drying:    { label: 'Drying',    emoji: '💨', bg: 'bg-purple-500/10',  text: 'text-purple-400',  border: 'border-purple-500/30'  },
  weighting: { label: 'Weighting', emoji: '⚖️', bg: 'bg-rose-500/10',    text: 'text-rose-400',    border: 'border-rose-500/30'    },
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://rambhaji.backend.shreenari.com'

function getImageUrl(url) {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

export default function BatchDemandsPanel({ demands = [], batchId, products = [] }) {
  if (!demands || demands.length === 0) return null

  // Map products by ID and name for fast lookup
  const productMap = new Map()
  products.forEach((p) => {
    if (p.id) productMap.set(String(p.id), p)
    if (p.name) productMap.set(p.name.toLowerCase().trim(), p)
  })

  const doneCount = demands.filter(d => (d.processed_qty || 0) >= (d.total_demand || d.total_quantity || d.quantity || 1)).length
  const totalCount = demands.length
  const totalPct = demands.length > 0
    ? Math.round((demands.reduce((a, d) => a + Math.min(1, (d.processed_qty || 0) / Math.max(1, d.total_demand || d.total_quantity || d.quantity || 1)), 0) / demands.length) * 100)
    : 0

  return (
    <div className="mt-8 w-full max-w-5xl mx-auto px-1">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-white font-black text-lg tracking-tight">📦 BATCH DEMANDS</span>
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-neutral-900 border border-neutral-800 text-neutral-300">
              {batchId !== 'ALL' ? `Batch #${batchId}` : 'All Batches'}
            </span>
          </div>
          <p className="text-neutral-400 text-xs font-semibold mt-0.5">
            {demands.length} items required for processing today
          </p>
        </div>

        {/* Overall Progress Pills */}
        <div className="flex items-center gap-2 text-xs select-none">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800">
            <span className="text-emerald-400 font-black text-sm">{doneCount}</span>
            <span className="text-neutral-400 font-bold uppercase tracking-wider text-[11px]">Completed</span>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800">
            <span className="text-white font-black text-sm">{totalCount}</span>
            <span className="text-neutral-400 font-bold uppercase tracking-wider text-[11px]">Total</span>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <span className="text-emerald-400 font-black text-sm">{totalPct}%</span>
            <span className="text-emerald-300 font-bold uppercase tracking-wider text-[11px]">Overall</span>
          </div>
        </div>
      </div>

      {/* Demands Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {demands.map((d, idx) => {
          const total = Number(d.total_demand || d.total_quantity || d.quantity || 0)
          const done = Number(d.processed_qty || 0)
          const remaining = Math.max(0, total - done)
          const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0
          const isFullDone = pct >= 100

          const prodName = d.product_name || d.name || 'Product'
          const matchedProd = productMap.get(String(d.product_id || d.productId)) || productMap.get(prodName.toLowerCase().trim())
          const hindiName = d.hindi_name || matchedProd?.hindi_name
          const imagePath = d.image_url || matchedProd?.image_url
          const fullImgUrl = getImageUrl(imagePath)

          const stages = d.stages || d.stage_breakdown || null

          return (
            <div
              key={d.id || d.product_id || idx}
              className={`bg-neutral-950 border rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-md transition-transform hover:-translate-y-0.5 ${
                isFullDone ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-neutral-800'
              }`}
            >
              <div>
                {/* Product Image / Name & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {fullImgUrl ? (
                      <img
                        src={fullImgUrl}
                        alt={prodName}
                        className="w-10 h-10 rounded-xl object-cover border border-neutral-800 bg-neutral-900 shrink-0"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <span className="text-2xl shrink-0 p-1.5 rounded-xl bg-neutral-900 border border-neutral-800">{d.emoji || '🥗'}</span>
                    )}
                    <div className="min-w-0">
                      <div className="text-white font-black text-base truncate leading-tight">
                        {prodName}
                      </div>
                      {hindiName && (
                        <div className="text-emerald-400 text-xs font-semibold truncate mt-0.5">
                          {hindiName}
                        </div>
                      )}
                    </div>
                  </div>

                  <span className={`shrink-0 px-2.5 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider border ${
                    isFullDone
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      : done > 0
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                  }`}>
                    {isFullDone ? '✓ DONE' : done > 0 ? '⚡ IN PROGRESS' : 'PENDING'}
                  </span>
                </div>

                {/* Quantities metrics */}
                <div className="flex items-center justify-between text-xs mt-3 px-1 text-neutral-400">
                  <span>Req: <strong className="text-white">{total} {d.unit || 'gm'}</strong></span>
                  <span>Done: <strong className="text-emerald-400">{done} {d.unit || 'gm'}</strong></span>
                  <span>Left: <strong className="text-neutral-300">{remaining} {d.unit || 'gm'}</strong></span>
                </div>

                {/* Progress bar */}
                <div className="mt-2.5">
                  <div className="h-2 rounded-full bg-neutral-900 overflow-hidden border border-neutral-800">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${isFullDone ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-right mt-1">
                    <span className={`text-xs font-black font-mono ${isFullDone ? 'text-emerald-400' : 'text-neutral-400'}`}>
                      {pct}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Per-stage breakdown */}
              {stages && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-neutral-900">
                  {STAGE_ORDER.map((key) => {
                    const stg = stages[key]
                    if (!stg) return null
                    const meta = STAGE_META[key]
                    const stageDone = Number(stg.processed || stg.done || 0)
                    const stageTotal = Number(stg.total || stg.quantity || 0)
                    const stagePct = stageTotal > 0 ? Math.min(100, Math.round((stageDone / stageTotal) * 100)) : 0
                    return (
                      <div
                        key={key}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-bold ${meta.bg} ${meta.text} ${meta.border}`}
                      >
                        <span>{meta.emoji}</span>
                        <span>{stagePct}%</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
