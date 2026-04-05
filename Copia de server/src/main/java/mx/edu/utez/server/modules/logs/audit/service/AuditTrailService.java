package mx.edu.utez.server.modules.logs.audit.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.shared.context.RequestContext;
import mx.edu.utez.server.shared.enums.AuditActorType;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.AuditSeverity;
import mx.edu.utez.server.shared.util.ClientIpResolver;
import mx.edu.utez.server.shared.util.SecurityLogSanitizer;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class AuditTrailService {

    private final AuditLogService auditLogService;
    private final ClientIpResolver clientIpResolver;
    private final SecurityLogSanitizer securityLogSanitizer;
    private final ObjectMapper objectMapper;

    public AuditTrailService(
            AuditLogService auditLogService,
            ClientIpResolver clientIpResolver,
            SecurityLogSanitizer securityLogSanitizer,
            ObjectMapper objectMapper
    ) {
        this.auditLogService = auditLogService;
        this.clientIpResolver = clientIpResolver;
        this.securityLogSanitizer = securityLogSanitizer;
        this.objectMapper = objectMapper;
    }

    public void auditAdminAction(
            Admin actorAdmin,
            String action,
            String entityType,
            String entityId,
            AuditOutcome outcome,
            Map<String, Object> metadata,
            HttpServletRequest request
    ) {
        String requestId = request != null
                ? (String) request.getAttribute(RequestContext.REQUEST_ID_ATTR)
                : "system";
        String correlationId = request != null
                ? (String) request.getAttribute(RequestContext.CORRELATION_ID_ATTR)
                : "system";
        if (requestId == null) {
            requestId = "system";
        }
        if (correlationId == null) {
            correlationId = "system";
        }
        String ipAddress = request != null ? clientIpResolver.resolve(request) : "0.0.0.0";
        String metadataJson = toJson(metadata);

        auditLogService.log(new AuditLogCommand(
                AuditActorType.ADMIN,
                actorAdmin,
                actorAdmin.getId().toString(),
                action,
                entityType,
                entityId,
                outcome,
                deriveSeverity(outcome),
                metadataJson,
                requestId,
                correlationId,
                ipAddress
        ));
    }

    private AuditSeverity deriveSeverity(AuditOutcome outcome) {
        return outcome == AuditOutcome.SUCCESS ? AuditSeverity.INFO : AuditSeverity.WARN;
    }

    private String toJson(Map<String, Object> metadata) {
        try {
            return objectMapper.writeValueAsString(securityLogSanitizer.sanitizeMetadata(metadata));
        } catch (Exception ex) {
            return "{}";
        }
    }
}
