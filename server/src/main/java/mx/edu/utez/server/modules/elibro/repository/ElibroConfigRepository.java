package mx.edu.utez.server.modules.elibro.repository;

import mx.edu.utez.server.modules.elibro.entity.ElibroConfig;
import mx.edu.utez.server.shared.enums.ElibroConfigStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ElibroConfigRepository extends JpaRepository<ElibroConfig, UUID> {

    @Query("select c from ElibroConfig c where c.status = :status order by c.updatedAt desc limit 1")
    Optional<ElibroConfig> findFirstByStatusOrderByUpdatedAtDesc(@Param("status") ElibroConfigStatus status);

    @Query("select c from ElibroConfig c where c.status = :status and c.id <> :id order by c.updatedAt desc limit 1")
    Optional<ElibroConfig> findFirstByStatusAndIdNotOrderByUpdatedAtDesc(@Param("status") ElibroConfigStatus status, @Param("id") UUID id);

    List<ElibroConfig> findAllByOrderByUpdatedAtDesc();
}
