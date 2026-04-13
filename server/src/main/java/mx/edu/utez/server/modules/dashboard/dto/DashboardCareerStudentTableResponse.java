package mx.edu.utez.server.modules.dashboard.dto;

import java.util.List;

/**
 * Shape esperado del widget CAREER_STUDENT_TABLE.
 *
 * <p>El contrato interno del widget deja explícitos:
 * {@code page}, {@code size}, {@code totalElements}, {@code sortBy}, {@code sortDirection} e
 * {@code items}, con métricas agregadas por alumno para soportar paginación real y evolución
 * posterior de sorting externo.
 *
 * <p>Regla analítica deliberada de este corte:
 * solo lista alumnos con actividad dentro del rango filtrado; todavía no incluye alumnos de la
 * carrera con cero accesos.
 */
public record DashboardCareerStudentTableResponse(
        int page,
        int size,
        long totalElements,
        String sortBy,
        DashboardSortDirection sortDirection,
        List<DashboardCareerStudentTableItemResponse> items
) implements DashboardWidgetData {
}
