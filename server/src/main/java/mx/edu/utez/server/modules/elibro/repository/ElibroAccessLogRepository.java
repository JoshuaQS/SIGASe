package mx.edu.utez.server.modules.elibro.repository;

import mx.edu.utez.server.modules.elibro.entity.ElibroAccessLog;
import mx.edu.utez.server.shared.enums.ElibroAccessResult;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ElibroAccessLogRepository extends JpaRepository<ElibroAccessLog, UUID>, JpaSpecificationExecutor<ElibroAccessLog> {

    long countByStudent_IdAndOccurredAtGreaterThanEqualAndResult(UUID studentId, Instant occurredAt, ElibroAccessResult result);

    long countByStudent_IdAndOccurredAtGreaterThanEqualAndResultNot(UUID studentId, Instant occurredAt, ElibroAccessResult result);

    Optional<ElibroAccessLog> findTopByStudent_IdAndResultOrderByOccurredAtDesc(UUID studentId, ElibroAccessResult result);

    List<ElibroAccessLog> findTop365ByStudent_IdAndResultOrderByOccurredAtDesc(UUID studentId, ElibroAccessResult result);

    List<ElibroAccessLog> findByOccurredAtGreaterThanEqualOrderByOccurredAtAsc(Instant occurredAt);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE ElibroAccessLog l SET l.student = NULL WHERE l.student.id = :studentId")
    int detachStudentReferences(@Param("studentId") UUID studentId);
}
