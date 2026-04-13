package mx.edu.utez.server.modules.dashboard.dto;

public record DashboardTopListWidgetConfig(
        int limit,
        DashboardSortDirection sortDirection
) implements DashboardWidgetConfig {
}
