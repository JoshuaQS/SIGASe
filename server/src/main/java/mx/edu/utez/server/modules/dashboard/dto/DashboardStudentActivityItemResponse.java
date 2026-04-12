package mx.edu.utez.server.modules.dashboard.dto;

import java.time.Instant;
import java.util.UUID;

public record DashboardStudentActivityItemResponse(
        UUID accessLogId,
        Instant occurredAt,
        String result,
        Long latencyMs,
        String channelName,
        String requestId,
        String providerErrorCode,
        String errorCode
) {
}
