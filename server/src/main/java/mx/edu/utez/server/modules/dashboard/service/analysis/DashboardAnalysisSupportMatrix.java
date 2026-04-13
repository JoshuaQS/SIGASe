package mx.edu.utez.server.modules.dashboard.service.analysis;

import java.util.List;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAccessResultFilter;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterScope;
import mx.edu.utez.server.modules.dashboard.dto.DashboardLayoutType;
import mx.edu.utez.server.modules.dashboard.dto.DashboardRankingMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection;
import org.springframework.stereotype.Component;

@Component
public class DashboardAnalysisSupportMatrix {

    public static final String CONTRACT_VERSION = "analysis-v1";
    public static final long DEFAULT_ROLLING_RANGE_DAYS = 30L;

    public List<DashboardFilterMode> allowedModes(DashboardFilterScope scope) {
        if (scope == null) {
            return List.of();
        }
        return switch (scope) {
            case STUDENTS -> List.of(DashboardFilterMode.ALL, DashboardFilterMode.INDIVIDUAL);
            case CAREERS -> List.of(DashboardFilterMode.INDIVIDUAL, DashboardFilterMode.ALL, DashboardFilterMode.MULTI);
        };
    }

    public List<DashboardAccessResultFilter> allowedAccessResults() {
        return List.of(DashboardAccessResultFilter.ALL, DashboardAccessResultFilter.SUCCESS, DashboardAccessResultFilter.FAILED);
    }

    public boolean rankingAllowed(DashboardFilterScope scope, DashboardFilterMode mode) {
        return isStudentRanking(scope, mode, DashboardRankingMode.TOP)
                || isCareerRankingFamily(scope, mode, DashboardRankingMode.TOP);
    }

    public List<DashboardRankingMode> allowedRankingModes(DashboardFilterScope scope, DashboardFilterMode mode) {
        if (scope == null || mode == null) {
            return List.of();
        }
        if (scope == DashboardFilterScope.STUDENTS && mode == DashboardFilterMode.ALL) {
            return List.of(DashboardRankingMode.NONE, DashboardRankingMode.TOP);
        }
        if (scope == DashboardFilterScope.CAREERS
                && (mode == DashboardFilterMode.ALL || mode == DashboardFilterMode.MULTI)) {
            return List.of(DashboardRankingMode.TOP);
        }
        return List.of(DashboardRankingMode.NONE);
    }

    public DashboardRankingMode defaultRankingMode(DashboardFilterScope scope, DashboardFilterMode mode) {
        List<DashboardRankingMode> allowedModes = allowedRankingModes(scope, mode);
        if (allowedModes.size() == 1) {
            return allowedModes.get(0);
        }
        return DashboardRankingMode.NONE;
    }

    public List<Integer> allowedTopN(
            DashboardFilterScope scope,
            DashboardFilterMode mode,
            DashboardRankingMode rankingMode
    ) {
        if (rankingMode != DashboardRankingMode.TOP) {
            return List.of();
        }
        if (scope == DashboardFilterScope.STUDENTS && mode == DashboardFilterMode.ALL) {
            return DashboardWidgetComposer.STUDENT_RANKING_ALLOWED_TOP_N.stream().sorted().toList();
        }
        if (scope == DashboardFilterScope.CAREERS
                && (mode == DashboardFilterMode.ALL || mode == DashboardFilterMode.MULTI)) {
            return DashboardWidgetComposer.CAREER_RANKING_ALLOWED_TOP_N.stream().sorted().toList();
        }
        return List.of();
    }

    public Integer defaultTopN(
            DashboardFilterScope scope,
            DashboardFilterMode mode,
            DashboardRankingMode rankingMode
    ) {
        if (rankingMode != DashboardRankingMode.TOP) {
            return null;
        }
        if (scope == DashboardFilterScope.STUDENTS && mode == DashboardFilterMode.ALL) {
            return DashboardWidgetComposer.STUDENT_RANKING_DEFAULT_TOP_N;
        }
        if (scope == DashboardFilterScope.CAREERS
                && (mode == DashboardFilterMode.ALL || mode == DashboardFilterMode.MULTI)) {
            return DashboardWidgetComposer.CAREER_RANKING_DEFAULT_TOP_N;
        }
        return null;
    }

