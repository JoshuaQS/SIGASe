package mx.edu.utez.server.modules.dashboard.service.analysis;

import java.util.ArrayList;
import java.util.List;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAccessResultFilter;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisField;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisOptionsDateFilterResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisOptionsEffectiveDefaultsResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisOptionsRankingResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisOptionsRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisOptionsResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardDateFilterType;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterScope;
import mx.edu.utez.server.modules.dashboard.dto.DashboardRankingMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import org.springframework.stereotype.Service;

@Service
public class DashboardOptionsService {

    private final DashboardAnalysisSupportMatrix supportMatrix;
    private final DashboardAnalysisValidator validator;

    public DashboardOptionsService(
            DashboardAnalysisSupportMatrix supportMatrix,
            DashboardAnalysisValidator validator
    ) {
        this.supportMatrix = supportMatrix;
        this.validator = validator;
    }

    public DashboardAnalysisOptionsResponse resolve(DashboardAnalysisOptionsRequest request) {
        if (request == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Debe enviar un body parcial para resolver options.");
        }

        DashboardRankingMode effectiveRankingMode = resolveEffectiveRankingMode(request);
        Integer effectiveTopN = request.topN() != null
                ? request.topN()
                : supportMatrix.defaultTopN(request.scope(), request.mode(), effectiveRankingMode);
        DashboardSortDirection effectiveSortDirection = request.sortDirection() != null
                ? request.sortDirection()
                : supportMatrix.defaultSortDirection(request.scope(), request.mode(), effectiveRankingMode);
        DashboardAccessResultFilter effectiveAccessResult = request.accessResult() == null
                ? DashboardAccessResultFilter.ALL
                : request.accessResult();
        DashboardDateFilterType effectiveDateFilterType = request.dateFilterType() == null
                ? DashboardDateFilterType.NONE
                : request.dateFilterType();

        List<DashboardAnalysisField> requiredFields = resolveRequiredFields(request, effectiveDateFilterType);
        List<DashboardAnalysisField> forbiddenFields = resolveForbiddenFields(request, effectiveDateFilterType);
        List<DashboardAnalysisField> missingRequiredFields = resolveMissingRequiredFields(request, requiredFields);

        DashboardAnalysisRequest candidate = new DashboardAnalysisRequest(
                request.scope(),
                request.mode(),
                request.studentId(),
                request.careerIds(),
                effectiveAccessResult,
                effectiveDateFilterType,
                request.dateFrom(),
                request.dateTo(),
                effectiveRankingMode,
                effectiveTopN,
                effectiveSortDirection
        );

        boolean canSubmit = missingRequiredFields.isEmpty() && validateCandidate(candidate);

        return new DashboardAnalysisOptionsResponse(
                supportMatrix.allowedModes(request.scope()),
                request.scope() == null ? List.of() : supportMatrix.allowedAccessResults(),
                new DashboardAnalysisOptionsRankingResponse(
                        supportMatrix.rankingAllowed(request.scope(), request.mode()),
                        supportMatrix.allowedRankingModes(request.scope(), request.mode()),
                        supportMatrix.allowedTopN(request.scope(), request.mode(), effectiveRankingMode),
                        supportMatrix.defaultTopN(request.scope(), request.mode(), effectiveRankingMode),
                        supportMatrix.defaultSortDirection(request.scope(), request.mode(), effectiveRankingMode)
                ),
                new DashboardAnalysisOptionsDateFilterResponse(
                        List.of(DashboardDateFilterType.values()),
                        DashboardDateFilterType.NONE
                ),
                requiredFields,
                forbiddenFields,
                new DashboardAnalysisOptionsEffectiveDefaultsResponse(
                        effectiveAccessResult,
                        effectiveDateFilterType,
                        effectiveRankingMode,
                        effectiveTopN,
                        effectiveSortDirection
                ),
                canSubmit,
                resolveNextStep(request, missingRequiredFields, effectiveDateFilterType, effectiveRankingMode),
                missingRequiredFields
        );
    }

    private DashboardRankingMode resolveEffectiveRankingMode(DashboardAnalysisOptionsRequest request) {
        if (request.rankingMode() != null) {
            return request.rankingMode();
        }
        return supportMatrix.defaultRankingMode(request.scope(), request.mode());
    }

