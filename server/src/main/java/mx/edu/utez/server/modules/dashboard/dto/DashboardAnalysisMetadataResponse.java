package mx.edu.utez.server.modules.dashboard.dto;

import java.util.List;

/**
 * Catálogo global y estable del wizard de análisis.
 *
 * <p>No debe absorber reglas contextuales ni resolución dinámica; esas viven en
 * {@code POST /analysis/options}.
 */
public record DashboardAnalysisMetadataResponse(
        List<DashboardFilterScope> scopes,
        List<DashboardFilterMode> modes,
        List<DashboardAccessResultFilter> accessResults,
        List<DashboardRankingMode> rankingModes,
        DashboardAnalysisMetadataDateStrategyResponse dateStrategy,
        DashboardAnalysisMetadataDefaultsResponse defaults,
        DashboardAnalysisMetadataContractResponse contract
) {
}