    public DashboardSortDirection defaultSortDirection(
            DashboardFilterScope scope,
            DashboardFilterMode mode,
            DashboardRankingMode rankingMode
    ) {
        if (rankingMode == DashboardRankingMode.TOP) {
            if (scope == DashboardFilterScope.STUDENTS && mode == DashboardFilterMode.ALL) {
                return DashboardWidgetComposer.STUDENT_RANKING_DEFAULT_SORT_DIRECTION;
            }
            if (scope == DashboardFilterScope.CAREERS
                    && (mode == DashboardFilterMode.ALL || mode == DashboardFilterMode.MULTI)) {
                return DashboardWidgetComposer.CAREER_RANKING_DEFAULT_SORT_DIRECTION;
            }
        }
        return DashboardSortDirection.DESC;
    }

    public List<DashboardLayoutType> supportedLayouts() {
        return List.of(
                DashboardLayoutType.OVERVIEW,
                DashboardLayoutType.STUDENT_DETAIL,
                DashboardLayoutType.CAREER_DETAIL,
                DashboardLayoutType.STUDENT_RANKING,
                DashboardLayoutType.CAREER_RANKING,
                DashboardLayoutType.CAREER_RANKING_SPLIT
        );
    }

    public boolean isOverview(
            DashboardFilterScope scope,
            DashboardFilterMode mode,
            DashboardRankingMode rankingMode
    ) {
        return scope == DashboardFilterScope.STUDENTS
                && mode == DashboardFilterMode.ALL
                && rankingMode == DashboardRankingMode.NONE;
    }

    public boolean isStudentDetail(
            DashboardFilterScope scope,
            DashboardFilterMode mode,
            DashboardRankingMode rankingMode
    ) {
        return scope == DashboardFilterScope.STUDENTS
                && mode == DashboardFilterMode.INDIVIDUAL
                && rankingMode == DashboardRankingMode.NONE;
    }

    public boolean isCareerDetail(
            DashboardFilterScope scope,
            DashboardFilterMode mode,
            DashboardRankingMode rankingMode
    ) {
        return scope == DashboardFilterScope.CAREERS
                && mode == DashboardFilterMode.INDIVIDUAL
                && rankingMode == DashboardRankingMode.NONE;
    }

    public boolean isStudentRanking(
            DashboardFilterScope scope,
            DashboardFilterMode mode,
            DashboardRankingMode rankingMode
    ) {
        return scope == DashboardFilterScope.STUDENTS
                && mode == DashboardFilterMode.ALL
                && rankingMode == DashboardRankingMode.TOP;
    }

    public boolean isCareerRankingFamily(
            DashboardFilterScope scope,
            DashboardFilterMode mode,
            DashboardRankingMode rankingMode
    ) {
        return scope == DashboardFilterScope.CAREERS
                && (mode == DashboardFilterMode.ALL || mode == DashboardFilterMode.MULTI)
                && rankingMode == DashboardRankingMode.TOP;
    }

    public boolean isCareerRanking(
            DashboardFilterScope scope,
            DashboardFilterMode mode,
            DashboardRankingMode rankingMode,
            DashboardAccessResultFilter accessResult
    ) {
        DashboardAccessResultFilter effectiveAccessResult = accessResult == null
                ? DashboardAccessResultFilter.ALL
                : accessResult;
        return isCareerRankingFamily(scope, mode, rankingMode)
                && effectiveAccessResult != DashboardAccessResultFilter.ALL;
    }

    public boolean isCareerRankingSplit(
            DashboardFilterScope scope,
            DashboardFilterMode mode,
            DashboardRankingMode rankingMode,
            DashboardAccessResultFilter accessResult
    ) {
        DashboardAccessResultFilter effectiveAccessResult = accessResult == null
                ? DashboardAccessResultFilter.ALL
                : accessResult;
        return isCareerRankingFamily(scope, mode, rankingMode)
                && effectiveAccessResult == DashboardAccessResultFilter.ALL;
    }
}
