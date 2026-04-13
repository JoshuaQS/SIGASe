package mx.edu.utez.server.modules.dashboard.dto;

import java.util.UUID;

public record DashboardCareerSearchItemResponse(
        UUID id,
        String displayLabel,
        String subtitle,
        String code,
        String name,
        String status
) {
}
