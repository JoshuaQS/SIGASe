package mx.edu.utez.server.modules.admins.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.auth.repository.AdminPasswordResetTokenRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroAccessLogRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroConfigRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroValidationRunRepository;
import mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository;
import mx.edu.utez.server.modules.notifications.entity.Notification;
import mx.edu.utez.server.modules.notifications.entity.NotificationReferenceType;
import mx.edu.utez.server.modules.notifications.entity.NotificationType;
import mx.edu.utez.server.modules.notifications.repository.NotificationPreferenceRepository;
import mx.edu.utez.server.modules.notifications.repository.NotificationRepository;
import mx.edu.utez.server.modules.students.repository.StudentAuthEventRepository;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.security.RoleConstants;
import mx.edu.utez.server.shared.enums.AdminRole;
import mx.edu.utez.server.shared.enums.AdminStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class AdminManagementControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private StudentAuthEventRepository studentAuthEventRepository;

    @Autowired
    private ElibroAccessLogRepository accessLogRepository;

    @Autowired
    private ElibroConfigRepository elibroConfigRepository;

    @Autowired
    private ElibroValidationRunRepository validationRunRepository;

    @Autowired
    private AdminPasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private NotificationPreferenceRepository notificationPreferenceRepository;

    private Admin adminTi;
    private Admin adminBiblioteca;
    private Admin targetAdmin;

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
        passwordResetTokenRepository.deleteAll();
        adminRepository.deleteAll();

        adminTi = saveAdmin("admin.ti@utez.edu.mx", AdminRole.ADMIN_TI, AdminStatus.ACTIVE);
        adminBiblioteca = saveAdmin("admin.biblioteca@utez.edu.mx", AdminRole.ADMIN_BIBLIOTECA, AdminStatus.ACTIVE);
        targetAdmin = saveAdmin("managed.admin@utez.edu.mx", AdminRole.ADMIN_BIBLIOTECA, AdminStatus.INACTIVE);
        targetAdmin.setLastLoginAt(Instant.parse("2026-04-01T10:15:30Z"));
        targetAdmin.setFailedLoginAttempts(2);
        targetAdmin.setLockedUntil(Instant.parse("2026-04-01T12:00:00Z"));
        targetAdmin = adminRepository.save(targetAdmin);
    }

    @Test
    void shouldListAdminsWithStatusRoleFiltersPaginationAndSort() throws Exception {
        mockMvc.perform(get("/api/v1/admins")
                        .param("status", "INACTIVE")
                        .param("role", "ADMIN_BIBLIOTECA")
                        .param("q", "managed")
                        .param("page", "0")
                        .param("size", "10")
                        .param("sortBy", "email")
                        .param("sortDir", "asc")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.totalElements", is(1)))
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].id", is(targetAdmin.getId().toString())))
                .andExpect(jsonPath("$.data.content[0].status", is("INACTIVE")))
                .andExpect(jsonPath("$.data.content[0].failedLoginAttempts", is(2)));
    }

    @Test
    void shouldCreateAdminWithCreatedHttpStatus() throws Exception {
        String payload = """
                {
                  "email": "new.admin@utez.edu.mx",
                  "name": "Nuevo",
                  "lastNamePaternal": "Administrador",
                  "lastNameMaternal": "SIGASe",
                  "password": "Password123!",
                  "role": "ADMIN_BIBLIOTECA",
                  "status": "ACTIVE"
                }
                """;

        mockMvc.perform(post("/api/v1/admins")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload)
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isCreated())
                .andExpect(header().string("Content-Type", org.hamcrest.Matchers.containsString(MediaType.APPLICATION_JSON_VALUE)))
                .andExpect(jsonPath("$.status", is(201)))
                .andExpect(jsonPath("$.data.email", is("new.admin@utez.edu.mx")))
                .andExpect(jsonPath("$.data.status", is("ACTIVE")));
    }

    @Test
    void shouldRejectDuplicateEmailOnCreate() throws Exception {
        String payload = """
                {
                  "email": "managed.admin@utez.edu.mx",
                  "name": "Duplicado",
                  "lastNamePaternal": "Administrador",
                  "lastNameMaternal": null,
                  "password": "Password123!",
                  "role": "ADMIN_TI",
                  "status": "ACTIVE"
                }
                """;

        mockMvc.perform(post("/api/v1/admins")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload)
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode", is("BUSINESS_RULE_VIOLATION")));
    }

    @Test
    void shouldUpdateAdmin() throws Exception {
        String payload = """
                {
                  "email": "managed.updated@utez.edu.mx",
                  "name": "Admin",
                  "lastNamePaternal": "Actualizado",
                  "lastNameMaternal": "SIGASe",
                  "role": "ADMIN_TI"
                }
                """;

        mockMvc.perform(put("/api/v1/admins/{adminId}", targetAdmin.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload)
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email", is("managed.updated@utez.edu.mx")))
                .andExpect(jsonPath("$.data.role", is("ADMIN_TI")));
    }

    @Test
    void shouldRejectDuplicateEmailOnUpdate() throws Exception {
        String payload = """
                {
                  "email": "admin.ti@utez.edu.mx",
                  "name": "Admin",
                  "lastNamePaternal": "Actualizado",
                  "lastNameMaternal": "SIGASe",
                  "role": "ADMIN_TI"
                }
                """;

        mockMvc.perform(put("/api/v1/admins/{adminId}", targetAdmin.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload)
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode", is("BUSINESS_RULE_VIOLATION")));
    }

    @Test
    void shouldActivateAndDeactivateAdmin() throws Exception {
        String reasonPayload = objectMapper.writeValueAsString(new ReasonPayload("Operación de prueba"));

        mockMvc.perform(patch("/api/v1/admins/{adminId}/activate", targetAdmin.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reasonPayload)
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("ACTIVE")));

        mockMvc.perform(patch("/api/v1/admins/{adminId}/deactivate", targetAdmin.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reasonPayload)
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("INACTIVE")));
    }

    @Test
    void shouldCreateNotificationsWhenAdminIsDeactivated() throws Exception {
        targetAdmin.setStatus(AdminStatus.ACTIVE);
        targetAdmin = adminRepository.save(targetAdmin);

        String reasonPayload = objectMapper.writeValueAsString(new ReasonPayload("Operación de prueba"));

        mockMvc.perform(patch("/api/v1/admins/{adminId}/deactivate", targetAdmin.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reasonPayload)
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("INACTIVE")));

        org.junit.jupiter.api.Assertions.assertEquals(2, notificationRepository.count());
        var notifications = notificationRepository.findAll();
        var notifiedAdminIds = notifications.stream()
                .map(n -> n.getAdmin().getId())
                .collect(java.util.stream.Collectors.toSet());

        org.junit.jupiter.api.Assertions.assertTrue(notifiedAdminIds.contains(adminTi.getId()));
        org.junit.jupiter.api.Assertions.assertTrue(notifiedAdminIds.contains(adminBiblioteca.getId()));
        org.junit.jupiter.api.Assertions.assertFalse(notifiedAdminIds.contains(targetAdmin.getId()));

        Notification notification = notifications.get(0);
        org.junit.jupiter.api.Assertions.assertEquals(NotificationType.AUDIT, notification.getType());
        org.junit.jupiter.api.Assertions.assertEquals(NotificationReferenceType.AUDIT_LOG, notification.getReferenceType());
        org.junit.jupiter.api.Assertions.assertFalse(notification.isRead());
        org.junit.jupiter.api.Assertions.assertFalse(notification.isDismissed());
    }

    @Test
    void shouldRejectSelfDeactivation() throws Exception {
        String reasonPayload = objectMapper.writeValueAsString(new ReasonPayload("No permitido"));

        mockMvc.perform(patch("/api/v1/admins/{adminId}/deactivate", adminTi.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reasonPayload)
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode", is("BUSINESS_RULE_VIOLATION")));
    }

    @Test
    void shouldResetPasswordAndIncrementTokenVersion() throws Exception {
        int previousTokenVersion = targetAdmin.getTokenVersion();
        String payload = """
                {
                  "newPassword": "Password456!"
                }
                """;

        mockMvc.perform(post("/api/v1/admins/{adminId}/reset-password", targetAdmin.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload)
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)));

        Admin updated = adminRepository.findById(targetAdmin.getId()).orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals(previousTokenVersion + 1, updated.getTokenVersion());
        org.junit.jupiter.api.Assertions.assertEquals(0, updated.getFailedLoginAttempts());
        org.junit.jupiter.api.Assertions.assertNull(updated.getLockedUntil());
        org.junit.jupiter.api.Assertions.assertNotNull(updated.getPasswordHash());
    }

    @Test
    void shouldRejectAdminsEndpointsForAdminBiblioteca() throws Exception {
        mockMvc.perform(get("/api/v1/admins")
                        .with(auth(adminBiblioteca, RoleConstants.ADMIN_BIBLIOTECA)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode", is("FORBIDDEN")));
    }

    private RequestPostProcessor auth(Admin admin, String role) {
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                admin.getId().toString(),
                null,
                List.of(new SimpleGrantedAuthority(role))
        );
        return SecurityMockMvcRequestPostProcessors.authentication(authentication);
    }

    private Admin saveAdmin(String email, AdminRole role, AdminStatus status) {
        Admin admin = new Admin();
        admin.setEmail(email);
        admin.setName("Admin");
        admin.setLastNamePaternal(role.name());
        admin.setLastNameMaternal(null);
        admin.setPasswordHash("$2a$10$123456789012345678901u2sNfJ0wYl8Bv0p5Wn4eC6zYkM8d8vS.");
        admin.setRole(role);
        admin.setStatus(status);
        return adminRepository.save(admin);
    }

    private record ReasonPayload(String reason) {
    }
}
