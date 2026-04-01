package mx.edu.utez.server.modules.elibro.dto;

import mx.edu.utez.server.shared.enums.ElibroValidationStatus;
import java.time.Instant;
import java.util.UUID;

public record ElibroConfigResponse(
        UUID id,
        String channelName,
        String authEndpoint,
        boolean active,
        ElibroValidationStatus validationStatus,
        String validationMessage,
        Instant lastValidatedAt,
        UUID createdByAdminId,
        UUID updatedByAdminId,
        Instant createdAt,
        Instant updatedAt
) {
}
