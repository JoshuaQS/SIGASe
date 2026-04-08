package mx.edu.utez.server.modules.admins.dto;

import java.util.UUID;

public record AdminActionCountResponse(
        UUID adminId,
        String adminName,
        long totalActions
) {
}
