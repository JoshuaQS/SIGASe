package mx.edu.utez.server.shared.enums;

/** Resultado de un intento de acceso SSO a eLibro. */
public enum ElibroAccessResult {
    SUCCESS,
    FAILED_STUDENT_NOT_FOUND,
    FAILED_STUDENT_INACTIVE,
    FAILED_ACCOUNT_LOCKED,
    FAILED_ELIBRO_CONFIG,
    FAILED_NEXT_URL_VALIDATION,
    FAILED_ELIBRO_API,
    FAILED_ELIBRO_TIMEOUT,
    FAILED_INTERNAL_ERROR
}
