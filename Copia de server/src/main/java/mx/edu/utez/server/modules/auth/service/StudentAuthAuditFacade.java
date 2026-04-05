package mx.edu.utez.server.modules.auth.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import java.util.UUID;
import mx.edu.utez.server.modules.logs.audit.service.AuditLogCommand;
import mx.edu.utez.server.modules.logs.audit.service.AuditLogService;
import mx.edu.utez.server.shared.context.RequestContext;
import mx.edu.utez.server.shared.enums.AuditActorType;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.AuditSeverity;
import mx.edu.utez.server.shared.util.ClientIpResolver;
import org.springframework.stereotype.Service;

@Service
public class StudentAuthAuditFacade {

    private final AuditLogService auditLogService;
    private final ClientIpResolver clientIpResolver;
    private final ObjectMapper objectMapper;

    public StudentAuthAuditFacade(
            AuditLogService auditLogService,
            ClientIpResolver clientIpResolver,
            ObjectMapper objectMapper
    ) {
        this.auditLogService = auditLogService;
        this.clientIpResolver = clientIpResolver;
        this.objectMapper = objectMapper;
    }

    public void auditStudent(HttpServletRequest request, String action, UUID studentId, AuditOutcome outcome) {
        auditLogService.log(new AuditLogCommand(
                AuditActorType.STUDENT,
                null,
                studentId.toString(),
                action,
                "STUDENT",
                studentId.toString(),
                outcome,
                outcome == AuditOutcome.SUCCESS ? AuditSeverity.INFO : AuditSeverity.WARN,
                null,
                requestId(request),
                correlationId(request),
                ipAddress(request)
        ));
    }

    public void auditSystemForStudent(
            HttpServletRequest request,
            String action,
            String actorReference,
            UUID studentId,
            AuditSeverity severity,
            Map<String, Object> metadata
    ) {
        auditLogService.log(new AuditLogCommand(
                AuditActorType.SYSTEM,
                null,
                actorReference,
                action,
                "STUDENT",
                studentId.toString(),
                AuditOutcome.FAILURE,
                severity,
                toJson(metadata),
                requestId(request),
                correlationId(request),
                ipAddress(request)
        ));
    }

    private String requestId(HttpServletRequest request) {
        return request != null ? (String) request.getAttribute(RequestContext.REQUEST_ID_ATTR) : null;
    }

    private String correlationId(HttpServletRequest request) {
        return request != null ? (String) request.getAttribute(RequestContext.CORRELATION_ID_ATTR) : null;
    }

    private String ipAddress(HttpServletRequest request) {
        return request != null ? clientIpResolver.resolve(request) : null;
    }

    private String toJson(Map<String, Object> metadata) {
        if (metadata == null || metadata.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(metadata);
        } catch (JsonProcessingException ex) {
            return "{}";
        }
    }
}
