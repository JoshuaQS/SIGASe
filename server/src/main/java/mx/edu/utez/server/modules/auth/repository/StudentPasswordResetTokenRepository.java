package mx.edu.utez.server.modules.auth.repository;

import mx.edu.utez.server.modules.auth.entity.StudentPasswordResetToken;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface StudentPasswordResetTokenRepository extends JpaRepository<StudentPasswordResetToken, UUID> {

    Optional<StudentPasswordResetToken> findByTokenHash(String tokenHash);

    /** Token pendiente de uso ({@code usedAt IS NULL}); el hash sigue siendo único en tabla. */
    @Query("SELECT t FROM StudentPasswordResetToken t WHERE t.tokenHash = :tokenHash AND t.usedAt IS NULL")
    Optional<StudentPasswordResetToken> findByTokenHashAndUsedFalse(@Param("tokenHash") String tokenHash);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE StudentPasswordResetToken t SET t.usedAt = :now WHERE t.student.id = :studentId AND t.usedAt IS NULL")
    void invalidatePendingByStudentId(@Param("studentId") UUID studentId, @Param("now") Instant now);

    @Modifying(clearAutomatically = true)
    @Query(value = "DELETE FROM student_password_reset_tokens WHERE student_id = :studentId", nativeQuery = true)
    void deleteByStudentId(@Param("studentId") UUID studentId);
}
