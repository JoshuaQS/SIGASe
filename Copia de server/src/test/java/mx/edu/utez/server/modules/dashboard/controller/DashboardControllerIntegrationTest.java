package mx.edu.utez.server.modules.dashboard.controller;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.auth.repository.AdminPasswordResetTokenRepository;
import mx.edu.utez.server.modules.careers.entity.Career;
import mx.edu.utez.server.modules.careers.repository.CareerRepository;
import mx.edu.utez.server.modules.elibro.entity.ElibroConfig;
import mx.edu.utez.server.modules.elibro.repository.ElibroConfigRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroValidationRunRepository;
import mx.edu.utez.server.modules.logs.access.entity.AccessLog;
import mx.edu.utez.server.modules.logs.access.repository.AccessLogRepository;
import mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.security.RoleConstants;
import mx.edu.utez.server.shared.enums.AccessResult;
import mx.edu.utez.server.shared.enums.AdminRole;
import mx.edu.utez.server.shared.enums.ElibroValidationStatus;
import mx.edu.utez.server.shared.enums.Sex;
import mx.edu.utez.server.shared.enums.StudentStatus;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

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
@ActiveProfiles("test")
class DashboardControllerIntegrationTest {

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
    private ElibroValidationRunRepository validationRunRepository;

    @Autowired
    private AdminPasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private CareerRepository careerRepository;

    private Admin adminTi;
    private Admin adminBiblioteca;
    private Student studentOne;
    private Student studentTwo;
    private Student studentThree;

    @BeforeEach
    void setUp() {
        accessLogRepository.deleteAll();
        auditLogRepository.deleteAll();
        validationRunRepository.deleteAll();
        elibroConfigRepository.deleteAll();
        studentRepository.deleteAll();
        careerRepository.deleteAll();
        passwordResetTokenRepository.deleteAll();
        adminRepository.deleteAll();

        adminTi = saveAdmin("dashboard.ti@utez.edu.mx", AdminRole.ADMIN_TI);
        adminBiblioteca = saveAdmin("dashboard.biblioteca@utez.edu.mx", AdminRole.ADMIN_BIBLIOTECA);

        Career sistemas = saveCareer("SIS", "Sistemas");
        Career industrial = saveCareer("IND", "Industrial");
        studentOne = saveStudent("2026D001", "one@utez.edu.mx", sistemas, StudentStatus.ACTIVE);
        studentTwo = saveStudent("2026D002", "two@utez.edu.mx", sistemas, StudentStatus.INACTIVE);
        studentThree = saveStudent("2026D003", "three@utez.edu.mx", industrial, StudentStatus.ACTIVE);

        saveElibroConfig();
        seedAccessLogs();
    }

