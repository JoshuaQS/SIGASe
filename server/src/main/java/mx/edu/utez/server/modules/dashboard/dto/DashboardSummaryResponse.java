package mx.edu.utez.server.modules.dashboard.dto;

import java.time.Instant;

public record DashboardSummaryResponse(
        long totalStudents,
        long activeStudents,
        long inactiveStudents,
        long successfulAccessesInRange,
        long failedAccessesInRange,
        double successRate,
        long uniqueStudentsWithSuccessfulAccess,
        String currentElibroConfigStatus,
        Instant lastAccessAt,
        Instant lastSuccessfulAccessAt,
        Instant lastFailedAccessAt
) implements DashboardWidgetData {
}
