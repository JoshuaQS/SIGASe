package mx.edu.utez.server.modules.notifications.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateNotificationPreferenceRequest(
        @NotNull Boolean notifyCritical,
        @NotNull Boolean notifySecurity,
        @NotNull Boolean notifyAccessFailures,
        @NotNull Boolean notifyStudentChanges,
        @NotNull Boolean notifyConfigChanges,
        @NotNull Boolean notifyAdminChanges
) {
}
