package mx.edu.utez.server.modules.notifications.repository;

import mx.edu.utez.server.modules.notifications.entity.EmailDispatchJob;
import mx.edu.utez.server.shared.enums.EmailDispatchJobStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface EmailDispatchJobRepository extends JpaRepository<EmailDispatchJob, UUID> {

    @Query("""
            SELECT j
            FROM EmailDispatchJob j
            WHERE j.status IN :statuses
              AND (j.nextAttemptAt IS NULL OR j.nextAttemptAt <= :now)
            ORDER BY j.createdAt ASC
            """)
    List<EmailDispatchJob> findReadyJobs(List<EmailDispatchJobStatus> statuses, Instant now, Pageable pageable);
}
