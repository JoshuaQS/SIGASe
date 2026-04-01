package mx.edu.utez.server.modules.elibro.dto;

import mx.edu.utez.server.shared.enums.ElibroValidationStatus;
import java.time.Instant;
import java.util.UUID;

public record ElibroConfigValidationResponse(
        UUID id,
        ElibroValidationStatus validationStatus,
        String validationMessage,
        Instant lastValidatedAt
) {
}
