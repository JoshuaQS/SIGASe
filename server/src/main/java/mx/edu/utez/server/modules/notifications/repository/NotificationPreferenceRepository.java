package mx.edu.utez.server.modules.notifications.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import mx.edu.utez.server.modules.notifications.entity.NotificationPreference;
import mx.edu.utez.server.shared.enums.AdminStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationPreferenceRepository extends JpaRepository<NotificationPreference, UUID> {

    Optional<NotificationPreference> findByAdminId(UUID adminId);

    @Query("""
            SELECT a.id AS adminId,
                   CASE WHEN p.adminId IS NULL THEN true ELSE p.notifyCritical END AS notifyCritical,
                   CASE WHEN p.adminId IS NULL THEN true ELSE p.notifySecurity END AS notifySecurity,
                   CASE WHEN p.adminId IS NULL THEN true ELSE p.notifyAccessFailures END AS notifyAccessFailures,
                   CASE WHEN p.adminId IS NULL THEN true ELSE p.notifyStudentChanges END AS notifyStudentChanges,
                   CASE WHEN p.adminId IS NULL THEN true ELSE p.notifyConfigChanges END AS notifyConfigChanges,
                   CASE WHEN p.adminId IS NULL THEN true ELSE p.notifyAdminChanges END AS notifyAdminChanges
              FROM Admin a
              LEFT JOIN NotificationPreference p ON p.admin = a
             WHERE a.status = :status
            """)
    List<AdminPreferenceView> findAdminPreferenceViewsByStatus(@Param("status") AdminStatus status);

    interface AdminPreferenceView {
        UUID getAdminId();
        Boolean getNotifyCritical();
        Boolean getNotifySecurity();
        Boolean getNotifyAccessFailures();
        Boolean getNotifyStudentChanges();
        Boolean getNotifyConfigChanges();
        Boolean getNotifyAdminChanges();
    }
}
