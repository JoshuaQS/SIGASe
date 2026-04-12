package mx.edu.utez.server.modules.dashboard.service.analysis;

import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardDateFilterType;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterScope;
import mx.edu.utez.server.modules.dashboard.dto.DashboardRankingMode;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import org.springframework.stereotype.Component;

@Component
public class DashboardAnalysisValidator {

    public void validate(DashboardAnalysisRequest request) {
        if (request == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Debe enviar un body de análisis.");
        }
        if (request.scope() == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "scope es obligatorio.");
        }
        if (request.mode() == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "mode es obligatorio.");
        }
        if (request.scope() != DashboardFilterScope.STUDENTS) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "El endpoint adaptativo solo soporta scope=STUDENTS en esta etapa."
            );
        }

        DashboardRankingMode effectiveRankingMode = request.rankingMode() == null
                ? DashboardRankingMode.NONE
                : request.rankingMode();
        if (effectiveRankingMode != DashboardRankingMode.NONE) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "El endpoint adaptativo todavía no soporta rankingMode distinto de NONE."
            );
        }
        if (request.careerIds() != null && !request.careerIds().isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "careerIds no aplica para scope=STUDENTS en este corte.");
        }
        if (request.topN() != null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "topN no está soportado en este corte.");
        }
        if (request.mode() == DashboardFilterMode.ALL && request.studentId() != null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "studentId no aplica para mode=ALL.");
        }
        if (request.mode() == DashboardFilterMode.INDIVIDUAL && request.studentId() == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "studentId es obligatorio para mode=INDIVIDUAL.");
        }
        if (request.mode() != DashboardFilterMode.ALL && request.mode() != DashboardFilterMode.INDIVIDUAL) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "El endpoint adaptativo todavía no soporta mode distinto de ALL o INDIVIDUAL para scope=STUDENTS."
            );
        }

        DashboardDateFilterType effectiveDateType = request.dateFilterType() == null
                ? DashboardDateFilterType.NONE
                : request.dateFilterType();
        if (effectiveDateType == DashboardDateFilterType.CUSTOM_RANGE) {
            if (request.dateFrom() == null || request.dateTo() == null) {
                throw new BusinessException(
                        ErrorCode.VALIDATION_ERROR,
                        "dateFrom y dateTo son obligatorios cuando dateFilterType=CUSTOM_RANGE."
                );
            }
            if (request.dateFrom().isAfter(request.dateTo())) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR, "dateFrom debe ser menor o igual a dateTo.");
            }
        } else if (request.dateFrom() != null || request.dateTo() != null) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "dateFrom y dateTo solo se permiten cuando dateFilterType=CUSTOM_RANGE."
            );
        }
    }
}
