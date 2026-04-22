package mx.edu.utez.server.modules.dashboard.dto;

import java.util.UUID;

public record DashboardCareerRankingTableItemResponse(
        int position,
        UUID careerId,
        String careerCode,
        String careerName,
        long rankingValue
) {
}
