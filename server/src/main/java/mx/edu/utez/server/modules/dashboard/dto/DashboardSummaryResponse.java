package mx.edu.utez.server.modules.dashboard.dto;

public record DashboardSummaryResponse(
        long totalStudents,
        long activeStudents,
        long inactiveStudents,
        long successfulAccessesInRange,
        long failedAccessesInRange,
        double successRate,
        long uniqueStudentsWithSuccessfulAccess,
        String currentElibroConfigStatus
) {
}
