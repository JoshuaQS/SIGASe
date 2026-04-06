package mx.edu.utez.server.modules.logs.audit.service;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.shared.enums.AuditActorType;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.AuditSeverity;
import mx.edu.utez.server.shared.enums.AuditSourceModule;

public record AuditLogCommand(
        AuditActorType actorType,
        Admin actorAdmin,
        String actorReference,
        String action,
        String entityType,
        String entityId,
        AuditOutcome outcome,
        AuditSeverity severity,
        AuditSourceModule sourceModule,
        String metadataJson,
        String requestId,
        String correlationId,
        String ipAddress,
        String userAgent,
        String sessionId,
        String origin,
        String httpMethod,
        String requestPath
) {
}
