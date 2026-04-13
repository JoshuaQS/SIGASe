package mx.edu.utez.server.modules.dashboard.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Request parcial del wizard de análisis.
 *
 * <p>Acepta únicamente lo que el usuario ya seleccionó hasta el paso actual; no exige el request
 * final completo del endpoint principal de analysis.
 */
public record DashboardAnalysisOptionsRequest(
        DashboardFilterScope scope,
        DashboardFilterMode mode,
        UUID studentId,
        List<UUID> careerIds,
        DashboardAccessResultFilter accessResult,
        DashboardDateFilterType dateFilterType,
        Instant dateFrom,
        Instant dateTo,
        DashboardRankingMode rankingMode,
        Integer topN,
        DashboardSortDirection sortDirection
) {
}
