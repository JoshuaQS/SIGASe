package mx.edu.utez.server.modules.dashboard.dto;

import java.util.UUID;

public record DashboardTopStudentItemResponse(
        UUID studentId,
        String name,
        String enrollmentId,
        long successfulAccesses,
        long failedAccesses,
        long totalAccesses
) {
}
