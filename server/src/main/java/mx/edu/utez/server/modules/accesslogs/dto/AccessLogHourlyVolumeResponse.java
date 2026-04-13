package mx.edu.utez.server.modules.accesslogs.dto;

public record AccessLogHourlyVolumeResponse(
        String t,
        long total,
        long successful,
        long failed
) {
}

