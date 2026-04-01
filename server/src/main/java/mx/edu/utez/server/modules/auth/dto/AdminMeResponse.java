package mx.edu.utez.server.modules.auth.dto;

import java.util.UUID;

public record AdminMeResponse(
        UUID id,
        String email,
        String name,
        String lastNamePaternal,
        String lastNameMaternal,
        String role
) {
}
