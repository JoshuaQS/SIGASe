package mx.edu.utez.server.modules.logs.audit.dto;

import mx.edu.utez.server.shared.enums.AuditActorType;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.AuditSeverity;
import java.time.Instant;
import org.springframework.format.annotation.DateTimeFormat;

public record AuditLogFilterRequest(
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFrom,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateTo,
        AuditActorType actorType,
        String actorEmail,
        String action,
        String entityType,
        AuditOutcome outcome,
        AuditOutcome result,
        String requestId,
        String correlationId,
        AuditSeverity severity,
        String search,
        Integer page,
        Integer size,
        String sortBy,
        String sortDir
) {

    public AuditOutcome resolvedOutcome() {
        return outcome != null ? outcome : result;
    }

    public int resolvedPage(int fallback) {
        return page == null ? fallback : page;
    }

    public int resolvedSize(int fallback) {
        return size == null ? fallback : size;
    }

    public String resolvedSortBy(String fallback) {
        return sortBy == null ? fallback : sortBy;
    }

    public String resolvedSortDir(String fallback) {
        return sortDir == null ? fallback : sortDir;
    }

    public AuditLogFilterRequest withoutPagination() {
        return new AuditLogFilterRequest(
                dateFrom,
                dateTo,
                actorType,
                actorEmail,
                action,
                entityType,
                outcome,
                result,
                requestId,
                correlationId,
                severity,
                search,
                null,
                null,
                sortBy,
                sortDir
        );
    }

    public static AuditLogFilterRequest empty() {
        return new AuditLogFilterRequest(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
    }
}
