package mx.edu.utez.server.modules.dashboard.service.analysis;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisWidgetControlsRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAccessResultFilter;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardDateFilterType;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardRankingMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTableWidgetControlRequest;
import org.springframework.stereotype.Component;

@Component
public class DashboardAnalysisNormalizer {

    private static final long DEFAULT_RANGE_DAYS = DashboardAnalysisSupportMatrix.DEFAULT_ROLLING_RANGE_DAYS;

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
        DashboardAnalysisWidgetControlsRequest widgetControls = request.widgetControls();

        return new ResolvedDashboardAnalysisContext(
                request.scope(),
                request.mode(),
                request.studentId(),
                request.careerIds() == null ? List.of() : List.copyOf(request.careerIds()),
                accessResult,
                effectiveDateFrom,
                effectiveDateTo,
                rankingMode,
                rankingMode == DashboardRankingMode.TOP ? request.topN() : null,
                sortDirection,
                request.mode() != DashboardFilterMode.INDIVIDUAL,
                new ResolvedDashboardWidgetControls(
                        normalizeStudentActivityTableControl(widgetControls == null ? null : widgetControls.studentActivityTable()),
                        normalizeCareerStudentTableControl(widgetControls == null ? null : widgetControls.careerStudentTable())
                )
        );
    }

    private ResolvedDashboardTableWidgetControl normalizeStudentActivityTableControl(
            DashboardTableWidgetControlRequest request
    ) {
        return new ResolvedDashboardTableWidgetControl(
                request == null || request.page() == null
                        ? DashboardWidgetComposer.STUDENT_ACTIVITY_DEFAULT_PAGE
                        : request.page(),
                request == null || request.size() == null
                        ? DashboardWidgetComposer.STUDENT_ACTIVITY_DEFAULT_SIZE
                        : request.size(),
                request == null || request.sortBy() == null || request.sortBy().isBlank()
                        ? DashboardWidgetComposer.STUDENT_ACTIVITY_DEFAULT_SORT_BY
                        : request.sortBy().trim(),
                request == null || request.sortDirection() == null
                        ? DashboardWidgetComposer.STUDENT_ACTIVITY_DEFAULT_SORT_DIRECTION
                        : request.sortDirection()
        );
    }

    private ResolvedDashboardTableWidgetControl normalizeCareerStudentTableControl(
            DashboardTableWidgetControlRequest request
    ) {
        return new ResolvedDashboardTableWidgetControl(
                request == null || request.page() == null
                        ? DashboardWidgetComposer.CAREER_STUDENT_TABLE_DEFAULT_PAGE
                        : request.page(),
                request == null || request.size() == null
                        ? DashboardWidgetComposer.CAREER_STUDENT_TABLE_DEFAULT_SIZE
                        : request.size(),
                request == null || request.sortBy() == null || request.sortBy().isBlank()
                        ? DashboardWidgetComposer.CAREER_STUDENT_TABLE_DEFAULT_SORT_BY
                        : request.sortBy().trim(),
                request == null || request.sortDirection() == null
                        ? DashboardWidgetComposer.CAREER_STUDENT_TABLE_DEFAULT_SORT_DIRECTION
                        : request.sortDirection()
        );
    }
}
