package mx.edu.utez.server.modules.logs.audit.service;

import mx.edu.utez.server.modules.logs.audit.entity.AuditLog;
import mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository;
import mx.edu.utez.server.shared.enums.AuditSeverity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public void log(AuditLogCommand command) {
        AuditLog auditLog = new AuditLog();
        auditLog.setActorType(command.actorType());
        auditLog.setActorAdmin(command.actorAdmin());
        auditLog.setActorReference(command.actorReference());
        auditLog.setAction(command.action());
        auditLog.setEntityType(command.entityType());
        auditLog.setEntityId(command.entityId());
        auditLog.setOutcome(command.outcome());
        auditLog.setSeverity(command.severity() == null ? AuditSeverity.INFO : command.severity());
        auditLog.setMetadataJson(command.metadataJson());
        auditLog.setRequestId(command.requestId());
        auditLog.setCorrelationId(command.correlationId());
        auditLog.setIpAddress(command.ipAddress());
        auditLogRepository.save(auditLog);
    }
}
