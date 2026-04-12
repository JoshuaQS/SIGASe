package mx.edu.utez.server.modules.dashboard.service.analysis;

import java.time.Instant;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAccessResultFilter;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardDateFilterType;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterScope;
import mx.edu.utez.server.modules.dashboard.dto.DashboardRankingMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection;
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
}
