package mx.edu.utez.server.modules.dashboard.dto;

import java.util.UUID;

public record DashboardStudentAccessSummaryResponse(
        UUID studentId,
        String studentName,
        String enrollmentId,
        long totalAccesses,
        long successfulAccesses,
        long failedAccesses,
        double successRate
) implements DashboardWidgetData {
}
