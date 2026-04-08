package mx.edu.utez.server.modules.elibro.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.careers.entity.Career;
import mx.edu.utez.server.modules.careers.repository.CareerRepository;
import mx.edu.utez.server.modules.auth.repository.AdminAuthEventRepository;
import mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository;
import mx.edu.utez.server.modules.notifications.entity.Notification;
import mx.edu.utez.server.modules.notifications.entity.NotificationReferenceType;
import mx.edu.utez.server.modules.notifications.entity.NotificationSeverity;
import mx.edu.utez.server.modules.notifications.entity.NotificationType;
import mx.edu.utez.server.modules.notifications.repository.NotificationPreferenceRepository;
import mx.edu.utez.server.modules.notifications.repository.NotificationRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroAccessLogRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroConfigRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroValidationRunRepository;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.repository.StudentAuthEventRepository;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.shared.api.ApiRoutes;
import mx.edu.utez.server.shared.enums.AdminRole;
import mx.edu.utez.server.shared.enums.AdminStatus;
import mx.edu.utez.server.shared.enums.CareerStatus;
import mx.edu.utez.server.shared.enums.Sex;
import mx.edu.utez.server.shared.enums.StudentStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class StudentPortalElibroAccessLogIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private StudentAuthEventRepository studentAuthEventRepository;

    @Autowired
    private ElibroAccessLogRepository elibroAccessLogRepository;

    @Autowired
    private ElibroConfigRepository elibroConfigRepository;

    @Autowired
    private ElibroValidationRunRepository elibroValidationRunRepository;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private AdminAuthEventRepository adminAuthEventRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private CareerRepository careerRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private NotificationPreferenceRepository notificationPreferenceRepository;

    private Admin adminTi;

    @BeforeEach
    void setUp() {
        notificationRepository.deleteAll();
        notificationPreferenceRepository.deleteAll();
        elibroAccessLogRepository.deleteAll();
        elibroValidationRunRepository.deleteAll();
        elibroConfigRepository.deleteAll();
        auditLogRepository.deleteAll();
        studentAuthEventRepository.deleteAll();
        adminAuthEventRepository.deleteAll();
        studentRepository.deleteAll();
        careerRepository.deleteAll();

        Admin admin = new Admin();
        admin.setEmail("admin.ti+" + UUID.randomUUID() + "@utez.edu.mx");
        admin.setName("Admin");
        admin.setLastNamePaternal("TI");
        admin.setPasswordHash(passwordEncoder.encode("AdminPass.123"));
        admin.setRole(AdminRole.ADMIN_TI);
        admin.setStatus(AdminStatus.ACTIVE);
        adminTi = adminRepository.save(admin);

        Career career = new Career();
        career.setCode("SIS");
        career.setName("Sistemas");
        career.setStatus(CareerStatus.ACTIVE);
        career = careerRepository.save(career);

        Student student = new Student();
        student.setEnrollmentId("26ELI001");
        student.setName("Portal");
        student.setLastNamePaternal("Student");
        student.setLastNameMaternal("Test");
        student.setSex(Sex.NON_BINARY);
        student.setQuarter(2);
        student.setInstitutionalEmail("portal@utez.edu.mx");
        student.setInstitutionalEmailNormalized("portal@utez.edu.mx");
        student.setCareer(career);
        student.setStatus(StudentStatus.ACTIVE);
        student.setCreatedByAdmin(adminTi);
        student.setUpdatedByAdmin(adminTi);
        student.setPasswordHash(passwordEncoder.encode("password123"));
        student.setMustChangePassword(false);
        studentRepository.save(student);
    }

    @Test
    void shouldWriteElibroAccessLogWhenConfigIsMissing() throws Exception {
        String token = loginAndGetStudentToken();

        mockMvc.perform(post(ApiRoutes.httpPath(ApiRoutes.STUDENT_PORTAL + "/elibro-access"))
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("User-Agent", "SIGASe-Test-Agent/1.0")
                        .content("""
                                {"next":"https://elibro.net/es/lc/utez/inicio"}
                                """))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.errorCode").value("SERVICE_UNAVAILABLE"));

        var event = elibroAccessLogRepository.findAll().stream()
                .filter(item -> "FAILED_ELIBRO_CONFIG".equals(item.getResult().name()))
                .findFirst()
                .orElseThrow();
        assertEquals("FAILED_ELIBRO_CONFIG", event.getResult().name());
        assertNotNull(event.getRequestId());
        assertNotNull(event.getCorrelationId());
        assertNotNull(event.getIpAddressMasked());
        assertEquals("/api/v1/student/portal/elibro-access", event.getRequestPath());

        Notification notification = notificationRepository.findAll().stream()
                .filter(item -> item.getType() == NotificationType.ACCESS)
                .filter(item -> adminTi.getId().equals(item.getAdmin().getId()))
                .findFirst()
                .orElseThrow();
        assertEquals(NotificationType.ACCESS, notification.getType());
        assertEquals(NotificationSeverity.CRITICAL, notification.getSeverity());
        assertEquals(NotificationReferenceType.ACCESS_LOG, notification.getReferenceType());
        assertEquals(event.getId(), notification.getReferenceId());
        assertNotNull(notification.getAdmin());
        assertNotNull(notification.getAdmin().getId());
    }

    private String loginAndGetStudentToken() throws Exception {
        MvcResult result = mockMvc.perform(post(ApiRoutes.httpPath(ApiRoutes.AUTH_STUDENT_LOGIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"portal@utez.edu.mx","password":"password123"}
                                """))
                .andExpect(status().isOk())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString()).path("data").path("token").asText();
    }
}
