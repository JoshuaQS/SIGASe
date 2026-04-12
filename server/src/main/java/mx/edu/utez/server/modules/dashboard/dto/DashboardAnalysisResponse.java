package mx.edu.utez.server.modules.dashboard.dto;

import java.util.List;

public record DashboardAnalysisResponse(
        DashboardFilterSummary summary,
        DashboardLayoutType layoutType,
        List<DashboardWidgetResponse> widgets
) {
}
