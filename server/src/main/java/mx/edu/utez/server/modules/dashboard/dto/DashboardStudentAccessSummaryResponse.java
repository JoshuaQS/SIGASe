package mx.edu.utez.server.modules.dashboard.dto;

import java.time.Instant;
import java.util.UUID;

public record DashboardStudentAccessSummaryResponse(
        UUID studentId,
        String studentName,
        String enrollmentId,
        String careerCode,
        String careerName,
        long totalAccesses,
        long successfulAccesses,
        long failedAccesses,
        double successRate,
        Instant lastAccessAt,
        Instant lastSuccessfulAccessAt,
        Instant lastFailedAccessAt
) {
}
