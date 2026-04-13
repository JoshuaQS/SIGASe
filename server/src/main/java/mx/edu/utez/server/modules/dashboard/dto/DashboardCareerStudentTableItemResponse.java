package mx.edu.utez.server.modules.dashboard.dto;

import java.time.Instant;
import java.util.UUID;

public record DashboardCareerStudentTableItemResponse(
        UUID studentId,
        String studentName,
        String enrollmentId,
        String studentStatus,
        long successfulAccesses,
        long failedAccesses,
        long totalAccesses,
        double successRate,
        Instant lastAccessAt,
        Instant lastSuccessfulAccessAt,
        Instant lastFailedAccessAt
) {
}
