package mx.edu.utez.server.modules.dashboard.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record DashboardAnalysisRequest(
        DashboardFilterScope scope,
        DashboardFilterMode mode,
        UUID studentId,
        List<UUID> careerIds,
        DashboardAccessResultFilter accessResult,
        DashboardDateFilterType dateFilterType,
        Instant dateFrom,
        Instant dateTo,
        DashboardRankingMode rankingMode,
        Integer topN,
        DashboardSortDirection sortDirection
) {
}
