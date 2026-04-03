package mx.edu.utez.server.modules.elibro.repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import mx.edu.utez.server.modules.elibro.entity.ElibroValidationRun;
import mx.edu.utez.server.shared.enums.ElibroValidationType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ElibroValidationRunRepository extends JpaRepository<ElibroValidationRun, UUID> {

    List<ElibroValidationRun> findByConfig_IdAndCheckedAtGreaterThanEqualOrderByCheckedAtAsc(UUID configId, Instant checkedAt);

    List<ElibroValidationRun> findByConfig_IdAndValidationTypeAndCheckedAtGreaterThanEqualOrderByCheckedAtAsc(
            UUID configId,
            ElibroValidationType validationType,
            Instant checkedAt
    );
}
