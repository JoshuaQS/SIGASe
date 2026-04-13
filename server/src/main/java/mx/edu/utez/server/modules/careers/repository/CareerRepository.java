package mx.edu.utez.server.modules.careers.repository;

import mx.edu.utez.server.modules.careers.entity.Career;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import mx.edu.utez.server.shared.enums.CareerStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CareerRepository extends JpaRepository<Career, UUID> {
    Optional<Career> findByCodeIgnoreCase(String code);
    Optional<Career> findByNameIgnoreCase(String name);
    List<Career> findByStatusOrderByNameAsc(CareerStatus status);

    @Query("""
            select c
            from Career c
            where lower(c.code) like lower(concat('%', :query, '%'))
               or lower(c.name) like lower(concat('%', :query, '%'))
            order by c.code asc
            """)
    List<Career> searchForDashboardAnalysis(@Param("query") String query, Pageable pageable);
}
