package mx.edu.utez.server.modules.elibro.dto;

import java.time.Instant;
import java.util.UUID;

public record ElibroOverviewConfig(
        UUID id,
        String name,
        String endpoint,
        String channelName,
        String channelIdMasked,
        boolean hasAuthToken,
        boolean hasChannelSecret,
        boolean hasChannelId,
        String createdByName,
        String updatedByName,
        Instant createdAt,
        Instant updatedAt,
        boolean active
) {
}
