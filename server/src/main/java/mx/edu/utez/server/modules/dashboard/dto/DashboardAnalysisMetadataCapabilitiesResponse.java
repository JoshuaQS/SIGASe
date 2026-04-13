package mx.edu.utez.server.modules.dashboard.dto;

public record DashboardAnalysisMetadataCapabilitiesResponse(
        boolean adaptiveAnalysis,
        boolean contextualOptions,
        boolean autocomplete,
        boolean export
) {
}
