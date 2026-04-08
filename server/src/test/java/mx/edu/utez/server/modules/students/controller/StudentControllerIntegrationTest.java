package mx.edu.utez.server.modules.students.controller;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.auth.repository.AdminPasswordResetTokenRepository;
import mx.edu.utez.server.modules.auth.repository.StudentPasswordResetTokenRepository;
import mx.edu.utez.server.modules.auth.service.StudentPasswordResetNotifier;
import mx.edu.utez.server.modules.careers.entity.Career;
import mx.edu.utez.server.modules.careers.repository.CareerRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroAccessLogRepository;
import mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository;
import mx.edu.utez.server.modules.notifications.entity.Notification;
import mx.edu.utez.server.modules.notifications.entity.NotificationReferenceType;
import mx.edu.utez.server.modules.notifications.entity.NotificationSeverity;
import mx.edu.utez.server.modules.notifications.entity.NotificationType;
import mx.edu.utez.server.modules.notifications.repository.NotificationPreferenceRepository;
import mx.edu.utez.server.modules.notifications.repository.NotificationRepository;
import mx.edu.utez.server.modules.students.repository.StudentAuthEventRepository;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.security.RoleConstants;
import mx.edu.utez.server.shared.api.ApiRoutes;
import mx.edu.utez.server.shared.enums.AdminRole;
import mx.edu.utez.server.shared.enums.AdminStatus;
import mx.edu.utez.server.shared.enums.CareerStatus;
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
class StudentControllerIntegrationTest {

    private static final String ADMIN_TI_EMAIL = "admin.ti@utez.edu.mx";
    private static final String ADMIN_NAME = "Admin";
    private static final String ADMIN_PASSWORD_HASH =
            "$2a$10$123456789012345678901u2sNfJ0wYl8Bv0p5Wn4eC6zYkM8d8vS.";

    private static final String CAREER_DSM_CODE = "DSM";
    private static final String CAREER_DSM_NAME = "Desarrollo de Software Multiplataforma";

    private static final String STUDENT_EMAIL = "alicia@utez.edu.mx";
    private static final String STUDENT_CREATE_PAYLOAD = """
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
            """;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private StudentAuthEventRepository studentAuthEventRepository;

    @Autowired
    private StudentPasswordResetTokenRepository studentPasswordResetTokenRepository;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private AdminPasswordResetTokenRepository adminPasswordResetTokenRepository;

    @Autowired
    private CareerRepository careerRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private ElibroAccessLogRepository elibroAccessLogRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private NotificationPreferenceRepository notificationPreferenceRepository;

    @MockitoBean
    private StudentPasswordResetNotifier studentPasswordResetNotifier;

    private Admin adminTi;

    @BeforeEach
    void setUp() {
        tearDown();
        adminTi = saveAdminTi();
        saveCareerDsm();
    }

    @AfterEach
    void tearDown() {
        notificationRepository.deleteAll();
        notificationPreferenceRepository.deleteAll();
        auditLogRepository.deleteAll();
        elibroAccessLogRepository.deleteAll();
        studentAuthEventRepository.deleteAll();
        studentPasswordResetTokenRepository.deleteAll();
        studentRepository.deleteAll();
        careerRepository.deleteAll();
        adminPasswordResetTokenRepository.deleteAll();
        adminRepository.deleteAll();
    }

    @Test
    void shouldCreateStudentWithCareerCodePayloadUsedByFrontend() throws Exception {
        when(studentPasswordResetNotifier.sendStudentOnboardingPasswordSetup(
                org.mockito.ArgumentMatchers.eq(STUDENT_EMAIL),
                org.mockito.ArgumentMatchers.anyString()
        )).thenReturn(true);

        mockMvc.perform(post(ApiRoutes.httpPath(ApiRoutes.STUDENTS))
                        .with(authAdminTi(adminTi))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(STUDENT_CREATE_PAYLOAD))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.status", is(201)))
                .andExpect(jsonPath("$.data.id", notNullValue()))
                .andExpect(jsonPath("$.data.career.code", is(CAREER_DSM_CODE)))
                .andExpect(jsonPath("$.data.mustChangePassword", is(true)))
                .andExpect(jsonPath("$.data.status", is("ACTIVE")));

        org.junit.jupiter.api.Assertions.assertEquals(1, auditLogRepository.count());
        org.junit.jupiter.api.Assertions.assertEquals(1, notificationRepository.count());

        Notification notification = notificationRepository.findAll().get(0);
        org.junit.jupiter.api.Assertions.assertEquals(adminTi.getId(), notification.getAdmin().getId());
        org.junit.jupiter.api.Assertions.assertEquals(NotificationType.AUDIT, notification.getType());
        org.junit.jupiter.api.Assertions.assertEquals(NotificationSeverity.INFO, notification.getSeverity());
        org.junit.jupiter.api.Assertions.assertEquals(NotificationReferenceType.AUDIT_LOG, notification.getReferenceType());
        org.junit.jupiter.api.Assertions.assertEquals(
                auditLogRepository.findAll().get(0).getId(),
                notification.getReferenceId()
        );
        org.junit.jupiter.api.Assertions.assertFalse(notification.isRead());
        org.junit.jupiter.api.Assertions.assertFalse(notification.isDismissed());
    }

    @Test
    void shouldReturnServiceUnavailableWhenOnboardingNotifierFails() throws Exception {
        when(studentPasswordResetNotifier.sendStudentOnboardingPasswordSetup(
                org.mockito.ArgumentMatchers.eq(STUDENT_EMAIL),
                org.mockito.ArgumentMatchers.anyString()
        )).thenReturn(false);

        mockMvc.perform(post(ApiRoutes.httpPath(ApiRoutes.STUDENTS))
                        .with(authAdminTi(adminTi))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(STUDENT_CREATE_PAYLOAD))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.errorCode", is("SERVICE_UNAVAILABLE")));
    }

    private RequestPostProcessor authAdminTi(Admin admin) {
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                admin.getId().toString(),
                null,
                List.of(new SimpleGrantedAuthority(RoleConstants.ADMIN_TI))
        );
        return authentication(authentication);
    }

    private Admin saveAdminTi() {
        Admin admin = new Admin();
        admin.setEmail(ADMIN_TI_EMAIL);
        admin.setName(ADMIN_NAME);
        admin.setLastNamePaternal(AdminRole.ADMIN_TI.name());
        admin.setPasswordHash(ADMIN_PASSWORD_HASH);
        admin.setRole(AdminRole.ADMIN_TI);
        admin.setStatus(AdminStatus.ACTIVE);
        return adminRepository.save(admin);
    }

    private void saveCareerDsm() {
        Career career = new Career();
        career.setCode(CAREER_DSM_CODE);
        career.setName(CAREER_DSM_NAME);
        career.setStatus(CareerStatus.ACTIVE);
        careerRepository.save(career);
    }
}
