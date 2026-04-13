package mx.edu.utez.server.modules.dashboard.dto;

/**
 * Payload flexible temporal del dashboard adaptativo.
 *
 * <p>Endurecimiento progresivo:
 * {@code data} y {@code config} ya avanzan hacia payloads tipados por {@code widgetType} sin
 * romper {@code layoutType/widgetId/type}. Los widgets que todavía no tengan una abstracción más
 * específica deben migrarse de forma incremental en futuras fases.
 */
public record DashboardWidgetResponse(
        String widgetId,
        DashboardWidgetType type,
        String title,
        int order,
        DashboardWidgetConfig config,
        DashboardWidgetData data
) {
}
