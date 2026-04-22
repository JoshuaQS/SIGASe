package mx.edu.utez.server.modules.admins.repository;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.shared.enums.AdminRole;
import mx.edu.utez.server.shared.enums.AdminStatus;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AdminRepository extends JpaRepository<Admin, UUID>, JpaSpecificationExecutor<Admin> {
    Optional<Admin> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByEmailAndIdNot(String email, UUID id);
    long countByStatus(AdminStatus status);
    long countByRole(AdminRole role);

    @Modifying
    @Query("update Admin a set a.lastActivityAt = :instant where a.id = :id")
    int updateLastActivityAt(@Param("id") UUID id, @Param("instant") Instant instant);
}
