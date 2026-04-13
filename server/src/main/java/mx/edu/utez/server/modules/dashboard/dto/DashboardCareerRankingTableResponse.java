package mx.edu.utez.server.modules.dashboard.dto;

import java.util.List;

/**
 * Shape esperado de los widgets rankeables de carreras.
 *
 * <p>{@code topN} y {@code sortDirection} solo afectan estos widgets rankeables y no alteran el
 * universo base usado por KPI_GROUP.
 *
 * <p>{@code rankingMetric} es un contrato controlado por backend; no es un valor libre enviado por
 * frontend.
 */
public record DashboardCareerRankingTableResponse(
        int topN,
        String sortDirection,
        String rankingMetric,
        long totalCandidates,
        List<DashboardCareerRankingTableItemResponse> items
) implements DashboardWidgetData {
}
