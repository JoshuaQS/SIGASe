package mx.edu.utez.server.modules.auth.repository;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.auth.entity.AdminPasswordResetToken;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AdminPasswordResetTokenRepository extends JpaRepository<AdminPasswordResetToken, UUID> {

    Optional<AdminPasswordResetToken> findByTokenHash(String tokenHash);

    /**
     * Invalidates all pending (unused) tokens for the given admin by setting
     * {@code usedAt} to the supplied timestamp.  Already-used tokens are left
     * untouched.
     */
    @Modifying
    @Query("UPDATE AdminPasswordResetToken t SET t.usedAt = :now "
            + "WHERE t.admin = :admin AND t.usedAt IS NULL")
    int invalidatePendingTokens(@Param("admin") Admin admin, @Param("now") Instant now);
}
