package mx.edu.utez.server.security;

import java.util.UUID;

public record ParsedToken(
        UUID userId,
        String role,
        JwtTokenType tokenType,
        boolean mustChangePassword
) {
}
