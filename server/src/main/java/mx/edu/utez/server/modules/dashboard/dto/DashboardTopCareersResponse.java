package mx.edu.utez.server.modules.dashboard.dto;

import java.util.List;

public record DashboardTopCareersResponse(
        String dateFrom,
        String dateTo,
        int limit,
        String sortDir,
        List<DashboardTopCareerItemResponse> careers
) implements DashboardWidgetData {
}
