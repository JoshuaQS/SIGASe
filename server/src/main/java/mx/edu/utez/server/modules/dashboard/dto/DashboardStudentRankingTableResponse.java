package mx.edu.utez.server.modules.dashboard.dto;

import java.util.List;

/**
 * Shape esperado del widget STUDENT_RANKING_TABLE.
 *
 * <p>{@code topN} y {@code sortDirection} solo afectan este widget rankeable; no alteran el
 * universo base utilizado por KPI_GROUP ni por STUDENT_RESULT_BREAKDOWN.
 */
public record DashboardStudentRankingTableResponse(
        int topN,
        String sortDirection,
        long totalCandidates,
        List<DashboardStudentRankingTableItemResponse> items
) implements DashboardWidgetData {
}
