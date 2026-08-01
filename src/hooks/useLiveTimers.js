import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'

/** Helper to normalize timer objects from backend API responses */
function normalizeTimer(t) {
  if (!t) return null
  const now = Date.now()
  const startedAt = Number(
    t.startedAt || t.started_at || t.createdAt || t.created_at || now
  )
  const durationSeconds = Number(
    t.durationSeconds || t.duration_seconds || t.duration || 300
  )
  const endedAt = Number(
    t.endedAt || t.ended_at || (startedAt + durationSeconds * 1000)
  )

  const processRaw = t.processName || t.process_name || t.processType || t.process_type || 'soaking'

  return {
    id: String(t.id || t._id || `timer-${Date.now()}`),
    productId: t.productId || t.product_id,
    productName: t.productName || t.product_name || t.product?.name || t.name || 'Production Item',
    employeeId: t.employeeId || t.employee_id || t.user_id,
    employeeName: t.employeeName || t.employee_name || t.workerName || t.worker_name || t.user?.name || t.user?.email || 'Worker',
    processName: processRaw,
    processType: String(processRaw).toLowerCase(),
    batchId: String(t.batchId || t.batch_id || t.batch_number || 'ALL'),
    startedAt,
    durationSeconds,
    endedAt,
    processedQty: Number(t.processedQty || t.processed_qty || t.quantity || 1000),
    unit: t.unit || 'gm',
    emoji: t.emoji || t.product?.emoji || '🥗',
    completedStages: Array.isArray(t.completedStages) ? t.completedStages : [],
    status: t.status || 'running',
    finalWeight: t.finalWeight || t.final_weight || null,
  }
}

/**
 * GET /api/timers/active & /api/timers — All currently active running timers
 * Live 2-second fast polling to sync instantly with mobile app timer starts.
 */
export function useLiveTimers(batchId) {
  const activeQuery = useQuery({
    queryKey: ['timers-active', batchId],
    queryFn: async () => {
      try {
        // Fetch ALL active timers. VegList matches by productId/productName anyway, 
        // which avoids issues if a timer was created without a batch_id
        const res = await api.get('/api/timers/active')
        let rawList = res.data?.timers || []

        // Also fetch any local active timers saved in localStorage
        let localTimers = []
        try {
          const stored = localStorage.getItem('active_timers')
          if (stored) localTimers = JSON.parse(stored)
        } catch (_e) {}

        const mergedMap = new Map()
        ;[...localTimers, ...rawList].forEach((t) => {
          const norm = normalizeTimer(t)
          if (norm && norm.id) {
            mergedMap.set(norm.id, norm)
          }
        })

        return Array.from(mergedMap.values())
      } catch {
        return []
      }
    },
    refetchInterval: 2000, // Poll every 2 seconds for real-time sync with mobile app
    retry: false,
  })

  /**
   * GET /api/logs/activity — Activity logs (completed stages) from the backend.
   */
  const activityLogsQuery = useQuery({
    queryKey: ['logs-activity'],
    queryFn: async () => {
      // Removed unnecessary API polling
      return []
    },
    retry: false,
    staleTime: Infinity,
  })

  /**
   * GET /api/logs — General logs
   */
  const logsQuery = useQuery({
    queryKey: ['logs-general'],
    queryFn: async () => {
      // Removed unnecessary API polling
      return []
    },
    retry: false,
    staleTime: Infinity,
  })

  // Merge activityLogs + general logs, deduplicate by id
  const completedLogs = (() => {
    const actLogs = activityLogsQuery.data || []
    const genLogs = (logsQuery.data || []).filter((l) => l.status === 'completed' || l.finalWeight)
    const merged = new Map()
    ;[...genLogs, ...actLogs].forEach((l) => {
      if (l && (l.id || l._id)) {
        merged.set(String(l.id || l._id), l)
      }
    })
    return Array.from(merged.values())
  })()

  return {
    activeTimers: activeQuery.data || [],
    completedLogs,
    isLoading: activeQuery.isLoading,
    refetchActive: activeQuery.refetch,
  }
}

/** POST /api/timers/:id/cancel — Cancel an active timer */
export function useCancelTimer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (timerId) => {
      const res = await api.post(`/api/timers/${timerId}/cancel`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timers-active'] })
      queryClient.invalidateQueries({ queryKey: ['logs-general'] })
    },
  })
}

/** POST /api/timers — Start a new production timer */
export function useStartTimer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ product_id, process_name, duration_seconds }) => {
      const res = await api.post('/api/timers', {
        product_id,
        process_name,
        duration_seconds,
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timers-active'] })
    },
  })
}

/** POST /api/admin/batches/:batchId/demands/process — Record partial stage processing */
export function useProcessDemand() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ batchId, payload }) => {
      const res = await api.post(
        `/api/admin/batches/${batchId}/demands/process`,
        payload
      )
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-demands'] })
      queryClient.invalidateQueries({ queryKey: ['timers-active'] })
    },
  })
}

/** POST /api/admin/batches/:batchId/demands/complete — Mark a demand as fully completed */
export function useCompleteDemand() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ batchId, payload }) => {
      const res = await api.post(
        `/api/admin/batches/${batchId}/demands/complete`,
        payload
      )
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-demands'] })
      queryClient.invalidateQueries({ queryKey: ['logs-activity'] })
      queryClient.invalidateQueries({ queryKey: ['logs-general'] })
    },
  })
}
