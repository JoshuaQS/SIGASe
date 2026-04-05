package mx.edu.utez.server.modules.auth.dto;

public record AuthTokenResponse(
        String accessToken,
        String tokenType,
        long expiresInSeconds,
        String role
) {
}
