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

    @Modifying(clearAutomatically = true)
    @Query(value = "UPDATE student_access_alert_states SET student_id = NULL WHERE student_id = :studentId", nativeQuery = true)
    void detachStudentReferences(@Param("studentId") UUID studentId);
}
