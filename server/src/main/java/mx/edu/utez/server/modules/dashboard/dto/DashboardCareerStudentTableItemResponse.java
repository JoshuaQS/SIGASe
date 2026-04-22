package mx.edu.utez.server.modules.dashboard.dto;

import java.util.UUID;

public record DashboardCareerStudentTableItemResponse(
        UUID studentId,
        String studentName,
        String enrollmentId,
        long successfulAccesses,
        long failedAccesses,
        long totalAccesses,
        double successRate
) {
}
