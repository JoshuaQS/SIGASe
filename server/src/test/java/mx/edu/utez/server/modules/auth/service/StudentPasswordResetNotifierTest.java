package mx.edu.utez.server.modules.auth.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.internet.MimeMessage;
import mx.edu.utez.server.config.AppProperties;
import mx.edu.utez.server.shared.util.SecurityLogSanitizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

@ExtendWith(MockitoExtension.class)
class StudentPasswordResetNotifierTest {

    @Mock
    private JavaMailSender mailSender;

    private SecurityLogSanitizer securityLogSanitizer;

    @BeforeEach
    void setUp() {
        AppProperties appProperties = new AppProperties();
        securityLogSanitizer = new SecurityLogSanitizer(appProperties, new ObjectMapper());
    }

    @Test
    void shouldReturnFalseWhenFrontendBaseUrlIsInvalidForOnboardingLink() {
        StudentPasswordResetNotifier notifier = new StudentPasswordResetNotifier(
                "localhost:5173",
                "noreply@utez.edu.mx",
                mailSender,
                securityLogSanitizer
        );

        boolean sent = notifier.sendStudentOnboardingPasswordSetup("student@utez.edu.mx", "raw-token");

        assertFalse(sent);
    }

    @Test
    void shouldSendOnboardingEmailWhenConfigurationIsValid() {
        MimeMessage message = new JavaMailSenderImpl().createMimeMessage();
        when(mailSender.createMimeMessage()).thenReturn(message);

        StudentPasswordResetNotifier notifier = new StudentPasswordResetNotifier(
                "http://localhost:5173",
                "noreply@utez.edu.mx",
                mailSender,
                securityLogSanitizer
        );

        boolean sent = notifier.sendStudentOnboardingPasswordSetup("student@utez.edu.mx", "raw-token");

        assertTrue(sent);
        verify(mailSender).send(any(MimeMessage.class));
    }
}
