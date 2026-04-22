package mx.edu.utez.server.modules.accesslogs.dto;

public record AccessLogSummaryResponse(
        long total,
        long successful,
        long failed,
        long uniqueActors
) {
}

