package mx.edu.utez.server.modules.dashboard.dto;

public record DashboardTrendPointResponse(
        String day,
        long successful,
        long failed
) {
}
