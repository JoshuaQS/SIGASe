package mx.edu.utez.server.modules.auth.service;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.auth.entity.AdminPasswordResetToken;
import mx.edu.utez.server.modules.auth.repository.AdminPasswordResetTokenRepository;
import mx.edu.utez.server.modules.logs.audit.service.AuditTrailService;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import mx.edu.utez.server.shared.util.EmailNormalizer;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Public password-reset flow (request + confirm).
 * <p>
 * In this phase the raw token is logged to console instead of being sent by
 * email.  In production the log shows only a partial token; in dev/local the
 * full token is logged so that it can be used for testing.
 * <p>
 * <b>Important:</b> confirming a reset does NOT revoke any JWT tokens that
 * were previously issued.  The admin's existing sessions remain valid until
 * they expire naturally.  JWT revocation can be added in a future phase.
 */
@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    private static final int TOKEN_BYTES = 32;
    private static final long TOKEN_EXPIRATION_MINUTES = 30;

    private final AdminRepository adminRepository;
    private final AdminPasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailNormalizer emailNormalizer;
    private final AuditTrailService auditTrailService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${spring.profiles.active:default}")
    private String activeProfile;

    public PasswordResetService(
            AdminRepository adminRepository,
            AdminPasswordResetTokenRepository tokenRepository,
            PasswordEncoder passwordEncoder,
            EmailNormalizer emailNormalizer,
            AuditTrailService auditTrailService
    ) {
        this.adminRepository = adminRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailNormalizer = emailNormalizer;
        this.auditTrailService = auditTrailService;
    }

    /**
     * Step 1 — request a password reset.
     * <p>
     * Always returns normally (no exception) regardless of whether the email
     * exists, so callers cannot enumerate valid accounts.
     */
    @Transactional
    public void requestReset(String rawEmail, HttpServletRequest request) {
        String normalizedEmail = emailNormalizer.normalize(rawEmail);
        Optional<Admin> adminOpt = adminRepository.findByEmail(normalizedEmail);

        if (adminOpt.isEmpty() || !adminOpt.get().isActive()) {
            // Do not reveal whether the email exists — return silently.
            return;
        }

        Admin admin = adminOpt.get();

        // Invalidate any pending (unused) tokens for the same admin.
        tokenRepository.invalidatePendingTokens(admin, Instant.now());

        // Generate cryptographically-secure token.
        String rawToken = generateRawToken();
        String tokenHash = hashToken(rawToken);

        AdminPasswordResetToken resetToken = new AdminPasswordResetToken();
        resetToken.setAdmin(admin);
        resetToken.setTokenHash(tokenHash);
        resetToken.setExpiresAt(Instant.now().plus(TOKEN_EXPIRATION_MINUTES, ChronoUnit.MINUTES));
        tokenRepository.save(resetToken);

        // Log the token — full in dev/test, partial in production.
        logToken(normalizedEmail, rawToken);

        auditTrailService.auditAdminAction(
                admin,
                "PASSWORD_RESET_REQUEST",
                "ADMIN",
                admin.getId().toString(),
                AuditOutcome.SUCCESS,
                Map.of("email", normalizedEmail),
                request
        );
    }

    /**
     * Step 2 — confirm the reset using the raw token plus the new password.
     */
    @Transactional
    public void confirmReset(String rawToken, String newPassword, HttpServletRequest request) {
        String tokenHash = hashToken(rawToken);

        AdminPasswordResetToken resetToken = tokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new BusinessException(
                        ErrorCode.INVALID_TOKEN, "Token de recuperación inválido."));

        if (resetToken.getUsedAt() != null) {
            throw new BusinessException(ErrorCode.INVALID_TOKEN,
                    "Token de recuperación ya fue utilizado.");
        }

        if (resetToken.getExpiresAt().isBefore(Instant.now())) {
            throw new BusinessException(ErrorCode.INVALID_TOKEN,
                    "Token de recuperación expirado.");
        }

        Admin admin = resetToken.getAdmin();
        if (!admin.isActive()) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "La cuenta de administrador está desactivada.");
        }

        // Mark token as consumed (single-use).
        resetToken.setUsedAt(Instant.now());
        tokenRepository.save(resetToken);

        // Update password and clear lockout state.
        admin.setPasswordHash(passwordEncoder.encode(newPassword));
        admin.setFailedLoginAttempts(0);
        admin.setLockedUntil(null);
        adminRepository.save(admin);

        auditTrailService.auditAdminAction(
                admin,
                "PASSWORD_RESET_CONFIRM",
                "ADMIN",
                admin.getId().toString(),
                AuditOutcome.SUCCESS,
                Map.of("adminId", admin.getId().toString(), "email", admin.getEmail()),
                request
        );
    }

    // ── helpers ─────────────────────────────────────────────────────────

    private String generateRawToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            // SHA-256 is mandated by the JLS — should never happen.
            throw new IllegalStateException("SHA-256 not available", ex);
        }
    }

    private void logToken(String email, String rawToken) {
        if (isProductionProfile()) {
            log.info("Password reset token generated for {}. Token: {}...(redacted)",
                    email, rawToken.substring(0, 8));
        } else {
            log.info("Password reset token generated for {}: {}", email, rawToken);
        }
    }

    private boolean isProductionProfile() {
        return activeProfile != null && activeProfile.contains("prod");
    }
}
