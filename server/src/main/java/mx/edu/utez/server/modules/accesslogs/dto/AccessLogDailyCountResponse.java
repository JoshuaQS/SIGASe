package mx.edu.utez.server.modules.accesslogs.dto;

public record AccessLogDailyCountResponse(
        String day,
        long accesses
) {
}

