package mx.edu.utez.server.modules.dashboard.repository.analysis;

import java.util.List;
import mx.edu.utez.server.modules.dashboard.dto.DashboardStudentActivityTableResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardStudentAccessSummaryResponse;
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

    DashboardStudentActivityTableResponse fetchStudentActivity(BaseAccessQueryFilter filter, int page, int size);

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
}
