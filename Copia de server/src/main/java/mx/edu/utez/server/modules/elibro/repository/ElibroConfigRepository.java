package mx.edu.utez.server.modules.elibro.repository;

import mx.edu.utez.server.modules.elibro.entity.ElibroConfig;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ElibroConfigRepository extends JpaRepository<ElibroConfig, UUID> {
    Optional<ElibroConfig> findFirstByActiveTrueOrderByUpdatedAtDesc();
    List<ElibroConfig> findAllByActiveTrueAndIdNot(UUID id);
    List<ElibroConfig> findAllByOrderByUpdatedAtDesc();
}
