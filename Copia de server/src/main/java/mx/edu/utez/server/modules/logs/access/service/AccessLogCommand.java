package mx.edu.utez.server.modules.logs.access.service;

import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.shared.enums.AccessResult;

public record AccessLogCommand(
        Student student,
        String attemptedEmail,
        String normalizedEmail,
        AccessResult result,
        String errorCode,
        String errorDetail,
        long latencyMs,
        String requestId,
        String correlationId,
        String ipAddress,
        String userAgent,
        String providerName,
        String nextUrl,
        String redirectUrl
) {
}
