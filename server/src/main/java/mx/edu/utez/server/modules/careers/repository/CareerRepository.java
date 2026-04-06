package mx.edu.utez.server.modules.careers.repository;

import mx.edu.utez.server.modules.careers.entity.Career;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import mx.edu.utez.server.shared.enums.CareerStatus;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CareerRepository extends JpaRepository<Career, UUID> {
    Optional<Career> findByCodeIgnoreCase(String code);
    Optional<Career> findByNameIgnoreCase(String name);
    List<Career> findByStatusOrderByNameAsc(CareerStatus status);
}
