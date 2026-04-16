package mx.edu.utez.server.modules.students.controller;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import mx.edu.utez.server.modules.elibro.entity.ElibroAccessLog;
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
import mx.edu.utez.server.shared.enums.ElibroAccessResult;
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

    private static final String STUDENT_EMAIL = "2026a01010@utez.edu.mx";
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
    private Career careerDsm;

    @BeforeEach
    void setUp() {
        tearDown();
        adminTi = saveAdminTi();
        careerDsm = saveCareerDsm();
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
                .content(studentCreatePayload()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.status", is(201)))
                .andExpect(jsonPath("$.data.id", notNullValue()))
                .andExpect(jsonPath("$.data.career.code", is(CAREER_DSM_CODE)))
                .andExpect(jsonPath("$.data.mustChangePassword", is(true)))
                .andExpect(jsonPath("$.data.status", is("PENDING")));

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
                .content(studentCreatePayload()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)));
    }

    @Test
    void shouldReturnRealStudentMetricsWithoutUsingPagination() throws Exception {
        Career career = careerRepository.findByCodeIgnoreCase(CAREER_DSM_CODE).orElseThrow();
        var activeStudent = saveStudent("2026A0102", "activa@utez.edu.mx", career, mx.edu.utez.server.shared.enums.StudentStatus.ACTIVE);
        var inactiveStudent = saveStudent("2026A0103", "inactiva@utez.edu.mx", career, mx.edu.utez.server.shared.enums.StudentStatus.INACTIVE);

        saveAccessLog(activeStudent, ElibroAccessResult.SUCCESS, "2026-04-01T10:00:00Z");
        saveAccessLog(activeStudent, ElibroAccessResult.FAILED_ELIBRO_API, "2026-04-01T12:00:00Z");
        saveAccessLog(inactiveStudent, ElibroAccessResult.SUCCESS, "2026-04-02T08:00:00Z");

        mockMvc.perform(get(ApiRoutes.httpPath(ApiRoutes.STUDENTS) + "/metrics")
                        .param("dateFrom", "2026-04-01T00:00:00Z")
                        .param("dateTo", "2026-04-02T23:59:59Z")
                        .with(authAdminTi(adminTi)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalStudents", is(2)))
                .andExpect(jsonPath("$.data.activeStudents", is(1)))
                .andExpect(jsonPath("$.data.disabledStudents", is(1)))
                .andExpect(jsonPath("$.data.totalAccesses", is(3)))
                .andExpect(jsonPath("$.data.successfulAccesses", is(2)))
                .andExpect(jsonPath("$.data.failedAccesses", is(1)))
                .andExpect(jsonPath("$.data.successRate", is(66.67)))
                .andExpect(jsonPath("$.data.activityByDate.length()", is(2)))
                .andExpect(jsonPath("$.data.activityByDate[0].date", is("2026-04-01")))
                .andExpect(jsonPath("$.data.activityByDate[0].total", is(2)))
                .andExpect(jsonPath("$.data.activityByDate[1].date", is("2026-04-02")))
                .andExpect(jsonPath("$.data.activityByDate[1].total", is(1)));
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

    private Career saveCareerDsm() {
        Career career = new Career();
        career.setCode(CAREER_DSM_CODE);
        career.setName(CAREER_DSM_NAME);
        career.setStatus(CareerStatus.ACTIVE);
        return careerRepository.save(career);
    }

    private String studentCreatePayload() {
        return """
                {
                  "enrollmentId": "2026A01010",
                  "name": "Alicia",
                  "lastNamePaternal": "Ramirez",
                  "lastNameMaternal": "Lopez",
                  "sex": "FEMALE",
                  "quarter": 4,
                  "institutionalEmail": "2026a01010@utez.edu.mx",
                  "careerId": "%s"
                }
                """.formatted(careerDsm.getId());
    }

    private mx.edu.utez.server.modules.students.entity.Student saveStudent(
            String enrollmentId,
            String email,
            Career career,
            mx.edu.utez.server.shared.enums.StudentStatus status
    ) {
        var student = new mx.edu.utez.server.modules.students.entity.Student();
        student.setEnrollmentId(enrollmentId);
        student.setName("Alumno");
        student.setLastNamePaternal("Prueba");
        student.setLastNameMaternal("Metrics");
        student.setSex(mx.edu.utez.server.shared.enums.Sex.FEMALE);
        student.setQuarter(4);
        student.setInstitutionalEmail(email);
        student.setInstitutionalEmailNormalized(email);
        student.setCareer(career);
        student.setStatus(status);
        student.setCreatedByAdmin(adminTi);
        student.setUpdatedByAdmin(adminTi);
        return studentRepository.save(student);
    }

    private void saveAccessLog(
            mx.edu.utez.server.modules.students.entity.Student student,
            ElibroAccessResult result,
            String occurredAt
    ) {
        ElibroAccessLog log = new ElibroAccessLog();
        log.setStudent(student);
        log.setResult(result);
        log.setRequestId("req-" + occurredAt);
        log.setCorrelationId("corr-" + occurredAt);
        log.setOccurredAt(java.time.Instant.parse(occurredAt));
        elibroAccessLogRepository.save(log);
    }
}
