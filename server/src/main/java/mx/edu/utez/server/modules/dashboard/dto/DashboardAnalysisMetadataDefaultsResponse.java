package mx.edu.utez.server.modules.dashboard.dto;

public record DashboardAnalysisMetadataDefaultsResponse(
        DashboardAccessResultFilter accessResult,
        DashboardDateFilterType dateFilterType,
        DashboardRankingMode rankingMode,
        DashboardSortDirection sortDirection
) {
}
