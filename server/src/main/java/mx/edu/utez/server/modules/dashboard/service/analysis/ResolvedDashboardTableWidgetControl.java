package mx.edu.utez.server.modules.dashboard.service.analysis;

import mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection;

public record ResolvedDashboardTableWidgetControl(
        int page,
        int size,
        String sortBy,
        DashboardSortDirection sortDirection
) {
}
