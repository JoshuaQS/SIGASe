package mx.edu.utez.server.modules.dashboard.dto;

import java.util.List;

public record DashboardAccessTrendsResponse(
        String dateFrom,
        String dateTo,
        List<DashboardTrendPointResponse> points
) {
}
