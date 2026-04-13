package mx.edu.utez.server.modules.dashboard.service.analysis;

public record ResolvedDashboardWidgetControls(
        ResolvedDashboardTableWidgetControl studentActivityTable,
        ResolvedDashboardTableWidgetControl careerStudentTable
) {
}
