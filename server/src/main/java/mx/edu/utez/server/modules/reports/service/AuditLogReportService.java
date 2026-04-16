package mx.edu.utez.server.modules.reports.service;

import jakarta.servlet.http.HttpServletRequest;
import java.io.OutputStream;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.logs.audit.dto.AuditLogFilterRequest;
import mx.edu.utez.server.modules.logs.audit.entity.AuditLog;
import mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository;
import mx.edu.utez.server.shared.enums.AuditOutcome;
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
            "entityId", "outcome", "severity", "ipAddressMasked", "ipAddressHash", "userAgentSanitized", "requestId"
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
            a -> a.getIpAddressMasked() != null ? a.getIpAddressMasked() : "",
            a -> a.getIpAddressHash() != null ? a.getIpAddressHash() : "",
            a -> a.getUserAgentSanitized() != null ? a.getUserAgentSanitized() : "",
            a -> a.getRequestId() != null ? a.getRequestId() : ""
    );

    private final AuditLogRepository auditLogRepository;
    private final mx.edu.utez.server.modules.logs.audit.service.AuditLogQueryService auditLogQueryService;
    private final CsvExportService csvExportService;
    private final ReportExportAuditService reportExportAuditService;

    public AuditLogReportService(
            AuditLogRepository auditLogRepository,
            mx.edu.utez.server.modules.logs.audit.service.AuditLogQueryService auditLogQueryService,
            CsvExportService csvExportService,
            ReportExportAuditService reportExportAuditService
    ) {
        this.auditLogRepository = auditLogRepository;
        this.auditLogQueryService = auditLogQueryService;
        this.csvExportService = csvExportService;
        this.reportExportAuditService = reportExportAuditService;
    }

    @Transactional(readOnly = true)
    public void export(
            OutputStream out,
            AuditLogFilterRequest filters,
            Admin actor,
            HttpServletRequest request
    ) {
        AuditLogFilterRequest exportFilters = filters.withoutPagination();
        auditLogQueryService.validateForExport(exportFilters);
        Specification<AuditLog> spec = auditLogQueryService.buildSpecification(exportFilters);
        Sort sort = auditLogQueryService.buildSort(exportFilters);
        long total = auditLogRepository.count(spec);
        if (total > MAX_LOGS_EXPORT) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "El resultado excede el límite de " + MAX_LOGS_EXPORT
                            + " registros. Aplique filtros más específicos."
            );
        }

        Map<String, Object> filterMeta = buildFilterMeta(exportFilters);

        try {
            csvExportService.write(out, AUDIT_LOG_HEADERS, AUDIT_LOG_EXTRACTORS, page -> {
                PageRequest pageRequest = PageRequest.of(page, CHUNK_SIZE, sort);
                Page<AuditLog> resultPage = auditLogRepository.findAll(spec, pageRequest);
                return resultPage.getContent();
            });
        } catch (Exception ex) {
            reportExportAuditService.auditCsvExport(actor, "AUDIT_LOGS", filterMeta, 0, AuditOutcome.FAILURE, request);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Error generando reporte de audit logs.");
        }

        reportExportAuditService.auditCsvExport(actor, "AUDIT_LOGS", filterMeta, total, AuditOutcome.SUCCESS, request);
    }

    private Map<String, Object> buildFilterMeta(AuditLogFilterRequest filters) {
        Map<String, Object> filterMeta = new LinkedHashMap<>();
        if (filters.dateFrom() != null) {
            filterMeta.put("dateFrom", filters.dateFrom().toString());
        }
        if (filters.dateTo() != null) {
            filterMeta.put("dateTo", filters.dateTo().toString());
        }
        if (filters.actorType() != null) {
            filterMeta.put("actorType", filters.actorType().name());
        }
        if (StringUtils.hasText(filters.actorEmail())) {
            filterMeta.put("actorEmail", filters.actorEmail());
        }
        if (StringUtils.hasText(filters.action())) {
            filterMeta.put("action", filters.action());
        }
        if (StringUtils.hasText(filters.entityType())) {
            filterMeta.put("entityType", filters.entityType());
        }
        if (filters.resolvedOutcome() != null) {
            filterMeta.put("outcome", filters.resolvedOutcome().name());
        }
        if (StringUtils.hasText(filters.requestId())) {
            filterMeta.put("requestId", filters.requestId());
        }
        if (StringUtils.hasText(filters.correlationId())) {
            filterMeta.put("correlationId", filters.correlationId());
        }
        if (filters.severity() != null) {
            filterMeta.put("severity", filters.severity().name());
        }
        if (StringUtils.hasText(filters.search())) {
            filterMeta.put("search", filters.search());
        }
        return filterMeta;
    }
}
