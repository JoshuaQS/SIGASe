package mx.edu.utez.server.modules.elibro.controller;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.auth.repository.AdminPasswordResetTokenRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroConfigRepository;
import mx.edu.utez.server.modules.logs.access.entity.AccessLog;
import mx.edu.utez.server.modules.logs.access.repository.AccessLogRepository;
import mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.security.RoleConstants;
import mx.edu.utez.server.shared.enums.AccessResult;
import mx.edu.utez.server.shared.enums.AdminRole;
import mx.edu.utez.server.shared.enums.Sex;
import mx.edu.utez.server.shared.enums.StudentStatus;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class StudentPortalSummaryIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AccessLogRepository accessLogRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private ElibroConfigRepository elibroConfigRepository;

    @Autowired
    private AdminPasswordResetTokenRepository passwordResetTokenRepository;

    private Admin adminTi;
    private Student activeStudent;
    private Student inactiveStudent;
    private Instant latestSuccess;

    @BeforeEach
    void setUp() {
        accessLogRepository.deleteAll();
        auditLogRepository.deleteAll();
        elibroConfigRepository.deleteAll();
        studentRepository.deleteAll();
        passwordResetTokenRepository.deleteAll();
        adminRepository.deleteAll();

        adminTi = saveAdmin("summary.admin@utez.edu.mx", AdminRole.ADMIN_TI);
        activeStudent = saveStudent("2026A2001", "student.active@utez.edu.mx", StudentStatus.ACTIVE);
        inactiveStudent = saveStudent("2026A2002", "student.inactive@utez.edu.mx", StudentStatus.INACTIVE);

        Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        latestSuccess = now.minus(1, ChronoUnit.DAYS);

        saveAccessLog(activeStudent, AccessResult.SUCCESS, latestSuccess);
        saveAccessLog(activeStudent, AccessResult.SUCCESS, now.minus(2, ChronoUnit.DAYS));
        saveAccessLog(activeStudent, AccessResult.SUCCESS, now.minus(4, ChronoUnit.DAYS));
        saveAccessLog(activeStudent, AccessResult.FAILED_ELIBRO_API, now.minus(1, ChronoUnit.DAYS));
        saveAccessLog(activeStudent, AccessResult.FAILED_NEXT_URL_VALIDATION, now.minus(6, ChronoUnit.DAYS));
        saveAccessLog(activeStudent, AccessResult.SUCCESS, now.minus(10, ChronoUnit.DAYS));
    }

    @Test
    void shouldReturnSummaryUsingAccessLogsAsSourceOfTruth() throws Exception {
        mockMvc.perform(get("/api/v1/student/portal/summary")
                        .with(auth(activeStudent.getId().toString(), RoleConstants.STUDENT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.personalInfo.enrollmentNumber").value(activeStudent.getEnrollmentNumber()))
                .andExpect(jsonPath("$.data.personalInfo.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.accountStatus.active").value(true))
                .andExpect(jsonPath("$.data.accessMetrics.accesosUltimos7Dias").value(3))
                .andExpect(jsonPath("$.data.accessMetrics.intentosFallidos7Dias").value(2))
                .andExpect(jsonPath("$.data.accessMetrics.ultimaFechaAcceso").value(latestSuccess.toString()))
                .andExpect(jsonPath("$.data.accessMetrics.rachaDiasConAcceso").value(2))
                .andExpect(jsonPath("$.data.cta.enabled").value(true));
    }

    @Test
    void shouldReturnZeroMetricsWhenStudentHasNoLogs() throws Exception {
        Student noLogsStudent = saveStudent("2026A2003", "student.nologs@utez.edu.mx", StudentStatus.ACTIVE);

        mockMvc.perform(get("/api/v1/student/portal/summary")
                        .with(auth(noLogsStudent.getId().toString(), RoleConstants.STUDENT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessMetrics.accesosUltimos7Dias").value(0))
                .andExpect(jsonPath("$.data.accessMetrics.intentosFallidos7Dias").value(0))
                .andExpect(jsonPath("$.data.accessMetrics.ultimaFechaAcceso").isEmpty())
                .andExpect(jsonPath("$.data.accessMetrics.rachaDiasConAcceso").value(0));
    }

    @Test
    void shouldDisableCtaWhenStudentIsInactive() throws Exception {
        mockMvc.perform(get("/api/v1/student/portal/summary")
                        .with(auth(inactiveStudent.getId().toString(), RoleConstants.STUDENT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.personalInfo.status").value("INACTIVE"))
                .andExpect(jsonPath("$.data.accountStatus.active").value(false))
                .andExpect(jsonPath("$.data.accountStatus.message").value("Tu cuenta está inactiva. Contacta al administrador de biblioteca."))
                .andExpect(jsonPath("$.data.cta.enabled").value(false))
                .andExpect(jsonPath("$.data.cta.reason").value("STUDENT_INACTIVE"));
    }

    @Test
    void shouldRejectSummaryForNonStudentRole() throws Exception {
        mockMvc.perform(get("/api/v1/student/portal/summary")
                        .with(auth(activeStudent.getId().toString(), RoleConstants.ADMIN_TI)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
    }

    private RequestPostProcessor auth(String principal, String role) {
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                principal,
                null,
                List.of(new SimpleGrantedAuthority(role))
        );
        return SecurityMockMvcRequestPostProcessors.authentication(authentication);
    }

    private Admin saveAdmin(String email, AdminRole role) {
        Admin admin = new Admin();
        admin.setEmail(email);
        admin.setName("Summary Admin");
        admin.setLastNamePaternal("Test");
        admin.setLastNameMaternal(null);
        admin.setPasswordHash("$2a$10$123456789012345678901u2sNfJ0wYl8Bv0p5Wn4eC6zYkM8d8vS.");
        admin.setRole(role);
        admin.setActive(true);
        return adminRepository.save(admin);
    }

    private Student saveStudent(String matricula, String email, StudentStatus status) {
        Student student = new Student();
        student.setEnrollmentNumber(matricula);
        student.setName("Student");
        student.setLastNamePaternal("Portal");
        student.setLastNameMaternal("Summary");
        student.setSex(Sex.NOT_SPECIFIED);
        student.setQuarter(4);
        student.setInstitutionalEmail(email);
        student.setInstitutionalEmailNormalized(email);
        student.setCareer("Tecnologias");
        student.setStatus(status);
        student.setCreatedByAdmin(adminTi);
        student.setUpdatedByAdmin(adminTi);
        return studentRepository.save(student);
    }

    private void saveAccessLog(Student student, AccessResult result, Instant occurredAt) {
        AccessLog accessLog = new AccessLog();
        accessLog.setStudent(student);
        accessLog.setAttemptedEmail(student.getInstitutionalEmail());
        accessLog.setNormalizedEmail(student.getInstitutionalEmailNormalized());
        accessLog.setResult(result);
        accessLog.setLatencyMs(100L);
        accessLog.setRequestId("req-" + result.name() + "-" + occurredAt.toEpochMilli());
        accessLog.setCorrelationId("corr-" + result.name() + "-" + occurredAt.toEpochMilli());
        accessLog.setIpAddress("127.0.0.1");
        accessLog.setUserAgent("JUnit");
        accessLog.setProviderName(result == AccessResult.SUCCESS ? "ELIBRO" : null);
        accessLog.setOccurredAt(occurredAt);
        accessLogRepository.save(accessLog);
    }
}
