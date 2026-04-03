package mx.edu.utez.server.modules.logs;

import java.util.LinkedHashMap;
import java.util.Map;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.logs.access.entity.AccessLog;
import mx.edu.utez.server.modules.logs.access.repository.AccessLogRepository;
import mx.edu.utez.server.modules.logs.access.service.AccessLogCommand;
import mx.edu.utez.server.modules.logs.access.service.AccessLogService;
import mx.edu.utez.server.modules.logs.audit.entity.AuditLog;
import mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository;
import mx.edu.utez.server.modules.logs.audit.service.AuditTrailService;
import mx.edu.utez.server.shared.enums.AccessResult;
import mx.edu.utez.server.shared.enums.AdminRole;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class LogSecurityIntegrationTest {

    @Autowired
    private AccessLogService accessLogService;

    @Autowired
    private AccessLogRepository accessLogRepository;

    @Autowired
    private AuditTrailService auditTrailService;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private AdminRepository adminRepository;

    private Admin actor;

    @BeforeEach
    void setUp() {
        accessLogRepository.deleteAll();
        auditLogRepository.deleteAll();
        adminRepository.deleteAll();
        actor = new Admin();
        actor.setEmail("admin.ti@utez.edu.mx");
        actor.setName("Admin");
        actor.setLastNamePaternal("TI");
        actor.setPasswordHash("$2a$10$123456789012345678901u2sNfJ0wYl8Bv0p5Wn4eC6zYkM8d8vS.");
        actor.setRole(AdminRole.ADMIN_TI);
        actor.setActive(true);
        actor = adminRepository.save(actor);
    }

    @Test
    void shouldSanitizeSensitiveFieldsInAccessLogPersistence() {
        accessLogService.log(new AccessLogCommand(
                null,
                "alice@utez.edu.mx",
                "alice@utez.edu.mx",
                AccessResult.FAILED_INTERNAL_ERROR,
                "TOKEN_ERROR",
                "token=secret-raw-value",
                150,
                "req-raw",
                "corr-raw",
                "10.20.30.40",
                "JUnit Agent \n with-break",
                "ELIBRO",
                "https://elibro.net/path?token=secret-value&ok=1",
                "https://elibro.net/redirect?password=raw-password"
        ));

        AccessLog saved = accessLogRepository.findAll().get(0);
        Assertions.assertTrue(saved.getAttemptedEmail().startsWith("sha256:"));
        Assertions.assertTrue(saved.getNormalizedEmail().startsWith("sha256:"));
        Assertions.assertEquals("10.20.30.0", saved.getIpAddress());
        Assertions.assertFalse(saved.getUserAgent().contains("\n"));
        Assertions.assertFalse(saved.getNextUrl().contains("secret-value"));
        Assertions.assertTrue(saved.getNextUrl().contains("***REDACTED***"));
        Assertions.assertFalse(saved.getRedirectUrl().contains("raw-password"));
    }

    @Test
    void shouldRedactSensitiveAuditMetadata() {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("token", "raw-token-value");
        metadata.put("password", "raw-password");
        metadata.put("nested", Map.of("secret", "raw-secret"));
        metadata.put("safe", "ok");

        auditTrailService.auditAdminAction(
                actor,
                "SECURITY_TEST",
                "TEST",
                "entity-1",
                AuditOutcome.SUCCESS,
                metadata,
                null
        );

        AuditLog saved = auditLogRepository.findAll().get(0);
        String metadataJson = saved.getMetadataJson();
        Assertions.assertNotNull(metadataJson);
        Assertions.assertFalse(metadataJson.contains("raw-token-value"));
        Assertions.assertFalse(metadataJson.contains("raw-password"));
        Assertions.assertFalse(metadataJson.contains("raw-secret"));
        Assertions.assertTrue(metadataJson.contains("***REDACTED***"));
    }
}
