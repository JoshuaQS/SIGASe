package mx.edu.utez.server.modules.auth.service;

import mx.edu.utez.server.shared.util.SecurityLogSanitizer;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
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

    public String buildStudentOnboardingLink(String rawToken) {
        return UriComponentsBuilder.fromHttpUrl(frontendBaseUrl)
                .path("/student/force-password-change")
                .queryParam("token", rawToken)
                .build()
                .toUriString();
    }

    public boolean sendStudentPasswordReset(String email, String rawToken) {
        String resetLink = buildStudentResetLink(rawToken);
        try {
            sendStyledEmail(
                    email,
                    "SIGASe | Restablece tu contraseña",
                    buildResetMessageBody(resetLink),
                    buildResetMessageHtml(resetLink)
            );

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
        } catch (MailException | MessagingException ex) {
            log.error(
                    "Failed to send student password reset email to {}: {}",
                    securityLogSanitizer.sanitizeEmailForLookup(email),
                    ex.getMessage()
            );
            return false;
        }
    }

    public boolean sendStudentOnboardingPasswordSetup(String email, String rawToken) {
        String onboardingLink = buildStudentOnboardingLink(rawToken);
        try {
            sendStyledEmail(
                    email,
                    "SIGASe | Configura tu contraseña",
                    buildOnboardingMessageBody(onboardingLink),
                    buildOnboardingMessageHtml(onboardingLink)
            );

            log.info(
                    "Student onboarding password setup email sent to {}",
                    securityLogSanitizer.sanitizeEmailForLookup(email)
            );
            log.info(
                    "Student onboarding password setup link for {}: {}",
                    email,
                    securityLogSanitizer.redactSensitiveQueryParams(onboardingLink)
            );
            return true;
        } catch (MailException | MessagingException ex) {
            log.error(
                    "Failed to send student onboarding password setup email to {}: {}",
                    securityLogSanitizer.sanitizeEmailForLookup(email),
                    ex.getMessage()
            );
            return false;
        }
    }

    private String buildOnboardingMessageBody(String onboardingLink) {
        return """
                Hola,

                Se creó tu acceso en SIGASe y necesitas establecer tu contraseña.

                Usa este enlace para crearla:
                %s

                Por seguridad, este enlace vence en un tiempo limitado.
                Si no solicitaste este acceso, ignora este mensaje.

                Equipo SIGASe
                """.formatted(onboardingLink);
    }

    private String buildOnboardingMessageHtml(String onboardingLink) {
        return buildHtmlTemplate(
                "Configura tu contraseña",
                "Tu cuenta en SIGASe ya fue creada. Para activar tu acceso, configura tu contraseña con el siguiente botón.",
                "Configurar contraseña",
                onboardingLink,
                "#2563eb"
        );
    }

    private String buildResetMessageBody(String resetLink) {
        return """
                Hola,

                Recibimos una solicitud para restablecer tu contraseña de SIGASe.

                Usa este enlace para crear una nueva contraseña:
                %s

                Si no solicitaste este cambio, ignora este correo.

                Equipo SIGASe
                """.formatted(resetLink);
    }

    private String buildResetMessageHtml(String resetLink) {
        return buildHtmlTemplate(
                "Restablece tu contraseña",
                "Recibimos una solicitud para restablecer tu contraseña. Si fuiste tú, continúa con el siguiente botón.",
                "Restablecer contraseña",
                resetLink,
                "#059669"
        );
    }

    private String buildHtmlTemplate(
            String title,
            String description,
            String buttonText,
            String actionUrl,
            String accentColor
    ) {
        return """
                <!doctype html>
                <html lang="es">
                  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#111827;">
                    <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
                      <tr>
                        <td align="center">
                          <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
                            <tr>
                              <td style="padding:20px 24px;background:%s;color:#ffffff;font-size:18px;font-weight:700;">
                                SIGASe
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:24px;">
                                <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.25;color:#111827;">%s</h1>
                                <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#374151;">%s</p>
                                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 18px 0;">
                                  <tr>
                                    <td style="border-radius:10px;background:%s;">
                                      <a href="%s" style="display:inline-block;padding:12px 20px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
                                        %s
                                      </a>
                                    </td>
                                  </tr>
                                </table>
                                <p style="margin:0;font-size:12px;line-height:1.5;color:#6b7280;">
                                  Si no solicitaste esta acción, puedes ignorar este correo.
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </body>
                </html>
                """.formatted(accentColor, title, description, accentColor, actionUrl, buttonText);
    }

    private void sendStyledEmail(String to, String subject, String plainText, String htmlContent) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(
                message,
                MimeMessageHelper.MULTIPART_MODE_NO,
                StandardCharsets.UTF_8.name()
        );
        if (StringUtils.hasText(mailFrom)) {
            helper.setFrom(mailFrom.trim());
        }
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(plainText, htmlContent);
        mailSender.send(message);
    }
}
