package mx.edu.utez.server.modules.logs.access.dto;

import mx.edu.utez.server.shared.enums.AccessResult;
import java.time.Instant;
import java.util.UUID;

public record AccessLogResponse(
        UUID id,
        UUID studentId,
        String attemptedEmail,
        String normalizedEmail,
        AccessResult result,
        String errorCode,
        String errorDetail,
        Long latencyMs,
        String requestId,
        String correlationId,
        String ipAddress,
        String userAgent,
        String providerName,
        String nextUrl,
        String redirectUrl,
        Instant occurredAt
) {
}
