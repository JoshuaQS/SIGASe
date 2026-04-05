package mx.edu.utez.server.modules.reports.service;

import jakarta.servlet.http.HttpServletRequest;
import java.io.OutputStream;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.logs.access.entity.AccessLog;
import mx.edu.utez.server.modules.logs.access.repository.AccessLogRepository;
import mx.edu.utez.server.shared.enums.AccessResult;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import mx.edu.utez.server.shared.util.SecurityLogSanitizer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class AccessLogReportService {

    private static final int CHUNK_SIZE = 500;
    private static final long MAX_LOGS_EXPORT = 50_000;
    static final long MAX_RANGE_DAYS = 366;
    private static final int ERROR_DETAIL_MAX_LENGTH = 100;

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

    private final AccessLogRepository accessLogRepository;
    private final CsvExportService csvExportService;
    private final ReportRangeValidator reportRangeValidator;
    private final ReportExportAuditService reportExportAuditService;
    private final SecurityLogSanitizer securityLogSanitizer;

    public AccessLogReportService(
            AccessLogRepository accessLogRepository,
            CsvExportService csvExportService,
            ReportRangeValidator reportRangeValidator,
            ReportExportAuditService reportExportAuditService,
            SecurityLogSanitizer securityLogSanitizer
    ) {
        this.accessLogRepository = accessLogRepository;
        this.csvExportService = csvExportService;
        this.reportRangeValidator = reportRangeValidator;
        this.reportExportAuditService = reportExportAuditService;
        this.securityLogSanitizer = securityLogSanitizer;
    }

    @Transactional(readOnly = true)
    public void export(
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
        validateRange(dateFrom, dateTo);
        String sanitizedNormalizedEmail = securityLogSanitizer.sanitizeEmailForLookup(normalizedEmail);
        String sanitizedAttemptedEmail = securityLogSanitizer.sanitizeEmailForLookup(attemptedEmail);
        String sanitizedIpAddress = securityLogSanitizer.sanitizeIpForLookup(ipAddress);

        Specification<AccessLog> spec = buildSpec(
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

        Map<String, Object> filterMeta = buildFilterMeta(
                dateFrom, dateTo, result, sanitizedNormalizedEmail, sanitizedAttemptedEmail, studentId, sanitizedIpAddress, providerName
        );

        try {
            csvExportService.write(out, ACCESS_LOG_HEADERS, ACCESS_LOG_EXTRACTORS, page -> {
                PageRequest pageRequest = PageRequest.of(page, CHUNK_SIZE, Sort.by(Sort.Direction.DESC, "occurredAt"));
                Page<AccessLog> resultPage = accessLogRepository.findAll(spec, pageRequest);
                return resultPage.getContent();
            });
        } catch (Exception ex) {
            reportExportAuditService.auditCsvExport(actor, "ACCESS_LOGS", filterMeta, 0, AuditOutcome.FAILURE, request);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Error generando reporte de access logs.");
        }

        reportExportAuditService.auditCsvExport(actor, "ACCESS_LOGS", filterMeta, total, AuditOutcome.SUCCESS, request);
    }

    public Specification<AccessLog> buildSpec(
            Instant dateFrom,
            Instant dateTo,
            AccessResult result,
            String normalizedEmail,
            String attemptedEmail,
            UUID studentId,
            String ipAddress,
            String providerName
    ) {
        final String rawNormalizedEmail = StringUtils.hasText(normalizedEmail)
                ? normalizedEmail.trim().toLowerCase(Locale.ROOT)
                : null;
        final String sanitizedNormalizedEmail = securityLogSanitizer.sanitizeEmailForLookup(normalizedEmail);
        final String rawAttemptedEmail = StringUtils.hasText(attemptedEmail)
                ? attemptedEmail.trim().toLowerCase(Locale.ROOT)
                : null;
        final String sanitizedAttemptedEmail = securityLogSanitizer.sanitizeEmailForLookup(attemptedEmail);
        final String rawIpAddress = StringUtils.hasText(ipAddress)
                ? ipAddress.trim().toLowerCase(Locale.ROOT)
                : null;
        final String sanitizedIpAddress = securityLogSanitizer.sanitizeIpForLookup(ipAddress);

        return (root, query, cb) -> {
            var predicate = cb.conjunction();
            predicate = cb.and(predicate, cb.greaterThanOrEqualTo(root.get("occurredAt"), dateFrom));
            predicate = cb.and(predicate, cb.lessThanOrEqualTo(root.get("occurredAt"), dateTo));
            if (result != null) {
                predicate = cb.and(predicate, cb.equal(root.get("result"), result));
            }
            if (StringUtils.hasText(rawNormalizedEmail)) {
                predicate = cb.and(predicate, cb.or(
                        cb.equal(cb.lower(root.get("normalizedEmail")), rawNormalizedEmail),
                        cb.equal(cb.lower(root.get("normalizedEmail")), sanitizedNormalizedEmail)
                ));
            }
            if (StringUtils.hasText(rawAttemptedEmail)) {
                predicate = cb.and(predicate, cb.or(
                        cb.equal(cb.lower(root.get("attemptedEmail")), rawAttemptedEmail),
                        cb.equal(cb.lower(root.get("attemptedEmail")), sanitizedAttemptedEmail)
                ));
            }
            if (studentId != null) {
                predicate = cb.and(predicate, cb.equal(root.get("student").get("id"), studentId));
            }
            if (StringUtils.hasText(rawIpAddress)) {
                predicate = cb.and(predicate, cb.or(
                        cb.equal(cb.lower(root.get("ipAddress")), rawIpAddress),
                        cb.equal(cb.lower(root.get("ipAddress")), sanitizedIpAddress)
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

    public void validateRange(Instant dateFrom, Instant dateTo) {
        reportRangeValidator.validateDateRange(dateFrom, dateTo, MAX_RANGE_DAYS);
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

    private Map<String, Object> buildFilterMeta(
            Instant dateFrom,
            Instant dateTo,
            AccessResult result,
            String normalizedEmail,
            String attemptedEmail,
            UUID studentId,
            String ipAddress,
            String providerName
    ) {
        Map<String, Object> filters = new LinkedHashMap<>();
        filters.put("dateFrom", dateFrom.toString());
        filters.put("dateTo", dateTo.toString());
        if (result != null) {
            filters.put("result", result.name());
        }
        if (StringUtils.hasText(normalizedEmail)) {
            filters.put("normalizedEmail", normalizedEmail);
        }
        if (StringUtils.hasText(attemptedEmail)) {
            filters.put("attemptedEmail", attemptedEmail);
        }
        if (studentId != null) {
            filters.put("studentId", studentId.toString());
        }
        if (StringUtils.hasText(ipAddress)) {
            filters.put("ipAddress", ipAddress);
        }
        if (StringUtils.hasText(providerName)) {
            filters.put("providerName", providerName);
        }
        return filters;
    }
}
