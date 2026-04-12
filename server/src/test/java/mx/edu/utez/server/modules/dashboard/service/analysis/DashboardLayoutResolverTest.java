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

    private final DashboardLayoutResolver resolver = new DashboardLayoutResolver();

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
                DashboardFilterScope.STUDENTS,
                DashboardFilterMode.ALL,
                null,
                List.of(),
                DashboardAccessResultFilter.ALL,
                Instant.parse("2026-03-01T00:00:00Z"),
                Instant.parse("2026-03-31T23:59:59Z"),
                DashboardRankingMode.TOP,
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
}
