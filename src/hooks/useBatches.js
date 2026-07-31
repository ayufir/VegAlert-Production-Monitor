import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

/** GET /api/user/batches — All batches assigned to the logged-in user */
export function useBatches() {
  return useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      const res = await api.get('/api/user/batches')
      const data = res.data
      if (Array.isArray(data)) return data
      if (Array.isArray(data?.batches)) return data.batches
      if (Array.isArray(data?.data)) return data.data
      return []
    },
    refetchInterval: 30_000,   // har 30 sec mein — 5s ki jagah
    staleTime: 20_000,
  })
}

/** GET /api/admin/batches/:batchId/demands?date=YYYY-MM-DD — Demands for a specific batch and date */
export function useBatchDemands(batchId, date) {
  const today = date || new Date().toISOString().split('T')[0]
  return useQuery({
    queryKey: ['batch-demands', batchId, today],
    enabled: !!batchId && batchId !== 'ALL',
    queryFn: async () => {
      const res = await api.get(`/api/admin/batches/${batchId}/demands`, {
        params: { date: today },
      })
      const data = res.data
      if (Array.isArray(data)) return data
      if (Array.isArray(data?.demands)) return data.demands
      if (Array.isArray(data?.data)) return data.data
      return []
    },
    refetchInterval: 30_000,   // har 30 sec mein
    staleTime: 20_000,
  })
}
