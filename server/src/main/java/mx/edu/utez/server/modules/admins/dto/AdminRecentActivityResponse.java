package mx.edu.utez.server.modules.admins.dto;

import java.time.Instant;
import java.util.UUID;

public record AdminRecentActivityResponse(
        UUID adminId,
        String adminName,
        String role,
        String action,
        String module,
        String severity,
        Instant occurredAt
) {
}
