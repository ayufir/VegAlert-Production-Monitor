import { useQuery } from "@tanstack/react-query";
import api from "../api/axios";

export function useProcessingLogs(date) {
  const today = date || new Date().toISOString().split("T")[0];
  return useQuery({
    queryKey: ["processing-logs", today],
    queryFn: async () => {
      const res = await api.get("/api/admin/processing-logs", {
        params: { date: today },
      });
      const data = res.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data)) return data.data;
      return [];
    },
    refetchInterval: 2_000, // Poll every 2 seconds for instant live sync
    staleTime: 1_000,
  });
}
