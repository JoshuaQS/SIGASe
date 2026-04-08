package mx.edu.utez.server.modules.notifications.dto;

public record NotificationPreferenceResponse(
        boolean notifyCritical,
        boolean notifySecurity,
        boolean notifyAccessFailures,
        boolean notifyStudentChanges,
        boolean notifyConfigChanges,
        boolean notifyAdminChanges
) {
}
