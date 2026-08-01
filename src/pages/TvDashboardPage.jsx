import { useState, useMemo, useEffect } from 'react'
import { useBatches, useBatchDemands } from '../hooks/useBatches'
import { useLiveTimers } from '../hooks/useLiveTimers'
import LiveProductionTable from '../components/TvDashboard/LiveProductionTable'
import UpcomingTasks from '../components/TvDashboard/UpcomingTasks'
import { classifyDemand } from '../components/VegList'

function computeCounts(demands, activeTimers, batchStartMs) {
  if (demands.length === 0 || !batchStartMs) return { running: 0, delayed: 0, completed: 0, pending: 0 }

  const timerMap = new Map()
  activeTimers.forEach((t) => {
    if (t.productId) timerMap.set(String(t.productId), t)
    if (t.productName) timerMap.set((t.productName || '').toLowerCase().trim(), t)
  })

  const counts = { running: 0, delayed: 0, completed: 0, pending: 0 }
  let currentStartMs = batchStartMs

  for (const demand of demands) {
    const activeTimer =
      timerMap.get(String(demand.product_id)) ||
      timerMap.get((demand.product_name || '').toLowerCase().trim())

    const classification = classifyDemand(demand, currentStartMs, activeTimer?.processType || null)
    
    counts[classification.status] = (counts[classification.status] || 0) + 1

    if (classification.status === 'running' || classification.status === 'pending') {
      const totalMins = Number(demand.total_time_minutes) || 0
      currentStartMs += totalMins * 60 * 1000
    }
  }

  return counts
}

