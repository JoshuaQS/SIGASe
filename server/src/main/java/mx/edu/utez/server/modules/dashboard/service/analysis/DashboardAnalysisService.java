package mx.edu.utez.server.modules.dashboard.service.analysis;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import mx.edu.utez.server.modules.careers.entity.Career;
import mx.edu.utez.server.modules.careers.repository.CareerRepository;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAccessTrendsResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAccessResultFilter;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardCareerKpiResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardCareerRankingKpiResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardCareerRankingTableItemResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardCareerRankingTableResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardLayoutType;
import mx.edu.utez.server.modules.dashboard.dto.DashboardStudentRankingKpiResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardStudentRankingTableResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardSummaryResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTopCareersResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTopStudentsResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardWidgetData;
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
    private final CareerRepository careerRepository;

    public DashboardAnalysisService(
            DashboardAnalysisValidator validator,
            DashboardAnalysisNormalizer normalizer,
            DashboardAccessResultMapper accessResultMapper,
            DashboardLayoutResolver layoutResolver,
            DashboardWidgetComposer widgetComposer,
            DashboardAnalyticsRepository analyticsRepository,
            DashboardResponseAssembler responseAssembler,
            ElibroConfigRepository elibroConfigRepository,
            StudentRepository studentRepository,
            CareerRepository careerRepository
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
        this.careerRepository = careerRepository;
    }

    @Transactional(readOnly = true)
    public DashboardAnalysisResponse analyze(DashboardAnalysisRequest request) {
        validator.validate(request);
        ResolvedDashboardAnalysisContext context = normalizer.normalize(request);
        DashboardLayoutType layoutType = layoutResolver.resolve(context);
        List<DashboardWidgetComposer.DashboardWidgetDefinition> definitions = widgetComposer.compose(layoutType, context);
        Career resolvedCareer = null;
        if (layoutType == DashboardLayoutType.STUDENT_DETAIL) {
            assertStudentExists(context);
        }
        if (layoutType == DashboardLayoutType.CAREER_DETAIL) {
            resolvedCareer = assertCareerExists(context);
        }
        BaseAccessQueryFilter queryFilter = new BaseAccessQueryFilter(
                context.studentId(),
                context.careerIds(),
                accessResultMapper.map(context.accessResult()),
                context.effectiveDateFrom(),
                context.effectiveDateTo()
        );

        Map<String, DashboardWidgetData> widgetData = new LinkedHashMap<>();
        switch (layoutType) {
            case OVERVIEW -> {
                DashboardAnalyticsRepository.OverviewKpiAggregate aggregate = analyticsRepository.fetchOverviewKpis(queryFilter);
                widgetData.put("overview-kpis", buildSummaryResponse(aggregate));
                widgetData.put("overview-trend", buildTrendResponse(context, queryFilter));
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
            }
            case STUDENT_DETAIL -> {
                widgetData.put("student-detail-trend", buildTrendResponse(context, queryFilter));
                widgetData.put("student-access-summary", analyticsRepository.fetchStudentAccessSummary(queryFilter));
            }
            case CAREER_DETAIL -> {
                DashboardAnalyticsRepository.AccessKpiAggregate aggregate = analyticsRepository.fetchCareerKpis(queryFilter);
                widgetData.put("career-detail-kpis", buildCareerKpiResponse(resolvedCareer, aggregate));
                widgetData.put("career-detail-trend", buildTrendResponse(context, queryFilter));
                widgetData.put(
                        "career-student-table",
                        analyticsRepository.fetchCareerStudents(
                                queryFilter,
                                context.widgetControls().careerStudentTable().page(),
                                context.widgetControls().careerStudentTable().size(),
                                context.widgetControls().careerStudentTable().sortBy(),
                                context.widgetControls().careerStudentTable().sortDirection()
                        )
                );
            }
            case STUDENT_RANKING -> {
                DashboardAnalyticsRepository.AccessKpiAggregate aggregate = analyticsRepository.fetchStudentRankingKpis(queryFilter);
                widgetData.put("student-ranking-kpis", buildStudentRankingKpiResponse(aggregate));
                widgetData.put("student-ranking-trend", buildTrendResponse(context, queryFilter));
                widgetData.put(
                        "student-ranking-table",
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
                        "student-ranking-top",
                        buildStudentRankingTableResponse(
                                context,
                                aggregate.uniqueStudentsImpacted(),
                                analyticsRepository.fetchStudentRanking(
                                        queryFilter,
                                        context.effectiveTopN(),
                                        context.effectiveSortDirection()
                                )
                        )
                );
            }
            case STUDENT_RANKING_SPLIT -> {
                DashboardAnalyticsRepository.AccessKpiAggregate aggregate = analyticsRepository.fetchStudentRankingKpis(queryFilter);
                widgetData.put("student-ranking-kpis", buildStudentRankingKpiResponse(aggregate));
                widgetData.put("student-ranking-trend", buildTrendResponse(context, queryFilter));

                widgetData.put(
                        "student-ranking-table",
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

                BaseAccessQueryFilter successFilter = new BaseAccessQueryFilter(
                        context.studentId(),
                        context.careerIds(),
                        accessResultMapper.map(DashboardAccessResultFilter.SUCCESS),
                        context.effectiveDateFrom(),
                        context.effectiveDateTo()
                );
                BaseAccessQueryFilter failedFilter = new BaseAccessQueryFilter(
                        context.studentId(),
                        context.careerIds(),
                        accessResultMapper.map(DashboardAccessResultFilter.FAILED),
                        context.effectiveDateFrom(),
                        context.effectiveDateTo()
                );

                widgetData.put(
                        "student-ranking-success-top",
                        buildStudentRankingTableResponse(
                                context,
                                aggregate.uniqueStudentsImpacted(),
                                analyticsRepository.fetchStudentRanking(
                                        successFilter,
                                        context.effectiveTopN(),
                                        context.effectiveSortDirection()
                                )
                        )
                );
                widgetData.put(
                        "student-ranking-failed-top",
                        buildStudentRankingTableResponse(
                                context,
                                aggregate.uniqueStudentsImpacted(),
                                analyticsRepository.fetchStudentRanking(
                                        failedFilter,
                                        context.effectiveTopN(),
                                        context.effectiveSortDirection()
                                )
                        )
                );
            }
            case CAREER_RANKING -> {
                DashboardAnalyticsRepository.CareerRankingKpiAggregate aggregate = analyticsRepository.fetchCareerRankingKpis(queryFilter);
                DashboardAnalyticsRepository.RankingMetric rankingMetric = resolveCareerRankingMetric(context);
                widgetData.put("career-ranking-kpis", buildCareerRankingKpiResponse(aggregate));
                widgetData.put(
                        "career-ranking-table",
                        buildCareerRankingTableResponse(
                                context,
                                rankingMetric,
                                aggregate.uniqueCareersImpacted(),
                                analyticsRepository.fetchCareerRanking(
                                        queryFilter,
                                        context.effectiveTopN(),
                                        context.effectiveSortDirection(),
                                        rankingMetric
                                )
                        )
                );
            }
            case CAREER_RANKING_SPLIT -> {
                DashboardAnalyticsRepository.CareerRankingKpiAggregate aggregate = analyticsRepository.fetchCareerRankingKpis(queryFilter);
                widgetData.put("career-ranking-split-kpis", buildCareerRankingKpiResponse(aggregate));
                widgetData.put(
                        "career-ranking-success-table",
                        buildCareerRankingTableResponse(
                                context,
                                DashboardAnalyticsRepository.RankingMetric.SUCCESS,
                                aggregate.uniqueCareersImpacted(),
                                analyticsRepository.fetchCareerRanking(
                                        queryFilter,
                                        context.effectiveTopN(),
                                        context.effectiveSortDirection(),
                                        DashboardAnalyticsRepository.RankingMetric.SUCCESS
                                )
                        )
                );
                widgetData.put(
                        "career-ranking-failed-table",
                        buildCareerRankingTableResponse(
                                context,
                                DashboardAnalyticsRepository.RankingMetric.FAILED,
                                aggregate.uniqueCareersImpacted(),
                                analyticsRepository.fetchCareerRanking(
                                        queryFilter,
                                        context.effectiveTopN(),
                                        context.effectiveSortDirection(),
                                        DashboardAnalyticsRepository.RankingMetric.FAILED
                                )
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

    private DashboardCareerKpiResponse buildCareerKpiResponse(
            Career career,
            DashboardAnalyticsRepository.AccessKpiAggregate aggregate
    ) {
        return new DashboardCareerKpiResponse(
                career.getId(),
                career.getCode(),
                career.getName(),
                aggregate.totalAccesses(),
                aggregate.successfulAccesses(),
                aggregate.failedAccesses(),
                aggregate.uniqueStudentsImpacted(),
                calculateSuccessRate(aggregate.successfulAccesses(), aggregate.failedAccesses()),
                aggregate.lastAccessAt(),
                aggregate.lastSuccessfulAccessAt(),
                aggregate.lastFailedAccessAt()
        );
    }

    private DashboardStudentRankingKpiResponse buildStudentRankingKpiResponse(
            DashboardAnalyticsRepository.AccessKpiAggregate aggregate
    ) {
        return new DashboardStudentRankingKpiResponse(
                aggregate.totalAccesses(),
                aggregate.successfulAccesses(),
                aggregate.failedAccesses(),
                aggregate.uniqueStudentsImpacted(),
                calculateSuccessRate(aggregate.successfulAccesses(), aggregate.failedAccesses()),
                aggregate.lastAccessAt(),
                aggregate.lastSuccessfulAccessAt(),
                aggregate.lastFailedAccessAt()
        );
    }

    private DashboardStudentRankingTableResponse buildStudentRankingTableResponse(
            ResolvedDashboardAnalysisContext context,
            long totalCandidates,
            List<mx.edu.utez.server.modules.dashboard.dto.DashboardStudentRankingTableItemResponse> items
    ) {
        return new DashboardStudentRankingTableResponse(
                context.effectiveTopN() == null ? DashboardWidgetComposer.STUDENT_RANKING_DEFAULT_TOP_N : context.effectiveTopN(),
                context.effectiveSortDirection().name().toLowerCase(),
                totalCandidates,
                items
        );
    }

    private DashboardCareerRankingKpiResponse buildCareerRankingKpiResponse(
            DashboardAnalyticsRepository.CareerRankingKpiAggregate aggregate
    ) {
        return new DashboardCareerRankingKpiResponse(
                aggregate.totalAccesses(),
                aggregate.successfulAccesses(),
                aggregate.failedAccesses(),
                aggregate.uniqueCareersImpacted(),
                calculateSuccessRate(aggregate.successfulAccesses(), aggregate.failedAccesses()),
                aggregate.lastAccessAt(),
                aggregate.lastSuccessfulAccessAt(),
                aggregate.lastFailedAccessAt()
        );
    }

    private DashboardCareerRankingTableResponse buildCareerRankingTableResponse(
            ResolvedDashboardAnalysisContext context,
            DashboardAnalyticsRepository.RankingMetric rankingMetric,
            long totalCandidates,
            List<DashboardCareerRankingTableItemResponse> items
    ) {
        return new DashboardCareerRankingTableResponse(
                context.effectiveTopN() == null ? DashboardWidgetComposer.CAREER_RANKING_DEFAULT_TOP_N : context.effectiveTopN(),
                context.effectiveSortDirection().name().toLowerCase(),
                rankingMetric.name(),
                totalCandidates,
                items
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

    private Career assertCareerExists(ResolvedDashboardAnalysisContext context) {
        if (context.careerIds().size() != 1) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "CAREER_DETAIL requiere exactamente un careerId efectivo.");
        }
        return careerRepository.findById(context.careerIds().get(0))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "careerId no corresponde a una carrera existente."));
    }

    private DashboardAnalyticsRepository.RankingMetric resolveCareerRankingMetric(ResolvedDashboardAnalysisContext context) {
        return switch (context.accessResult()) {
            case SUCCESS -> DashboardAnalyticsRepository.RankingMetric.SUCCESS;
            case FAILED -> DashboardAnalyticsRepository.RankingMetric.FAILED;
            case ALL -> throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "CAREER_RANKING requiere accessResult SUCCESS o FAILED."
            );
        };
    }
}
