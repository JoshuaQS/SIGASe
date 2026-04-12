package mx.edu.utez.server.modules.dashboard.service.analysis;

import java.util.List;
import java.util.Map;
import mx.edu.utez.server.modules.dashboard.dto.DashboardLayoutType;
import mx.edu.utez.server.modules.dashboard.dto.DashboardWidgetType;
import org.springframework.stereotype.Component;

@Component
public class DashboardWidgetComposer {

    public static final int OVERVIEW_TOP_LIMIT = 10;
    public static final int STUDENT_ACTIVITY_DEFAULT_PAGE = 0;
    public static final int STUDENT_ACTIVITY_DEFAULT_SIZE = 20;

    public List<DashboardWidgetDefinition> compose(DashboardLayoutType layoutType, ResolvedDashboardAnalysisContext context) {
        return switch (layoutType) {
            case OVERVIEW -> List.of(
                    new DashboardWidgetDefinition("overview-kpis", DashboardWidgetType.KPI_GROUP, "Resumen general", 1, Map.of()),
                    new DashboardWidgetDefinition("overview-trend", DashboardWidgetType.AREA_TREND, "Tendencia de accesos", 2, Map.of()),
                    new DashboardWidgetDefinition(
                            "overview-top-students",
                            DashboardWidgetType.TOP_STUDENTS_TABLE,
                            "Top estudiantes",
                            3,
                            Map.of("limit", OVERVIEW_TOP_LIMIT, "sortDirection", context.effectiveSortDirection().name())
                    ),
                    new DashboardWidgetDefinition(
                            "overview-top-careers",
                            DashboardWidgetType.TOP_CAREERS_TABLE,
                            "Top carreras",
                            4,
                            Map.of("limit", OVERVIEW_TOP_LIMIT, "sortDirection", context.effectiveSortDirection().name())
                    )
            );
            case STUDENT_DETAIL -> List.of(
                    new DashboardWidgetDefinition("student-detail-kpis", DashboardWidgetType.KPI_GROUP, "Resumen del alumno", 1, Map.of()),
                    new DashboardWidgetDefinition("student-detail-trend", DashboardWidgetType.AREA_TREND, "Tendencia del alumno", 2, Map.of()),
                    new DashboardWidgetDefinition("student-access-summary", DashboardWidgetType.STUDENT_ACCESS_SUMMARY, "Resumen de accesos", 3, Map.of()),
                    new DashboardWidgetDefinition(
                            "student-activity-table",
                            DashboardWidgetType.STUDENT_ACTIVITY_TABLE,
                            "Actividad del alumno",
                            4,
                            Map.of(
                                    "page", STUDENT_ACTIVITY_DEFAULT_PAGE,
                                    "size", STUDENT_ACTIVITY_DEFAULT_SIZE,
                                    "sortBy", "occurredAt",
                                    "sortDirection", "DESC"
                            )
                    )
            );
            default -> throw new IllegalArgumentException("El layout todavía no está soportado por el composer.");
        };
    }

    public record DashboardWidgetDefinition(
            String widgetId,
            DashboardWidgetType type,
            String title,
            int order,
            Map<String, Object> config
    ) {
    }
}
