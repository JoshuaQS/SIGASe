package mx.edu.utez.server.modules.logs.audit.service;

import mx.edu.utez.server.modules.logs.audit.entity.AuditLog;
import mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository;
import mx.edu.utez.server.shared.enums.AuditSeverity;
import mx.edu.utez.server.shared.enums.AuditSourceModule;
import mx.edu.utez.server.shared.util.SecurityLogSanitizer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final SecurityLogSanitizer securityLogSanitizer;

    public AuditLogService(
            AuditLogRepository auditLogRepository,
            SecurityLogSanitizer securityLogSanitizer
    ) {
        this.auditLogRepository = auditLogRepository;
        this.securityLogSanitizer = securityLogSanitizer;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(AuditLogCommand command) {
        AuditLog auditLog = new AuditLog();
        auditLog.setActorType(command.actorType());
        auditLog.setActorAdmin(command.actorAdmin());
        auditLog.setActorReference(securityLogSanitizer.sanitizeText(command.actorReference(), 254));
        auditLog.setAction(securityLogSanitizer.sanitizeText(command.action(), 80));
        auditLog.setEntityType(securityLogSanitizer.sanitizeText(command.entityType(), 40));
        auditLog.setEntityId(securityLogSanitizer.sanitizeText(command.entityId(), 36));
        auditLog.setOutcome(command.outcome());
        auditLog.setSeverity(command.severity() == null ? AuditSeverity.INFO : command.severity());
        auditLog.setSourceModule(command.sourceModule() == null ? AuditSourceModule.SYSTEM : command.sourceModule());
        auditLog.setMetadataJson(securityLogSanitizer.sanitizeMetadataJson(command.metadataJson()));
        auditLog.setRequestId(defaultValue(securityLogSanitizer.sanitizeText(command.requestId(), 80), "system"));
        auditLog.setCorrelationId(defaultValue(securityLogSanitizer.sanitizeText(command.correlationId(), 80), "system"));
        auditLog.setIpAddressMasked(defaultValue(securityLogSanitizer.maskIpAddress(command.ipAddress()), "0.0.0.0"));
        auditLog.setIpAddressHash(securityLogSanitizer.hashIpAddress(command.ipAddress()));
        auditLog.setUserAgentSanitized(securityLogSanitizer.sanitizeUserAgent(command.userAgent()));
        auditLog.setSessionId(securityLogSanitizer.sanitizeText(command.sessionId(), 128));
        auditLog.setOrigin(securityLogSanitizer.sanitizeText(command.origin(), 254));
        auditLog.setHttpMethod(securityLogSanitizer.sanitizeText(command.httpMethod(), 10));
        auditLog.setEndpoint(securityLogSanitizer.sanitizeUrl(command.requestPath()));
        auditLogRepository.save(auditLog);
    }

    private String defaultValue(String value, String defaultValue) {
        return StringUtils.hasText(value) ? value : defaultValue;
    }
}
