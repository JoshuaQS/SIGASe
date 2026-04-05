package mx.edu.utez.server.modules.elibro.dto;

import mx.edu.utez.server.shared.enums.ElibroValidationStatus;
import java.time.Instant;
import java.util.UUID;

public record ElibroConfigResponse(
        UUID id,
        String name,
        String channelName,
        String authEndpoint,
        String channelIdMasked,
        boolean hasAuthToken,
        boolean hasChannelSecret,
        boolean hasChannelId,
        boolean active,
        ElibroValidationStatus validationStatus,
        String validationMessage,
        Instant lastValidatedAt,
        UUID createdByAdminId,
        String createdByName,
        UUID updatedByAdminId,
        String updatedByName,
        Instant createdAt,
        Instant updatedAt
) {
}
