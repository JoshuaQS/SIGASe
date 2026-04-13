package mx.edu.utez.server.modules.dashboard.dto;

import java.util.UUID;

public record DashboardStudentRankingTableItemResponse(
        int position,
        UUID studentId,
        String studentName,
        String enrollmentId,
        String careerCode,
        String careerName,
        long successfulAccesses,
        long failedAccesses,
        long totalAccesses,
        double successRate
) {
}
