package mx.edu.utez.server.modules.notifications.dto;

import java.time.Instant;
import java.util.UUID;
import mx.edu.utez.server.shared.enums.EmailDispatchJobStatus;
import mx.edu.utez.server.shared.enums.EmailDispatchJobType;

public record EmailDispatchJobResponse(
        UUID id,
        EmailDispatchJobType jobType,
        EmailDispatchJobStatus status,
        String recipientEmail,
        String referenceType,
        String referenceId,
        int attempts,
        int maxAttempts,
        Instant nextAttemptAt,
        Instant sentAt,
        Instant permanentlyFailedAt,
        Instant createdAt
) {
}
