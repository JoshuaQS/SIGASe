package mx.edu.utez.server.modules.dashboard.dto;

import java.util.UUID;

public record DashboardCareerComparisonItemResponse(
        UUID careerId,
        String careerCode,
        String careerName,
        long successfulAccesses,
        long failedAccesses,
        long totalAccesses,
        double successRate
) {
}
