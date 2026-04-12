package mx.edu.utez.server.modules.dashboard.service.analysis;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAccessResultFilter;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardDateFilterType;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardRankingMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection;
import org.springframework.stereotype.Component;

@Component
public class DashboardAnalysisNormalizer {

    private static final long DEFAULT_RANGE_DAYS = 30;

    public ResolvedDashboardAnalysisContext normalize(DashboardAnalysisRequest request) {
        DashboardAccessResultFilter accessResult = request.accessResult() == null
                ? DashboardAccessResultFilter.ALL
                : request.accessResult();
        DashboardDateFilterType dateFilterType = request.dateFilterType() == null
                ? DashboardDateFilterType.NONE
                : request.dateFilterType();
        DashboardRankingMode rankingMode = request.rankingMode() == null
                ? DashboardRankingMode.NONE
                : request.rankingMode();
        DashboardSortDirection sortDirection = request.sortDirection() == null
                ? DashboardSortDirection.DESC
                : request.sortDirection();

        Instant effectiveDateTo = dateFilterType == DashboardDateFilterType.CUSTOM_RANGE
                ? request.dateTo().truncatedTo(ChronoUnit.SECONDS)
                : Instant.now().truncatedTo(ChronoUnit.SECONDS);
        Instant effectiveDateFrom = dateFilterType == DashboardDateFilterType.CUSTOM_RANGE
                ? request.dateFrom().truncatedTo(ChronoUnit.SECONDS)
                : effectiveDateTo.minus(DEFAULT_RANGE_DAYS, ChronoUnit.DAYS);

        return new ResolvedDashboardAnalysisContext(
                request.scope(),
                request.mode(),
                request.studentId(),
                request.careerIds() == null ? List.of() : List.copyOf(request.careerIds()),
                accessResult,
                effectiveDateFrom,
                effectiveDateTo,
                rankingMode,
                null,
                sortDirection,
                request.mode() == DashboardFilterMode.ALL
        );
    }
}
