package mx.edu.utez.server.modules.dashboard.service.analysis;

import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterScope;
import mx.edu.utez.server.modules.dashboard.dto.DashboardLayoutType;
import mx.edu.utez.server.modules.dashboard.dto.DashboardRankingMode;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import org.springframework.stereotype.Component;

@Component
public class DashboardLayoutResolver {

    public DashboardLayoutType resolve(ResolvedDashboardAnalysisContext context) {
        if (context.scope() == DashboardFilterScope.STUDENTS
                && context.mode() == DashboardFilterMode.ALL
                && context.rankingMode() == DashboardRankingMode.NONE) {
            return DashboardLayoutType.OVERVIEW;
        }
        if (context.scope() == DashboardFilterScope.STUDENTS
                && context.mode() == DashboardFilterMode.INDIVIDUAL
                && context.rankingMode() == DashboardRankingMode.NONE) {
            return DashboardLayoutType.STUDENT_DETAIL;
        }
        throw new BusinessException(
                ErrorCode.VALIDATION_ERROR,
                "El layout solicitado todavía no está soportado en este corte."
        );
    }
}
