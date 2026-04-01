package mx.edu.utez.server.modules.auth.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * En esta fase el token de recuperación se registra en log (igual que el flujo admin).
 * Sustituir por envío real de correo cuando exista integración SMTP.
 */
@Service
public class StudentPasswordResetNotifier {

    private static final Logger log = LoggerFactory.getLogger(StudentPasswordResetNotifier.class);

    @Value("${spring.profiles.active:default}")
    private String activeProfile;

    @Value("${app.frontend.base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    public String buildStudentResetLink(String rawToken) {
        return UriComponentsBuilder.fromHttpUrl(frontendBaseUrl)
                .path("/reset-password")
                .queryParam("mode", "student")
                .queryParam("token", rawToken)
                .build()
                .toUriString();
    }

    public void sendStudentPasswordReset(String email, String rawToken) {
        String resetLink = buildStudentResetLink(rawToken);
        if (isProductionProfile()) {
            int len = Math.min(8, rawToken.length());
            log.info("Student password reset token for {}. Prefix: {}...", email, rawToken.substring(0, len));
            log.info("Student password reset link for {}: {}", email, redactUrlToken(resetLink));
        } else {
            log.info("Student password reset token for {}: {}", email, rawToken);
            log.info("Student password reset link for {}: {}", email, resetLink);
        }
    }

    private boolean isProductionProfile() {
        return activeProfile != null && activeProfile.contains("prod");
    }

    private String redactUrlToken(String resetLink) {
        int tokenIndex = resetLink.indexOf("token=");
        if (tokenIndex < 0) {
            return resetLink;
        }
        int valueStart = tokenIndex + "token=".length();
        int valueEnd = resetLink.indexOf('&', valueStart);
        if (valueEnd < 0) {
            valueEnd = resetLink.length();
        }
        String tokenValue = resetLink.substring(valueStart, valueEnd);
        String visiblePrefix = tokenValue.substring(0, Math.min(8, tokenValue.length()));
        return resetLink.substring(0, valueStart) + visiblePrefix + "...(redacted)" + resetLink.substring(valueEnd);
    }
}
