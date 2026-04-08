package mx.edu.utez.server.modules.accesslogs.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;

public record AccessLogResponse(
        String id,
        Instant occurredAt,
        String actorType,
        String scope,
        String actorId,
        String actorName,
        String actorEmail,
        String result,
        String reason,
        String requestId,
        String correlationId,
        String sessionId,
        String ipAddressMasked,
        String userAgentSanitized,
        Long latencyMs,
        String nextUrl,
        String redirectUrl,
        Integer providerStatusCode,
        String providerErrorCode,
        String providerErrorMessage,
        String channelName,
        JsonNode metadata
) {
}
