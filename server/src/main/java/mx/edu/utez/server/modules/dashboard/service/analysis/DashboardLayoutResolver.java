package mx.edu.utez.server.modules.dashboard.service.analysis;

import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterScope;
import mx.edu.utez.server.modules.dashboard.dto.DashboardLayoutType;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import org.springframework.stereotype.Component;

@Component
public class DashboardLayoutResolver {

    private final DashboardAnalysisSupportMatrix supportMatrix;

    public DashboardLayoutResolver(DashboardAnalysisSupportMatrix supportMatrix) {
        this.supportMatrix = supportMatrix;
    }

    public DashboardLayoutType resolve(ResolvedDashboardAnalysisContext context) {
        if (supportMatrix.isOverview(context.scope(), context.mode(), context.rankingMode())) {
            return DashboardLayoutType.OVERVIEW;
        }
        if (supportMatrix.isStudentDetail(context.scope(), context.mode(), context.rankingMode())) {
            return DashboardLayoutType.STUDENT_DETAIL;
        }
        if (supportMatrix.isCareerDetail(context.scope(), context.mode(), context.rankingMode())) {
            return DashboardLayoutType.CAREER_DETAIL;
        }
        if (supportMatrix.isStudentRanking(context.scope(), context.mode(), context.rankingMode())) {
            return DashboardLayoutType.STUDENT_RANKING;
        }
        if (supportMatrix.isCareerRanking(
                context.scope(),
                context.mode(),
                context.rankingMode(),
                context.accessResult()
        )) {
            return DashboardLayoutType.CAREER_RANKING;
        }
        if (supportMatrix.isCareerRankingSplit(
                context.scope(),
                context.mode(),
                context.rankingMode(),
                context.accessResult()
        )) {
            return DashboardLayoutType.CAREER_RANKING_SPLIT;
        }
        throw new BusinessException(
                ErrorCode.VALIDATION_ERROR,
                "El layout solicitado todavía no está soportado en este corte."
        );
    }
}
