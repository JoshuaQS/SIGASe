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

    // ── Audit log global summary (no table pagination) ─────────────────────

    @Query("""
            SELECT al.action AS action, COUNT(al.id) AS total
            FROM AuditLog al
            GROUP BY al.action
            ORDER BY COUNT(al.id) DESC
            """)
    List<ActionCountProjection> findTopActions(Pageable pageable);

    @Query("""
            SELECT al.severity AS severity, COUNT(al.id) AS total
            FROM AuditLog al
            GROUP BY al.severity
            ORDER BY COUNT(al.id) DESC
            """)
    List<SeverityCountProjection> countBySeverity();

    @Query("""
            SELECT al.outcome AS outcome, COUNT(al.id) AS total
            FROM AuditLog al
            GROUP BY al.outcome
            ORDER BY COUNT(al.id) DESC
            """)
    List<OutcomeCountProjection> countByOutcome();

    @Query("""
            SELECT COUNT(al.id)
            FROM AuditLog al
            """)
    long countAll();

    @Query(value = """
            SELECT COUNT(DISTINCT CONCAT(COALESCE(CAST(actor_admin_id AS CHAR), ''), ':', COALESCE(actor_reference, 'SYSTEM')))
            FROM audit_logs
            """, nativeQuery = true)
    long countDistinctActorsNative();

    @Query("""
            SELECT COUNT(al.id)
            FROM AuditLog al
            WHERE al.severity IN ('SECURITY','CRITICAL')
            """)
    long countCriticalLike();

    @Query("""
            SELECT COUNT(al.id)
            FROM AuditLog al
            WHERE al.outcome IN ('FAILURE','ERROR')
            """)
    long countFailureLike();

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

    interface ActionCountProjection {
        String getAction();
        long getTotal();
    }

    interface SeverityCountProjection {
        mx.edu.utez.server.shared.enums.AuditSeverity getSeverity();
        long getTotal();
    }

    interface OutcomeCountProjection {
        mx.edu.utez.server.shared.enums.AuditOutcome getOutcome();
        long getTotal();
    }
}
