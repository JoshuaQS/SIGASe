package mx.edu.utez.server.modules.dashboard.dto;

/**
 * Controles opcionales de widgets tabulares del analysis request.
 *
 * <p>En este corte solo se formalizan:
 * {@code studentActivityTable} y {@code careerStudentTable}. La expansión a tablas de ranking debe
 * mantenerse versionada y explícita, no implícita.
 */
public record DashboardAnalysisWidgetControlsRequest(
        DashboardTableWidgetControlRequest studentActivityTable,
        DashboardTableWidgetControlRequest careerStudentTable
) {
}
