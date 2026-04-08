package mx.edu.utez.server.modules.logs.audit.repository;

import mx.edu.utez.server.modules.logs.audit.entity.AuditLog;
import mx.edu.utez.server.shared.enums.AuditActorType;
import mx.edu.utez.server.shared.enums.AuditSourceModule;
import mx.edu.utez.server.shared.enums.AdminRole;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID>, JpaSpecificationExecutor<AuditLog> {

    List<AuditLog> findTop20ByActionInAndEntityTypeOrderByOccurredAtDesc(Collection<String> actions, String entityType);

    // ── Admin dashboard metrics ───────────────────────────────────────────

    /** Count audit entries for a given actor type after a point in time. */
    long countByActorTypeAndOccurredAtGreaterThanEqual(AuditActorType actorType, Instant since);

    /** Count audit entries for a given actor type within a time window. */
    long countByActorTypeAndOccurredAtGreaterThanEqualAndOccurredAtLessThan(
            AuditActorType actorType, Instant from, Instant to);

    /** Activity grouped by admin role and source module for the radar chart. */
    @Query("""
            SELECT al.actorAdmin.role AS role,
                   al.sourceModule   AS module,
                   COUNT(al.id)      AS count
            FROM AuditLog al
            WHERE al.actorType     = :actorType
              AND al.actorAdmin    IS NOT NULL
              AND al.sourceModule  IS NOT NULL
              AND al.occurredAt   >= :since
            GROUP BY al.actorAdmin.role, al.sourceModule
            ORDER BY al.actorAdmin.role, al.sourceModule
            """)
    List<RoleModuleActivityProjection> findRoleModuleActivity(
            @Param("actorType") AuditActorType actorType,
            @Param("since") Instant since);

    /** Most recent audit entries by admin actors (used for the activity timeline). */
    List<AuditLog> findTop10ByActorTypeOrderByOccurredAtDesc(AuditActorType actorType);

    /** Total audit entries grouped by admin, ordered by action count descending. */
    @Query("""
            SELECT al.actorAdmin.id AS adminId,
                   CONCAT(al.actorAdmin.name, ' ', al.actorAdmin.lastNamePaternal) AS adminName,
                   COUNT(al.id) AS totalActions
            FROM AuditLog al
            WHERE al.actorType  = :actorType
              AND al.actorAdmin IS NOT NULL
            GROUP BY al.actorAdmin.id, al.actorAdmin.name, al.actorAdmin.lastNamePaternal
            ORDER BY COUNT(al.id) DESC
            """)
    List<AdminActionCountProjection> findActionsPerAdmin(
            @Param("actorType") AuditActorType actorType,
            Pageable pageable);

    // ── Projection interfaces ─────────────────────────────────────────────

    interface RoleModuleActivityProjection {
        AdminRole getRole();
        AuditSourceModule getModule();
        long getCount();
    }

    interface AdminActionCountProjection {
        UUID getAdminId();
        String getAdminName();
        long getTotalActions();
    }
}
