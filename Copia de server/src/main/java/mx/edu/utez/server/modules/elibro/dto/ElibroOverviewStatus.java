package mx.edu.utez.server.modules.elibro.dto;

import java.time.Instant;

public record ElibroOverviewStatus(
        String state,
        String provider,
        Instant lastValidationAt,
        String lastValidationMessage,
        Instant updatedAt,
        String updatedByName
) {
}
