package mx.edu.utez.server.modules.dashboard.service.analysis;

import java.time.Instant;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAccessResultFilter;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisWidgetControlsRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardDateFilterType;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterScope;
import mx.edu.utez.server.modules.dashboard.dto.DashboardRankingMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTableWidgetControlRequest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DashboardAnalysisNormalizerTest {

    private final DashboardAnalysisNormalizer normalizer = new DashboardAnalysisNormalizer();

    @Test
    void shouldApplyDefaultsForOverviewSlice() {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.STUDENTS,
                DashboardFilterMode.ALL,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );

        ResolvedDashboardAnalysisContext context = normalizer.normalize(request);

        assertEquals(DashboardAccessResultFilter.ALL, context.accessResult());
        assertEquals(DashboardRankingMode.NONE, context.rankingMode());
        assertEquals(DashboardSortDirection.DESC, context.effectiveSortDirection());
        assertEquals(DashboardWidgetComposer.STUDENT_ACTIVITY_DEFAULT_PAGE, context.widgetControls().studentActivityTable().page());
        assertEquals(DashboardWidgetComposer.CAREER_STUDENT_TABLE_DEFAULT_SORT_BY, context.widgetControls().careerStudentTable().sortBy());
        assertTrue(context.effectiveDateTo().isAfter(context.effectiveDateFrom()));
    }

    @Test
    void shouldRespectCustomRangeAndExplicitValues() {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.STUDENTS,
                DashboardFilterMode.ALL,
                null,
                null,
                DashboardAccessResultFilter.SUCCESS,
                DashboardDateFilterType.CUSTOM_RANGE,
                Instant.parse("2026-03-01T00:00:00Z"),
                Instant.parse("2026-03-31T23:59:59Z"),
                DashboardRankingMode.NONE,
                null,
                DashboardSortDirection.ASC
        );

        ResolvedDashboardAnalysisContext context = normalizer.normalize(request);

        assertEquals(DashboardAccessResultFilter.SUCCESS, context.accessResult());
        assertEquals(Instant.parse("2026-03-01T00:00:00Z"), context.effectiveDateFrom());
        assertEquals(Instant.parse("2026-03-31T23:59:59Z"), context.effectiveDateTo());
        assertEquals(DashboardSortDirection.ASC, context.effectiveSortDirection());
    }

    @Test
    void shouldNormalizeExplicitWidgetControls() {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.INDIVIDUAL,
                null,
                java.util.List.of(java.util.UUID.randomUUID()),
                DashboardAccessResultFilter.ALL,
                DashboardDateFilterType.NONE,
                null,
                null,
                DashboardRankingMode.NONE,
                null,
                DashboardSortDirection.ASC,
                new DashboardAnalysisWidgetControlsRequest(
                        new DashboardTableWidgetControlRequest(1, 5, "latencyMs", DashboardSortDirection.ASC),
                        new DashboardTableWidgetControlRequest(2, 7, "studentName", DashboardSortDirection.ASC)
                )
        );

        ResolvedDashboardAnalysisContext context = normalizer.normalize(request);

        assertEquals(1, context.widgetControls().studentActivityTable().page());
        assertEquals(5, context.widgetControls().studentActivityTable().size());
        assertEquals("latencyMs", context.widgetControls().studentActivityTable().sortBy());
        assertEquals(DashboardSortDirection.ASC, context.widgetControls().studentActivityTable().sortDirection());
        assertEquals(2, context.widgetControls().careerStudentTable().page());
        assertEquals(7, context.widgetControls().careerStudentTable().size());
        assertEquals("studentName", context.widgetControls().careerStudentTable().sortBy());
        assertEquals(DashboardSortDirection.ASC, context.widgetControls().careerStudentTable().sortDirection());
    }
}
