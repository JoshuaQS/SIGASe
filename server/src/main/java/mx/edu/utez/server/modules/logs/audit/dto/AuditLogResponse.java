package mx.edu.utez.server.modules.logs.audit.dto;

import mx.edu.utez.server.shared.enums.AuditActorType;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.AuditSeverity;
import mx.edu.utez.server.shared.enums.AuditSourceModule;
import java.time.Instant;
import java.util.UUID;

public record AuditLogResponse(
        UUID id,
        AuditActorType actorType,
        UUID actorAdminId,
        String actorAdminEmail,
        String actorReference,
        String action,
        String entityType,
        String entityId,
        AuditOutcome outcome,
        AuditSeverity severity,
        AuditSourceModule sourceModule,
        String description,
        String entitySnapshotName,
        String targetLabel,
        String httpMethod,
        String endpoint,
        Integer statusCode,
        String metadataJson,
        String requestId,
        String correlationId,
        String ipAddressMasked,
        String ipAddressHash,
        String userAgentSanitized,
        Instant occurredAt
) {
}
