package mx.edu.utez.server.modules.notifications.repository;

import java.util.Optional;
import java.util.UUID;
import mx.edu.utez.server.modules.notifications.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByAdmin_IdAndDismissedFalse(UUID adminId, Pageable pageable);

    long countByAdmin_IdAndReadFalseAndDismissedFalse(UUID adminId);

    Optional<Notification> findByIdAndAdmin_IdAndDismissedFalse(Long id, UUID adminId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE Notification n
               SET n.read = true
             WHERE n.admin.id = :adminId
               AND n.read = false
               AND n.dismissed = false
            """)
    int markAllRead(@Param("adminId") UUID adminId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE Notification n
               SET n.dismissed = true,
                   n.read = true
             WHERE n.admin.id = :adminId
               AND n.dismissed = false
            """)
    int dismissAll(@Param("adminId") UUID adminId);
}
