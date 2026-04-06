package mx.edu.utez.server.modules.elibro.service;

import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.shared.enums.ElibroAccessResult;

public record ElibroAccessLogCommand(
        Student student,
        String attemptedEmail,
        String normalizedEmail,
        ElibroAccessResult result,
        String errorCode,
        String errorDetail,
        long latencyMs,
        String requestId,
        String correlationId,
        String ipAddress,
        String userAgent,
        String sessionId,
        String origin,
        String referer,
        String httpMethod,
        String requestPath,
        String nextUrl,
        String redirectUrl,
        String channelNameSnapshot,
        Integer providerStatusCode,
        String providerErrorCode,
        String providerErrorMessage,
        String metadataJson
) {
}
