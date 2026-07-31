import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

/** GET /api/products — All available vegetable/product list */
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await api.get('/api/products')
      const data = res.data
      if (Array.isArray(data)) return data
      if (Array.isArray(data?.products)) return data.products
      if (Array.isArray(data?.data)) return data.data
      return []
    },
    refetchInterval: 5 * 60_000,  // Products rarely change — 5 min kaafi hai
    staleTime: 4 * 60_000,        // 4 min fresh
  })
}
