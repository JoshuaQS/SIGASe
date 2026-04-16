package mx.edu.utez.server.modules.notifications.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import mx.edu.utez.server.modules.notifications.entity.NotificationPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationPreferenceRepository extends JpaRepository<NotificationPreference, UUID> {

    Optional<NotificationPreference> findByAdminId(UUID adminId);

    @Query(value = """
            SELECT a.id AS adminId,
                   IFNULL(np.notify_critical + 0, 1) AS notifyCritical,
                   IFNULL(np.notify_security + 0, 1) AS notifySecurity,
                   IFNULL(np.notify_access_failures + 0, 1) AS notifyAccessFailures,
                   IFNULL(np.notify_student_changes + 0, 1) AS notifyStudentChanges,
                   IFNULL(np.notify_config_changes + 0, 1) AS notifyConfigChanges,
                   IFNULL(np.notify_admin_changes + 0, 1) AS notifyAdminChanges
              FROM admins a
              LEFT JOIN notification_preferences np ON np.admin_id = a.id
             WHERE a.status = :status
            """, nativeQuery = true)
    List<AdminPreferenceView> findAdminPreferenceViewsByStatus(@Param("status") String status);

    interface AdminPreferenceView {
        UUID getAdminId();
        Integer getNotifyCritical();
        Integer getNotifySecurity();
        Integer getNotifyAccessFailures();
        Integer getNotifyStudentChanges();
        Integer getNotifyConfigChanges();
        Integer getNotifyAdminChanges();
    }
}
