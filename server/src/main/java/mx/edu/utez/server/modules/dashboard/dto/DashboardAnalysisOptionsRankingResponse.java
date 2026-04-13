package mx.edu.utez.server.modules.dashboard.dto;

import java.util.List;

public record DashboardAnalysisOptionsRankingResponse(
        boolean allowed,
        List<DashboardRankingMode> allowedModes,
        List<Integer> allowedTopN,
        Integer defaultTopN,
        DashboardSortDirection defaultSortDirection
) {
}
