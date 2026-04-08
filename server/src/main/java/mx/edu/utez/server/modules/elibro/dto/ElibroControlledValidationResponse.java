package mx.edu.utez.server.modules.elibro.dto;

import java.time.Instant;
import java.util.UUID;
import mx.edu.utez.server.shared.enums.ElibroValidationStatus;

public record ElibroControlledValidationResponse(
        UUID id,
        String testUser,
        String nextUrl,
        String redirectUrl,
        ElibroValidationStatus validationStatus,
        String validationMessage,
        Long latencyMs,
        String errorCode,
        String requestId,
        String correlationId,
        Instant lastValidatedAt
) {
}
