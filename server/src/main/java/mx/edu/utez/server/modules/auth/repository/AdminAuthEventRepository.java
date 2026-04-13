package mx.edu.utez.server.modules.auth.repository;

import java.util.UUID;
import mx.edu.utez.server.modules.auth.entity.AdminAuthEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AdminAuthEventRepository extends JpaRepository<AdminAuthEvent, UUID>, JpaSpecificationExecutor<AdminAuthEvent> {

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE AdminAuthEvent e SET e.admin = null WHERE e.admin.id = :adminId")
    int detachAdminReferences(@Param("adminId") UUID adminId);
}
