package mx.edu.utez.server.modules.dashboard.dto;

/**
 * Defaults efectivos sugeridos para orquestar el wizard.
 *
 * <p>No reemplazan la validación final ni mutan silenciosamente el contrato de
 * {@code POST /api/v1/dashboard/analysis}; el request final sigue validándose de forma estricta.
 */
public record DashboardAnalysisOptionsEffectiveDefaultsResponse(
        DashboardAccessResultFilter accessResult,
        DashboardDateFilterType dateFilterType,
        DashboardRankingMode rankingMode,
        Integer topN,
        DashboardSortDirection sortDirection
) {
}
