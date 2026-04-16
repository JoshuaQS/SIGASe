package mx.edu.utez.server.modules.auth.dto;

import java.time.Instant;
import java.util.UUID;

public record AdminMeResponse(
        UUID id,
        String email,
        String name,
        String lastNamePaternal,
        String lastNameMaternal,
        String role,
        boolean hasChangedTemporaryPassword,
        Instant temporaryPasswordGeneratedAt,
        Instant temporaryPasswordNotifiedAt,
        Instant passwordChangedAt
) {
}
