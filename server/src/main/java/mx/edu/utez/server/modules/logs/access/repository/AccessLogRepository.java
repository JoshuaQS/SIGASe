package mx.edu.utez.server.modules.logs.access.repository;

import mx.edu.utez.server.modules.logs.access.entity.AccessLog;
import mx.edu.utez.server.shared.enums.AccessResult;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AccessLogRepository extends JpaRepository<AccessLog, UUID>, JpaSpecificationExecutor<AccessLog> {

    long countByStudent_IdAndOccurredAtGreaterThanEqualAndResult(UUID studentId, Instant occurredAt, AccessResult result);

    long countByStudent_IdAndOccurredAtGreaterThanEqualAndResultNot(UUID studentId, Instant occurredAt, AccessResult result);

    Optional<AccessLog> findTopByStudent_IdAndResultOrderByOccurredAtDesc(UUID studentId, AccessResult result);

    List<AccessLog> findTop365ByStudent_IdAndResultOrderByOccurredAtDesc(UUID studentId, AccessResult result);

    long countByStudent_IdAndProviderNameAndOccurredAtGreaterThanEqualAndResult(
            UUID studentId,
            String providerName,
            Instant occurredAt,
            AccessResult result
    );

    long countByStudent_IdAndProviderNameAndOccurredAtGreaterThanEqualAndResultNot(
            UUID studentId,
            String providerName,
            Instant occurredAt,
            AccessResult result
    );

    Optional<AccessLog> findTopByStudent_IdAndProviderNameAndResultOrderByOccurredAtDesc(
            UUID studentId,
            String providerName,
            AccessResult result
    );

    List<AccessLog> findTop365ByStudent_IdAndProviderNameAndResultOrderByOccurredAtDesc(
            UUID studentId,
            String providerName,
            AccessResult result
    );

    List<AccessLog> findByProviderNameAndOccurredAtGreaterThanEqualOrderByOccurredAtAsc(String providerName, Instant occurredAt);

    @Modifying(clearAutomatically = true)
    @Query(value = "UPDATE access_logs SET student_id = NULL WHERE student_id = :studentId", nativeQuery = true)
    void detachStudentReferences(@Param("studentId") UUID studentId);
}
