package mx.edu.utez.server.modules.admins.dto;

import java.util.List;

public record AdminDashboardMetricsResponse(

        // KPIs — derived from AdminRepository counts
        long totalAdmins,
        long adminTiCount,
        long activeAdmins,
        long inactiveAdmins,

        // Actions KPI — derived from AuditLog
        long actionsToday,
        long actionsYesterday,
        double trendPercentage,

        // Radar chart: activity per role and module (last 30 days)
        List<AdminRoleModuleActivityResponse> roleModuleActivity,

        // Timeline: last 10 admin audit entries
        List<AdminRecentActivityResponse> recentActivity,

        // Table column: audit action count per admin
        List<AdminActionCountResponse> actionsPerAdmin

) {
}
