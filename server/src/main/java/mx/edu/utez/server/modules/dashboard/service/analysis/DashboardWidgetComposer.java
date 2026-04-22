package mx.edu.utez.server.modules.dashboard.service.analysis;

import java.util.List;
import java.util.Set;
import mx.edu.utez.server.modules.dashboard.dto.DashboardEmptyWidgetConfig;
import mx.edu.utez.server.modules.dashboard.dto.DashboardLayoutType;
import mx.edu.utez.server.modules.dashboard.dto.DashboardRankingWidgetConfig;
import mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTableWidgetConfig;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTopListWidgetConfig;
import mx.edu.utez.server.modules.dashboard.dto.DashboardWidgetConfig;
import mx.edu.utez.server.modules.dashboard.dto.DashboardWidgetType;
import org.springframework.stereotype.Component;

@Component
public class DashboardWidgetComposer {

    // Overview top widgets should expose the complete ranking by default.
    // Frontend pagination handles visual chunking.
    public static final int OVERVIEW_TOP_LIMIT = 1000;
    public static final int STUDENT_ACTIVITY_DEFAULT_PAGE = 0;
    public static final int STUDENT_ACTIVITY_DEFAULT_SIZE = 20;
    public static final int STUDENT_ACTIVITY_MAX_SIZE = 100;
    public static final String STUDENT_ACTIVITY_DEFAULT_SORT_BY = "occurredAt";
    public static final DashboardSortDirection STUDENT_ACTIVITY_DEFAULT_SORT_DIRECTION = DashboardSortDirection.DESC;
    public static final Set<String> STUDENT_ACTIVITY_ALLOWED_SORT_BY = Set.of(
            "occurredAt",
            "result",
            "latencyMs",
            "channelName"
    );
    public static final int STUDENT_RANKING_DEFAULT_TOP_N = 10;
    public static final DashboardSortDirection STUDENT_RANKING_DEFAULT_SORT_DIRECTION = DashboardSortDirection.DESC;
    public static final Set<Integer> STUDENT_RANKING_ALLOWED_TOP_N = Set.of(1, 5, 10, 20, 50);
    public static final int CAREER_RANKING_DEFAULT_TOP_N = 10;
    public static final DashboardSortDirection CAREER_RANKING_DEFAULT_SORT_DIRECTION = DashboardSortDirection.DESC;
    public static final Set<Integer> CAREER_RANKING_ALLOWED_TOP_N = Set.of(1, 5, 10, 20, 50);
    public static final int CAREER_STUDENT_TABLE_DEFAULT_PAGE = 0;
    public static final int CAREER_STUDENT_TABLE_DEFAULT_SIZE = 20;
    public static final int CAREER_STUDENT_TABLE_MAX_SIZE = 100;
    public static final String CAREER_STUDENT_TABLE_DEFAULT_SORT_BY = "totalAccesses";
    public static final DashboardSortDirection CAREER_STUDENT_TABLE_DEFAULT_SORT_DIRECTION = DashboardSortDirection.DESC;
    public static final Set<String> CAREER_STUDENT_TABLE_ALLOWED_SORT_BY = Set.of(
            "totalAccesses",
            "successfulAccesses",
            "failedAccesses",
            "studentName",
            "enrollmentId"
    );
    public static final String RESULT_BREAKDOWN_DEFAULT_SORT_BY = "total";
    public static final DashboardSortDirection RESULT_BREAKDOWN_DEFAULT_SORT_DIRECTION = DashboardSortDirection.DESC;
    public static final String RESULT_BREAKDOWN_DEFAULT_TIE_BREAKER = "result";
    public static final String CAREER_COMPARISON_DEFAULT_SORT_BY = "careerCode";
    public static final DashboardSortDirection CAREER_COMPARISON_DEFAULT_SORT_DIRECTION = DashboardSortDirection.ASC;

