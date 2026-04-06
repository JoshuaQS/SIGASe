package mx.edu.utez.server.modules.students.repository;

import mx.edu.utez.server.modules.students.entity.StudentAuthEvent;
import mx.edu.utez.server.shared.enums.StudentAuthResult;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StudentAuthEventRepository extends JpaRepository<StudentAuthEvent, UUID>, JpaSpecificationExecutor<StudentAuthEvent> {

    long countByStudent_IdAndResult(UUID studentId, StudentAuthResult result);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE StudentAuthEvent e SET e.student = NULL WHERE e.student.id = :studentId")
    int detachStudentReferences(@Param("studentId") UUID studentId);
}
