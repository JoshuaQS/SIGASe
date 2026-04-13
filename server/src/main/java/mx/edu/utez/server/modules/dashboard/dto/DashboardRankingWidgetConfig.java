package mx.edu.utez.server.modules.dashboard.dto;

public record DashboardRankingWidgetConfig(
        int topN,
        DashboardSortDirection sortDirection
) implements DashboardWidgetConfig {
}
