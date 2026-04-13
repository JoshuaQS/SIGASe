package mx.edu.utez.server.modules.dashboard.dto;

public record DashboardBreakdownWidgetConfig(
        String sortBy,
        DashboardSortDirection sortDirection,
        String tieBreaker
) implements DashboardWidgetConfig {
}
