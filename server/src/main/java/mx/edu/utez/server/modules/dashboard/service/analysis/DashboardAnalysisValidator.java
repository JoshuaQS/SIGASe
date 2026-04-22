package mx.edu.utez.server.modules.dashboard.service.analysis;

import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisWidgetControlsRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAccessResultFilter;
import mx.edu.utez.server.modules.dashboard.dto.DashboardDateFilterType;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterScope;
import mx.edu.utez.server.modules.dashboard.dto.DashboardRankingMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTableWidgetControlRequest;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import org.springframework.stereotype.Component;

@Component
public class DashboardAnalysisValidator {

    private final DashboardAnalysisSupportMatrix supportMatrix;

    public DashboardAnalysisValidator(DashboardAnalysisSupportMatrix supportMatrix) {
        this.supportMatrix = supportMatrix;
    }

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
        DashboardRankingMode effectiveRankingMode = request.rankingMode() == null
                ? DashboardRankingMode.NONE
                : request.rankingMode();
        boolean studentRankingLayout = request.scope() == DashboardFilterScope.STUDENTS
                && request.mode() == DashboardFilterMode.ALL
                && effectiveRankingMode == DashboardRankingMode.TOP;
        boolean careerRankingLayout = supportMatrix.isCareerRankingFamily(request.scope(), request.mode(), effectiveRankingMode);
        if (effectiveRankingMode != DashboardRankingMode.NONE && !studentRankingLayout && !careerRankingLayout) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "El endpoint adaptativo todavía no soporta rankingMode distinto de NONE."
            );
        }
        if (!studentRankingLayout && !careerRankingLayout && request.topN() != null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "topN no está soportado en este corte.");
        }
        if (request.scope() == DashboardFilterScope.STUDENTS) {
            validateStudentsScope(request, studentRankingLayout);
        } else if (request.scope() == DashboardFilterScope.CAREERS) {
            validateCareersScope(request, careerRankingLayout);
        } else {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "El endpoint adaptativo todavía no soporta el scope solicitado."
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

        validateWidgetControls(request);
    }

    private void validateStudentsScope(DashboardAnalysisRequest request, boolean studentRankingLayout) {
        if (request.careerIds() != null && !request.careerIds().isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "careerIds no aplica para scope=STUDENTS en este corte.");
        }
        if (studentRankingLayout) {
            if (request.studentId() != null) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR, "studentId no aplica para STUDENT_RANKING.");
            }
            if (request.topN() == null) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR, "topN es obligatorio para STUDENT_RANKING.");
            }
            if (!DashboardWidgetComposer.STUDENT_RANKING_ALLOWED_TOP_N.contains(request.topN())) {
                throw new BusinessException(
                        ErrorCode.VALIDATION_ERROR,
                        "topN no pertenece al catálogo soportado para STUDENT_RANKING."
                );
            }
            DashboardAccessResultFilter effectiveAccessResult = request.accessResult() == null
                    ? DashboardAccessResultFilter.ALL
                    : request.accessResult();
            if (effectiveAccessResult != DashboardAccessResultFilter.ALL
                    && effectiveAccessResult != DashboardAccessResultFilter.SUCCESS
                    && effectiveAccessResult != DashboardAccessResultFilter.FAILED) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR, "accessResult no soportado para ranking de estudiantes.");
            }
            return;
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
    }

    private void validateCareersScope(DashboardAnalysisRequest request, boolean careerRankingLayout) {
        if (request.studentId() != null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "studentId no aplica para scope=CAREERS.");
        }
        if (careerRankingLayout) {
            validateCareerRankingScope(request);
            return;
        }
        if (request.mode() != DashboardFilterMode.INDIVIDUAL) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "El endpoint adaptativo solo soporta mode=INDIVIDUAL para scope=CAREERS en esta etapa."
            );
        }
        if (request.careerIds() == null || request.careerIds().size() != 1) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "careerIds debe contener exactamente un careerId cuando scope=CAREERS y mode=INDIVIDUAL."
            );
        }
    }

    private void validateCareerRankingScope(DashboardAnalysisRequest request) {
        if (request.topN() == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "topN es obligatorio para rankings de carrera.");
        }
        if (!DashboardWidgetComposer.CAREER_RANKING_ALLOWED_TOP_N.contains(request.topN())) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "topN no pertenece al catálogo soportado para rankings de carrera."
            );
        }
        if (request.mode() == DashboardFilterMode.ALL && request.careerIds() != null && !request.careerIds().isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "careerIds no aplica para scope=CAREERS y mode=ALL.");
        }
        if (request.mode() == DashboardFilterMode.MULTI && (request.careerIds() == null || request.careerIds().isEmpty())) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "careerIds es obligatorio cuando scope=CAREERS y mode=MULTI."
            );
        }
        DashboardAccessResultFilter effectiveAccessResult = request.accessResult() == null
                ? DashboardAccessResultFilter.ALL
                : request.accessResult();
        if (effectiveAccessResult != DashboardAccessResultFilter.ALL
                && effectiveAccessResult != DashboardAccessResultFilter.SUCCESS
                && effectiveAccessResult != DashboardAccessResultFilter.FAILED) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "accessResult no soportado para rankings de carrera.");
        }
    }

    private void validateWidgetControls(DashboardAnalysisRequest request) {
        DashboardAnalysisWidgetControlsRequest widgetControls = request.widgetControls();
        if (widgetControls == null) {
            return;
        }

        if (widgetControls.studentActivityTable() != null) {
            boolean appliesToStudentDetail = request.scope() == DashboardFilterScope.STUDENTS
                    && request.mode() == DashboardFilterMode.INDIVIDUAL
                    && (request.rankingMode() == null || request.rankingMode() == DashboardRankingMode.NONE);
            if (!appliesToStudentDetail) {
                throw new BusinessException(
                        ErrorCode.VALIDATION_ERROR,
                        "studentActivityTable solo aplica para STUDENT_DETAIL."
                );
            }
            validateTableControl(
                    widgetControls.studentActivityTable(),
                    "studentActivityTable",
                    DashboardWidgetComposer.STUDENT_ACTIVITY_ALLOWED_SORT_BY,
                    DashboardWidgetComposer.STUDENT_ACTIVITY_MAX_SIZE
            );
        }

        if (widgetControls.careerStudentTable() != null) {
            boolean appliesToCareerDetail = request.scope() == DashboardFilterScope.CAREERS
                    && request.mode() == DashboardFilterMode.INDIVIDUAL
                    && (request.rankingMode() == null || request.rankingMode() == DashboardRankingMode.NONE);
            if (!appliesToCareerDetail) {
                throw new BusinessException(
                        ErrorCode.VALIDATION_ERROR,
                        "careerStudentTable solo aplica para CAREER_DETAIL."
                );
            }
            validateTableControl(
                    widgetControls.careerStudentTable(),
                    "careerStudentTable",
                    DashboardWidgetComposer.CAREER_STUDENT_TABLE_ALLOWED_SORT_BY,
                    DashboardWidgetComposer.CAREER_STUDENT_TABLE_MAX_SIZE
            );
        }
    }

    private void validateTableControl(
            DashboardTableWidgetControlRequest control,
            String controlName,
            java.util.Set<String> allowedSortBy,
            int maxSize
    ) {
        if (control.page() != null && control.page() < 0) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, controlName + ".page debe ser mayor o igual a 0.");
        }
        if (control.size() != null && (control.size() < 1 || control.size() > maxSize)) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    controlName + ".size debe estar entre 1 y " + maxSize + "."
            );
        }
        if (control.sortBy() != null && !control.sortBy().isBlank() && !allowedSortBy.contains(control.sortBy().trim())) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    controlName + ".sortBy no pertenece al catálogo soportado."
            );
        }
    }
}
