package mx.edu.utez.server.modules.logs.access.mapper;

import mx.edu.utez.server.modules.logs.access.dto.AccessLogResponse;
import mx.edu.utez.server.modules.logs.access.entity.AccessLog;
import org.springframework.stereotype.Component;

@Component
public class AccessLogMapper {

    public AccessLogResponse toResponse(AccessLog accessLog) {
        return new AccessLogResponse(
                accessLog.getId(),
                accessLog.getStudent() == null ? null : accessLog.getStudent().getId(),
                accessLog.getAttemptedEmail(),
                accessLog.getNormalizedEmail(),
                accessLog.getResult(),
                accessLog.getErrorCode(),
                accessLog.getErrorDetail(),
                accessLog.getLatencyMs(),
                accessLog.getRequestId(),
                accessLog.getCorrelationId(),
                accessLog.getIpAddress(),
                accessLog.getUserAgent(),
                accessLog.getProviderName(),
                accessLog.getNextUrl(),
                accessLog.getRedirectUrl(),
                accessLog.getOccurredAt()
        );
    }
}
