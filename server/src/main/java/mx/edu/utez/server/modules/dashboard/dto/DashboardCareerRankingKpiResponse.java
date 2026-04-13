package mx.edu.utez.server.modules.dashboard.dto;

import java.time.Instant;

public record DashboardCareerRankingKpiResponse(
        long totalAccesses,
        long successfulAccesses,
        long failedAccesses,
        long uniqueCareersImpacted,
        double successRate,
        Instant lastAccessAt,
        Instant lastSuccessfulAccessAt,
        Instant lastFailedAccessAt
) implements DashboardWidgetData {
}