export default function TvDashboardPage() {
  const [now, setNow] = useState(Date.now())
  const today = new Date().toISOString().split('T')[0]
  
  // Refresh global clock every second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const { data: batches = [] } = useBatches()
  const activeBatch = batches[0] || null
  const selectedBatchId = activeBatch ? String(activeBatch.id || activeBatch._id) : 'ALL'

  const { data: batchDemands = [], isLoading: demandsLoading } = useBatchDemands(
    selectedBatchId !== 'ALL' ? selectedBatchId : null,
    today
  )
  const { activeTimers, isLoading: timersLoading } = useLiveTimers(selectedBatchId)

  // Determine start time for the batch, default to current time for demo
  const batchStartMs = useMemo(() => {
    if (!activeBatch) return Date.now()
    // For this example, we just start the timeline at 9:00 AM today or now
    // Actually, in dashboard we used Date.now() as a demo, let's keep a stable demo start or 9AM
    const baseDate = new Date()
    baseDate.setHours(9, 0, 0, 0)
    return baseDate.getTime()
  }, [activeBatch])
  
  // Note: For TV dashboard, maybe we want it to simulate real-time today, so let's use a dynamic one 
  // wait, DashboardPage used demoStartMs = Date.now(). Let's do the same for consistency
  const [demoStartMs] = useState(Date.now() - 600000) // 10 minutes ago
  const actualBatchStartMs = demoStartMs

  const counts = useMemo(() => 
    computeCounts(batchDemands, activeTimers, actualBatchStartMs),
    [batchDemands, activeTimers, actualBatchStartMs, now] // re-evaluate every second
  )

  const currentTimeStr = new Date(now).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  const currentDateStr = new Date(now).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })

  return (
    <div className="min-h-screen bg-[#070B14] text-white overflow-hidden flex flex-col font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="px-10 py-6 bg-[#0B1324] border-b border-white/5 flex items-center justify-between shadow-2xl shrink-0 z-10 relative">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-gradient-to-br from-[#A3D61B] to-emerald-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-[#A3D61B]/20">
            🥗
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">VegAlert</h1>
            <h2 className="text-[#A3D61B] font-bold text-lg tracking-widest uppercase mt-0.5 opacity-90">Live Production Monitor</h2>
          </div>
        </div>

        {activeBatch && (
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
            <div className="bg-[#111C33] border border-white/5 px-8 py-3 rounded-full flex items-center gap-4 shadow-xl">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
              <span className="text-xl font-bold text-slate-200">
                Batch: <span className="text-white">{activeBatch.name || activeBatch.batch_name || 'Current'}</span>
              </span>
              <span className="px-3 py-1 bg-white/10 rounded-lg text-emerald-400 font-bold text-sm">
                {activeBatch.time_range || activeBatch.timeRange || activeBatch.slot || ''}
              </span>
            </div>
          </div>
        )}

        <div className="text-right">
          <div className="text-4xl font-black font-mono tracking-tighter text-white drop-shadow-md">{currentTimeStr}</div>
          <div className="text-slate-400 font-bold text-lg uppercase tracking-wider mt-1">{currentDateStr}</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 grid grid-cols-[1fr_400px] gap-8 overflow-hidden">
        <div className="flex flex-col gap-6 overflow-hidden">
          {/* Top Metrics */}
          <div className="grid grid-cols-4 gap-6 shrink-0">
            <div className="bg-[#0A2211] border border-emerald-900/50 rounded-3xl p-6 flex items-center justify-between shadow-lg relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500 opacity-10 blur-3xl rounded-full transform translate-x-1/2 -translate-y-1/2" />
              <div>
                <div className="text-emerald-500 font-black text-sm uppercase tracking-widest mb-1">Running</div>
                <div className="text-5xl font-black text-emerald-400 font-mono tracking-tighter">{counts.running}</div>
              </div>
              <div className="w-14 h-14 bg-emerald-950 rounded-2xl flex items-center justify-center text-3xl">⚙️</div>
            </div>
            
            <div className="bg-[#241A0A] border border-amber-900/50 rounded-3xl p-6 flex items-center justify-between shadow-lg relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500 opacity-10 blur-3xl rounded-full transform translate-x-1/2 -translate-y-1/2" />
              <div>
                <div className="text-amber-500 font-black text-sm uppercase tracking-widest mb-1">Pending</div>
                <div className="text-5xl font-black text-amber-400 font-mono tracking-tighter">{counts.pending}</div>
              </div>
              <div className="w-14 h-14 bg-amber-950 rounded-2xl flex items-center justify-center text-3xl">⏳</div>
            </div>

            <div className="bg-[#170C15] border border-rose-900/50 rounded-3xl p-6 flex items-center justify-between shadow-lg relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-rose-500 opacity-10 blur-3xl rounded-full transform translate-x-1/2 -translate-y-1/2" />
              <div>
                <div className="text-rose-500 font-black text-sm uppercase tracking-widest mb-1">Delayed</div>
                <div className="text-5xl font-black text-rose-400 font-mono tracking-tighter">{counts.delayed}</div>
              </div>
              <div className="w-14 h-14 bg-rose-950 rounded-2xl flex items-center justify-center text-3xl">⚠️</div>
            </div>

            <div className="bg-[#0B1824] border border-sky-900/50 rounded-3xl p-6 flex items-center justify-between shadow-lg relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-sky-500 opacity-10 blur-3xl rounded-full transform translate-x-1/2 -translate-y-1/2" />
              <div>
                <div className="text-sky-500 font-black text-sm uppercase tracking-widest mb-1">Completed</div>
                <div className="text-5xl font-black text-sky-400 font-mono tracking-tighter">{counts.completed}</div>
              </div>
              <div className="w-14 h-14 bg-sky-950 rounded-2xl flex items-center justify-center text-3xl">✅</div>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {(demandsLoading || timersLoading) ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <div className="w-16 h-16 border-4 border-emerald-900 border-t-emerald-500 rounded-full animate-spin mb-6" />
                <h2 className="text-2xl font-bold">Syncing Production Data...</h2>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <LiveProductionTable 
                  demands={batchDemands} 
                  activeTimers={activeTimers} 
                  batchStartMs={actualBatchStartMs} 
                  now={now} 
                />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="h-full">
          <UpcomingTasks 
            demands={batchDemands}
            activeTimers={activeTimers}
            batchStartMs={actualBatchStartMs}
            now={now}
          />
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.02);
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}} />
    </div>
  )
}
