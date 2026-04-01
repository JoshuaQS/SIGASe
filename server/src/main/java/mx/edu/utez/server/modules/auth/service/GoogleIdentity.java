package mx.edu.utez.server.modules.auth.service;

public record GoogleIdentity(
        String subject,
        String email,
        boolean emailVerified
) {
}
