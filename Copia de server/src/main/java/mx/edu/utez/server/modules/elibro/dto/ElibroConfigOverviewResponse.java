package mx.edu.utez.server.modules.elibro.dto;

import java.util.List;

public record ElibroConfigOverviewResponse(
        ElibroOverviewConfig config,
        ElibroOverviewStatus status,
        ElibroOverviewChecklist checklist,
        ElibroOverviewKpis kpis,
        ElibroOverviewCharts charts,
        List<ElibroOverviewRecentActivity> recentActivity,
        List<ElibroOverviewInsight> insights
) {
}
