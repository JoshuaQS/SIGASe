package mx.edu.utez.server.modules.reports.service;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.logs.access.entity.AccessLog;
import mx.edu.utez.server.modules.logs.access.repository.AccessLogRepository;
import mx.edu.utez.server.modules.logs.audit.entity.AuditLog;
import mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository;
import mx.edu.utez.server.modules.logs.audit.service.AuditTrailService;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.shared.enums.AccessResult;
import mx.edu.utez.server.shared.enums.AuditActorType;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.AuditSeverity;
import mx.edu.utez.server.shared.enums.StudentStatus;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import java.io.OutputStream;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class ReportService {

    private static final int CHUNK_SIZE = 500;
    private static final long MAX_STUDENTS_EXPORT = 10_000;
    private static final long MAX_LOGS_EXPORT = 50_000;
    private static final long MAX_RANGE_DAYS = 366;
    private static final int ERROR_DETAIL_MAX_LENGTH = 100;

    private static final DateTimeFormatter FILENAME_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd_HHmmss");

    private final StudentRepository studentRepository;
    private final AccessLogRepository accessLogRepository;
    private final AuditLogRepository auditLogRepository;
    private final CsvExportService csvExportService;
    private final AuditTrailService auditTrailService;

    public ReportService(
            StudentRepository studentRepository,
            AccessLogRepository accessLogRepository,
            AuditLogRepository auditLogRepository,
            CsvExportService csvExportService,
            AuditTrailService auditTrailService
    ) {
        this.studentRepository = studentRepository;
        this.accessLogRepository = accessLogRepository;
        this.auditLogRepository = auditLogRepository;
        this.csvExportService = csvExportService;
        this.auditTrailService = auditTrailService;
    }

    // ── Students Export ──────────────────────────────────────────────────

    static final String[] STUDENT_HEADERS = {
            "enrollmentId", "name", "lastNamePaternal", "lastNameMaternal",
            "institutionalEmail", "career", "quarter", "sex", "status",
            "lastLoginAt", "createdAt"
    };

    private static final List<Function<Student, String>> STUDENT_EXTRACTORS = List.of(
            s -> s.getEnrollmentId(),
            s -> s.getName(),
            s -> s.getLastNamePaternal(),
            s -> s.getLastNameMaternal() != null ? s.getLastNameMaternal() : "",
            s -> s.getInstitutionalEmail(),
            s -> s.getCareer(),
            s -> String.valueOf(s.getQuarter()),
            s -> s.getSex() != null ? s.getSex().name() : "",
            s -> s.getStatus() != null ? s.getStatus().name() : "",
            s -> CsvExportService.formatInstant(s.getLastLoginAt()),
            s -> CsvExportService.formatInstant(s.getCreatedAt())
    );

    @Transactional(readOnly = true)
    public void exportStudents(
            OutputStream out,
            String q,
            String career,
            StudentStatus status,
            Admin actor,
            HttpServletRequest request
    ) {
        Specification<Student> spec = buildStudentSpec(q, career, status);
        long total = studentRepository.count(spec);

        try {
                csvExportService.write(out, STUDENT_HEADERS, STUDENT_EXTRACTORS, page -> {
                PageRequest pageRequest = PageRequest.of(page, CHUNK_SIZE, Sort.by(Sort.Direction.ASC, "enrollmentId"));
                Page<Student> result = studentRepository.findAll(spec, pageRequest);
                return result.getContent();
            });
        } catch (Exception ex) {
            auditExport(actor, "STUDENTS", buildStudentFilterMeta(q, career, status), 0, AuditOutcome.FAILURE, request);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Error generando reporte de estudiantes.");
        }

        auditExport(actor, "STUDENTS", buildStudentFilterMeta(q, career, status), total, AuditOutcome.SUCCESS, request);
    }

    Specification<Student> buildStudentSpec(String query, String career, StudentStatus status) {
        return (root, q, cb) -> {
            var predicate = cb.conjunction();
            if (StringUtils.hasText(query)) {
                String normalized = "%" + query.trim().toLowerCase(Locale.ROOT) + "%";
                predicate = cb.and(predicate, cb.or(
                        cb.like(cb.lower(root.get("name")), normalized),
                        cb.like(cb.lower(root.get("lastNamePaternal")), normalized),
                        cb.like(cb.lower(root.get("lastNameMaternal")), normalized),
                        cb.like(cb.lower(root.get("enrollmentId")), normalized),
                        cb.like(cb.lower(root.get("institutionalEmailNormalized")), normalized)
                ));
            }
            if (StringUtils.hasText(career)) {
                predicate = cb.and(predicate, cb.equal(
                        cb.lower(root.get("career")),
                        career.trim().toLowerCase(Locale.ROOT)
                ));
            }
            if (status != null) {
                predicate = cb.and(predicate, cb.equal(root.get("status"), status));
            }
            return predicate;
        };
    }

    private Map<String, Object> buildStudentFilterMeta(String q, String career, StudentStatus status) {
        Map<String, Object> filters = new LinkedHashMap<>();
        if (StringUtils.hasText(q)) filters.put("q", q);
        if (StringUtils.hasText(career)) filters.put("career", career);
        if (status != null) filters.put("status", status.name());
        return filters;
    }

    // ── Access Logs Export ───────────────────────────────────────────────

    static final String[] ACCESS_LOG_HEADERS = {
            "occurredAt", "attemptedEmail", "normalizedEmail", "result",
            "errorCode", "errorDetail", "latencyMs", "ipAddress", "userAgent",
            "providerName", "nextUrl", "redirectUrl", "requestId"
    };

    private static final List<Function<AccessLog, String>> ACCESS_LOG_EXTRACTORS = List.of(
            a -> CsvExportService.formatInstant(a.getOccurredAt()),
            a -> a.getAttemptedEmail() != null ? a.getAttemptedEmail() : "",
            a -> a.getNormalizedEmail() != null ? a.getNormalizedEmail() : "",
            a -> a.getResult() != null ? a.getResult().name() : "",
            a -> a.getErrorCode() != null ? a.getErrorCode() : "",
            a -> truncateErrorDetail(a.getErrorDetail()),
            a -> a.getLatencyMs() != null ? String.valueOf(a.getLatencyMs()) : "",
            a -> a.getIpAddress() != null ? a.getIpAddress() : "",
            a -> a.getUserAgent() != null ? a.getUserAgent() : "",
            a -> a.getProviderName() != null ? a.getProviderName() : "",
            a -> a.getNextUrl() != null ? a.getNextUrl() : "",
            a -> a.getRedirectUrl() != null ? a.getRedirectUrl() : "",
            a -> a.getRequestId() != null ? a.getRequestId() : ""
    );

    @Transactional(readOnly = true)
    public void exportAccessLogs(
            OutputStream out,
            Instant dateFrom,
            Instant dateTo,
            AccessResult result,
            String normalizedEmail,
            String attemptedEmail,
            UUID studentId,
            String ipAddress,
            String providerName,
            Admin actor,
            HttpServletRequest request
    ) {
        validateDateRange(dateFrom, dateTo);
        Specification<AccessLog> spec = buildAccessLogSpec(
                dateFrom, dateTo, result, normalizedEmail, attemptedEmail, studentId, ipAddress, providerName
        );
        long total = accessLogRepository.count(spec);
        if (total > MAX_LOGS_EXPORT) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "El resultado excede el límite de " + MAX_LOGS_EXPORT
                            + " registros. Aplique filtros más específicos."
            );
        }

        Map<String, Object> filterMeta = buildAccessLogFilterMeta(
                dateFrom, dateTo, result, normalizedEmail, attemptedEmail, studentId, ipAddress, providerName
        );

        try {
            csvExportService.write(out, ACCESS_LOG_HEADERS, ACCESS_LOG_EXTRACTORS, page -> {
                PageRequest pageRequest = PageRequest.of(page, CHUNK_SIZE, Sort.by(Sort.Direction.DESC, "occurredAt"));
                Page<AccessLog> resultPage = accessLogRepository.findAll(spec, pageRequest);
                return resultPage.getContent();
            });
        } catch (Exception ex) {
            auditExport(actor, "ACCESS_LOGS", filterMeta, 0, AuditOutcome.FAILURE, request);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Error generando reporte de access logs.");
        }

        auditExport(actor, "ACCESS_LOGS", filterMeta, total, AuditOutcome.SUCCESS, request);
    }

    Specification<AccessLog> buildAccessLogSpec(
            Instant dateFrom, Instant dateTo, AccessResult result,
            String normalizedEmail, String attemptedEmail, UUID studentId,
            String ipAddress, String providerName
    ) {
        return (root, query, cb) -> {
            var predicate = cb.conjunction();
            predicate = cb.and(predicate, cb.greaterThanOrEqualTo(root.get("occurredAt"), dateFrom));
            predicate = cb.and(predicate, cb.lessThanOrEqualTo(root.get("occurredAt"), dateTo));
            if (result != null) {
                predicate = cb.and(predicate, cb.equal(root.get("result"), result));
            }
            if (StringUtils.hasText(normalizedEmail)) {
                predicate = cb.and(predicate, cb.equal(
                        cb.lower(root.get("normalizedEmail")),
                        normalizedEmail.trim().toLowerCase(Locale.ROOT)
                ));
            }
            if (StringUtils.hasText(attemptedEmail)) {
                predicate = cb.and(predicate, cb.equal(
                        cb.lower(root.get("attemptedEmail")),
                        attemptedEmail.trim().toLowerCase(Locale.ROOT)
                ));
            }
            if (studentId != null) {
                predicate = cb.and(predicate, cb.equal(root.get("student").get("id"), studentId));
            }
            if (StringUtils.hasText(ipAddress)) {
                predicate = cb.and(predicate, cb.equal(
                        cb.lower(root.get("ipAddress")),
                        ipAddress.trim().toLowerCase(Locale.ROOT)
                ));
            }
            if (StringUtils.hasText(providerName)) {
                predicate = cb.and(predicate, cb.equal(
                        cb.lower(root.get("providerName")),
                        providerName.trim().toLowerCase(Locale.ROOT)
                ));
            }
            return predicate;
        };
    }

    private Map<String, Object> buildAccessLogFilterMeta(
            Instant dateFrom, Instant dateTo, AccessResult result,
            String normalizedEmail, String attemptedEmail, UUID studentId,
            String ipAddress, String providerName
    ) {
        Map<String, Object> filters = new LinkedHashMap<>();
        filters.put("dateFrom", dateFrom.toString());
        filters.put("dateTo", dateTo.toString());
        if (result != null) filters.put("result", result.name());
        if (StringUtils.hasText(normalizedEmail)) filters.put("normalizedEmail", normalizedEmail);
        if (StringUtils.hasText(attemptedEmail)) filters.put("attemptedEmail", attemptedEmail);
        if (studentId != null) filters.put("studentId", studentId.toString());
        if (StringUtils.hasText(ipAddress)) filters.put("ipAddress", ipAddress);
        if (StringUtils.hasText(providerName)) filters.put("providerName", providerName);
        return filters;
    }

    // ── Audit Logs Export ───────────────────────────────────────────────

    static final String[] AUDIT_LOG_HEADERS = {
            "occurredAt", "actorType", "actorEmail", "action", "entityType",
            "entityId", "outcome", "severity", "ipAddress", "requestId"
    };

    private static final List<Function<AuditLog, String>> AUDIT_LOG_EXTRACTORS = List.of(
            a -> CsvExportService.formatInstant(a.getOccurredAt()),
            a -> a.getActorType() != null ? a.getActorType().name() : "",
            a -> a.getActorAdmin() != null ? a.getActorAdmin().getEmail() : "",
            a -> a.getAction() != null ? a.getAction() : "",
            a -> a.getEntityType() != null ? a.getEntityType() : "",
            a -> a.getEntityId() != null ? a.getEntityId() : "",
            a -> a.getOutcome() != null ? a.getOutcome().name() : "",
            a -> a.getSeverity() != null ? a.getSeverity().name() : "",
            a -> a.getIpAddress() != null ? a.getIpAddress() : "",
            a -> a.getRequestId() != null ? a.getRequestId() : ""
    );

    @Transactional(readOnly = true)
    public void exportAuditLogs(
            OutputStream out,
            Instant dateFrom,
            Instant dateTo,
            AuditActorType actorType,
            String actorEmail,
            String action,
            String entityType,
            AuditOutcome outcome,
            AuditSeverity severity,
            Admin actor,
            HttpServletRequest request
    ) {
        validateDateRange(dateFrom, dateTo);
        Specification<AuditLog> spec = buildAuditLogSpec(
                dateFrom, dateTo, actorType, actorEmail, action, entityType, outcome, severity
        );
        long total = auditLogRepository.count(spec);
        if (total > MAX_LOGS_EXPORT) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "El resultado excede el límite de " + MAX_LOGS_EXPORT
                            + " registros. Aplique filtros más específicos."
            );
        }

        Map<String, Object> filterMeta = buildAuditLogFilterMeta(
                dateFrom, dateTo, actorType, actorEmail, action, entityType, outcome, severity
        );

        try {
            csvExportService.write(out, AUDIT_LOG_HEADERS, AUDIT_LOG_EXTRACTORS, page -> {
                PageRequest pageRequest = PageRequest.of(page, CHUNK_SIZE, Sort.by(Sort.Direction.DESC, "occurredAt"));
                Page<AuditLog> resultPage = auditLogRepository.findAll(spec, pageRequest);
                return resultPage.getContent();
            });
        } catch (Exception ex) {
            auditExport(actor, "AUDIT_LOGS", filterMeta, 0, AuditOutcome.FAILURE, request);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Error generando reporte de audit logs.");
        }

        auditExport(actor, "AUDIT_LOGS", filterMeta, total, AuditOutcome.SUCCESS, request);
    }

    Specification<AuditLog> buildAuditLogSpec(
            Instant dateFrom, Instant dateTo, AuditActorType actorType,
            String actorEmail, String action, String entityType,
            AuditOutcome outcome, AuditSeverity severity
    ) {
        return (root, query, cb) -> {
            var predicate = cb.conjunction();
            predicate = cb.and(predicate, cb.greaterThanOrEqualTo(root.get("occurredAt"), dateFrom));
            predicate = cb.and(predicate, cb.lessThanOrEqualTo(root.get("occurredAt"), dateTo));
            if (actorType != null) {
                predicate = cb.and(predicate, cb.equal(root.get("actorType"), actorType));
            }
            if (StringUtils.hasText(actorEmail)) {
                var adminJoin = root.join("actorAdmin", jakarta.persistence.criteria.JoinType.LEFT);
                predicate = cb.and(predicate, cb.equal(
                        cb.lower(adminJoin.get("email")),
                        actorEmail.trim().toLowerCase(Locale.ROOT)
                ));
            }
            if (StringUtils.hasText(action)) {
                predicate = cb.and(predicate, cb.equal(
                        cb.lower(root.get("action")),
                        action.trim().toLowerCase(Locale.ROOT)
                ));
            }
            if (StringUtils.hasText(entityType)) {
                predicate = cb.and(predicate, cb.equal(
                        cb.lower(root.get("entityType")),
                        entityType.trim().toLowerCase(Locale.ROOT)
                ));
            }
            if (outcome != null) {
                predicate = cb.and(predicate, cb.equal(root.get("outcome"), outcome));
            }
            if (severity != null) {
                predicate = cb.and(predicate, cb.equal(root.get("severity"), severity));
            }
            return predicate;
        };
    }

    private Map<String, Object> buildAuditLogFilterMeta(
            Instant dateFrom, Instant dateTo, AuditActorType actorType,
            String actorEmail, String action, String entityType,
            AuditOutcome outcome, AuditSeverity severity
    ) {
        Map<String, Object> filters = new LinkedHashMap<>();
        filters.put("dateFrom", dateFrom.toString());
        filters.put("dateTo", dateTo.toString());
        if (actorType != null) filters.put("actorType", actorType.name());
        if (StringUtils.hasText(actorEmail)) filters.put("actorEmail", actorEmail);
        if (StringUtils.hasText(action)) filters.put("action", action);
        if (StringUtils.hasText(entityType)) filters.put("entityType", entityType);
        if (outcome != null) filters.put("outcome", outcome.name());
        if (severity != null) filters.put("severity", severity.name());
        return filters;
    }

    // ── Public validation (called from controller before response is committed) ──

    public void validateStudentExport(String q, String career, StudentStatus status) {
        Specification<Student> spec = buildStudentSpec(q, career, status);
        long total = studentRepository.count(spec);
        if (total > MAX_STUDENTS_EXPORT) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "El resultado excede el límite de " + MAX_STUDENTS_EXPORT
                            + " registros. Aplique filtros más específicos."
            );
        }
    }

    public void validateLogExport(Instant dateFrom, Instant dateTo) {
        validateDateRange(dateFrom, dateTo);
    }

    // ── Shared ──────────────────────────────────────────────────────────

    private void validateDateRange(Instant dateFrom, Instant dateTo) {
        if (dateFrom == null || dateTo == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "dateFrom y dateTo son obligatorios para exportación.");
        }
        if (dateFrom.isAfter(dateTo)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "dateFrom debe ser menor o igual a dateTo.");
        }
        long days = ChronoUnit.DAYS.between(dateFrom, dateTo);
        if (days > MAX_RANGE_DAYS) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Rango de fechas excede el máximo permitido de " + MAX_RANGE_DAYS + " días.");
        }
    }

    private void auditExport(
            Admin actor,
            String reportType,
            Map<String, Object> filters,
            long rowCount,
            AuditOutcome outcome,
            HttpServletRequest request
    ) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("reportType", reportType);
        metadata.put("filters", filters);
        metadata.put("rowCount", rowCount);
        auditTrailService.auditAdminAction(
                actor,
                "REPORT_EXPORT",
                "REPORT",
                reportType,
                outcome,
                metadata,
                request
        );
    }

    static String truncateErrorDetail(String errorDetail) {
        if (errorDetail == null) {
            return "";
        }
        String sanitized = errorDetail.replaceAll("[\\r\\n\\t]", " ").trim();
        if (sanitized.length() > ERROR_DETAIL_MAX_LENGTH) {
            return sanitized.substring(0, ERROR_DETAIL_MAX_LENGTH) + "...";
        }
        return sanitized;
    }

    public static String generateFilename(String reportType) {
        return generateFilename(reportType, "csv");
    }

    public static String generateFilename(String reportType, String extension) {
        String timestamp = FILENAME_FORMATTER.format(LocalDateTime.now(ZoneOffset.UTC));
        return reportType + "_" + timestamp + "." + extension;
    }
}
