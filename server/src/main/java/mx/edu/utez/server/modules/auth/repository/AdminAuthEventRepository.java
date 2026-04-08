package mx.edu.utez.server.modules.auth.repository;

import java.util.UUID;
import mx.edu.utez.server.modules.auth.entity.AdminAuthEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AdminAuthEventRepository extends JpaRepository<AdminAuthEvent, UUID>, JpaSpecificationExecutor<AdminAuthEvent> {
}
