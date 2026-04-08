package mx.edu.utez.server.modules.admins.repository;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.shared.enums.AdminRole;
import mx.edu.utez.server.shared.enums.AdminStatus;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AdminRepository extends JpaRepository<Admin, UUID>, JpaSpecificationExecutor<Admin> {
    Optional<Admin> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByEmailAndIdNot(String email, UUID id);
    long countByStatus(AdminStatus status);
    long countByRole(AdminRole role);
}
