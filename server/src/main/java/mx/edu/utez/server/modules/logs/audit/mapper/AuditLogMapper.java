package mx.edu.utez.server.modules.logs.audit.mapper;

import mx.edu.utez.server.modules.logs.audit.dto.AuditLogResponse;
import mx.edu.utez.server.modules.logs.audit.entity.AuditLog;
import org.springframework.stereotype.Component;

@Component
public class AuditLogMapper {

    public AuditLogResponse toResponse(AuditLog auditLog) {
        return new AuditLogResponse(
                auditLog.getId(),
                auditLog.getActorType(),
                auditLog.getActorAdmin() == null ? null : auditLog.getActorAdmin().getId(),
                auditLog.getActorAdmin() == null ? null : auditLog.getActorAdmin().getEmail(),
                auditLog.getActorReference(),
                auditLog.getAction(),
                auditLog.getEntityType(),
                auditLog.getEntityId(),
                auditLog.getOutcome(),
                auditLog.getSeverity(),
                auditLog.getMetadataJson(),
                auditLog.getRequestId(),
                auditLog.getCorrelationId(),
                auditLog.getIpAddressMasked(),
                auditLog.getIpAddressHash(),
                auditLog.getUserAgentSanitized(),
                auditLog.getOccurredAt()
        );
    }
}
