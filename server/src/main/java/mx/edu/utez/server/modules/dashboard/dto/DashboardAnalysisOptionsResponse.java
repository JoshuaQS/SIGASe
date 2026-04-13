package mx.edu.utez.server.modules.dashboard.dto;

import java.util.List;

/**
 * Respuesta contextual del wizard.
 *
 * <p>En este endpoint es deliberado responder {@code 200 OK} para muchos estados parciales del
 * flujo y comunicar progreso con {@code canSubmit=false}, {@code nextStep} y
 * {@code missingRequiredFields}, en lugar de fallar con {@code 400}.
 */
public record DashboardAnalysisOptionsResponse(
        List<DashboardFilterMode> allowedModes,
        List<DashboardAccessResultFilter> allowedAccessResults,
        DashboardAnalysisOptionsRankingResponse ranking,
        DashboardAnalysisOptionsDateFilterResponse dateFilter,
        List<DashboardAnalysisField> requiredFields,
        List<DashboardAnalysisField> forbiddenFields,
        DashboardAnalysisOptionsEffectiveDefaultsResponse effectiveDefaults,
        boolean canSubmit,
        DashboardAnalysisField nextStep,
        List<DashboardAnalysisField> missingRequiredFields
) {
}
