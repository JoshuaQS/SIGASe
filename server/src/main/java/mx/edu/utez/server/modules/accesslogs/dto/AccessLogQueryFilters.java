package mx.edu.utez.server.modules.accesslogs.dto;

import java.time.Instant;
import java.util.UUID;

public record AccessLogQueryFilters(
        AccessLogActorType actorType,
        AccessLogScope scope,
        String result,
        Instant dateFrom,
        Instant dateTo,
        UUID studentId,
        UUID adminId,
        UUID careerId,
        String search,
        int page,
        int size,
        String sort
) {
}
