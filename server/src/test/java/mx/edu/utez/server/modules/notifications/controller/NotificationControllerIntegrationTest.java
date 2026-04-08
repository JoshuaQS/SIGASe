package mx.edu.utez.server.modules.notifications.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.auth.repository.AdminAuthEventRepository;
import mx.edu.utez.server.modules.auth.repository.AdminPasswordResetTokenRepository;
import mx.edu.utez.server.modules.auth.repository.StudentPasswordResetTokenRepository;
import mx.edu.utez.server.modules.auth.service.StudentPasswordResetNotifier;
import mx.edu.utez.server.modules.careers.entity.Career;
import mx.edu.utez.server.modules.careers.repository.CareerRepository;
import mx.edu.utez.server.modules.elibro.entity.ElibroConfig;
import mx.edu.utez.server.modules.elibro.repository.ElibroAccessLogRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroConfigRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroValidationRunRepository;
import mx.edu.utez.server.modules.notifications.repository.NotificationPreferenceRepository;
import mx.edu.utez.server.modules.notifications.repository.NotificationRepository;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.repository.StudentAuthEventRepository;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.security.RoleConstants;
import mx.edu.utez.server.shared.api.ApiRoutes;
import mx.edu.utez.server.shared.crypto.Aes256CryptoService;
import mx.edu.utez.server.shared.enums.AdminRole;
import mx.edu.utez.server.shared.enums.AdminStatus;
import mx.edu.utez.server.shared.enums.CareerStatus;
import mx.edu.utez.server.shared.enums.ElibroConfigStatus;
import mx.edu.utez.server.shared.enums.ElibroValidationStatus;
import mx.edu.utez.server.shared.enums.Sex;
import mx.edu.utez.server.shared.enums.StudentStatus;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class NotificationControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private NotificationPreferenceRepository notificationPreferenceRepository;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private CareerRepository careerRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private StudentAuthEventRepository studentAuthEventRepository;

    @Autowired
    private StudentPasswordResetTokenRepository studentPasswordResetTokenRepository;

    @Autowired
    private AdminAuthEventRepository adminAuthEventRepository;

    @Autowired
    private AdminPasswordResetTokenRepository adminPasswordResetTokenRepository;

    @Autowired
    private ElibroAccessLogRepository elibroAccessLogRepository;

    @Autowired
    private ElibroConfigRepository elibroConfigRepository;

    @Autowired
    private ElibroValidationRunRepository elibroValidationRunRepository;

    @Autowired
    private mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository auditLogRepository;

    @Autowired
    private Aes256CryptoService aes256CryptoService;

    @MockitoBean
    private StudentPasswordResetNotifier studentPasswordResetNotifier;

    private Admin adminTi;
    private Career career;

    @BeforeEach
    void setUp() {
        tearDown();
        adminTi = saveAdmin("admin.ti+" + UUID.randomUUID() + "@utez.edu.mx", AdminRole.ADMIN_TI, AdminStatus.ACTIVE);
        career = saveCareer("DSM", "Desarrollo de Software Multiplataforma");
    }

    @AfterEach
    void tearDown() {
        notificationRepository.deleteAll();
        notificationPreferenceRepository.deleteAll();
        elibroAccessLogRepository.deleteAll();
        auditLogRepository.deleteAll();
        elibroValidationRunRepository.deleteAll();
        elibroConfigRepository.deleteAll();
        studentAuthEventRepository.deleteAll();
        studentPasswordResetTokenRepository.deleteAll();
        studentRepository.deleteAll();
        careerRepository.deleteAll();
        adminAuthEventRepository.deleteAll();
        adminPasswordResetTokenRepository.deleteAll();
    }

    @Test
    void shouldCreateStudentNotificationAndExposeItThroughNotificationsApi() throws Exception {
        when(studentPasswordResetNotifier.sendStudentOnboardingPasswordSetup(eq("alicia@utez.edu.mx"), anyString()))
                .thenReturn(true);

        mockMvc.perform(post(ApiRoutes.httpPath(ApiRoutes.STUDENTS))
                        .with(auth(adminTi, RoleConstants.ADMIN_TI))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "enrollmentId": "2026A0101",
                                  "name": "Alicia",
                                  "lastNamePaternal": "Ramirez",
                                  "lastNameMaternal": "Lopez",
                                  "sex": "FEMALE",
                                  "quarter": 4,
                                  "institutionalEmail": "alicia@utez.edu.mx",
                                  "careerCode": "DSM"
                                }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(get(ApiRoutes.httpPath(ApiRoutes.NOTIFICATIONS + "/unread-count"))
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.unreadCount", is(1)));

        mockMvc.perform(get(ApiRoutes.httpPath(ApiRoutes.NOTIFICATIONS))
                        .param("page", "0")
                        .param("size", "10")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].type", is("AUDIT")))
                .andExpect(jsonPath("$.data.content[0].referenceType", is("AUDIT_LOG")))
                .andExpect(jsonPath("$.data.content[0].title", is("Cambio en estudiantes")));
    }

    @Test
    void shouldCreateAccessFailureNotificationFromStudentPortalAttempt() throws Exception {
        Student student = saveStudent("26ELI001", "portal@utez.edu.mx", StudentStatus.ACTIVE);

        mockMvc.perform(post(ApiRoutes.httpPath(ApiRoutes.STUDENT_PORTAL + "/elibro-access"))
                        .with(authStudent(student))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"next":"https://elibro.net/es/lc/utez/inicio"}
                                """))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.errorCode", is("SERVICE_UNAVAILABLE")));

        mockMvc.perform(get(ApiRoutes.httpPath(ApiRoutes.NOTIFICATIONS))
                        .param("page", "0")
                        .param("size", "10")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].type", is("ACCESS")))
                .andExpect(jsonPath("$.data.content[0].severity", is("CRITICAL")))
                .andExpect(jsonPath("$.data.content[0].referenceType", is("ACCESS_LOG")));
    }

    @Test
    void shouldCreateAdminDeactivationNotification() throws Exception {
        Admin targetAdmin = saveAdmin("managed.admin+" + UUID.randomUUID() + "@utez.edu.mx", AdminRole.ADMIN_BIBLIOTECA, AdminStatus.ACTIVE);

        mockMvc.perform(patch(ApiRoutes.httpPath(ApiRoutes.ADMINS + "/{adminId}/deactivate"), targetAdmin.getId())
                        .with(auth(adminTi, RoleConstants.ADMIN_TI))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ReasonPayload("Operación de prueba"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("INACTIVE")));

        mockMvc.perform(get(ApiRoutes.httpPath(ApiRoutes.NOTIFICATIONS))
                        .param("page", "0")
                        .param("size", "10")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].type", is("AUDIT")))
                .andExpect(jsonPath("$.data.content[0].title", is("Cambio administrativo")));
    }

    @Test
    void shouldCreateElibroConfigUpdateNotification() throws Exception {
        ElibroConfig config = saveInactiveConfig("Config base");

        mockMvc.perform(put(ApiRoutes.httpPath(ApiRoutes.ELIBRO_CONFIG + "/{configId}"), config.getId())
                        .with(auth(adminTi, RoleConstants.ADMIN_TI))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "channelName": "utez-actualizado"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.channelName", is("utez-actualizado")));

        mockMvc.perform(get(ApiRoutes.httpPath(ApiRoutes.NOTIFICATIONS))
                        .param("page", "0")
                        .param("size", "10")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].type", is("AUDIT")))
                .andExpect(jsonPath("$.data.content[0].title", is("Cambio en configuración eLibro")));
    }

    @Test
    void shouldHonorNotificationPreferencesForStudentChanges() throws Exception {
        when(studentPasswordResetNotifier.sendStudentOnboardingPasswordSetup(eq("brenda@utez.edu.mx"), anyString()))
                .thenReturn(true);

        mockMvc.perform(get(ApiRoutes.httpPath(ApiRoutes.NOTIFICATIONS + "/preferences"))
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.notifyStudentChanges", is(true)));

        mockMvc.perform(put(ApiRoutes.httpPath(ApiRoutes.NOTIFICATIONS + "/preferences"))
                        .with(auth(adminTi, RoleConstants.ADMIN_TI))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "notifyCritical": true,
                                  "notifySecurity": true,
                                  "notifyAccessFailures": true,
                                  "notifyStudentChanges": false,
                                  "notifyConfigChanges": true,
                                  "notifyAdminChanges": true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.notifyStudentChanges", is(false)));

        mockMvc.perform(post(ApiRoutes.httpPath(ApiRoutes.STUDENTS))
                        .with(auth(adminTi, RoleConstants.ADMIN_TI))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "enrollmentId": "2026A0102",
                                  "name": "Brenda",
                                  "lastNamePaternal": "Lopez",
                                  "lastNameMaternal": "Perez",
                                  "sex": "FEMALE",
                                  "quarter": 4,
                                  "institutionalEmail": "brenda@utez.edu.mx",
                                  "careerCode": "DSM"
                                }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(get(ApiRoutes.httpPath(ApiRoutes.NOTIFICATIONS + "/unread-count"))
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.unreadCount", is(0)));
    }

    private RequestPostProcessor auth(Admin admin, String authority) {
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                admin.getId().toString(),
                null,
                List.of(new SimpleGrantedAuthority(authority))
        );
        return authentication(authentication);
    }

    private RequestPostProcessor authStudent(Student student) {
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                student.getId().toString(),
                null,
                List.of(new SimpleGrantedAuthority(RoleConstants.STUDENT))
        );
        return authentication(authentication);
    }

    private Admin saveAdmin(String email, AdminRole role, AdminStatus status) {
        Admin admin = new Admin();
        admin.setEmail(email);
        admin.setName("Admin");
        admin.setLastNamePaternal(role.name());
        admin.setPasswordHash("$2a$10$123456789012345678901u2sNfJ0wYl8Bv0p5Wn4eC6zYkM8d8vS.");
        admin.setRole(role);
        admin.setStatus(status);
        return adminRepository.save(admin);
    }

    private Career saveCareer(String code, String name) {
        Career saved = new Career();
        saved.setCode(code);
        saved.setName(name);
        saved.setStatus(CareerStatus.ACTIVE);
        return careerRepository.save(saved);
    }

    private Student saveStudent(String enrollmentId, String email, StudentStatus status) {
        Student student = new Student();
        student.setEnrollmentId(enrollmentId);
        student.setName("Portal");
        student.setLastNamePaternal("Student");
        student.setLastNameMaternal("Test");
        student.setSex(Sex.NON_BINARY);
        student.setQuarter(2);
        student.setInstitutionalEmail(email);
        student.setInstitutionalEmailNormalized(email);
        student.setCareer(career);
        student.setStatus(status);
        student.setCreatedByAdmin(adminTi);
        student.setUpdatedByAdmin(adminTi);
        student.setMustChangePassword(false);
        student.setPasswordHash("$2a$10$123456789012345678901u2sNfJ0wYl8Bv0p5Wn4eC6zYkM8d8vS.");
        return studentRepository.save(student);
    }

    private ElibroConfig saveInactiveConfig(String name) {
        ElibroConfig config = new ElibroConfig();
        config.setName(name);
        config.setAuthTokenEncrypted(aes256CryptoService.encrypt("auth-token"));
        config.setChannelIdEncrypted(aes256CryptoService.encrypt("channel-id"));
        config.setChannelSecretEncrypted(aes256CryptoService.encrypt("channel-secret"));
        config.setChannelName("utez");
        config.setNextUrl("https://elibro.net/es/lc/utez/inicio");
        config.setStatus(ElibroConfigStatus.INACTIVE);
        config.setValidationStatus(ElibroValidationStatus.NOT_VALIDATED);
        config.setCreatedByAdmin(adminTi);
        config.setUpdatedByAdmin(adminTi);
        return elibroConfigRepository.save(config);
    }

    private record ReasonPayload(String reason) {
    }
}
