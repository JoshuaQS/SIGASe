package mx.edu.utez.server.shared.enums;

public enum AccessResult {
    SUCCESS,
    FAILED_INVALID_GOOGLE_TOKEN,
    FAILED_GOOGLE_PROVIDER_UNAVAILABLE,
    FAILED_GOOGLE_PROVIDER_ERROR,
    FAILED_GOOGLE_SUBJECT_MISMATCH,
    FAILED_INSTITUTIONAL_DOMAIN,
    FAILED_STUDENT_NOT_FOUND,
    FAILED_STUDENT_INACTIVE,
    FAILED_ACCOUNT_LOCKED,
    FAILED_NEXT_URL_VALIDATION,
    /**
     * Backend could not call eLibro due to missing/inactive/incomplete local config.
     */
    FAILED_ELIBRO_CONFIG,
    /**
     * eLibro call was attempted but remote API failed (timeout, non-2xx, invalid payload).
     */
    FAILED_ELIBRO_API,
    FAILED_INTERNAL_ERROR
}
