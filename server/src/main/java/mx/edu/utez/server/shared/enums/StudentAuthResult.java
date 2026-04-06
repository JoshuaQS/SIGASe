package mx.edu.utez.server.shared.enums;

/** Resultado de un intento de autenticación interna del estudiante (local o Google). */
public enum StudentAuthResult {
    SUCCESS,
    FAILED_INVALID_CREDENTIALS,
    FAILED_STUDENT_NOT_FOUND,
    FAILED_STUDENT_INACTIVE,
    FAILED_ACCOUNT_LOCKED,
    FAILED_INVALID_GOOGLE_TOKEN,
    FAILED_GOOGLE_PROVIDER_UNAVAILABLE,
    FAILED_GOOGLE_PROVIDER_ERROR,
    FAILED_GOOGLE_SUBJECT_MISMATCH,
    FAILED_INSTITUTIONAL_DOMAIN,
    FAILED_INTERNAL_ERROR
}
