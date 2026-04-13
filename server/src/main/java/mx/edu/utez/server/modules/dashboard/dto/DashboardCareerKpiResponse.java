package mx.edu.utez.server.modules.dashboard.dto;

import java.time.Instant;
import java.util.UUID;

public record DashboardCareerKpiResponse(
        UUID careerId,
        String careerCode,
        String careerName,
        long totalAccesses,
        long successfulAccesses,
        long failedAccesses,
        long uniqueStudentsImpacted,
        double successRate,
        Instant lastAccessAt,
        Instant lastSuccessfulAccessAt,
        Instant lastFailedAccessAt
) implements DashboardWidgetData {
}