    public List<DashboardWidgetDefinition> compose(DashboardLayoutType layoutType, ResolvedDashboardAnalysisContext context) {
        return switch (layoutType) {
            case OVERVIEW -> List.of(
                    new DashboardWidgetDefinition("overview-kpis", DashboardWidgetType.KPI_GROUP, "Resumen general", 1, new DashboardEmptyWidgetConfig()),
                    new DashboardWidgetDefinition("overview-trend", DashboardWidgetType.AREA_TREND, "Tendencia de accesos", 2, new DashboardEmptyWidgetConfig()),
                    new DashboardWidgetDefinition(
                            "overview-top-careers",
                            DashboardWidgetType.TOP_CAREERS_TABLE,
                            "Carreras con accesos a eLibro",
                            3,
                            new DashboardTopListWidgetConfig(OVERVIEW_TOP_LIMIT, context.effectiveSortDirection())
                    ),
                    new DashboardWidgetDefinition(
                            "overview-top-students",
                            DashboardWidgetType.TOP_STUDENTS_TABLE,
                            "Estudiantes con accesos a eLibro",
                            4,
                            new DashboardTopListWidgetConfig(OVERVIEW_TOP_LIMIT, context.effectiveSortDirection())
                    )
            );
            case STUDENT_DETAIL -> List.of(
                    new DashboardWidgetDefinition("student-detail-trend", DashboardWidgetType.AREA_TREND, "Accesos a eLibro por tiempo", 1, new DashboardEmptyWidgetConfig()),
                    new DashboardWidgetDefinition("student-access-summary", DashboardWidgetType.STUDENT_ACCESS_SUMMARY, "Resumen de accesos a eLibro", 2, new DashboardEmptyWidgetConfig())
            );
            case CAREER_DETAIL -> List.of(
                    new DashboardWidgetDefinition("career-detail-kpis", DashboardWidgetType.KPI_GROUP, "KPIs de la carrera", 1, new DashboardEmptyWidgetConfig()),
                    new DashboardWidgetDefinition("career-detail-trend", DashboardWidgetType.AREA_TREND, "Accesos a eLibro por tiempo", 2, new DashboardEmptyWidgetConfig()),
                    new DashboardWidgetDefinition(
                            "career-student-table",
                            DashboardWidgetType.CAREER_STUDENT_TABLE,
                            "Estudiantes con accesos a eLibro",
                            3,
                            new DashboardTableWidgetConfig(
                                    context.widgetControls().careerStudentTable().page(),
                                    context.widgetControls().careerStudentTable().size(),
                                    context.widgetControls().careerStudentTable().sortBy(),
                                    context.widgetControls().careerStudentTable().sortDirection()
                            )
                    )
            );
            case STUDENT_RANKING -> List.of(
                    new DashboardWidgetDefinition("student-ranking-kpis", DashboardWidgetType.KPI_GROUP, "KPIs del universo de estudiantes", 1, new DashboardEmptyWidgetConfig()),
                    new DashboardWidgetDefinition("student-ranking-trend", DashboardWidgetType.AREA_TREND, "Accesos a eLibro por tiempo", 2, new DashboardEmptyWidgetConfig()),
                    new DashboardWidgetDefinition(
                            "student-ranking-table",
                            DashboardWidgetType.TOP_STUDENTS_TABLE,
                            "Tabla de estudiantes con accesos a eLibro",
                            3,
                            new DashboardTopListWidgetConfig(OVERVIEW_TOP_LIMIT, context.effectiveSortDirection())
                    ),
                    new DashboardWidgetDefinition(
                            "student-ranking-top",
                            DashboardWidgetType.STUDENT_RANKING_TABLE,
                            "Top estudiantes",
                            4,
                            new DashboardRankingWidgetConfig(context.effectiveTopN(), context.effectiveSortDirection())
                    )
            );
            case STUDENT_RANKING_SPLIT -> List.of(
                    new DashboardWidgetDefinition("student-ranking-kpis", DashboardWidgetType.KPI_GROUP, "KPIs del universo de estudiantes", 1, new DashboardEmptyWidgetConfig()),
                    new DashboardWidgetDefinition("student-ranking-trend", DashboardWidgetType.AREA_TREND, "Accesos a eLibro por tiempo", 2, new DashboardEmptyWidgetConfig()),
                    new DashboardWidgetDefinition(
                            "student-ranking-table",
                            DashboardWidgetType.TOP_STUDENTS_TABLE,
                            "Tabla general de estudiantes",
                            3,
                            new DashboardTopListWidgetConfig(OVERVIEW_TOP_LIMIT, context.effectiveSortDirection())
                    ),
                    new DashboardWidgetDefinition(
                            "student-ranking-success-top",
                            DashboardWidgetType.STUDENT_RANKING_TABLE,
                            "Top estudiantes (exitosos)",
                            4,
                            new DashboardRankingWidgetConfig(context.effectiveTopN(), context.effectiveSortDirection())
                    ),
                    new DashboardWidgetDefinition(
                            "student-ranking-failed-top",
                            DashboardWidgetType.STUDENT_RANKING_TABLE,
                            "Top estudiantes (fallidos)",
                            5,
                            new DashboardRankingWidgetConfig(context.effectiveTopN(), context.effectiveSortDirection())
                    )
            );
            case CAREER_RANKING -> List.of(
                    new DashboardWidgetDefinition("career-ranking-kpis", DashboardWidgetType.KPI_GROUP, "KPIs del universo de carreras", 1, new DashboardEmptyWidgetConfig()),
                    new DashboardWidgetDefinition(
                            "career-ranking-table",
                            DashboardWidgetType.CAREER_RANKING_TABLE,
                            "Top carreras",
                            2,
                            new DashboardRankingWidgetConfig(context.effectiveTopN(), context.effectiveSortDirection())
                    )
            );
            case CAREER_RANKING_SPLIT -> List.of(
                    new DashboardWidgetDefinition("career-ranking-split-kpis", DashboardWidgetType.KPI_GROUP, "KPIs del universo de carreras", 1, new DashboardEmptyWidgetConfig()),
                    new DashboardWidgetDefinition(
                            "career-ranking-success-table",
                            DashboardWidgetType.CAREER_RANKING_SUCCESS_TABLE,
                            "Top carreras (exitosos)",
                            2,
                            new DashboardRankingWidgetConfig(context.effectiveTopN(), context.effectiveSortDirection())
                    ),
                    new DashboardWidgetDefinition(
                            "career-ranking-failed-table",
                            DashboardWidgetType.CAREER_RANKING_FAILED_TABLE,
                            "Top carreras (fallidos)",
                            3,
                            new DashboardRankingWidgetConfig(context.effectiveTopN(), context.effectiveSortDirection())
                    )
            );
            default -> throw new IllegalArgumentException("El layout todavía no está soportado por el widget composer.");
        };
    }

    public record DashboardWidgetDefinition(
            String widgetId,
            DashboardWidgetType type,
            String title,
            int order,
            DashboardWidgetConfig config
    ) {
    }
}
