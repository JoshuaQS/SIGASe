package mx.edu.utez.server.modules.dashboard.service;

import mx.edu.utez.server.modules.dashboard.dto.DashboardAccessTrendsResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTopCareerItemResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTopCareersResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardSummaryResponse;
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
            UUID careerId,
            String careerCode,
            StudentStatus studentStatus
    ) {
        Range range = resolveRange(dateFrom, dateTo);
        String normalizedCareerCode = normalizeCareerCode(careerCode);
        String effectiveCareerCode = careerId != null ? null : normalizedCareerCode;

        long totalStudents = studentRepository.count(studentSpecification(careerId, effectiveCareerCode, studentStatus));
        long activeStudents = studentRepository.count(studentSpecification(careerId, effectiveCareerCode, StudentStatus.ACTIVE, studentStatus));
        long inactiveStudents = studentRepository.count(studentSpecification(careerId, effectiveCareerCode, StudentStatus.INACTIVE, studentStatus));

        long successful = dashboardMetricsRepository.countSuccessfulAccesses(
                range.dateFrom(),
                range.dateTo(),
                careerId,
                effectiveCareerCode,
                studentStatus
        );
        long failed = dashboardMetricsRepository.countFailedAccesses(
                range.dateFrom(),
                range.dateTo(),
                careerId,
                effectiveCareerCode,
                studentStatus
        );
        long uniqueSuccessfulStudents = dashboardMetricsRepository.countUniqueStudentsWithSuccessfulAccess(
                range.dateFrom(),
                range.dateTo(),
                careerId,
                effectiveCareerCode,
                studentStatus
        );

        return new DashboardSummaryResponse(
                totalStudents,
                activeStudents,
                inactiveStudents,
                successful,
                failed,
                calculateSuccessRate(successful, failed),
                uniqueSuccessfulStudents,
                resolveElibroStatus()
        );
    }

    @Transactional(readOnly = true)
    public DashboardAccessTrendsResponse getAccessTrends(
            Instant dateFrom,
            Instant dateTo,
            UUID careerId,
            String careerCode,
            StudentStatus studentStatus,
            AccessResult result
    ) {
        Range range = resolveRange(dateFrom, dateTo);
        String normalizedCareerCode = normalizeCareerCode(careerCode);
        String effectiveCareerCode = careerId != null ? null : normalizedCareerCode;
        List<DashboardMetricsRepository.DailyResultCountProjection> rows = dashboardMetricsRepository.findDailyAccessCounts(
                range.dateFrom(),
                range.dateTo(),
                careerId,
                effectiveCareerCode,
                studentStatus,
                result
        );

        Map<LocalDate, DashboardTrendAccumulator> byDay = new HashMap<>();
        LocalDate fromDay = range.dateFrom().atZone(ZoneOffset.UTC).toLocalDate();
        LocalDate toDay = range.dateTo().atZone(ZoneOffset.UTC).toLocalDate();
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
                range.dateFrom().toString(),
                range.dateTo().toString(),
                points
        );
    }

    @Transactional(readOnly = true)
    public DashboardTopStudentsResponse getTopStudents(
            Instant dateFrom,
            Instant dateTo,
            UUID careerId,
            String careerCode,
            StudentStatus studentStatus,
            AccessResult result,
            Integer limit,
            String sortDir
    ) {
        Range range = resolveRange(dateFrom, dateTo);
        String normalizedCareerCode = normalizeCareerCode(careerCode);
        String effectiveCareerCode = careerId != null ? null : normalizedCareerCode;
        int safeLimit = resolveLimit(limit);
        String safeSortDir = resolveSortDirection(sortDir);

        if (result != null && result != AccessResult.SUCCESS) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "El endpoint top-students solo soporta result=SUCCESS."
            );
        }

        PageRequest pageRequest = PageRequest.of(0, safeLimit);
        List<DashboardTopStudentItemResponse> items = ("asc".equals(safeSortDir)
                ? dashboardMetricsRepository.findTopStudentsAsc(
                        range.dateFrom(), range.dateTo(), careerId, effectiveCareerCode, studentStatus, pageRequest
                )
                : dashboardMetricsRepository.findTopStudentsDesc(
                        range.dateFrom(), range.dateTo(), careerId, effectiveCareerCode, studentStatus, pageRequest
                )).stream().map(dashboardMapper::toTopStudentItem).toList();

        return new DashboardTopStudentsResponse(
                range.dateFrom().toString(),
                range.dateTo().toString(),
                safeLimit,
                safeSortDir,
                items
        );
    }

    @Transactional(readOnly = true)
    public DashboardTopCareersResponse getTopCareers(
            Instant dateFrom,
            Instant dateTo,
            UUID careerId,
            String careerCode,
            StudentStatus studentStatus,
            Integer limit,
            String sortDir
    ) {
        Range range = resolveRange(dateFrom, dateTo);
        String normalizedCareerCode = normalizeCareerCode(careerCode);
        String effectiveCareerCode = careerId != null ? null : normalizedCareerCode;
        int safeLimit = resolveLimit(limit);
        String safeSortDir = resolveSortDirection(sortDir);

        PageRequest pageRequest = PageRequest.of(0, safeLimit);
        List<DashboardTopCareerItemResponse> items = ("asc".equals(safeSortDir)
                ? dashboardMetricsRepository.findTopCareersAsc(
                        range.dateFrom(), range.dateTo(), careerId, effectiveCareerCode, studentStatus, pageRequest
                )
                : dashboardMetricsRepository.findTopCareersDesc(
                        range.dateFrom(), range.dateTo(), careerId, effectiveCareerCode, studentStatus, pageRequest
                ))
                .stream()
                .map(row -> new DashboardTopCareerItemResponse(
                        row.getCareerCode(),
                        row.getCareerName(),
                        row.getSuccessfulAccesses()
                ))
                .toList();

        return new DashboardTopCareersResponse(
                range.dateFrom().toString(),
                range.dateTo().toString(),
                safeLimit,
                safeSortDir,
                items
        );
    }

    private Specification<Student> studentSpecification(UUID careerId, String careerCode, StudentStatus exactStatus) {
        return studentSpecification(careerId, careerCode, exactStatus, null);
    }

    private Specification<Student> studentSpecification(
            UUID careerId,
            String careerCode,
            StudentStatus exactStatus,
            StudentStatus statusFilter
    ) {
        return (root, query, cb) -> {
            var predicate = cb.conjunction();

            if (careerId != null) {
                predicate = cb.and(predicate, cb.equal(root.get("career").get("id"), careerId));
            } else if (StringUtils.hasText(careerCode)) {
                predicate = cb.and(
                        predicate,
                        cb.equal(
                                cb.lower(root.get("career").get("code")),
                                careerCode.toLowerCase(Locale.ROOT)
                        )
                );
            }

            if (statusFilter != null) {
                predicate = cb.and(predicate, cb.equal(root.get("status"), statusFilter));
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

    private Range resolveRange(Instant dateFrom, Instant dateTo) {
        if (dateFrom == null && dateTo == null) {
            Instant to = Instant.now();
            Instant from = to.minus(DEFAULT_RANGE_DAYS, ChronoUnit.DAYS);
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
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "limit fuera de rango permitido.");
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

    private String normalizeCareerCode(String careerCode) {
        if (!StringUtils.hasText(careerCode)) {
            return null;
        }
        return careerCode.trim();
    }

    private static class DashboardTrendAccumulator {
        private long successful;
        private long failed;
    }

    private record Range(Instant dateFrom, Instant dateTo) {
    }
}
