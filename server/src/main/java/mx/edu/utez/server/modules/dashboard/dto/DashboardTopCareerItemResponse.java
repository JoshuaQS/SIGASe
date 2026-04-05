package mx.edu.utez.server.modules.dashboard.dto;

public record DashboardTopCareerItemResponse(
        String careerCode,
        String careerName,
        long successfulAccesses,
        long failedAccesses,
        long totalAccesses
) {
}
