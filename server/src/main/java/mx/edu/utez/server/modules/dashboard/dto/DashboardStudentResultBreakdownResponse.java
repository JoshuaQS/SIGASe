package mx.edu.utez.server.modules.dashboard.dto;

import java.util.List;

public record DashboardStudentResultBreakdownResponse(
        long totalAccesses,
        long successfulAccesses,
        long failedAccesses,
        List<DashboardStudentResultBreakdownItemResponse> items
) implements DashboardWidgetData {
}
