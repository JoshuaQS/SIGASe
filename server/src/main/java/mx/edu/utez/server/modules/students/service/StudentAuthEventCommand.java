package mx.edu.utez.server.modules.students.service;

import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.shared.enums.StudentAuthMethod;
import mx.edu.utez.server.shared.enums.StudentAuthResult;

public record StudentAuthEventCommand(
        Student student,
        String attemptedEmail,
        String normalizedEmail,
        String googleSubject,
        StudentAuthMethod authMethod,
        StudentAuthResult result,
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
