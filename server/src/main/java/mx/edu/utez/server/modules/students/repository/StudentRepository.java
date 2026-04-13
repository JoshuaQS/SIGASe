package mx.edu.utez.server.modules.students.repository;

import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.shared.enums.StudentStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;

public interface StudentRepository extends JpaRepository<Student, UUID>, JpaSpecificationExecutor<Student> {

    /** {@code email} debe ir en minúsculas (p. ej. {@code trim().toLowerCase(Locale.ROOT)}); consulta por correo normalizado. */
    default Optional<Student> findByInstitutionalEmail(String email) {
        return findByInstitutionalEmailNormalized(email);
    }

    Optional<Student> findByInstitutionalEmailNormalized(String institutionalEmailNormalized);
    boolean existsByInstitutionalEmailNormalized(String institutionalEmailNormalized);
    boolean existsByInstitutionalEmailNormalizedAndIdNot(String institutionalEmailNormalized, UUID id);
    boolean existsByEnrollmentId(String enrollmentId);
    boolean existsByEnrollmentIdAndIdNot(String enrollmentId, UUID id);
    long countByStatus(StudentStatus status);
    Optional<Student> findFirstByStatusAndInstitutionalEmailNormalizedIsNotNullOrderByUpdatedAtDesc(StudentStatus status);

    @Query("""
            select s
            from Student s
            join fetch s.career c
            where lower(s.enrollmentId) like lower(concat('%', :query, '%'))
               or lower(s.name) like lower(concat('%', :query, '%'))
               or lower(s.lastNamePaternal) like lower(concat('%', :query, '%'))
               or lower(coalesce(s.lastNameMaternal, '')) like lower(concat('%', :query, '%'))
               or lower(concat(s.name, ' ', s.lastNamePaternal, ' ', coalesce(s.lastNameMaternal, '')))
                    like lower(concat('%', :query, '%'))
            order by s.enrollmentId asc
            """)
    List<Student> searchForDashboardAnalysis(@Param("query") String query, Pageable pageable);
}
