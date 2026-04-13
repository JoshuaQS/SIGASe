package mx.edu.utez.server.modules.dashboard.dto;

/**
 * Envelope explícito para exportación.
 *
 * <p>El contrato final de analysis sigue viviendo en {@link DashboardAnalysisRequest}; export solo
 * añade el formato de salida.
 */
public record DashboardAnalysisExportRequest(
        DashboardAnalysisRequest analysis,
        DashboardExportFormat format
) {
}