    @Test
    void shouldReturnDashboardSummaryWithExpectedKpis() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard/summary")
                        .param("dateFrom", "2026-03-20T00:00:00Z")
                        .param("dateTo", "2026-03-22T23:59:59Z")
                        .param("careerCode", "SIS")
                        .with(auth(adminTi.getId().toString(), RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalStudents").value(2))
                .andExpect(jsonPath("$.data.activeStudents").value(1))
                .andExpect(jsonPath("$.data.inactiveStudents").value(1))
                .andExpect(jsonPath("$.data.successfulAccessesInRange").value(3))
                .andExpect(jsonPath("$.data.failedAccessesInRange").value(1))
                .andExpect(jsonPath("$.data.successRate").value(75.0))
                .andExpect(jsonPath("$.data.uniqueStudentsWithSuccessfulAccess").value(2))
                .andExpect(jsonPath("$.data.currentElibroConfigStatus").value("ACTIVE_VALID"));
    }

    @Test
    void shouldReturnAccessTrendsByDay() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard/access-trends")
                        .param("dateFrom", "2026-03-20T00:00:00Z")
                        .param("dateTo", "2026-03-22T23:59:59Z")
                        .param("careerCode", "SIS")
                        .with(auth(adminTi.getId().toString(), RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.points.length()").value(3))
                .andExpect(jsonPath("$.data.points[0].day").value("2026-03-20"))
                .andExpect(jsonPath("$.data.points[0].successful").value(2))
                .andExpect(jsonPath("$.data.points[0].failed").value(0))
                .andExpect(jsonPath("$.data.points[1].day").value("2026-03-21"))
                .andExpect(jsonPath("$.data.points[1].successful").value(1))
                .andExpect(jsonPath("$.data.points[1].failed").value(1))
                .andExpect(jsonPath("$.data.points[2].day").value("2026-03-22"))
                .andExpect(jsonPath("$.data.points[2].successful").value(0))
                .andExpect(jsonPath("$.data.points[2].failed").value(0));
    }

    @Test
    void shouldReturnTopStudentsAndAllowBibliotecaRole() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard/top-students")
                        .param("dateFrom", "2026-03-20T00:00:00Z")
                        .param("dateTo", "2026-03-22T23:59:59Z")
                        .param("careerCode", "SIS")
                        .param("limit", "2")
                        .param("sortDir", "desc")
                        .with(auth(adminBiblioteca.getId().toString(), RoleConstants.ADMIN_BIBLIOTECA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.students.length()").value(2))
                .andExpect(jsonPath("$.data.students[0].enrollmentId").value("2026D001"))
                .andExpect(jsonPath("$.data.students[0].successfulAccesses").value(2))
                .andExpect(jsonPath("$.data.students[1].enrollmentId").value("2026D002"))
                .andExpect(jsonPath("$.data.students[1].successfulAccesses").value(1));
    }

    @Test
    void shouldRejectDashboardForStudentRole() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard/summary")
                        .with(auth(adminTi.getId().toString(), RoleConstants.STUDENT)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
    }

    @Test
    void shouldRejectInvalidDashboardParams() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard/summary")
                        .param("dateFrom", "2026-03-20T00:00:00Z")
                        .with(auth(adminTi.getId().toString(), RoleConstants.ADMIN_TI)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));

        mockMvc.perform(get("/api/v1/dashboard/access-trends")
                        .param("dateFrom", "2024-01-01T00:00:00Z")
                        .param("dateTo", "2026-03-22T23:59:59Z")
                        .with(auth(adminTi.getId().toString(), RoleConstants.ADMIN_TI)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));

        mockMvc.perform(get("/api/v1/dashboard/top-students")
                        .param("dateFrom", "2026-03-20T00:00:00Z")
                        .param("dateTo", "2026-03-22T23:59:59Z")
                        .param("limit", "51")
                        .with(auth(adminTi.getId().toString(), RoleConstants.ADMIN_TI)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));

        mockMvc.perform(get("/api/v1/dashboard/top-students")
                        .param("dateFrom", "2026-03-20T00:00:00Z")
                        .param("dateTo", "2026-03-22T23:59:59Z")
                        .param("result", "FAILED_ELIBRO_API")
                        .with(auth(adminTi.getId().toString(), RoleConstants.ADMIN_TI)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    private void seedAccessLogs() {
        saveAccessLog(studentOne, AccessResult.SUCCESS, "2026-03-20T10:00:00Z");
        saveAccessLog(studentTwo, AccessResult.SUCCESS, "2026-03-20T11:00:00Z");
        saveAccessLog(studentOne, AccessResult.SUCCESS, "2026-03-21T09:00:00Z");
        saveAccessLog(studentOne, AccessResult.FAILED_ELIBRO_API, "2026-03-21T10:00:00Z");
        saveAccessLog(studentThree, AccessResult.SUCCESS, "2026-03-22T08:00:00Z");
        saveAccessLog(null, AccessResult.FAILED_INVALID_GOOGLE_TOKEN, "2026-03-22T09:00:00Z");
        saveAccessLog(studentOne, AccessResult.SUCCESS, "2026-03-10T09:00:00Z");
    }

    private void saveElibroConfig() {
        ElibroConfig config = new ElibroConfig();
        config.setName("Configuración Dashboard eLibro");
        config.setAuthTokenEncrypted("enc-token");
        config.setChannelIdEncrypted("enc-channel-id");
        config.setChannelSecretEncrypted("enc-channel-secret");
        config.setChannelName("UTEZ");
        config.setAuthEndpoint("https://auth.elibro.net/auth/sso/");
        config.setActive(true);
        config.setValidationStatus(ElibroValidationStatus.VALID);
        config.setValidationMessage("ok");
        config.setLastValidatedAt(Instant.parse("2026-03-19T00:00:00Z"));
        config.setCreatedByAdmin(adminTi);
        config.setUpdatedByAdmin(adminTi);
        elibroConfigRepository.save(config);
    }

    private Admin saveAdmin(String email, AdminRole role) {
        Admin admin = new Admin();
        admin.setEmail(email);
        admin.setName("Dashboard Admin");
        admin.setLastNamePaternal(role.name());
        admin.setLastNameMaternal(null);
        admin.setPasswordHash("$2a$10$123456789012345678901u2sNfJ0wYl8Bv0p5Wn4eC6zYkM8d8vS.");
        admin.setRole(role);
        admin.setActive(true);
        return adminRepository.save(admin);
    }

    private Student saveStudent(String matricula, String email, Career career, StudentStatus status) {
        Student student = new Student();
        student.setEnrollmentId(matricula);
        student.setName("Student");
        student.setLastNamePaternal("Dashboard");
        student.setLastNameMaternal("Kpi");
        student.setSex(Sex.NON_BINARY);
        student.setQuarter(4);
        student.setInstitutionalEmail(email);
        student.setInstitutionalEmailNormalized(email);
        student.setCareer(career);
        student.setStatus(status);
        student.setCreatedByAdmin(adminTi);
        student.setUpdatedByAdmin(adminTi);
        return studentRepository.save(student);
    }

    private Career saveCareer(String code, String name) {
        Career career = new Career();
        career.setCode(code);
        career.setName(name);
        career.setActive(true);
        return careerRepository.save(career);
    }

    private void saveAccessLog(Student student, AccessResult result, String occurredAt) {
        AccessLog log = new AccessLog();
        log.setStudent(student);
        log.setAttemptedEmail(student == null ? "unknown@utez.edu.mx" : student.getInstitutionalEmail());
        log.setNormalizedEmail(student == null ? "unknown@utez.edu.mx" : student.getInstitutionalEmailNormalized());
        log.setResult(result);
        log.setErrorCode(result == AccessResult.SUCCESS ? null : "ERR");
        log.setErrorDetail(result == AccessResult.SUCCESS ? null : "detail");
        log.setLatencyMs(90L);
        log.setRequestId("req-" + result.name() + "-" + occurredAt);
        log.setCorrelationId("corr-" + result.name() + "-" + occurredAt);
        log.setIpAddress("127.0.0.1");
        log.setUserAgent("JUnit");
        log.setProviderName(result == AccessResult.SUCCESS ? "ELIBRO" : null);
        log.setOccurredAt(Instant.parse(occurredAt));
        accessLogRepository.save(log);
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
