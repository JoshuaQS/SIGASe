package mx.edu.utez.server.shared.enums;

/** Resultado de un intento de autenticación interna del administrador. */
public enum AdminAuthResult {
    SUCCESS,
    FAILED_INVALID_CREDENTIALS,
    FAILED_ADMIN_INACTIVE,
    FAILED_ACCOUNT_LOCKED,
    FAILED_INTERNAL_ERROR
}
