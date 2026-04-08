package mx.edu.utez.server.modules.elibro.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.auth.repository.AdminPasswordResetTokenRepository;
import mx.edu.utez.server.modules.careers.repository.CareerRepository;
import mx.edu.utez.server.modules.elibro.entity.ElibroAccessLog;
import mx.edu.utez.server.modules.elibro.entity.ElibroConfig;
import mx.edu.utez.server.modules.elibro.entity.ElibroValidationRun;
import mx.edu.utez.server.modules.elibro.repository.ElibroAccessLogRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroConfigRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroValidationRunRepository;
import mx.edu.utez.server.modules.logs.audit.entity.AuditLog;
import mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository;
import mx.edu.utez.server.modules.notifications.entity.Notification;
import mx.edu.utez.server.modules.notifications.entity.NotificationReferenceType;
import mx.edu.utez.server.modules.notifications.entity.NotificationType;
import mx.edu.utez.server.modules.notifications.repository.NotificationPreferenceRepository;
import mx.edu.utez.server.modules.notifications.repository.NotificationRepository;
import mx.edu.utez.server.modules.students.repository.StudentAuthEventRepository;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.security.RoleConstants;
import mx.edu.utez.server.shared.crypto.Aes256CryptoService;
import mx.edu.utez.server.shared.enums.AdminRole;
import mx.edu.utez.server.shared.enums.AdminStatus;
import mx.edu.utez.server.shared.enums.AuditActorType;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.AuditSeverity;
import mx.edu.utez.server.shared.enums.ElibroAccessResult;
import mx.edu.utez.server.shared.enums.ElibroConfigStatus;
import mx.edu.utez.server.shared.enums.ElibroValidationRunStatus;
import mx.edu.utez.server.shared.enums.ElibroValidationStatus;
import mx.edu.utez.server.shared.enums.ElibroValidationType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class ElibroConfigControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private AdminPasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private CareerRepository careerRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private StudentAuthEventRepository studentAuthEventRepository;

    @Autowired
    private ElibroConfigRepository elibroConfigRepository;

    @Autowired
    private ElibroValidationRunRepository validationRunRepository;

    @Autowired
    private ElibroAccessLogRepository accessLogRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private Aes256CryptoService aes256CryptoService;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private NotificationPreferenceRepository notificationPreferenceRepository;

    private Admin adminTi;
    private ElibroConfig config;

    @BeforeEach
    void setUp() {
        notificationRepository.deleteAll();
        notificationPreferenceRepository.deleteAll();
        accessLogRepository.deleteAll();
        auditLogRepository.deleteAll();
        validationRunRepository.deleteAll();
        elibroConfigRepository.deleteAll();
        studentAuthEventRepository.deleteAll();
        studentRepository.deleteAll();
        careerRepository.deleteAll();
        passwordResetTokenRepository.deleteAll();
        adminRepository.deleteAll();

        adminTi = saveAdmin("elibro.config.admin@utez.edu.mx", AdminRole.ADMIN_TI);
        config = saveActiveConfig();
        seedAccessLogs();
        seedValidationRuns();
        seedRecentAuditActivity();
    }

    @Test
    void shouldReturnOverviewWithAggregatedDataAndMaskedFields() throws Exception {
        mockMvc.perform(get("/api/v1/elibro/config/active/overview")
                        .with(auth(adminTi.getId().toString(), RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.config.id").value(config.getId().toString()))
                .andExpect(jsonPath("$.data.config.name").value("Integración SSO eLibro UTEZ"))
                .andExpect(jsonPath("$.data.config.channelName").value("utez"))
                .andExpect(jsonPath("$.data.config.hasAuthToken").value(true))
                .andExpect(jsonPath("$.data.config.hasChannelSecret").value(true))
                .andExpect(jsonPath("$.data.config.hasChannelId").value(true))
                .andExpect(jsonPath("$.data.config.channelIdMasked").isNotEmpty())
                .andExpect(jsonPath("$.data.config.authToken").doesNotExist())
                .andExpect(jsonPath("$.data.config.channelSecret").doesNotExist())
                .andExpect(jsonPath("$.data.status.state").value("configured"))
                .andExpect(jsonPath("$.data.kpis.avgLatency24hMs").value(150))
                .andExpect(jsonPath("$.data.kpis.validations7dTotal").value(2))
                .andExpect(jsonPath("$.data.charts.latency24h.length()").value(24))
                .andExpect(jsonPath("$.data.charts.validations7d.length()").value(7))
                .andExpect(jsonPath("$.data.charts.uptimeWeekly.pct").value(50.0))
                .andExpect(jsonPath("$.data.recentActivity.length()").value(5));
    }

    @Test
    void shouldPersistManualValidationRunWhenValidateIsCalled() throws Exception {
        long before = validationRunRepository.count();

        mockMvc.perform(post("/api/v1/elibro/config/{configId}/validate", config.getId())
                        .with(auth(adminTi.getId().toString(), RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(config.getId().toString()))
                .andExpect(jsonPath("$.data.validationStatus").value("INVALID"))
                .andExpect(jsonPath("$.data.validationMessage").isNotEmpty());

        long after = validationRunRepository.count();
        org.junit.jupiter.api.Assertions.assertEquals(before + 1, after);

        ElibroValidationRun latestRun = validationRunRepository.findAll().stream()
                .max(Comparator.comparing(ElibroValidationRun::getCheckedAt))
                .orElseThrow();

        org.junit.jupiter.api.Assertions.assertEquals(ElibroValidationType.MANUAL, latestRun.getValidationType());
        org.junit.jupiter.api.Assertions.assertEquals(ElibroValidationRunStatus.FAILURE, latestRun.getStatus());
        org.junit.jupiter.api.Assertions.assertEquals(config.getId(), latestRun.getConfig().getId());
    }

    @Test
    void shouldExecuteControlledValidationUsingProvidedUserAndNextUrl() throws Exception {
        long before = validationRunRepository.count();

        mockMvc.perform(post("/api/v1/elibro/config/{configId}/validate-controlled", config.getId())
                        .with(auth(adminTi.getId().toString(), RoleConstants.ADMIN_TI))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(java.util.Map.of(
                                "testUser", "probe.student@utez.edu.mx",
                                "nextUrl", "https://elibro.net/es/lc/utez/inicio"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(config.getId().toString()))
                .andExpect(jsonPath("$.data.testUser").value("probe.student@utez.edu.mx"))
                .andExpect(jsonPath("$.data.nextUrl").value("https://elibro.net/es/lc/utez/inicio"))
                .andExpect(jsonPath("$.data.validationStatus").isNotEmpty())
                .andExpect(jsonPath("$.data.validationMessage").isNotEmpty());

        long after = validationRunRepository.count();
        org.junit.jupiter.api.Assertions.assertEquals(before + 1, after);
    }

    @Test
    void shouldListElibroConfigs() throws Exception {
        mockMvc.perform(get("/api/v1/elibro/config")
                        .with(auth(adminTi.getId().toString(), RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(config.getId().toString()));
    }

    @Test
    void shouldDeleteElibroConfig() throws Exception {
        mockMvc.perform(delete("/api/v1/elibro/config/{configId}", config.getId())
                        .with(auth(adminTi.getId().toString(), RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        org.junit.jupiter.api.Assertions.assertEquals(0, elibroConfigRepository.count());
    }

    @Test
    void shouldCreateNotificationWhenElibroConfigIsDeactivated() throws Exception {
        mockMvc.perform(patch("/api/v1/elibro/config/{configId}/deactivate", config.getId())
                        .with(auth(adminTi.getId().toString(), RoleConstants.ADMIN_TI))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(java.util.Map.of("reason", "Cambio operativo"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("INACTIVE"));

        org.junit.jupiter.api.Assertions.assertEquals(1, notificationRepository.count());
        Notification notification = notificationRepository.findAll().get(0);
        org.junit.jupiter.api.Assertions.assertEquals(NotificationType.AUDIT, notification.getType());
        org.junit.jupiter.api.Assertions.assertEquals(NotificationReferenceType.AUDIT_LOG, notification.getReferenceType());
        org.junit.jupiter.api.Assertions.assertEquals(adminTi.getId(), notification.getAdmin().getId());
    }

    private Admin saveAdmin(String email, AdminRole role) {
        Admin admin = new Admin();
        admin.setEmail(email);
        admin.setName("Admin");
        admin.setLastNamePaternal("Elibro");
        admin.setLastNameMaternal("Config");
        admin.setPasswordHash("$2a$10$123456789012345678901u2sNfJ0wYl8Bv0p5Wn4eC6zYkM8d8vS.");
        admin.setRole(role);
        admin.setStatus(AdminStatus.ACTIVE);
        return adminRepository.save(admin);
    }

    private ElibroConfig saveActiveConfig() {
        ElibroConfig cfg = new ElibroConfig();
        cfg.setName("Integración SSO eLibro UTEZ");
        cfg.setAuthTokenEncrypted(aes256CryptoService.encrypt("auth-token-001"));
        cfg.setChannelIdEncrypted(aes256CryptoService.encrypt("CH-UTEZ-001"));
        cfg.setChannelSecretEncrypted(aes256CryptoService.encrypt("channel-secret-001"));
        cfg.setChannelName("utez");
        cfg.setNextUrl("https://elibro.net/es/lc/utez/inicio");
        cfg.setStatus(ElibroConfigStatus.ACTIVE);
        cfg.setValidationStatus(ElibroValidationStatus.VALID);
        cfg.setValidationMessage("Configuración operativa válida.");
        cfg.setLastValidatedAt(Instant.now().minus(2, ChronoUnit.HOURS));
        cfg.setCreatedByAdmin(adminTi);
        cfg.setUpdatedByAdmin(adminTi);
        return elibroConfigRepository.save(cfg);
    }

    private void seedAccessLogs() {
        saveAccessLog(100L, Instant.now().minus(3, ChronoUnit.HOURS));
        saveAccessLog(200L, Instant.now().minus(1, ChronoUnit.HOURS));
    }

    private void saveAccessLog(long latencyMs, Instant occurredAt) {
        ElibroAccessLog log = new ElibroAccessLog();
        log.setAttemptedEmail("student@utez.edu.mx");
        log.setNormalizedEmail("student@utez.edu.mx");
        log.setResult(ElibroAccessResult.SUCCESS);
        log.setLatencyMs(latencyMs);
        log.setRequestId("req-" + occurredAt.toEpochMilli());
        log.setCorrelationId("corr-" + occurredAt.toEpochMilli());
        log.setIpAddressMasked("127.0.0.0");
        log.setIpAddressHash("hash-127.0.0.1");
        log.setUserAgentSanitized("JUnit");
        log.setChannelNameSnapshot("ELIBRO");
        log.setOccurredAt(occurredAt);
        accessLogRepository.save(log);
    }

    private void seedValidationRuns() {
        ElibroValidationRun scheduledSuccess = new ElibroValidationRun();
        scheduledSuccess.setConfig(config);
        scheduledSuccess.setExecutedByAdmin(adminTi);
        scheduledSuccess.setStatus(ElibroValidationRunStatus.SUCCESS);
        scheduledSuccess.setValidationType(ElibroValidationType.SCHEDULED);
        scheduledSuccess.setMessage("Sonda operativa exitosa");
        scheduledSuccess.setLatencyMs(120L);
        scheduledSuccess.setRequestId("sched-1");
        scheduledSuccess.setCorrelationId("sched-1");
        scheduledSuccess.setCheckedAt(Instant.now().minus(2, ChronoUnit.DAYS));

        ElibroValidationRun scheduledError = new ElibroValidationRun();
        scheduledError.setConfig(config);
        scheduledError.setExecutedByAdmin(adminTi);
        scheduledError.setStatus(ElibroValidationRunStatus.FAILURE);
        scheduledError.setValidationType(ElibroValidationType.SCHEDULED);
        scheduledError.setMessage("Sonda con timeout");
        scheduledError.setLatencyMs(800L);
        scheduledError.setErrorCode("TIMEOUT");
        scheduledError.setRequestId("sched-2");
        scheduledError.setCorrelationId("sched-2");
        scheduledError.setCheckedAt(Instant.now().minus(1, ChronoUnit.DAYS));

        validationRunRepository.saveAll(List.of(scheduledSuccess, scheduledError));
    }

    private void seedRecentAuditActivity() {
        saveAudit("ELIBRO_CONFIG_CREATE", AuditOutcome.SUCCESS, Instant.now().minus(8, ChronoUnit.HOURS));
        saveAudit("ELIBRO_CONFIG_UPDATE", AuditOutcome.SUCCESS, Instant.now().minus(6, ChronoUnit.HOURS));
        saveAudit("ELIBRO_CONFIG_VALIDATE", AuditOutcome.SUCCESS, Instant.now().minus(4, ChronoUnit.HOURS));
        saveAudit("ELIBRO_CONFIG_ACTIVATE", AuditOutcome.SUCCESS, Instant.now().minus(2, ChronoUnit.HOURS));
        saveAudit("ELIBRO_CONFIG_DEACTIVATE", AuditOutcome.SUCCESS, Instant.now().minus(1, ChronoUnit.HOURS));
    }

    private void saveAudit(String action, AuditOutcome outcome, Instant occurredAt) {
        AuditLog audit = new AuditLog();
        audit.setActorType(AuditActorType.ADMIN);
        audit.setActorAdmin(adminTi);
        audit.setActorReference(adminTi.getId().toString());
        audit.setAction(action);
        audit.setEntityType("ELIBRO_CONFIG");
        audit.setEntityId(config.getId().toString());
        audit.setOutcome(outcome);
        audit.setSeverity(AuditSeverity.INFO);
        audit.setMetadataJson("{}");
        audit.setRequestId("req-audit-" + occurredAt.toEpochMilli());
        audit.setCorrelationId("corr-audit-" + occurredAt.toEpochMilli());
        audit.setIpAddressMasked("127.0.0.0");
        audit.setIpAddressHash("hash-127.0.0.1");
        audit.setUserAgentSanitized("JUnit");
        audit.setOccurredAt(occurredAt);
        auditLogRepository.save(audit);
    }

    private RequestPostProcessor auth(String principal, String role) {
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                principal,
                null,
                List.of(new SimpleGrantedAuthority(role))
        );
        return SecurityMockMvcRequestPostProcessors.authentication(authentication);
    }
}
