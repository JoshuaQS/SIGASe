package mx.edu.utez.server.modules.dashboard.dto;

import java.time.Instant;

public record DashboardFilterSummary(
        DashboardFilterScope scope,
        DashboardFilterMode mode,
        DashboardAccessResultFilter accessResult,
        DashboardDateFilterType dateFilterType,
        Instant dateFrom,
        Instant dateTo,
        DashboardRankingMode rankingMode,
        Integer topN,
        DashboardSortDirection sortDirection
) {
}
