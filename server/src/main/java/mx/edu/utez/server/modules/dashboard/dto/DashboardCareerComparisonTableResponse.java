package mx.edu.utez.server.modules.dashboard.dto;

import java.util.List;

/**
 * Comparativo agregado de carreras del universo filtrado.
 *
 * <p>En el corte actual el backend fija el orden por {@code careerCode} ascendente; no es un orden
 * configurable todavía.
 */
public record DashboardCareerComparisonTableResponse(
        String sortBy,
        String sortDirection,
        long totalCareers,
        List<DashboardCareerComparisonItemResponse> items
) implements DashboardWidgetData {
}
