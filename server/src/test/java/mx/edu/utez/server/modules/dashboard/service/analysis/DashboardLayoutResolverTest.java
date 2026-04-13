package mx.edu.utez.server.modules.dashboard.service.analysis;

import java.time.Instant;
import java.util.List;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAccessResultFilter;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterScope;
import mx.edu.utez.server.modules.dashboard.dto.DashboardLayoutType;
import mx.edu.utez.server.modules.dashboard.dto.DashboardRankingMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection;
import mx.edu.utez.server.shared.exception.BusinessException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class DashboardLayoutResolverTest {

    private final DashboardAnalysisSupportMatrix supportMatrix = new DashboardAnalysisSupportMatrix();
    private final DashboardLayoutResolver resolver = new DashboardLayoutResolver(supportMatrix);

    @Test
    void shouldResolveOverview() {
        ResolvedDashboardAnalysisContext context = new ResolvedDashboardAnalysisContext(
                DashboardFilterScope.STUDENTS,
                DashboardFilterMode.ALL,
                null,
                List.of(),
                DashboardAccessResultFilter.ALL,
                Instant.parse("2026-03-01T00:00:00Z"),
                Instant.parse("2026-03-31T23:59:59Z"),
                DashboardRankingMode.NONE,
                null,
                DashboardSortDirection.DESC,
                true
        );

        assertEquals(DashboardLayoutType.OVERVIEW, resolver.resolve(context));
    }

    @Test
    void shouldRejectUnsupportedLayout() {
        ResolvedDashboardAnalysisContext context = new ResolvedDashboardAnalysisContext(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.MULTI,
                null,
                List.of(),
                DashboardAccessResultFilter.ALL,
                Instant.parse("2026-03-01T00:00:00Z"),
                Instant.parse("2026-03-31T23:59:59Z"),
                DashboardRankingMode.NONE,
                null,
                DashboardSortDirection.DESC,
                true
        );

        assertThrows(BusinessException.class, () -> resolver.resolve(context));
    }

    @Test
    void shouldResolveStudentDetail() {
        ResolvedDashboardAnalysisContext context = new ResolvedDashboardAnalysisContext(
                DashboardFilterScope.STUDENTS,
                DashboardFilterMode.INDIVIDUAL,
                java.util.UUID.randomUUID(),
                List.of(),
                DashboardAccessResultFilter.ALL,
                Instant.parse("2026-03-01T00:00:00Z"),
                Instant.parse("2026-03-31T23:59:59Z"),
                DashboardRankingMode.NONE,
                null,
                DashboardSortDirection.DESC,
                false
        );

        assertEquals(DashboardLayoutType.STUDENT_DETAIL, resolver.resolve(context));
    }

    @Test
    void shouldResolveCareerDetail() {
        ResolvedDashboardAnalysisContext context = new ResolvedDashboardAnalysisContext(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.INDIVIDUAL,
                null,
                List.of(java.util.UUID.randomUUID()),
                DashboardAccessResultFilter.ALL,
                Instant.parse("2026-03-01T00:00:00Z"),
                Instant.parse("2026-03-31T23:59:59Z"),
                DashboardRankingMode.NONE,
                null,
                DashboardSortDirection.DESC,
                false
        );

        assertEquals(DashboardLayoutType.CAREER_DETAIL, resolver.resolve(context));
    }

    @Test
    void shouldResolveStudentRanking() {
        ResolvedDashboardAnalysisContext context = new ResolvedDashboardAnalysisContext(
                DashboardFilterScope.STUDENTS,
                DashboardFilterMode.ALL,
                null,
                List.of(),
                DashboardAccessResultFilter.ALL,
                Instant.parse("2026-03-01T00:00:00Z"),
                Instant.parse("2026-03-31T23:59:59Z"),
                DashboardRankingMode.TOP,
                10,
                DashboardSortDirection.DESC,
                true
        );

        assertEquals(DashboardLayoutType.STUDENT_RANKING, resolver.resolve(context));
    }

    @Test
    void shouldResolveCareerRanking() {
        ResolvedDashboardAnalysisContext context = new ResolvedDashboardAnalysisContext(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.ALL,
                null,
                List.of(),
                DashboardAccessResultFilter.SUCCESS,
                Instant.parse("2026-03-01T00:00:00Z"),
                Instant.parse("2026-03-31T23:59:59Z"),
                DashboardRankingMode.TOP,
                10,
                DashboardSortDirection.DESC,
                true
        );

        assertEquals(DashboardLayoutType.CAREER_RANKING, resolver.resolve(context));
    }

    @Test
    void shouldResolveCareerRankingSplit() {
        ResolvedDashboardAnalysisContext context = new ResolvedDashboardAnalysisContext(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.MULTI,
                null,
                List.of(java.util.UUID.randomUUID(), java.util.UUID.randomUUID()),
                DashboardAccessResultFilter.ALL,
                Instant.parse("2026-03-01T00:00:00Z"),
                Instant.parse("2026-03-31T23:59:59Z"),
                DashboardRankingMode.TOP,
                10,
                DashboardSortDirection.DESC,
                true
        );

        assertEquals(DashboardLayoutType.CAREER_RANKING_SPLIT, resolver.resolve(context));
    }
}
