package mx.edu.utez.server.modules.elibro.dto;

import java.time.Instant;

public record ElibroOverviewRecentActivity(
        String action,
        String actorName,
        Instant occurredAt,
        String type
) {
}
