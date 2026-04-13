package mx.edu.utez.server.modules.dashboard.dto;

/**
 * Subcontrato acotado para tablas locales del layout.
 *
 * <p>Esta fase solo formaliza paginación/orden para widgets tabulares no rankeables y evita meter
 * un árbol arbitrario de controles por widget en el request principal.
 */
public record DashboardTableWidgetControlRequest(
        Integer page,
        Integer size,
        String sortBy,
        DashboardSortDirection sortDirection
) {
}
