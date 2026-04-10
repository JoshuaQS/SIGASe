package mx.edu.utez.server.modules.logs.audit.controller;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.auth.repository.AdminPasswordResetTokenRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroAccessLogRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroConfigRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroValidationRunRepository;

import mx.edu.utez.server.modules.logs.audit.entity.AuditLog;
import mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository;
import mx.edu.utez.server.modules.students.repository.StudentAuthEventRepository;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.security.RoleConstants;
import mx.edu.utez.server.shared.enums.AdminRole;
import mx.edu.utez.server.shared.enums.AdminStatus;
import mx.edu.utez.server.shared.enums.AuditActorType;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.AuditSeverity;
import mx.edu.utez.server.shared.enums.AuditSourceModule;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class AuditLogQueryControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private ElibroAccessLogRepository accessLogRepository;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private StudentAuthEventRepository studentAuthEventRepository;

    @Autowired
    private ElibroConfigRepository elibroConfigRepository;

    @Autowired
    private ElibroValidationRunRepository validationRunRepository;

    @Autowired
    private AdminPasswordResetTokenRepository passwordResetTokenRepository;

    private Admin adminTi;
    private Admin adminBiblioteca;
    private AuditLog firstLog;

    @BeforeEach
    void setUp() {
        accessLogRepository.deleteAll();
        auditLogRepository.deleteAll();
        validationRunRepository.deleteAll();
        elibroConfigRepository.deleteAll();
        studentAuthEventRepository.deleteAll();
        studentRepository.deleteAll();
        passwordResetTokenRepository.deleteAll();
        adminRepository.deleteAll();

        adminTi = saveAdmin("audit.ti@utez.edu.mx", AdminRole.ADMIN_TI);
        adminBiblioteca = saveAdmin("audit.biblio@utez.edu.mx", AdminRole.ADMIN_BIBLIOTECA);

        firstLog = saveAuditLog(
                adminTi,
                "ADMIN_CREATE",
                "ADMIN",
                AuditOutcome.SUCCESS,
                AuditSeverity.INFO,
                Instant.parse("2026-03-20T10:00:00Z"),
                "req-a-1",
                "corr-a-1"
        );
        saveAuditLog(
                adminBiblioteca,
                "STUDENT_UPDATE",
                "STUDENT",
                AuditOutcome.SUCCESS,
                AuditSeverity.INFO,
                Instant.parse("2026-03-22T10:00:00Z"),
                "req-a-3",
                "corr-a-3"
        );
    }

    @Test
    void shouldListAuditLogsWithFiltersPaginationAndSort() throws Exception {
        mockMvc.perform(get("/api/v1/audit-logs")
                        .param("actorType", "ADMIN")
                        .param("actorEmail", "audit.ti@utez.edu.mx")
                        .param("entityType", "ADMIN")
                        .param("page", "0")
                        .param("size", "1")
                        .param("sortBy", "occurredAt")
                        .param("sortDir", "asc")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].id").value(firstLog.getId().toString()))
                .andExpect(jsonPath("$.data.content[0].actorAdminEmail").value("audit.ti@utez.edu.mx"))
                .andExpect(jsonPath("$.data.content[0].sourceModule").value("ADMINS"))
                .andExpect(jsonPath("$.data.content[0].description").value("Evento ADMIN_CREATE de prueba"))
                .andExpect(jsonPath("$.data.content[0].httpMethod").value("POST"))
                .andExpect(jsonPath("$.data.content[0].endpoint").value("/api/v1/admins"))
                .andExpect(jsonPath("$.data.content[0].statusCode").value(201));
    }

    @Test
    void shouldGetAuditLogByIdForTiOnly() throws Exception {
        mockMvc.perform(get("/api/v1/audit-logs/{id}", firstLog.getId())
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(firstLog.getId().toString()));

        mockMvc.perform(get("/api/v1/audit-logs/{id}", firstLog.getId())
                        .with(auth(adminBiblioteca, RoleConstants.ADMIN_BIBLIOTECA)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
    }

    @Test
    void shouldRejectAuditEndpointsForNonTiRoles() throws Exception {
        mockMvc.perform(get("/api/v1/audit-logs")
                        .with(auth(adminBiblioteca, RoleConstants.ADMIN_BIBLIOTECA)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));

        mockMvc.perform(get("/api/v1/audit-logs")
                        .with(auth(adminTi, RoleConstants.STUDENT)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
    }

    @Test
    void shouldRejectInvalidSortByForAuditLogs() throws Exception {
        mockMvc.perform(get("/api/v1/audit-logs")
                        .param("sortBy", "passwordHash")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void shouldRejectInvalidAuditPaginationAndDateRange() throws Exception {
        mockMvc.perform(get("/api/v1/audit-logs")
                        .param("size", "201")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));

        mockMvc.perform(get("/api/v1/audit-logs")
                        .param("dateFrom", "2026-03-22T00:00:00Z")
                        .param("dateTo", "2026-03-20T00:00:00Z")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void shouldExportAuditLogsWithSameBodyFiltersViaPost() throws Exception {
        mockMvc.perform(post("/api/v1/audit-logs/export?format=csv")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "requestId": "req-a-1",
                                  "correlationId": "corr-a-1",
                                  "sortBy": "occurredAt",
                                  "sortDir": "asc"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(result -> {
                    String csv = result.getResponse().getContentAsString();
                    org.junit.jupiter.api.Assertions.assertTrue(csv.contains("req-a-1"));
                    org.junit.jupiter.api.Assertions.assertFalse(csv.contains("req-a-3"));
                });
    }

    private RequestPostProcessor auth(Admin admin, String role) {
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                admin.getId().toString(),
                null,
                List.of(new SimpleGrantedAuthority(role))
        );
        return SecurityMockMvcRequestPostProcessors.authentication(authentication);
    }

    private Admin saveAdmin(String email, AdminRole role) {
        Admin admin = new Admin();
        admin.setEmail(email);
        admin.setName("Audit Admin");
        admin.setLastNamePaternal(role.name());
        admin.setLastNameMaternal(null);
        admin.setPasswordHash("$2a$10$123456789012345678901u2sNfJ0wYl8Bv0p5Wn4eC6zYkM8d8vS.");
        admin.setRole(role);
        admin.setStatus(AdminStatus.ACTIVE);
        return adminRepository.save(admin);
    }

    private AuditLog saveAuditLog(
            Admin actorAdmin,
            String action,
            String entityType,
            AuditOutcome outcome,
            AuditSeverity severity,
            Instant occurredAt,
            String requestId,
            String correlationId
    ) {
        AuditLog log = new AuditLog();
        log.setActorType(AuditActorType.ADMIN);
        log.setActorAdmin(actorAdmin);
        log.setActorReference(actorAdmin.getId().toString());
        log.setAction(action);
        log.setEntityType(entityType);
        log.setEntityId(actorAdmin.getId().toString());
        log.setOutcome(outcome);
        log.setSeverity(severity);
        log.setMetadataJson("{\"source\":\"test\"}");
        log.setSourceModule(AuditSourceModule.ADMINS);
        log.setDescription("Evento " + action + " de prueba");
        log.setEntitySnapshotName("Audit Admin " + actorAdmin.getEmail());
        log.setTargetLabel(actorAdmin.getEmail());
        log.setHttpMethod("POST");
        log.setEndpoint("/api/v1/admins");
        log.setStatusCode(201);
        log.setRequestId(requestId);
        log.setCorrelationId(correlationId);
        log.setOccurredAt(occurredAt);
        return auditLogRepository.save(log);
    }
}
