package mx.edu.utez.server.shared.api;

import java.time.Instant;

public record ApiErrorResponse(
        boolean success,
        String message,
        String errorCode,
        Instant timestamp,
        String requestId
) {
}
