import { useQuery } from "@tanstack/react-query";
import { fetchBrandAnalyticsStats, type BrandAnalyticsStats } from "@/lib/brandAnalyticsStats";

export type BrandMonitoringStats = BrandAnalyticsStats;


export { formatInrFromPaise } from "@/lib/brandAnalyticsStats";

export function useBrandMonitoringStats(brandId: string | undefined) {
  return useQuery({
    queryKey: ["brand-analytics", brandId],
    enabled: !!brandId,
    queryFn: () => fetchBrandAnalyticsStats(brandId!),
  });
}
