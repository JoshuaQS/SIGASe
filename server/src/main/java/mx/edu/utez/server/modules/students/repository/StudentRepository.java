package mx.edu.utez.server.modules.students.repository;

import mx.edu.utez.server.modules.students.entity.Student;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

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
}
