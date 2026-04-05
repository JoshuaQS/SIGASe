package mx.edu.utez.server.modules.auth.dto;

public record StudentAuthResponse(
        String token,
        boolean mustChangePassword
) {
}
