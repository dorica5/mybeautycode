import { api } from "@/src/lib/apiClient";
import { useMutation, useQuery } from "@tanstack/react-query";

export const useSaveInspirationToDatabase = () => {
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return api.post("/api/inspirations", data);
    },
  });
};

export const useFetchInspirationImages = (owner_id: string) => {
  return useQuery({
    queryKey: ["inspirationImage", owner_id],
    queryFn: () =>
      api.get<unknown[]>(
        `/api/inspirations?owner_id=${encodeURIComponent(owner_id)}`
      ),
    enabled: !!owner_id,
  });
};
