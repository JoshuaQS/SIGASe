package mx.edu.utez.server.modules.dashboard.dto;

import java.util.List;

public record DashboardAnalysisOptionsDateFilterResponse(
        List<DashboardDateFilterType> allowed,
        DashboardDateFilterType defaultType
) {
}
