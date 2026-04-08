package mx.edu.utez.server.modules.notifications.dto;

import java.time.Instant;
import java.util.UUID;
import mx.edu.utez.server.modules.notifications.entity.NotificationReferenceType;
import mx.edu.utez.server.modules.notifications.entity.NotificationSeverity;
import mx.edu.utez.server.modules.notifications.entity.NotificationType;

public record NotificationResponse(
        Long id,
        String title,
        String message,
        NotificationType type,
        NotificationSeverity severity,
        boolean read,
        boolean dismissed,
        Instant createdAt,
        NotificationReferenceType referenceType,
        UUID referenceId
) {
}
