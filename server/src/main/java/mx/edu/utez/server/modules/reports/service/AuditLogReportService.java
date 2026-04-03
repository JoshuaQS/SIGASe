package mx.edu.utez.server.modules.reports.service;

import jakarta.servlet.http.HttpServletRequest;
import java.io.OutputStream;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.logs.audit.entity.AuditLog;
import mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository;
import mx.edu.utez.server.shared.enums.AuditActorType;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.AuditSeverity;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class AuditLogReportService {

    private static final int CHUNK_SIZE = 500;
    private static final long MAX_LOGS_EXPORT = 50_000;

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

    private final AuditLogRepository auditLogRepository;
    private final CsvExportService csvExportService;
    private final ReportRangeValidator reportRangeValidator;
    private final ReportExportAuditService reportExportAuditService;

    public AuditLogReportService(
            AuditLogRepository auditLogRepository,
            CsvExportService csvExportService,
            ReportRangeValidator reportRangeValidator,
            ReportExportAuditService reportExportAuditService
    ) {
        this.auditLogRepository = auditLogRepository;
        this.csvExportService = csvExportService;
        this.reportRangeValidator = reportRangeValidator;
        this.reportExportAuditService = reportExportAuditService;
    }

    @Transactional(readOnly = true)
    public void export(
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
        reportRangeValidator.validateDateRange(dateFrom, dateTo, AccessLogReportService.MAX_RANGE_DAYS);
        Specification<AuditLog> spec = buildSpec(dateFrom, dateTo, actorType, actorEmail, action, entityType, outcome, severity);
        long total = auditLogRepository.count(spec);
        if (total > MAX_LOGS_EXPORT) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "El resultado excede el límite de " + MAX_LOGS_EXPORT
                            + " registros. Aplique filtros más específicos."
            );
        }

        Map<String, Object> filterMeta = buildFilterMeta(dateFrom, dateTo, actorType, actorEmail, action, entityType, outcome, severity);

        try {
            csvExportService.write(out, AUDIT_LOG_HEADERS, AUDIT_LOG_EXTRACTORS, page -> {
                PageRequest pageRequest = PageRequest.of(page, CHUNK_SIZE, Sort.by(Sort.Direction.DESC, "occurredAt"));
                Page<AuditLog> resultPage = auditLogRepository.findAll(spec, pageRequest);
                return resultPage.getContent();
            });
        } catch (Exception ex) {
            reportExportAuditService.auditCsvExport(actor, "AUDIT_LOGS", filterMeta, 0, AuditOutcome.FAILURE, request);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Error generando reporte de audit logs.");
        }

        reportExportAuditService.auditCsvExport(actor, "AUDIT_LOGS", filterMeta, total, AuditOutcome.SUCCESS, request);
    }

    public Specification<AuditLog> buildSpec(
            Instant dateFrom,
            Instant dateTo,
            AuditActorType actorType,
            String actorEmail,
            String action,
            String entityType,
            AuditOutcome outcome,
            AuditSeverity severity
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

    private Map<String, Object> buildFilterMeta(
            Instant dateFrom,
            Instant dateTo,
            AuditActorType actorType,
            String actorEmail,
            String action,
            String entityType,
            AuditOutcome outcome,
            AuditSeverity severity
    ) {
        Map<String, Object> filters = new LinkedHashMap<>();
        filters.put("dateFrom", dateFrom.toString());
        filters.put("dateTo", dateTo.toString());
        if (actorType != null) {
            filters.put("actorType", actorType.name());
        }
        if (StringUtils.hasText(actorEmail)) {
            filters.put("actorEmail", actorEmail);
        }
        if (StringUtils.hasText(action)) {
            filters.put("action", action);
        }
        if (StringUtils.hasText(entityType)) {
            filters.put("entityType", entityType);
        }
        if (outcome != null) {
            filters.put("outcome", outcome.name());
        }
        if (severity != null) {
            filters.put("severity", severity.name());
        }
        return filters;
    }
}
