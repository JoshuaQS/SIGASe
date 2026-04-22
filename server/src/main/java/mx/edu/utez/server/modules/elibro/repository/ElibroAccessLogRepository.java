package mx.edu.utez.server.modules.elibro.repository;

import mx.edu.utez.server.modules.elibro.entity.ElibroAccessLog;
import mx.edu.utez.server.shared.enums.ElibroAccessResult;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ElibroAccessLogRepository extends JpaRepository<ElibroAccessLog, UUID>, JpaSpecificationExecutor<ElibroAccessLog> {

    interface DailyAccessCountProjection {
        LocalDate getActivityDate();
        long getTotal();
    }

    interface StudentAccessMetricsProjection {
        UUID getStudentId();
        ElibroAccessResult getResult();
        long getAccessCount();
    }

    interface StudentLastAccessProjection {
        UUID getStudentId();
        Instant getLastOccurredAt();
    }

    long countByStudent_IdAndOccurredAtGreaterThanEqualAndResult(UUID studentId, Instant occurredAt, ElibroAccessResult result);

    long countByStudent_IdAndOccurredAtGreaterThanEqualAndResultNot(UUID studentId, Instant occurredAt, ElibroAccessResult result);

    long countByOccurredAtGreaterThanEqualAndOccurredAtLessThanEqual(Instant dateFrom, Instant dateTo);

    long countByOccurredAtGreaterThanEqualAndOccurredAtLessThanEqualAndResult(
            Instant dateFrom,
            Instant dateTo,
            ElibroAccessResult result
    );

    Optional<ElibroAccessLog> findTopByStudent_IdAndResultOrderByOccurredAtDesc(UUID studentId, ElibroAccessResult result);

    List<ElibroAccessLog> findTop365ByStudent_IdAndResultOrderByOccurredAtDesc(UUID studentId, ElibroAccessResult result);

    List<ElibroAccessLog> findByOccurredAtGreaterThanEqualOrderByOccurredAtAsc(Instant occurredAt);

    long deleteByRequestIdStartingWith(String requestIdPrefix);

    @Query(
            value = """
                    SELECT DATE(occurred_at) AS activity_date, COUNT(*) AS total
                    FROM elibro_access_logs
                    WHERE occurred_at >= :dateFrom
                      AND occurred_at <= :dateTo
                    GROUP BY DATE(occurred_at)
                    ORDER BY DATE(occurred_at)
                    """,
            nativeQuery = true
    )
    List<DailyAccessCountProjection> countDailyAccesses(
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo
    );

    @Query("""
            SELECT
                l.student.id AS studentId,
                l.result AS result,
                COUNT(l) AS accessCount
            FROM ElibroAccessLog l
            WHERE l.student.id IN :studentIds
            GROUP BY l.student.id, l.result
            """)
    List<StudentAccessMetricsProjection> summarizeStudentAccessMetrics(
            @Param("studentIds") Collection<UUID> studentIds
    );

    @Query("""
            SELECT
                l.student.id AS studentId,
                MAX(l.occurredAt) AS lastOccurredAt
            FROM ElibroAccessLog l
            WHERE l.student.id IN :studentIds
            GROUP BY l.student.id
            """)
    List<StudentLastAccessProjection> summarizeStudentLastAccess(
            @Param("studentIds") Collection<UUID> studentIds
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE ElibroAccessLog l SET l.student = NULL WHERE l.student.id = :studentId")
    int detachStudentReferences(@Param("studentId") UUID studentId);
}
