package mx.edu.utez.server.modules.elibro.dto;

public record StudentPortalSummaryResponse(
        PersonalInfo personalInfo,
        AccountStatus accountStatus,
        AccessMetrics accessMetrics,
        Cta cta
) {
    public record PersonalInfo(
            String name,
            String enrollmentId,
            String career,
            String status
    ) {
    }

    public record AccountStatus(
            boolean active,
            String state,
            String message
    ) {
    }

    public record AccessMetrics(
            long accesosUltimos7Dias,
            long intentosFallidos7Dias,
            String ultimaFechaAcceso,
            int rachaDiasConAcceso
    ) {
    }

    public record Cta(
            boolean enabled,
            String reason
    ) {
    }
}
