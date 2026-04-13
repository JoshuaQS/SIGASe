package mx.edu.utez.server.modules.dashboard.dto;

public record DashboardComparisonWidgetConfig(
        String sortBy,
        DashboardSortDirection sortDirection
) implements DashboardWidgetConfig {
}
