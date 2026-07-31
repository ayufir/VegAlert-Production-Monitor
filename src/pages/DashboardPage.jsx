import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import MetricCards from '../components/MetricCards'
import TabBar from '../components/TabBar'
import VegList, { getDemandStatus } from '../components/VegList'
import { useLiveTimers } from '../hooks/useLiveTimers'
import { useBatches, useBatchDemands } from '../hooks/useBatches'

// Convert batch time string like "9:00 AM" or "09:00" to a timestamp in ms on selectedDate
function parseBatchStartTime(batch, selectedDate) {
  const baseDate = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date()

  if (!batch) {
    // Default fallback: 9:00 AM
    baseDate.setHours(9, 0, 0, 0)
    return baseDate.getTime()
  }

  // Try to extract a start time from various fields including name (e.g. "1-3 PM")
  const raw = batch.name || batch.start_time || batch.startTime || batch.time_range || batch.timeRange || batch.slot || ''
  if (!raw) {
    baseDate.setHours(9, 0, 0, 0)
    return baseDate.getTime()
  }

  // Extract the first number and optional minutes
  const startMatch = raw.match(/(\d{1,2})(?::(\d{2}))?/)
  if (!startMatch) {
    baseDate.setHours(9, 0, 0, 0)
    return baseDate.getTime()
  }

  let h = parseInt(startMatch[1], 10)
  const mins = parseInt(startMatch[2] || '0', 10)

  // Try to find if there's an AM/PM immediately following the start time, e.g. "9 AM - 12 PM"
  const exactPeriodMatch = raw.match(new RegExp(startMatch[0] + '\\s*(AM|PM)', 'i'))
  let period = exactPeriodMatch ? exactPeriodMatch[1].toUpperCase() : ''

  if (!period) {
    // If not, use the global AM/PM found anywhere in the string (like "1-3 PM")
    const globalPeriodMatch = raw.match(/(AM|PM)/i)
    if (globalPeriodMatch) {
       period = globalPeriodMatch[1].toUpperCase()
       // If the global period is PM, but the start hour is morning (7-11), it's actually AM.
       if (period === 'PM' && h >= 7 && h <= 11) {
         period = 'AM'
       }
       // If global is AM, but start hour is afternoon (1-5), it's PM
       if (period === 'AM' && h >= 1 && h <= 5) {
         period = 'PM'
       }
    }
  }

  if (period === 'PM' && h !== 12) h += 12
  if (period === 'AM' && h === 12) h = 0

  baseDate.setHours(h, mins, 0, 0)
  return baseDate.getTime()
}

// Compute per-demand status using IST real-time vs stage windows (mirrors VegList logic)
function computeCounts(demands, activeTimers, batchStartMs) {
  if (demands.length === 0 || !batchStartMs) return { running: 0, delayed: 0, completed: 0, pending: 0 }

  // Build timer lookup (mobile app timers)
  const timerMap = new Map()
  activeTimers.forEach((t) => {
    if (t.productId) timerMap.set(String(t.productId), t)
    if (t.productName) timerMap.set((t.productName || '').toLowerCase().trim(), t)
  })

  let running = 0, delayed = 0, completed = 0
  let currentStartMs = batchStartMs

  for (const demand of demands) {
    const activeTimer =
      timerMap.get(String(demand.product_id)) ||
      timerMap.get((demand.product_name || '').toLowerCase().trim())

    const status = getDemandStatus(demand, currentStartMs, activeTimer?.processType || null)

    // Combine running and pending into the "In Progress" count
    if (status === 'running' || status === 'pending') running++
    else if (status === 'delayed')                    delayed++
    else if (status === 'completed')                  completed++

    // Advance start time for the next item ONLY if this one is still in the active queue
    if (status === 'running' || status === 'pending') {
      const totalMins = Number(demand.total_time_minutes) || 0
      currentStartMs += totalMins * 60 * 1000
    }
  }

  return { running, delayed, completed }
}

