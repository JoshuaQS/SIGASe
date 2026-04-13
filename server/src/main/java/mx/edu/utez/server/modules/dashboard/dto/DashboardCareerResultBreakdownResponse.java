package mx.edu.utez.server.modules.dashboard.dto;

import java.util.List;
import java.util.UUID;

public record DashboardCareerResultBreakdownResponse(
        UUID careerId,
        String careerCode,
        String careerName,
        long totalAccesses,
        long successfulAccesses,
        long failedAccesses,
        List<DashboardCareerResultBreakdownItemResponse> items
) implements DashboardWidgetData {
}
