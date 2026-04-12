package mx.edu.utez.server.modules.dashboard.dto;

import java.util.Map;

/**
 * Payload flexible temporal del dashboard adaptativo.
 *
 * <p>Deuda técnica controlada: {@code data} y {@code config} son blandos en esta etapa y después
 * deberán tiparse por {@code widgetType} para endurecer el contrato sin romper
 * {@code layoutType/widgetId/type}.
 */
public record DashboardWidgetResponse(
        String widgetId,
        DashboardWidgetType type,
        String title,
        int order,
        Map<String, Object> config,
        Object data
) {
}
