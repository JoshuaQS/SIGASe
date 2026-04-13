package mx.edu.utez.server.modules.dashboard.dto;

public record DashboardTableWidgetConfig(
        int page,
        int size,
        String sortBy,
        DashboardSortDirection sortDirection
) implements DashboardWidgetConfig {
}
