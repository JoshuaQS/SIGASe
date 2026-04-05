package mx.edu.utez.server.modules.logs.access.repository;

import jakarta.persistence.LockModeType;
import mx.edu.utez.server.modules.logs.access.entity.StudentAccessAlertState;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StudentAccessAlertStateRepository extends JpaRepository<StudentAccessAlertState, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from StudentAccessAlertState s where s.normalizedEmail = :normalizedEmail")
    Optional<StudentAccessAlertState> findForUpdateByNormalizedEmail(@Param("normalizedEmail") String normalizedEmail);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE StudentAccessAlertState s SET s.student = NULL WHERE s.student.id = :studentId")
    int detachStudentReferences(@Param("studentId") UUID studentId);
}