export default function DashboardPage() {
  const navigate = useNavigate()

  // Auth guard
  useEffect(() => {
    if (!localStorage.getItem('accessToken')) {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  const today = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedBatch, setSelectedBatch] = useState('ALL')
  const [activeTab, setActiveTab] = useState('running')

  // Data hooks
  const { data: batches = [] } = useBatches()
  const { data: batchDemands = [], isLoading: demandsLoading } = useBatchDemands(
    selectedBatch !== 'ALL' ? selectedBatch : null,
    selectedDate
  )
  const { activeTimers, isLoading: timersLoading } = useLiveTimers(selectedBatch)

  const isLoading = demandsLoading || timersLoading

  // Auto-select first batch if none selected
  useEffect(() => {
    if (selectedBatch === 'ALL' && batches.length > 0) {
      setSelectedBatch(String(batches[0].id || batches[0]._id))
    }
  }, [batches, selectedBatch])

  // Find selected batch object to parse its start time
  const selectedBatchObj = useMemo(() => {
    if (selectedBatch === 'ALL') return batches[0] || null
    return batches.find((b) => String(b.id || b._id) === selectedBatch) || null
  }, [batches, selectedBatch])

  // Force the batch to start right now so the user can see the queue running in "In Progress"
  const [demoStartMs] = useState(Date.now())
  const batchStartMs = demoStartMs

  // Counts for tab badges and metric cards — uses same IST logic as VegList
  const counts = useMemo(() =>
    computeCounts(batchDemands, activeTimers, batchStartMs),
    [batchDemands, activeTimers, batchStartMs]
  )

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('userProfile')
    navigate('/login', { replace: true })
  }

  const userProfile = (() => {
    try { return JSON.parse(localStorage.getItem('userProfile') || '{}') } catch { return {} }
  })()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header
        user={userProfile}
        onLogout={handleLogout}
        batches={batches}
        selectedBatch={selectedBatch}
        onBatchChange={setSelectedBatch}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />

      {/* Metric Cards */}
      <MetricCards
        running={counts.running}
        delayed={counts.delayed}
        completed={counts.completed}
        onTabChange={setActiveTab}
      />

      {/* Tab Bar */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-0 sm:px-6 pb-20">
        {/* Table Header — Desktop */}
        <div className="hidden sm:grid grid-cols-[auto_1fr_160px_100px_160px_100px] gap-4 px-5 py-3 bg-white border-b border-slate-200 rounded-t-2xl mt-4 mx-0 shadow-sm">
          <div className="w-7" />
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Vegetable</span>
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Stage</span>
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Time</span>
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Time Window</span>
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider text-right">Timer</span>
        </div>

        {/* List */}
        <div className={`bg-white sm:rounded-b-2xl shadow-sm overflow-hidden ${!isLoading ? 'sm:mt-0 mt-4' : ''}`}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-10 h-10 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-slate-500 font-semibold text-sm">Loading production data...</p>
            </div>
          ) : selectedBatch === 'ALL' && batches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center px-6">
              <span className="text-5xl">📋</span>
              <p className="text-slate-700 font-bold text-base">No batches found</p>
              <p className="text-slate-400 text-sm max-w-xs">Ask your manager to create batches for today</p>
            </div>
          ) : (
            <VegList 
              demands={batchDemands} 
              activeTimers={activeTimers} 
              batchStartMs={batchStartMs} 
              tab={activeTab} 
            />
          )}
        </div>

        {/* Batch Info Banner */}
        {selectedBatchObj && batchStartMs && (
          <div className="mt-4 mx-0 sm:mx-0 px-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-wrap items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 text-sm font-black shrink-0">
              ℹ
            </div>
            <div>
              <div className="text-slate-900 font-bold text-sm">
                {selectedBatchObj.name || selectedBatchObj.batch_name || 'Batch'}
                {' '}
                <span className="text-slate-400 font-medium text-xs">
                  {selectedBatchObj.time_range || selectedBatchObj.timeRange || selectedBatchObj.slot || ''}
                </span>
              </div>
              <div className="text-slate-500 text-xs mt-0.5">
                Batch starts at <strong className="text-slate-700">{new Date(batchStartMs).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</strong>
                {' · '}
                <strong className="text-slate-700">{batchDemands.length}</strong> vegetables in queue
                {' · '}
                <strong className="text-emerald-600">{counts.running}</strong> in progress
                {counts.delayed > 0 && <>{' · '}<strong className="text-red-500">{counts.delayed}</strong> delayed</>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
