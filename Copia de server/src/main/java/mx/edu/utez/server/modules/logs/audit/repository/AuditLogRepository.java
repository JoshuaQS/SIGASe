package mx.edu.utez.server.modules.logs.audit.repository;

import mx.edu.utez.server.modules.logs.audit.entity.AuditLog;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID>, JpaSpecificationExecutor<AuditLog> {

    List<AuditLog> findTop20ByActionInAndEntityTypeOrderByOccurredAtDesc(Collection<String> actions, String entityType);
}
