package mx.edu.utez.server.modules.dashboard.service.analysis;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAccessTrendsResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardLayoutType;
import mx.edu.utez.server.modules.dashboard.dto.DashboardSummaryResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTopCareersResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTopStudentsResponse;
import mx.edu.utez.server.modules.dashboard.repository.analysis.DashboardAnalyticsRepository;
import mx.edu.utez.server.modules.elibro.entity.ElibroConfig;
import mx.edu.utez.server.modules.elibro.repository.ElibroConfigRepository;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.shared.enums.ElibroConfigStatus;
import mx.edu.utez.server.shared.enums.ElibroValidationStatus;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardAnalysisService {

    private final DashboardAnalysisValidator validator;
    private final DashboardAnalysisNormalizer normalizer;
    private final DashboardAccessResultMapper accessResultMapper;
    private final DashboardLayoutResolver layoutResolver;
    private final DashboardWidgetComposer widgetComposer;
    private final DashboardAnalyticsRepository analyticsRepository;
    private final DashboardResponseAssembler responseAssembler;
    private final ElibroConfigRepository elibroConfigRepository;
    private final StudentRepository studentRepository;

    public DashboardAnalysisService(
            DashboardAnalysisValidator validator,
            DashboardAnalysisNormalizer normalizer,
            DashboardAccessResultMapper accessResultMapper,
            DashboardLayoutResolver layoutResolver,
            DashboardWidgetComposer widgetComposer,
            DashboardAnalyticsRepository analyticsRepository,
            DashboardResponseAssembler responseAssembler,
            ElibroConfigRepository elibroConfigRepository,
            StudentRepository studentRepository
    ) {
        this.validator = validator;
        this.normalizer = normalizer;
        this.accessResultMapper = accessResultMapper;
        this.layoutResolver = layoutResolver;
        this.widgetComposer = widgetComposer;
        this.analyticsRepository = analyticsRepository;
        this.responseAssembler = responseAssembler;
        this.elibroConfigRepository = elibroConfigRepository;
        this.studentRepository = studentRepository;
    }

    @Transactional(readOnly = true)
    public DashboardAnalysisResponse analyze(DashboardAnalysisRequest request) {
        validator.validate(request);
        ResolvedDashboardAnalysisContext context = normalizer.normalize(request);
        DashboardLayoutType layoutType = layoutResolver.resolve(context);
        List<DashboardWidgetComposer.DashboardWidgetDefinition> definitions = widgetComposer.compose(layoutType, context);
        if (layoutType == DashboardLayoutType.STUDENT_DETAIL) {
            assertStudentExists(context);
        }
        BaseAccessQueryFilter queryFilter = new BaseAccessQueryFilter(
                context.studentId(),
                context.careerIds(),
                accessResultMapper.map(context.accessResult()),
                context.effectiveDateFrom(),
                context.effectiveDateTo()
        );

        Map<String, Object> widgetData = new LinkedHashMap<>();
        DashboardAnalyticsRepository.OverviewKpiAggregate aggregate = analyticsRepository.fetchOverviewKpis(queryFilter);
        switch (layoutType) {
            case OVERVIEW -> {
                widgetData.put("overview-kpis", buildSummaryResponse(aggregate));
                widgetData.put("overview-trend", buildTrendResponse(context, queryFilter));
                widgetData.put(
                        "overview-top-students",
                        new DashboardTopStudentsResponse(
                                context.effectiveDateFrom().toString(),
                                context.effectiveDateTo().toString(),
                                DashboardWidgetComposer.OVERVIEW_TOP_LIMIT,
                                context.effectiveSortDirection().name().toLowerCase(),
                                analyticsRepository.fetchTopStudents(
                                        queryFilter,
                                        DashboardWidgetComposer.OVERVIEW_TOP_LIMIT,
                                        context.effectiveSortDirection()
                                )
                        )
                );
                widgetData.put(
                        "overview-top-careers",
                        new DashboardTopCareersResponse(
                                context.effectiveDateFrom().toString(),
                                context.effectiveDateTo().toString(),
                                DashboardWidgetComposer.OVERVIEW_TOP_LIMIT,
                                context.effectiveSortDirection().name().toLowerCase(),
                                analyticsRepository.fetchTopCareers(
                                        queryFilter,
                                        DashboardWidgetComposer.OVERVIEW_TOP_LIMIT,
                                        context.effectiveSortDirection()
                                )
                        )
                );
            }
            case STUDENT_DETAIL -> {
                widgetData.put("student-detail-kpis", buildSummaryResponse(aggregate));
                widgetData.put("student-detail-trend", buildTrendResponse(context, queryFilter));
                widgetData.put("student-access-summary", analyticsRepository.fetchStudentAccessSummary(queryFilter));
                widgetData.put(
                        "student-activity-table",
                        analyticsRepository.fetchStudentActivity(
                                queryFilter,
                                DashboardWidgetComposer.STUDENT_ACTIVITY_DEFAULT_PAGE,
                                DashboardWidgetComposer.STUDENT_ACTIVITY_DEFAULT_SIZE
                        )
                );
            }
            default -> throw new BusinessException(ErrorCode.VALIDATION_ERROR, "El layout solicitado todavía no está soportado.");
        }

        return responseAssembler.assemble(context, layoutType, definitions, widgetData);
    }

    private DashboardAccessTrendsResponse buildTrendResponse(
            ResolvedDashboardAnalysisContext context,
            BaseAccessQueryFilter queryFilter
    ) {
        return new DashboardAccessTrendsResponse(
                context.effectiveDateFrom().toString(),
                context.effectiveDateTo().toString(),
                analyticsRepository.fetchTrend(queryFilter)
        );
    }

    private DashboardSummaryResponse buildSummaryResponse(DashboardAnalyticsRepository.OverviewKpiAggregate aggregate) {
        return new DashboardSummaryResponse(
                aggregate.totalStudents(),
                aggregate.activeStudents(),
                aggregate.inactiveStudents(),
                aggregate.successfulAccessesInRange(),
                aggregate.failedAccessesInRange(),
                calculateSuccessRate(aggregate.successfulAccessesInRange(), aggregate.failedAccessesInRange()),
                aggregate.uniqueStudentsWithSuccessfulAccess(),
                resolveElibroStatus(),
                aggregate.lastAccessAt(),
                aggregate.lastSuccessfulAccessAt(),
                aggregate.lastFailedAccessAt()
        );
    }

    private double calculateSuccessRate(long successful, long failed) {
        long total = successful + failed;
        if (total == 0L) {
            return 0.0;
        }
        return BigDecimal.valueOf(successful)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private String resolveElibroStatus() {
        ElibroConfig activeConfig = elibroConfigRepository.findFirstByStatusOrderByUpdatedAtDesc(ElibroConfigStatus.ACTIVE).orElse(null);
        if (activeConfig == null) {
            return "NO_ACTIVE_CONFIG";
        }
        if (activeConfig.getValidationStatus() == ElibroValidationStatus.VALID) {
            return "ACTIVE_VALID";
        }
        if (activeConfig.getValidationStatus() == ElibroValidationStatus.INVALID) {
            return "ACTIVE_INVALID";
        }
        return "ACTIVE_UNKNOWN";
    }

    private void assertStudentExists(ResolvedDashboardAnalysisContext context) {
        if (context.studentId() == null || !studentRepository.existsById(context.studentId())) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "studentId no corresponde a un alumno existente.");
        }
    }
}
