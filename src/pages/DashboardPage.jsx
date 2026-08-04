import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import MetricCards from '../components/MetricCards'
import TabBar from '../components/TabBar'
import VegList, { getDemandStatus, classifyDemand } from '../components/VegList'
import { useProcessingLogs } from '../hooks/useProcessingLogs'
import { useBatches } from '../hooks/useBatches'

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

function computeCounts(logs) {
  const counts = { soaking: 0, cleaning: 0, cutting: 0, drying: 0, weighting: 0, running: 0, pending: 0, delayed: 0, completed: 0 }
  
  for (const log of logs) {
    const stageKey = log.process_type
    if (stageKey && counts[stageKey] !== undefined) {
      counts[stageKey]++
    }
    
    if (log.start_time && !log.end_time) {
      counts.running++
    } else if (log.end_time) {
      counts.completed++
    }
  }

  return counts
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
  const [activeTab, setActiveTab] = useState('soaking')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Data hooks
  // Data hooks
  const { data: batches = [] } = useBatches()
  const { data: rawLogs = [], isLoading } = useProcessingLogs(selectedDate)

  // Auto-update date when a new day arrives
  useEffect(() => {
    const timer = setInterval(() => {
      const liveToday = new Date().toISOString().split('T')[0]
      setSelectedDate((prev) => (prev !== liveToday ? liveToday : prev))
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  // Flatten processing logs (ignoring old abandoned overtime logs and empty 0s unstarted rows)
  const allLogs = useMemo(() => {
    const flat = []
    const now = Date.now()
    rawLogs.forEach(product => {
      if (product.processes) {
        Object.keys(product.processes).forEach(processType => {
          product.processes[processType].forEach(log => {
            const isRunning = log.start_time && !log.end_time
            const isCompleted = !!log.end_time
            const startMs = log.start_time ? new Date(log.start_time).getTime() : null
            const expectedMins = Number(log.expected_time_taken_minutes) || 0
            const expectedMs = expectedMins > 0 ? expectedMins * 60 * 1000 : 5 * 60 * 1000

            // 1. Skip dummy unstarted rows that have 0 expected time
            if (!isRunning && !isCompleted && expectedMins <= 0) {
              return
            }

            // 2. Skip abandoned overtime logs (e.g. overtime > 3 mins or running > 15 mins)
            if (isRunning && startMs) {
              const elapsed = now - startMs
              const overtime = elapsed - expectedMs
              const isAbandoned = overtime > Math.max(180000, expectedMs * 2) || elapsed > 15 * 60 * 1000
              if (isAbandoned) {
                return
              }
            }

            flat.push({
              ...log,
              product_id: product.product_id,
              product_name: product.product_name,
              hindi_name: product.hindi_name,
              image_url: product.image_url,
              unit: product.unit,
            })
          })
        })
      }
    })
    // Sort by id or start time desc
    return flat.sort((a, b) => b.id - a.id)
  }, [rawLogs])

  // Filter logs by selected batch
  const batchLogs = useMemo(() => {
    if (selectedBatch === 'ALL') return allLogs
    return allLogs.filter(log => String(log.batch_id) === selectedBatch)
  }, [allLogs, selectedBatch])

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

  // Counts for tab badges
  const counts = useMemo(() => computeCounts(batchLogs), [batchLogs])

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

      {/* Metric Cards (Hidden as per request) */}
      {/* 
      <MetricCards
        running={counts.running}
        delayed={counts.delayed}
        completed={counts.completed}
        onTabChange={setActiveTab}
      />
      */}

      {/* Tab Bar */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-0 sm:px-6 pb-20">
        {/* Batch Info Banner */}
        {selectedBatchObj && batchStartMs && (
          <div className="mt-4 mb-2 mx-0 sm:mx-0 px-5 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-wrap items-center gap-4 relative overflow-hidden">
            {/* Subtle background decoration */}
            <div className="absolute right-0 top-0 w-32 h-32 bg-blue-100 opacity-50 blur-3xl rounded-full transform translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 text-lg font-black shrink-0 relative z-10 border border-blue-100">
              ℹ
            </div>
            <div className="relative z-10">
              <div className="text-slate-800 font-bold text-base flex items-center gap-2">
                {selectedBatchObj.name || selectedBatchObj.batch_name || 'Batch'}
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold text-xs border border-blue-100">
                  {selectedBatchObj.time_range || selectedBatchObj.timeRange || selectedBatchObj.slot || ''}
                </span>
              </div>
              <div className="text-slate-500 text-sm mt-1 flex items-center gap-2 flex-wrap">
                <span>Starts <strong className="text-slate-700">{new Date(batchStartMs).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</strong></span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span 
                  className={`cursor-pointer transition-colors px-2 py-0.5 rounded-md -ml-2 ${statusFilter === 'ALL' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => setStatusFilter('ALL')}
                >
                  <strong className={statusFilter === 'ALL' ? 'text-slate-800' : 'text-slate-600'}>{batchLogs.length}</strong> tasks
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span 
                  className={`cursor-pointer transition-colors px-2 py-0.5 rounded-md -mx-2 ${statusFilter === 'running' ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'hover:bg-slate-50 text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setStatusFilter(prev => prev === 'running' ? 'ALL' : 'running')}
                >
                  <strong className="text-blue-600">{counts.running}</strong> running
                </span>
                {counts.delayed > 0 && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span 
                      className={`cursor-pointer transition-colors px-2 py-0.5 rounded-md -mx-2 ${statusFilter === 'delayed' ? 'bg-red-50 text-red-600 ring-1 ring-red-200' : 'text-red-500/80 hover:bg-red-50 hover:text-red-600'}`}
                      onClick={() => setStatusFilter(prev => prev === 'delayed' ? 'ALL' : 'delayed')}
                    >
                      <strong>{counts.delayed}</strong> delayed
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Table Header — Desktop */}
        <div className="hidden sm:grid grid-cols-[1fr_160px_100px_120px] gap-4 px-5 py-3 bg-white border-b border-slate-200 rounded-t-2xl mt-2 mx-0 shadow-sm">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Vegetable</span>
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Stage</span>
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Time</span>
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
              logs={batchLogs} 
              tab={activeTab}
              statusFilter={statusFilter}
            />
          )}
        </div>

      </div>
    </div>
  )
}
