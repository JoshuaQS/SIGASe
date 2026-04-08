package mx.edu.utez.server.modules.auth.service;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.shared.enums.AdminAuthResult;

public record AdminAuthEventCommand(
        Admin admin,
        String attemptedEmail,
        String normalizedEmail,
        AdminAuthResult result,
        String errorCode,
        String errorDetail,
        String requestId,
        String correlationId,
        String ipAddress,
        String userAgent,
        String sessionId,
        String origin,
        String referer,
        String httpMethod,
        String requestPath,
        String metadataJson
) {
}
