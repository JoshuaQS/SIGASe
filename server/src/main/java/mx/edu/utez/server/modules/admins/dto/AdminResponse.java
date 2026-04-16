package mx.edu.utez.server.modules.admins.dto;

import mx.edu.utez.server.shared.enums.AdminRole;
import mx.edu.utez.server.shared.enums.AdminStatus;
import java.time.Instant;
import java.util.UUID;

public record AdminResponse(
        UUID id,
        String email,
        String name,
        String lastNamePaternal,
        String lastNameMaternal,
        AdminRole role,
        AdminStatus status,
        boolean hasChangedTemporaryPassword,
        Instant temporaryPasswordGeneratedAt,
        Instant temporaryPasswordNotifiedAt,
        Instant passwordChangedAt,
        int failedLoginAttempts,
        Instant lockedUntil,
        Instant lastLoginAt,
        Instant createdAt,
        Instant updatedAt
) {
}
