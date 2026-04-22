package mx.edu.utez.server.modules.dashboard.repository.analysis;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import mx.edu.utez.server.modules.dashboard.dto.DashboardCareerComparisonItemResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardCareerResultBreakdownItemResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardCareerRankingTableItemResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardCareerStudentTableResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAccessResultFilter;
import mx.edu.utez.server.modules.dashboard.dto.DashboardStudentActivityTableResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardStudentAccessSummaryResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardStudentRankingTableItemResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardStudentResultBreakdownItemResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTopCareerItemResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTopStudentItemResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTrendPointResponse;
import mx.edu.utez.server.modules.dashboard.service.analysis.BaseAccessQueryFilter;

public interface DashboardAnalyticsRepository {

    OverviewKpiAggregate fetchOverviewKpis(BaseAccessQueryFilter filter);

    List<DashboardTrendPointResponse> fetchTrend(BaseAccessQueryFilter filter);

    List<DashboardTopStudentItemResponse> fetchTopStudents(BaseAccessQueryFilter filter, int limit, DashboardSortDirection sortDirection);

    List<DashboardTopCareerItemResponse> fetchTopCareers(BaseAccessQueryFilter filter, int limit, DashboardSortDirection sortDirection);

    DashboardStudentAccessSummaryResponse fetchStudentAccessSummary(BaseAccessQueryFilter filter);

    AccessRange fetchStudentAccessRange(UUID studentId, DashboardAccessResultFilter accessResult);

    DashboardStudentActivityTableResponse fetchStudentActivity(
            BaseAccessQueryFilter filter,
            int page,
            int size,
            String sortBy,
            DashboardSortDirection sortDirection
    );

    AccessKpiAggregate fetchCareerKpis(BaseAccessQueryFilter filter);

    List<DashboardCareerResultBreakdownItemResponse> fetchCareerResultBreakdown(BaseAccessQueryFilter filter);

    DashboardCareerStudentTableResponse fetchCareerStudents(
            BaseAccessQueryFilter filter,
            int page,
            int size,
            String sortBy,
            DashboardSortDirection sortDirection
    );

    CareerRankingKpiAggregate fetchCareerRankingKpis(BaseAccessQueryFilter filter);

    List<DashboardCareerRankingTableItemResponse> fetchCareerRanking(
            BaseAccessQueryFilter filter,
            int limit,
            DashboardSortDirection sortDirection,
            RankingMetric rankingMetric
    );

    List<DashboardCareerComparisonItemResponse> fetchCareerComparison(BaseAccessQueryFilter filter);

    AccessKpiAggregate fetchStudentRankingKpis(BaseAccessQueryFilter filter);

    List<DashboardStudentResultBreakdownItemResponse> fetchStudentResultBreakdown(BaseAccessQueryFilter filter);

    List<DashboardStudentRankingTableItemResponse> fetchStudentRanking(
            BaseAccessQueryFilter filter,
            int limit,
            DashboardSortDirection sortDirection
    );

    record OverviewKpiAggregate(
            long totalStudents,
            long activeStudents,
            long inactiveStudents,
            long successfulAccessesInRange,
            long failedAccessesInRange,
            long uniqueStudentsWithSuccessfulAccess,
            java.time.Instant lastAccessAt,
            java.time.Instant lastSuccessfulAccessAt,
            java.time.Instant lastFailedAccessAt
    ) {
    }

    record AccessRange(
            Instant firstAccessAt,
            Instant lastAccessAt
    ) {
    }

    record AccessKpiAggregate(
            long totalAccesses,
            long successfulAccesses,
            long failedAccesses,
            long uniqueStudentsImpacted,
            Instant lastAccessAt,
            Instant lastSuccessfulAccessAt,
            Instant lastFailedAccessAt
    ) {
    }

    record CareerRankingKpiAggregate(
            long totalAccesses,
            long successfulAccesses,
            long failedAccesses,
            long uniqueCareersImpacted,
            Instant lastAccessAt,
            Instant lastSuccessfulAccessAt,
            Instant lastFailedAccessAt
    ) {
    }

    enum RankingMetric {
        SUCCESS,
        FAILED,
        TOTAL
    }
}