    private List<DashboardAnalysisField> resolveRequiredFields(
            DashboardAnalysisOptionsRequest request,
            DashboardDateFilterType effectiveDateFilterType
    ) {
        List<DashboardAnalysisField> fields = new ArrayList<>();
        if (request.scope() == null) {
            fields.add(DashboardAnalysisField.SCOPE);
            return fields;
        }
        if (request.mode() == null) {
            fields.add(DashboardAnalysisField.MODE);
            return fields;
        }
        if (request.scope() == DashboardFilterScope.STUDENTS && request.mode() == DashboardFilterMode.INDIVIDUAL) {
            fields.add(DashboardAnalysisField.STUDENT_ID);
        }
        if (request.scope() == DashboardFilterScope.CAREERS
                && (request.mode() == DashboardFilterMode.INDIVIDUAL || request.mode() == DashboardFilterMode.MULTI)) {
            fields.add(DashboardAnalysisField.CAREER_IDS);
        }
        if (effectiveDateFilterType == DashboardDateFilterType.CUSTOM_RANGE) {
            fields.add(DashboardAnalysisField.DATE_FROM);
            fields.add(DashboardAnalysisField.DATE_TO);
        }
        return fields;
    }

    private List<DashboardAnalysisField> resolveForbiddenFields(
            DashboardAnalysisOptionsRequest request,
            DashboardDateFilterType effectiveDateFilterType
    ) {
        List<DashboardAnalysisField> fields = new ArrayList<>();
        if (request.scope() == DashboardFilterScope.STUDENTS) {
            fields.add(DashboardAnalysisField.CAREER_IDS);
        }
        if (request.scope() == DashboardFilterScope.CAREERS) {
            fields.add(DashboardAnalysisField.STUDENT_ID);
        }
        if (request.scope() == DashboardFilterScope.CAREERS && request.mode() == DashboardFilterMode.ALL) {
            fields.add(DashboardAnalysisField.CAREER_IDS);
        }
        if (!supportMatrix.rankingAllowed(request.scope(), request.mode())) {
            fields.add(DashboardAnalysisField.RANKING_MODE);
            fields.add(DashboardAnalysisField.TOP_N);
        }
        if (effectiveDateFilterType != DashboardDateFilterType.CUSTOM_RANGE) {
            fields.add(DashboardAnalysisField.DATE_FROM);
            fields.add(DashboardAnalysisField.DATE_TO);
        }
        return fields.stream().distinct().toList();
    }

    private List<DashboardAnalysisField> resolveMissingRequiredFields(
            DashboardAnalysisOptionsRequest request,
            List<DashboardAnalysisField> requiredFields
    ) {
        return requiredFields.stream()
                .filter(field -> !isFieldPresent(request, field))
                .toList();
    }

    private boolean isFieldPresent(DashboardAnalysisOptionsRequest request, DashboardAnalysisField field) {
        return switch (field) {
            case SCOPE -> request.scope() != null;
            case MODE -> request.mode() != null;
            case STUDENT_ID -> request.studentId() != null;
            case CAREER_IDS -> request.careerIds() != null && !request.careerIds().isEmpty();
            case ACCESS_RESULT -> request.accessResult() != null;
            case DATE_FILTER_TYPE -> request.dateFilterType() != null;
            case DATE_FROM -> request.dateFrom() != null;
            case DATE_TO -> request.dateTo() != null;
            case RANKING_MODE -> request.rankingMode() != null;
            case TOP_N -> request.topN() != null;
            case SORT_DIRECTION -> request.sortDirection() != null;
        };
    }

    private boolean validateCandidate(DashboardAnalysisRequest candidate) {
        try {
            validator.validate(candidate);
            return true;
        } catch (BusinessException ex) {
            return false;
        }
    }

    private DashboardAnalysisField resolveNextStep(
            DashboardAnalysisOptionsRequest request,
            List<DashboardAnalysisField> missingRequiredFields,
            DashboardDateFilterType effectiveDateFilterType,
            DashboardRankingMode effectiveRankingMode
    ) {
        if (!missingRequiredFields.isEmpty()) {
            return missingRequiredFields.get(0);
        }
        if (request.scope() != null
                && request.mode() != null
                && request.scope() == DashboardFilterScope.CAREERS
                && (request.mode() == DashboardFilterMode.ALL || request.mode() == DashboardFilterMode.MULTI)
                && request.rankingMode() != null
                && request.rankingMode() != DashboardRankingMode.TOP) {
            return DashboardAnalysisField.RANKING_MODE;
        }
        List<Integer> allowedTopN = supportMatrix.allowedTopN(request.scope(), request.mode(), effectiveRankingMode);
        if (effectiveRankingMode == DashboardRankingMode.TOP
                && request.topN() != null
                && !allowedTopN.isEmpty()
                && !allowedTopN.contains(request.topN())) {
            return DashboardAnalysisField.TOP_N;
        }
        if (effectiveDateFilterType == DashboardDateFilterType.CUSTOM_RANGE
                && request.dateFrom() != null
                && request.dateTo() != null
                && request.dateFrom().isAfter(request.dateTo())) {
            return DashboardAnalysisField.DATE_FROM;
        }
        if (request.scope() == DashboardFilterScope.CAREERS
                && request.mode() == DashboardFilterMode.INDIVIDUAL
                && request.careerIds() != null
                && request.careerIds().size() != 1) {
            return DashboardAnalysisField.CAREER_IDS;
        }
        return null;
    }
}
