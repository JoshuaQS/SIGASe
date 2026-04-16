package mx.edu.utez.server.modules.auth.service;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.auth.entity.AdminPasswordResetToken;
import mx.edu.utez.server.modules.auth.repository.AdminPasswordResetTokenRepository;
import mx.edu.utez.server.modules.logs.audit.service.AuditTrailService;
import mx.edu.utez.server.modules.notifications.service.EmailDispatchService;
import mx.edu.utez.server.shared.enums.AdminStatus;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.EmailDispatchJobType;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import mx.edu.utez.server.shared.util.EmailNormalizer;
import mx.edu.utez.server.shared.util.SecurityLogSanitizer;
import mx.edu.utez.server.shared.validation.PasswordPolicy;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Public password-reset flow (request + confirm).
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
    private final EmailDispatchService emailDispatchService;
    private final String frontendBaseUrl;
    private final SecureRandom secureRandom = new SecureRandom();

    private final SecurityLogSanitizer securityLogSanitizer;

    public PasswordResetService(
            AdminRepository adminRepository,
            AdminPasswordResetTokenRepository tokenRepository,
            PasswordEncoder passwordEncoder,
            EmailNormalizer emailNormalizer,
            AuditTrailService auditTrailService,
            EmailDispatchService emailDispatchService,
            @org.springframework.beans.factory.annotation.Value("${app.frontend.base-url:http://localhost:5173}") String frontendBaseUrl,
            SecurityLogSanitizer securityLogSanitizer
    ) {
        this.adminRepository = adminRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailNormalizer = emailNormalizer;
        this.auditTrailService = auditTrailService;
        this.emailDispatchService = emailDispatchService;
        this.frontendBaseUrl = frontendBaseUrl;
        this.securityLogSanitizer = securityLogSanitizer;
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

        if (adminOpt.isEmpty() || adminOpt.get().getStatus() != AdminStatus.ACTIVE) {
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

        enqueuePasswordResetEmail(admin.getEmail(), rawToken, admin.getId().toString());

        // Never log raw reset tokens; keep only a short redacted fingerprint.
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
    public void confirmReset(String rawToken, String newPassword, String confirmNewPassword, HttpServletRequest request) {
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
        if (admin.getStatus() != AdminStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "La cuenta de administrador está desactivada.");
        }

        PasswordPolicy.validateOrThrow(newPassword);
        if (!newPassword.equals(confirmNewPassword)) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "La confirmación no coincide con la nueva contraseña.");
        }

        // Mark token as consumed (single-use).
        resetToken.setUsedAt(Instant.now());
        tokenRepository.save(resetToken);

        // Update password and clear lockout state.
        admin.setPasswordHash(passwordEncoder.encode(newPassword));
        admin.setFailedLoginAttempts(0);
        admin.setLockedUntil(null);
        admin.setTokenVersion(admin.getTokenVersion() + 1);
        admin.setHasChangedTemporaryPassword(true);
        admin.setPasswordChangedAt(Instant.now());
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
        log.info(
                "Password reset token generated for {}: {}",
                email,
                securityLogSanitizer.redactToken(rawToken)
        );
    }

    private void enqueuePasswordResetEmail(String email, String rawToken, String referenceId) {
        try {
            String resetLink = buildResetLink(rawToken);
            String plainText = """
                    Hola,

                    Recibimos una solicitud para restablecer tu contraseña de SIGASe.

                    Usa este enlace para crear una nueva contraseña:
                    %s

                    Si no solicitaste este cambio, ignora este correo.
                    """.formatted(resetLink);
            String html = """
                    <!doctype html>
                    <html lang="es">
                      <body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
                        <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;">
                          <h1 style="margin:0 0 12px 0;font-size:22px;">Restablece tu contraseña</h1>
                          <p style="margin:0 0 16px 0;line-height:1.6;">Recibimos una solicitud para restablecer tu contraseña. Si fuiste tú, continúa con el siguiente botón.</p>
                          <a href="%s" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#059669;color:#fff;text-decoration:none;font-weight:700;">Restablecer contraseña</a>
                        </div>
                      </body>
                    </html>
                    """.formatted(resetLink);
            emailDispatchService.enqueue(
                    EmailDispatchJobType.ADMIN_PASSWORD_RESET,
                    email,
                    "SIGASe | Restablece tu contraseña",
                    plainText,
                    html,
                    "ADMIN",
                    referenceId
            );
        } catch (Exception ex) {
            log.warn("No se pudo encolar el correo de reset para {}: {}", email, ex.getMessage());
        }
    }

    private String buildResetLink(String rawToken) {
        return frontendBaseUrl + "/reset-password?mode=admin&token=" + rawToken;
    }
}
