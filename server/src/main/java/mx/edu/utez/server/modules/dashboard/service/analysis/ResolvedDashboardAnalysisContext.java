package mx.edu.utez.server.modules.dashboard.service.analysis;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAccessResultFilter;
import mx.edu.utez.server.modules.dashboard.dto.DashboardDateFilterType;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterScope;
import mx.edu.utez.server.modules.dashboard.dto.DashboardRankingMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection;

public record ResolvedDashboardAnalysisContext(
        DashboardFilterScope scope,
        DashboardFilterMode mode,
        UUID studentId,
        List<UUID> careerIds,
        DashboardAccessResultFilter accessResult,
        DashboardDateFilterType dateFilterType,
        Instant effectiveDateFrom,
        Instant effectiveDateTo,
        DashboardRankingMode rankingMode,
        Integer effectiveTopN,
        DashboardSortDirection effectiveSortDirection,
        boolean groupedScope,
        ResolvedDashboardWidgetControls widgetControls
) {
    public ResolvedDashboardAnalysisContext(
            DashboardFilterScope scope,
            DashboardFilterMode mode,
            UUID studentId,
            List<UUID> careerIds,
            DashboardAccessResultFilter accessResult,
            DashboardDateFilterType dateFilterType,
            Instant effectiveDateFrom,
            Instant effectiveDateTo,
            DashboardRankingMode rankingMode,
            Integer effectiveTopN,
            DashboardSortDirection effectiveSortDirection,
            boolean groupedScope
    ) {
        this(
                scope,
                mode,
                studentId,
                careerIds,
                accessResult,
                dateFilterType,
                effectiveDateFrom,
                effectiveDateTo,
                rankingMode,
                effectiveTopN,
                effectiveSortDirection,
                groupedScope,
                new ResolvedDashboardWidgetControls(
                        new ResolvedDashboardTableWidgetControl(
                                DashboardWidgetComposer.STUDENT_ACTIVITY_DEFAULT_PAGE,
                                DashboardWidgetComposer.STUDENT_ACTIVITY_DEFAULT_SIZE,
                                DashboardWidgetComposer.STUDENT_ACTIVITY_DEFAULT_SORT_BY,
                                DashboardWidgetComposer.STUDENT_ACTIVITY_DEFAULT_SORT_DIRECTION
                        ),
                        new ResolvedDashboardTableWidgetControl(
                                DashboardWidgetComposer.CAREER_STUDENT_TABLE_DEFAULT_PAGE,
                                DashboardWidgetComposer.CAREER_STUDENT_TABLE_DEFAULT_SIZE,
                                DashboardWidgetComposer.CAREER_STUDENT_TABLE_DEFAULT_SORT_BY,
                                DashboardWidgetComposer.CAREER_STUDENT_TABLE_DEFAULT_SORT_DIRECTION
                        )
                )
        );
    }
}
