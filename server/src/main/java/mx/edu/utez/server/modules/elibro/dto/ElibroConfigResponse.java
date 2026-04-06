package mx.edu.utez.server.modules.elibro.dto;

import mx.edu.utez.server.shared.enums.ElibroValidationStatus;
import mx.edu.utez.server.shared.enums.ElibroConfigStatus;
import java.time.Instant;
import java.util.UUID;

public record ElibroConfigResponse(
        UUID id,
        String name,
        String channelName,
        String channelIdMasked,
        boolean hasAuthToken,
        boolean hasChannelSecret,
        boolean hasChannelId,
        String nextUrl,
        ElibroConfigStatus status,
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
