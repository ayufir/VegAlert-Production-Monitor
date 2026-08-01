import { useState, useEffect } from 'react'
import { STAGES, getDemandStatus, classifyDemand } from '../VegList'

function msToStr(ms) {
  const total = Math.floor(Math.abs(ms) / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatTime(ms) {
  if (!ms) return '--'
  return new Date(ms).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const VEG_EMOJIS = {
  potato: '🥔', onion: '🧅', tomato: '🍅', cucumber: '🥒',
  lemon: '🍋', garlic: '🧄', ginger: '🫚', coriander: '🌿',
  chilli: '🌶️', spinach: '🥬', carrot: '🥕', cabbage: '🥬',
  cauliflower: '🥦', peas: '🫛', brinjal: '🍆',
}
function getVegEmoji(name = '') {
  const lower = name.toLowerCase()
  return Object.entries(VEG_EMOJIS).find(([k]) => lower.includes(k))?.[1] || '🥗'
}

export default function LiveProductionTable({ demands = [], activeTimers = [], batchStartMs, now }) {
  if (!batchStartMs) return null

  const timerByProductId = new Map()
  activeTimers.forEach((t) => {
    if (t.productId) timerByProductId.set(String(t.productId), t)
    if (t.productName) timerByProductId.set((t.productName || '').toLowerCase().trim(), t)
  })

  let currentStartMs = batchStartMs

  const rows = demands.map((demand) => {
    const activeTimer = timerByProductId.get(String(demand.product_id))
      || timerByProductId.get((demand.product_name || '').toLowerCase().trim())

    const classification = classifyDemand(demand, currentStartMs, activeTimer || null)

    if (classification.status === 'running' || classification.status === 'pending') {
      const totalMins = Number(demand.total_time_minutes) || 0
      currentStartMs += totalMins * 60 * 1000
    }

    return { demand, classification }
  })

  // Filter out completed for the main active table if you want, but user said show "Status (Running, Delayed, Completed)"
  // So we show all, but maybe limit to those not fully completed or show completed at the bottom.
  
  return (
    <div className="bg-[#111827] rounded-3xl overflow-hidden shadow-2xl border border-white/10">
      <div className="grid grid-cols-[3fr_2fr_1.5fr_1.5fr_1.5fr_1.5fr] gap-4 px-8 py-5 bg-[#1F2937] border-b border-white/5">
        <span className="text-slate-400 text-sm font-black uppercase tracking-widest">Vegetable</span>
        <span className="text-slate-400 text-sm font-black uppercase tracking-widest">Current Stage</span>
        <span className="text-slate-400 text-sm font-black uppercase tracking-widest">Started</span>
        <span className="text-slate-400 text-sm font-black uppercase tracking-widest">Ends At</span>
        <span className="text-slate-400 text-sm font-black uppercase tracking-widest text-right">Remaining</span>
        <span className="text-slate-400 text-sm font-black uppercase tracking-widest text-right">Status</span>
      </div>

      <div className="divide-y divide-white/5">
        {rows.map(({ demand, classification }, idx) => {
          const { status, activeStage } = classification
          const emoji = getVegEmoji(demand.product_name)
          
          const isRunning = status === 'running'
          const isDelayed = status === 'delayed'
          const isCompleted = status === 'completed'
          const isPending = status === 'pending'
          
          const stageInfo = STAGES.find(s => s.key === activeStage?.key) || STAGES[0]
          
          // Calculate remaining
          const remainingMs = activeStage ? activeStage.endMs - now : 0
          const displayRemaining = remainingMs > 0 ? remainingMs : 0
          const isAlmostDone = isRunning && displayRemaining > 0 && displayRemaining < 120_000

          return (
            <div 
              key={demand.product_id || idx} 
              className={`grid grid-cols-[3fr_2fr_1.5fr_1.5fr_1.5fr_1.5fr] gap-4 px-8 py-6 items-center transition-colors
                ${isRunning ? 'bg-[#052e16]/30 hover:bg-[#052e16]/50' : 'hover:bg-white/5'}
                ${isDelayed ? 'bg-red-950/20' : ''}
              `}
            >
              {/* Vegetable */}
              <div className="flex items-center gap-4">
                {demand.product_image ? (
                  <img 
                    src={`${import.meta.env.VITE_API_BASE_URL || 'https://rambhaji.backend.shreenari.com'}${demand.product_image}`} 
                    alt={demand.product_name} 
                    className="w-12 h-12 rounded-full object-cover shadow-lg border border-white/10 shrink-0" 
                  />
                ) : (
                  <span className="text-4xl shrink-0">{emoji}</span>
                )}
                <div>
                  <div className="text-white font-bold text-xl leading-tight">
                    {demand.product_name} 
                    {demand.hindi_name && <span className="text-emerald-400 text-lg font-semibold ml-2">({demand.hindi_name})</span>}
                  </div>
                  <div className="text-slate-400 text-sm font-semibold mt-1">
                    {demand.total_demand} {demand.unit || 'gm'} 
                    {Number(demand.processed_qty) > 0 && !isCompleted && ` • ${demand.processed_qty} processed`}
                  </div>
                </div>
              </div>

              {/* Stage Badge */}
              <div>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-bold text-base
                  ${stageInfo.key === 'soaking' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' : ''}
                  ${stageInfo.key === 'cleaning' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : ''}
                  ${stageInfo.key === 'cutting' ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' : ''}
                  ${stageInfo.key === 'drying' ? 'border-purple-500/30 text-purple-400 bg-purple-500/10' : ''}
                  ${stageInfo.key === 'weighting' ? 'border-rose-500/30 text-rose-400 bg-rose-500/10' : ''}
                `}>
                  <span>{stageInfo.emoji}</span>
                  <span>{stageInfo.label}</span>
                </div>
              </div>

              {/* Started Time */}
              <div className="text-slate-300 font-bold text-lg font-mono">
                {activeStage ? formatTime(activeStage.startMs) : '--'}
              </div>

              {/* Ends At Time */}
              <div className="text-slate-300 font-bold text-lg font-mono">
                {activeStage && !isCompleted ? formatTime(activeStage.endMs) : '--'}
              </div>

              {/* Remaining Time */}
              <div className="text-right">
                {isRunning ? (
                  <div className={`font-black text-3xl font-mono tracking-tighter ${isAlmostDone ? 'text-amber-400 animate-pulse' : 'text-[#A3D61B]'}`}>
                    {msToStr(displayRemaining)}
                  </div>
                ) : isDelayed ? (
                  <div className="font-black text-2xl font-mono text-red-500">MISSED</div>
                ) : isCompleted ? (
                  <div className="font-black text-2xl font-mono text-sky-400">00:00</div>
                ) : (
                  <div className="font-bold text-xl font-mono text-slate-500">WAITING</div>
                )}
              </div>

              {/* Status */}
              <div className="text-right flex justify-end">
                {isRunning && <span className="px-3 py-1 bg-[#A3D61B]/20 text-[#A3D61B] rounded-lg font-bold text-sm tracking-wide">RUNNING</span>}
                {isDelayed && <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg font-bold text-sm tracking-wide animate-pulse">DELAYED</span>}
                {isCompleted && <span className="px-3 py-1 bg-sky-500/20 text-sky-400 rounded-lg font-bold text-sm tracking-wide">COMPLETED</span>}
                {isPending && <span className="px-3 py-1 bg-slate-700/50 text-slate-400 rounded-lg font-bold text-sm tracking-wide">PENDING</span>}
              </div>
            </div>
          )
        })}
        {rows.length === 0 && (
          <div className="p-12 text-center text-slate-400 font-bold text-lg">No production data available for this batch.</div>
        )}
      </div>
    </div>
  )
}
