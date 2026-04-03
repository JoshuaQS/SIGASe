package mx.edu.utez.server.modules.auth.service;

import mx.edu.utez.server.shared.util.SecurityLogSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class StudentPasswordResetNotifier {

    private static final Logger log = LoggerFactory.getLogger(StudentPasswordResetNotifier.class);
    private final String frontendBaseUrl;
    private final String mailFrom;
    private final JavaMailSender mailSender;
    private final SecurityLogSanitizer securityLogSanitizer;

    public StudentPasswordResetNotifier(
            @Value("${app.frontend.base-url:http://localhost:5173}") String frontendBaseUrl,
            @Value("${app.mail.from:}") String mailFrom,
            JavaMailSender mailSender,
            SecurityLogSanitizer securityLogSanitizer
    ) {
        this.frontendBaseUrl = frontendBaseUrl;
        this.mailFrom = mailFrom;
        this.mailSender = mailSender;
        this.securityLogSanitizer = securityLogSanitizer;
    }

    public String buildStudentResetLink(String rawToken) {
        return UriComponentsBuilder.fromHttpUrl(frontendBaseUrl)
                .path("/reset-password")
                .queryParam("mode", "student")
                .queryParam("token", rawToken)
                .build()
                .toUriString();
    }

    public boolean sendStudentPasswordReset(String email, String rawToken) {
        String resetLink = buildStudentResetLink(rawToken);
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            if (StringUtils.hasText(mailFrom)) {
                message.setFrom(mailFrom.trim());
            }
            message.setTo(email);
            message.setSubject("SIGASe | Configura tu contraseña");
            message.setText(buildMessageBody(resetLink));

            mailSender.send(message);

            log.info(
                    "Student password reset email sent to {}",
                    securityLogSanitizer.sanitizeEmailForLookup(email)
            );
            log.info(
                    "Student password reset link for {}: {}",
                    email,
                    securityLogSanitizer.redactSensitiveQueryParams(resetLink)
            );
            return true;
        } catch (MailException ex) {
            log.error(
                    "Failed to send student password reset email to {}: {}",
                    securityLogSanitizer.sanitizeEmailForLookup(email),
                    ex.getMessage()
            );
            return false;
        }
    }

    private String buildMessageBody(String resetLink) {
        return """
                Hola,

                Se creó tu acceso en SIGASe y necesitas establecer tu contraseña.

                Usa este enlace para crearla:
                %s

                Por seguridad, este enlace vence en un tiempo limitado.
                Si no solicitaste este acceso, ignora este mensaje.

                Equipo SIGASe
                """.formatted(resetLink);
    }
}
