package mx.edu.utez.server.modules.dashboard.dto;

import java.util.List;

/**
 * Shape esperado del widget STUDENT_ACTIVITY_TABLE.
 *
 * <p>Expone el estado efectivo de paginación y orden local aplicado por backend:
 * {@code page}, {@code size}, {@code totalElements}, {@code sortBy}, {@code sortDirection} e
 * {@code items}.
 */
public record DashboardStudentActivityTableResponse(
        int page,
        int size,
        long totalElements,
        String sortBy,
        DashboardSortDirection sortDirection,
        List<DashboardStudentActivityItemResponse> items
) implements DashboardWidgetData {
}
