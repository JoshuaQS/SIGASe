package mx.edu.utez.server.modules.dashboard.service.analysis;

import java.util.List;
import java.util.Set;
import mx.edu.utez.server.modules.dashboard.dto.DashboardBreakdownWidgetConfig;
import mx.edu.utez.server.modules.dashboard.dto.DashboardComparisonWidgetConfig;
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
            "enrollmentId",
            "lastAccessAt"
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
                            "overview-top-students",
                            DashboardWidgetType.TOP_STUDENTS_TABLE,
                            "Top estudiantes",
                            3,
                            new DashboardTopListWidgetConfig(OVERVIEW_TOP_LIMIT, context.effectiveSortDirection())
                    ),
                    new DashboardWidgetDefinition(
                            "overview-top-careers",
                            DashboardWidgetType.TOP_CAREERS_TABLE,
                            "Top carreras",
                            4,
                            new DashboardTopListWidgetConfig(OVERVIEW_TOP_LIMIT, context.effectiveSortDirection())
                    )
            );
            case STUDENT_DETAIL -> List.of(
                    new DashboardWidgetDefinition("student-detail-kpis", DashboardWidgetType.KPI_GROUP, "Resumen del alumno", 1, new DashboardEmptyWidgetConfig()),
                    new DashboardWidgetDefinition("student-detail-trend", DashboardWidgetType.AREA_TREND, "Tendencia del alumno", 2, new DashboardEmptyWidgetConfig()),
                    new DashboardWidgetDefinition("student-access-summary", DashboardWidgetType.STUDENT_ACCESS_SUMMARY, "Resumen de accesos", 3, new DashboardEmptyWidgetConfig()),
                    new DashboardWidgetDefinition(
                            "student-activity-table",
                            DashboardWidgetType.STUDENT_ACTIVITY_TABLE,
                            "Actividad del alumno",
                            4,
                            new DashboardTableWidgetConfig(
                                    context.widgetControls().studentActivityTable().page(),
                                    context.widgetControls().studentActivityTable().size(),
                                    context.widgetControls().studentActivityTable().sortBy(),
                                    context.widgetControls().studentActivityTable().sortDirection()
                            )
                    )
            );
            case CAREER_DETAIL -> List.of(
                    new DashboardWidgetDefinition("career-detail-kpis", DashboardWidgetType.KPI_GROUP, "Resumen de la carrera", 1, new DashboardEmptyWidgetConfig()),
                    new DashboardWidgetDefinition("career-detail-trend", DashboardWidgetType.AREA_TREND, "Tendencia de la carrera", 2, new DashboardEmptyWidgetConfig()),
                    new DashboardWidgetDefinition(
                            "career-result-breakdown",
                            DashboardWidgetType.CAREER_RESULT_BREAKDOWN,
                            "Distribución de resultados",
                            3,
                            new DashboardBreakdownWidgetConfig(
                                    RESULT_BREAKDOWN_DEFAULT_SORT_BY,
                                    RESULT_BREAKDOWN_DEFAULT_SORT_DIRECTION,
                                    RESULT_BREAKDOWN_DEFAULT_TIE_BREAKER
                            )
                    ),
                    new DashboardWidgetDefinition(
                            "career-student-table",
                            DashboardWidgetType.CAREER_STUDENT_TABLE,
                            "Alumnos de la carrera",
                            4,
                            new DashboardTableWidgetConfig(
                                    context.widgetControls().careerStudentTable().page(),
                                    context.widgetControls().careerStudentTable().size(),
                                    context.widgetControls().careerStudentTable().sortBy(),
                                    context.widgetControls().careerStudentTable().sortDirection()
                            )
                    )
            );
            case STUDENT_RANKING -> List.of(
                    new DashboardWidgetDefinition("student-ranking-kpis", DashboardWidgetType.KPI_GROUP, "Resumen del universo analítico", 1, new DashboardEmptyWidgetConfig()),
                    new DashboardWidgetDefinition(
                            "student-ranking-table",
                            DashboardWidgetType.STUDENT_RANKING_TABLE,
                            "Ranking de alumnos",
                            2,
                            new DashboardRankingWidgetConfig(context.effectiveTopN(), context.effectiveSortDirection())
                    ),
                    new DashboardWidgetDefinition(
                            "student-result-breakdown",
                            DashboardWidgetType.STUDENT_RESULT_BREAKDOWN,
                            "Distribución de resultados",
                            3,
                            new DashboardBreakdownWidgetConfig(
                                    RESULT_BREAKDOWN_DEFAULT_SORT_BY,
                                    RESULT_BREAKDOWN_DEFAULT_SORT_DIRECTION,
                                    RESULT_BREAKDOWN_DEFAULT_TIE_BREAKER
                            )
                    )
            );
            case CAREER_RANKING -> List.of(
                    new DashboardWidgetDefinition("career-ranking-kpis", DashboardWidgetType.KPI_GROUP, "Resumen del universo analítico", 1, new DashboardEmptyWidgetConfig()),
                    new DashboardWidgetDefinition(
                            "career-ranking-table",
                            DashboardWidgetType.CAREER_RANKING_TABLE,
                            "Ranking de carreras",
                            2,
                            new DashboardRankingWidgetConfig(context.effectiveTopN(), context.effectiveSortDirection())
                    ),
                    new DashboardWidgetDefinition(
                            "career-comparison-table",
                            DashboardWidgetType.CAREER_COMPARISON_TABLE,
                            "Comparativo de carreras",
                            3,
                            new DashboardComparisonWidgetConfig(
                                    CAREER_COMPARISON_DEFAULT_SORT_BY,
                                    CAREER_COMPARISON_DEFAULT_SORT_DIRECTION
                            )
                    )
            );
            case CAREER_RANKING_SPLIT -> List.of(
                    new DashboardWidgetDefinition("career-ranking-split-kpis", DashboardWidgetType.KPI_GROUP, "Resumen del universo analítico", 1, new DashboardEmptyWidgetConfig()),
                    new DashboardWidgetDefinition(
                            "career-ranking-success-table",
                            DashboardWidgetType.CAREER_RANKING_SUCCESS_TABLE,
                            "Carreras con más éxitos",
                            2,
                            new DashboardRankingWidgetConfig(context.effectiveTopN(), context.effectiveSortDirection())
                    ),
                    new DashboardWidgetDefinition(
                            "career-ranking-failed-table",
                            DashboardWidgetType.CAREER_RANKING_FAILED_TABLE,
                            "Carreras con más fallos",
                            3,
                            new DashboardRankingWidgetConfig(context.effectiveTopN(), context.effectiveSortDirection())
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
            DashboardWidgetConfig config
    ) {
    }
}
