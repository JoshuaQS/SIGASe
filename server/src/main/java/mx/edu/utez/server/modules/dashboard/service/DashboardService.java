package mx.edu.utez.server.modules.dashboard.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAccessStatus;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAccessTrendsResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisType;
import mx.edu.utez.server.modules.dashboard.dto.DashboardSummaryResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTopCareerItemResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTopCareersResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTopStudentItemResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTopStudentsResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTrendPointResponse;
import mx.edu.utez.server.modules.dashboard.mapper.DashboardMapper;
import mx.edu.utez.server.modules.dashboard.repository.DashboardMetricsRepository;
import mx.edu.utez.server.modules.elibro.entity.ElibroConfig;
import mx.edu.utez.server.modules.elibro.repository.ElibroConfigRepository;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.shared.enums.AccessResult;
import mx.edu.utez.server.shared.enums.ElibroValidationStatus;
import mx.edu.utez.server.shared.enums.StudentStatus;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class DashboardService {

    private static final int DEFAULT_RANGE_DAYS = 30;
    private static final long MAX_RANGE_DAYS = 366;
    private static final int DEFAULT_TOP_LIMIT = 10;
    private static final int MAX_TOP_LIMIT = 50;

    private final StudentRepository studentRepository;
    private final DashboardMetricsRepository dashboardMetricsRepository;
    private final ElibroConfigRepository elibroConfigRepository;
    private final DashboardMapper dashboardMapper;

    public DashboardService(
            StudentRepository studentRepository,
            DashboardMetricsRepository dashboardMetricsRepository,
            ElibroConfigRepository elibroConfigRepository,
            DashboardMapper dashboardMapper
    ) {
        this.studentRepository = studentRepository;
        this.dashboardMetricsRepository = dashboardMetricsRepository;
        this.elibroConfigRepository = elibroConfigRepository;
        this.dashboardMapper = dashboardMapper;
    }

    @Transactional(readOnly = true)
    public DashboardSummaryResponse getSummary(
            Instant dateFrom,
            Instant dateTo,
            String analysisType,
            UUID studentId,
            List<String> careerCodes,
            String status,
            StudentStatus studentStatus,
            String sortDir,
            Boolean topEnabled,
            Integer topN
    ) {
        ResolvedFilters filters = resolveFilters(
                dateFrom,
                dateTo,
                analysisType,
                studentId,
                careerCodes,
                status,
                studentStatus,
                sortDir,
                topEnabled,
                topN
        );

        long totalStudents = studentRepository.count(studentSpecification(filters, null));
        long activeStudents = studentRepository.count(studentSpecification(filters, StudentStatus.ACTIVE));
        long inactiveStudents = studentRepository.count(studentSpecification(filters, StudentStatus.INACTIVE));

        long successful = dashboardMetricsRepository.countSuccessfulAccesses(
                filters.range().dateFrom(),
                filters.range().dateTo(),
                filters.studentId(),
                filters.careerCodes(),
                filters.careerCodesEmpty(),
                filters.studentStatus(),
                filters.accessStatus().name()
        );
        long failed = dashboardMetricsRepository.countFailedAccesses(
                filters.range().dateFrom(),
                filters.range().dateTo(),
                filters.studentId(),
                filters.careerCodes(),
                filters.careerCodesEmpty(),
                filters.studentStatus(),
                filters.accessStatus().name()
        );
        long uniqueStudents = dashboardMetricsRepository.countUniqueStudentsByAccessStatus(
                filters.range().dateFrom(),
                filters.range().dateTo(),
                filters.studentId(),
                filters.careerCodes(),
                filters.careerCodesEmpty(),
                filters.studentStatus(),
                filters.accessStatus().name()
        );

        Instant lastAccessAt = dashboardMetricsRepository.findLastAccessAtByFilters(
                filters.studentId(),
                filters.careerCodes(),
                filters.careerCodesEmpty(),
                filters.studentStatus(),
                filters.accessStatus().name()
        );
        Instant lastSuccessfulAccessAt = dashboardMetricsRepository.findLastSuccessfulAccessAt(
                filters.range().dateFrom(),
                filters.range().dateTo(),
                filters.studentId(),
                filters.careerCodes(),
                filters.careerCodesEmpty(),
                filters.studentStatus()
        );
        Instant lastFailedAccessAt = dashboardMetricsRepository.findLastFailedAccessAt(
                filters.range().dateFrom(),
                filters.range().dateTo(),
                filters.studentId(),
                filters.careerCodes(),
                filters.careerCodesEmpty(),
                filters.studentStatus()
        );

        return new DashboardSummaryResponse(
                totalStudents,
                activeStudents,
                inactiveStudents,
                successful,
                failed,
                calculateSuccessRate(successful, failed),
                uniqueStudents,
                resolveElibroStatus(),
                lastAccessAt,
                lastSuccessfulAccessAt,
                lastFailedAccessAt
        );
    }

    @Transactional(readOnly = true)
    public DashboardAccessTrendsResponse getAccessTrends(
            Instant dateFrom,
            Instant dateTo,
            String analysisType,
            UUID studentId,
            List<String> careerCodes,
            String status,
            StudentStatus studentStatus,
            String sortDir,
            Boolean topEnabled,
            Integer topN
    ) {
        ResolvedFilters filters = resolveFilters(
                dateFrom,
                dateTo,
                analysisType,
                studentId,
                careerCodes,
                status,
                studentStatus,
                sortDir,
                topEnabled,
                topN
        );

        List<DashboardMetricsRepository.DailyResultCountProjection> rows = dashboardMetricsRepository.findDailyAccessCounts(
                filters.range().dateFrom(),
                filters.range().dateTo(),
                filters.studentId(),
                filters.careerCodes(),
                filters.careerCodesEmpty(),
                filters.studentStatus(),
                filters.accessStatus().name()
        );

        Map<LocalDate, DashboardTrendAccumulator> byDay = new HashMap<>();
        LocalDate fromDay = filters.range().dateFrom().atZone(ZoneOffset.UTC).toLocalDate();
        LocalDate toDay = filters.range().dateTo().atZone(ZoneOffset.UTC).toLocalDate();
        LocalDate cursor = fromDay;
        while (!cursor.isAfter(toDay)) {
            byDay.put(cursor, new DashboardTrendAccumulator());
            cursor = cursor.plusDays(1);
        }

        for (DashboardMetricsRepository.DailyResultCountProjection row : rows) {
            LocalDate day = row.getDay().toLocalDate();
            DashboardTrendAccumulator accumulator = byDay.get(day);
            if (accumulator == null) {
                continue;
            }
            if (row.getResult() == AccessResult.SUCCESS) {
                accumulator.successful += row.getTotal();
            } else {
                accumulator.failed += row.getTotal();
            }
        }

        List<DashboardTrendPointResponse> points = new ArrayList<>();
        cursor = fromDay;
        while (!cursor.isAfter(toDay)) {
            DashboardTrendAccumulator acc = byDay.get(cursor);
            points.add(new DashboardTrendPointResponse(
                    cursor.toString(),
                    acc == null ? 0 : acc.successful,
                    acc == null ? 0 : acc.failed
            ));
            cursor = cursor.plusDays(1);
        }

        return new DashboardAccessTrendsResponse(
                filters.range().dateFrom().toString(),
                filters.range().dateTo().toString(),
                points
        );
    }

    @Transactional(readOnly = true)
    public DashboardTopStudentsResponse getTopStudents(
            Instant dateFrom,
            Instant dateTo,
            String analysisType,
            UUID studentId,
            List<String> careerCodes,
            String status,
            StudentStatus studentStatus,
            String sortDir,
            Boolean topEnabled,
            Integer topN
    ) {
        ResolvedFilters filters = resolveFilters(
                dateFrom,
                dateTo,
                analysisType,
                studentId,
                careerCodes,
                status,
                studentStatus,
                sortDir,
                topEnabled,
                topN
        );

        int limit = filters.effectiveTopLimit();
        PageRequest pageRequest = PageRequest.of(0, limit);
        List<DashboardTopStudentItemResponse> items = resolveTopStudentsQuery(filters, pageRequest)
                .stream()
                .map(dashboardMapper::toTopStudentItem)
                .toList();

        return new DashboardTopStudentsResponse(
                filters.range().dateFrom().toString(),
                filters.range().dateTo().toString(),
                limit,
                filters.sortDir(),
                items
        );
    }

    @Transactional(readOnly = true)
    public DashboardTopCareersResponse getTopCareers(
            Instant dateFrom,
            Instant dateTo,
            String analysisType,
            UUID studentId,
            List<String> careerCodes,
            String status,
            StudentStatus studentStatus,
            String sortDir,
            Boolean topEnabled,
            Integer topN
    ) {
        ResolvedFilters filters = resolveFilters(
                dateFrom,
                dateTo,
                analysisType,
                studentId,
                careerCodes,
                status,
                studentStatus,
                sortDir,
                topEnabled,
                topN
        );

        int limit = filters.effectiveTopLimit();
        PageRequest pageRequest = PageRequest.of(0, limit);
        List<DashboardTopCareerItemResponse> items = resolveTopCareersQuery(filters, pageRequest)
                .stream()
                .map(row -> new DashboardTopCareerItemResponse(
                        row.getCareerCode(),
                        row.getCareerName(),
                        row.getSuccessfulAccesses(),
                        row.getFailedAccesses(),
                        row.getTotalAccesses()
                ))
                .toList();

        return new DashboardTopCareersResponse(
                filters.range().dateFrom().toString(),
                filters.range().dateTo().toString(),
                limit,
                filters.sortDir(),
                items
        );
    }

    @Transactional(readOnly = true)
    public DashboardExportSnapshot buildExportSnapshot(
            Instant dateFrom,
            Instant dateTo,
            String analysisType,
            UUID studentId,
            List<String> careerCodes,
            String status,
            StudentStatus studentStatus,
            String sortDir,
            Boolean topEnabled,
            Integer topN
    ) {
        DashboardSummaryResponse summary = getSummary(
                dateFrom, dateTo, analysisType, studentId, careerCodes, status, studentStatus, sortDir, topEnabled, topN
        );
        DashboardAccessTrendsResponse trends = getAccessTrends(
                dateFrom, dateTo, analysisType, studentId, careerCodes, status, studentStatus, sortDir, topEnabled, topN
        );
        DashboardTopStudentsResponse topStudents = getTopStudents(
                dateFrom, dateTo, analysisType, studentId, careerCodes, status, studentStatus, sortDir, topEnabled, topN
        );
        DashboardTopCareersResponse topCareers = getTopCareers(
                dateFrom, dateTo, analysisType, studentId, careerCodes, status, studentStatus, sortDir, topEnabled, topN
        );
        return new DashboardExportSnapshot(summary, trends, topStudents, topCareers);
    }

    private List<DashboardMetricsRepository.TopStudentProjection> resolveTopStudentsQuery(
            ResolvedFilters filters,
            PageRequest pageRequest
    ) {
        return switch (filters.accessStatus()) {
            case SUCCESS -> "asc".equals(filters.sortDir())
                    ? dashboardMetricsRepository.findTopStudentsSuccessAsc(
                            filters.range().dateFrom(),
                            filters.range().dateTo(),
                            filters.studentId(),
                            filters.careerCodes(),
                            filters.careerCodesEmpty(),
                            filters.studentStatus(),
                            pageRequest
                    ).getContent()
                    : dashboardMetricsRepository.findTopStudentsSuccessDesc(
                            filters.range().dateFrom(),
                            filters.range().dateTo(),
                            filters.studentId(),
                            filters.careerCodes(),
                            filters.careerCodesEmpty(),
                            filters.studentStatus(),
                            pageRequest
                    ).getContent();
            case FAILED -> "asc".equals(filters.sortDir())
                    ? dashboardMetricsRepository.findTopStudentsFailedAsc(
                            filters.range().dateFrom(),
                            filters.range().dateTo(),
                            filters.studentId(),
                            filters.careerCodes(),
                            filters.careerCodesEmpty(),
                            filters.studentStatus(),
                            pageRequest
                    ).getContent()
                    : dashboardMetricsRepository.findTopStudentsFailedDesc(
                            filters.range().dateFrom(),
                            filters.range().dateTo(),
                            filters.studentId(),
                            filters.careerCodes(),
                            filters.careerCodesEmpty(),
                            filters.studentStatus(),
                            pageRequest
                    ).getContent();
            case ALL -> "asc".equals(filters.sortDir())
                    ? dashboardMetricsRepository.findTopStudentsAllAsc(
                            filters.range().dateFrom(),
                            filters.range().dateTo(),
                            filters.studentId(),
                            filters.careerCodes(),
                            filters.careerCodesEmpty(),
                            filters.studentStatus(),
                            pageRequest
                    ).getContent()
                    : dashboardMetricsRepository.findTopStudentsAllDesc(
                            filters.range().dateFrom(),
                            filters.range().dateTo(),
                            filters.studentId(),
                            filters.careerCodes(),
                            filters.careerCodesEmpty(),
                            filters.studentStatus(),
                            pageRequest
                    ).getContent();
        };
    }

    private List<DashboardMetricsRepository.TopCareerProjection> resolveTopCareersQuery(
            ResolvedFilters filters,
            PageRequest pageRequest
    ) {
        return switch (filters.accessStatus()) {
            case SUCCESS -> "asc".equals(filters.sortDir())
                    ? dashboardMetricsRepository.findTopCareersSuccessAsc(
                            filters.range().dateFrom(),
                            filters.range().dateTo(),
                            filters.studentId(),
                            filters.careerCodes(),
                            filters.careerCodesEmpty(),
                            filters.studentStatus(),
                            pageRequest
                    ).getContent()
                    : dashboardMetricsRepository.findTopCareersSuccessDesc(
                            filters.range().dateFrom(),
                            filters.range().dateTo(),
                            filters.studentId(),
                            filters.careerCodes(),
                            filters.careerCodesEmpty(),
                            filters.studentStatus(),
                            pageRequest
                    ).getContent();
            case FAILED -> "asc".equals(filters.sortDir())
                    ? dashboardMetricsRepository.findTopCareersFailedAsc(
                            filters.range().dateFrom(),
                            filters.range().dateTo(),
                            filters.studentId(),
                            filters.careerCodes(),
                            filters.careerCodesEmpty(),
                            filters.studentStatus(),
                            pageRequest
                    ).getContent()
                    : dashboardMetricsRepository.findTopCareersFailedDesc(
                            filters.range().dateFrom(),
                            filters.range().dateTo(),
                            filters.studentId(),
                            filters.careerCodes(),
                            filters.careerCodesEmpty(),
                            filters.studentStatus(),
                            pageRequest
                    ).getContent();
            case ALL -> "asc".equals(filters.sortDir())
                    ? dashboardMetricsRepository.findTopCareersAllAsc(
                            filters.range().dateFrom(),
                            filters.range().dateTo(),
                            filters.studentId(),
                            filters.careerCodes(),
                            filters.careerCodesEmpty(),
                            filters.studentStatus(),
                            pageRequest
                    ).getContent()
                    : dashboardMetricsRepository.findTopCareersAllDesc(
                            filters.range().dateFrom(),
                            filters.range().dateTo(),
                            filters.studentId(),
                            filters.careerCodes(),
                            filters.careerCodesEmpty(),
                            filters.studentStatus(),
                            pageRequest
                    ).getContent();
        };
    }

    private Specification<Student> studentSpecification(ResolvedFilters filters, StudentStatus exactStatus) {
        return (root, query, cb) -> {
            var predicate = cb.conjunction();

            if (filters.studentId() != null) {
                predicate = cb.and(predicate, cb.equal(root.get("id"), filters.studentId()));
            }

            if (!filters.careerCodesEmpty()) {
                predicate = cb.and(
                        predicate,
                        cb.upper(root.get("career").get("code")).in(filters.careerCodes())
                );
            }

            if (filters.studentStatus() != null) {
                predicate = cb.and(predicate, cb.equal(root.get("status"), filters.studentStatus()));
            }

            if (exactStatus != null) {
                predicate = cb.and(predicate, cb.equal(root.get("status"), exactStatus));
            }

            return predicate;
        };
    }

    private double calculateSuccessRate(long successful, long failed) {
        long total = successful + failed;
        if (total == 0) {
            return 0.0;
        }
        BigDecimal ratio = BigDecimal.valueOf(successful)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP);
        return ratio.doubleValue();
    }

    private String resolveElibroStatus() {
        ElibroConfig activeConfig = elibroConfigRepository.findFirstByActiveTrueOrderByUpdatedAtDesc().orElse(null);
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

    private ResolvedFilters resolveFilters(
            Instant dateFrom,
            Instant dateTo,
            String analysisTypeRaw,
            UUID studentId,
            List<String> careerCodesRaw,
            String accessStatusRaw,
            StudentStatus studentStatus,
            String sortDir,
            Boolean topEnabledRaw,
            Integer topN
    ) {
        DashboardAnalysisType analysisType = DashboardAnalysisType.fromNullable(analysisTypeRaw);
        DashboardAccessStatus accessStatus = DashboardAccessStatus.fromNullable(accessStatusRaw);
        String safeSortDir = resolveSortDirection(sortDir);

        List<String> normalizedCareerCodes = normalizeCareerCodes(careerCodesRaw);
        boolean careerCodesEmpty = normalizedCareerCodes.isEmpty();

        boolean topEnabled = Boolean.TRUE.equals(topEnabledRaw);
        if (!topEnabled && topN != null) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "topN es inválido cuando topEnabled=false."
            );
        }
        if (topEnabled && topN == null) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "topN es obligatorio cuando topEnabled=true."
            );
        }

        if (analysisType == DashboardAnalysisType.STUDENTS_INDIVIDUAL && studentId == null) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "students_individual requiere studentId."
            );
        }

        if (analysisType != DashboardAnalysisType.STUDENTS_INDIVIDUAL && studentId != null) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "studentId solo se permite con analysisType=students_individual."
            );
        }

        if (analysisType == DashboardAnalysisType.STUDENTS_INDIVIDUAL && topEnabled) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "topEnabled no se permite con analysisType=students_individual."
            );
        }

        Range range = resolveRange(
                dateFrom,
                dateTo,
                studentId,
                normalizedCareerCodes,
                careerCodesEmpty,
                studentStatus,
                accessStatus
        );

        int effectiveTopLimit = topEnabled ? resolveLimit(topN) : DEFAULT_TOP_LIMIT;

        return new ResolvedFilters(
                range,
                analysisType,
                studentId,
                normalizedCareerCodes,
                careerCodesEmpty,
                accessStatus,
                studentStatus,
                safeSortDir,
                topEnabled,
                topN,
                effectiveTopLimit
        );
    }

    private Range resolveRange(
            Instant dateFrom,
            Instant dateTo,
            UUID studentId,
            List<String> careerCodes,
            boolean careerCodesEmpty,
            StudentStatus studentStatus,
            DashboardAccessStatus accessStatus
    ) {
        if (dateFrom == null && dateTo == null) {
            Instant historicalFrom = dashboardMetricsRepository.findFirstAccessAtByFilters(
                    studentId,
                    careerCodes,
                    careerCodesEmpty,
                    studentStatus,
                    accessStatus.name()
            );
            Instant historicalTo = dashboardMetricsRepository.findLastAccessAtByFilters(
                    studentId,
                    careerCodes,
                    careerCodesEmpty,
                    studentStatus,
                    accessStatus.name()
            );
            if (historicalFrom == null || historicalTo == null) {
                Instant to = Instant.now();
                Instant from = to.minus(DEFAULT_RANGE_DAYS, ChronoUnit.DAYS);
                return new Range(from, to);
            }
            Instant from = historicalFrom.truncatedTo(ChronoUnit.SECONDS);
            Instant to = historicalTo.truncatedTo(ChronoUnit.SECONDS);
            return new Range(from, to);
        }
        if (dateFrom == null || dateTo == null) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "dateFrom y dateTo deben enviarse juntos o ambos omitirse."
            );
        }
        if (dateFrom.isAfter(dateTo)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "dateFrom debe ser menor o igual a dateTo.");
        }
        long days = ChronoUnit.DAYS.between(dateFrom, dateTo);
        if (days > MAX_RANGE_DAYS) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Rango de fechas excede el máximo permitido.");
        }
        return new Range(dateFrom, dateTo);
    }

    private int resolveLimit(Integer limit) {
        if (limit == null) {
            return DEFAULT_TOP_LIMIT;
        }
        if (limit < 1 || limit > MAX_TOP_LIMIT) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "topN fuera de rango permitido.");
        }
        return limit;
    }

    private String resolveSortDirection(String sortDir) {
        if (!StringUtils.hasText(sortDir)) {
            return "desc";
        }
        String normalized = sortDir.trim().toLowerCase(Locale.ROOT);
        if (!"asc".equals(normalized) && !"desc".equals(normalized)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "sortDir inválido.");
        }
        return normalized;
    }

    private List<String> normalizeCareerCodes(List<String> rawCodes) {
        if (rawCodes == null || rawCodes.isEmpty()) {
            return List.of();
        }
        return rawCodes.stream()
                .filter(StringUtils::hasText)
                .map(value -> value.trim().toUpperCase(Locale.ROOT))
                .distinct()
                .collect(Collectors.toList());
    }

    private static class DashboardTrendAccumulator {
        private long successful;
        private long failed;
    }

    private record Range(Instant dateFrom, Instant dateTo) {
    }

    private record ResolvedFilters(
            Range range,
            DashboardAnalysisType analysisType,
            UUID studentId,
            List<String> careerCodes,
            boolean careerCodesEmpty,
            DashboardAccessStatus accessStatus,
            StudentStatus studentStatus,
            String sortDir,
            boolean topEnabled,
            Integer topN,
            int effectiveTopLimit
    ) {
    }

    public record DashboardExportSnapshot(
            DashboardSummaryResponse summary,
            DashboardAccessTrendsResponse trends,
            DashboardTopStudentsResponse topStudents,
            DashboardTopCareersResponse topCareers
    ) {
    }
}
