package mx.edu.utez.server.modules.elibro.dto;

import java.time.Instant;
import java.util.UUID;
import mx.edu.utez.server.shared.enums.ElibroConfigStatus;

public record ElibroOverviewConfig(
        UUID id,
        String name,
        String channelName,
        String channelIdMasked,
        boolean hasAuthToken,
        boolean hasChannelSecret,
        boolean hasChannelId,
        String createdByName,
        String updatedByName,
        Instant createdAt,
        Instant updatedAt,
        String nextUrl,
        ElibroConfigStatus status
) {
}
