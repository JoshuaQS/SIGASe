package mx.edu.utez.server.modules.elibro.controller;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.auth.repository.AdminPasswordResetTokenRepository;
import mx.edu.utez.server.modules.careers.entity.Career;
import mx.edu.utez.server.modules.careers.repository.CareerRepository;
import mx.edu.utez.server.modules.elibro.entity.ElibroAccessLog;
import mx.edu.utez.server.modules.elibro.repository.ElibroAccessLogRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroConfigRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroValidationRunRepository;
import mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.repository.StudentAuthEventRepository;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.security.RoleConstants;
import mx.edu.utez.server.shared.enums.AdminRole;
import mx.edu.utez.server.shared.enums.AdminStatus;
import mx.edu.utez.server.shared.enums.CareerStatus;
import mx.edu.utez.server.shared.enums.ElibroAccessResult;
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
@ActiveProfiles("test")
@AutoConfigureMockMvc
class StudentPortalSummaryIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ElibroAccessLogRepository accessLogRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private StudentAuthEventRepository studentAuthEventRepository;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private ElibroConfigRepository elibroConfigRepository;

    @Autowired
    private ElibroValidationRunRepository validationRunRepository;

    @Autowired
    private CareerRepository careerRepository;

    @Autowired
    private AdminPasswordResetTokenRepository passwordResetTokenRepository;

    private Admin adminTi;
    private Student activeStudent;
    private Student inactiveStudent;
    private Instant latestSuccess;
    private Career tecnologias;

    @BeforeEach
    void setUp() {
        accessLogRepository.deleteAll();
        auditLogRepository.deleteAll();
        validationRunRepository.deleteAll();
        elibroConfigRepository.deleteAll();
        studentAuthEventRepository.deleteAll();
        studentRepository.deleteAll();
        careerRepository.deleteAll();
        passwordResetTokenRepository.deleteAll();
        adminRepository.deleteAll();

        adminTi = saveAdmin("summary.admin@utez.edu.mx", AdminRole.ADMIN_TI);
        tecnologias = saveCareer("TEC", "Tecnologias");
        activeStudent = saveStudent("2026A2001", "student.active@utez.edu.mx", StudentStatus.ACTIVE, tecnologias);
        inactiveStudent = saveStudent("2026A2002", "student.inactive@utez.edu.mx", StudentStatus.INACTIVE, tecnologias);

        Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        latestSuccess = now.minus(1, ChronoUnit.DAYS);

        saveAccessLog(activeStudent, ElibroAccessResult.SUCCESS, latestSuccess);
        saveAccessLog(activeStudent, ElibroAccessResult.SUCCESS, now.minus(2, ChronoUnit.DAYS));
        saveAccessLog(activeStudent, ElibroAccessResult.SUCCESS, now.minus(4, ChronoUnit.DAYS));
        saveAccessLog(activeStudent, ElibroAccessResult.FAILED_ELIBRO_API, now.minus(1, ChronoUnit.DAYS));
        saveAccessLog(activeStudent, ElibroAccessResult.FAILED_NEXT_URL_VALIDATION, now.minus(6, ChronoUnit.DAYS));
        saveAccessLog(activeStudent, ElibroAccessResult.SUCCESS, now.minus(10, ChronoUnit.DAYS));
        saveAccessLog(activeStudent, ElibroAccessResult.SUCCESS, now.minus(3, ChronoUnit.DAYS), null);
    }

    @Test
    void shouldReturnSummaryUsingAccessLogsAsSourceOfTruth() throws Exception {
        mockMvc.perform(get("/api/v1/student/portal/summary")
                        .with(auth(activeStudent.getId().toString(), RoleConstants.STUDENT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.personalInfo.enrollmentId").value(activeStudent.getEnrollmentId()))
                .andExpect(jsonPath("$.data.personalInfo.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.accountStatus.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.accountStatus.message").isEmpty())
                .andExpect(jsonPath("$.data.accessMetrics.accesosUltimos7Dias").value(4))
                .andExpect(jsonPath("$.data.accessMetrics.intentosFallidos7Dias").value(2))
                .andExpect(jsonPath("$.data.accessMetrics.ultimaFechaAcceso").value(latestSuccess.toString()))
                .andExpect(jsonPath("$.data.accessMetrics.rachaDiasConAcceso").value(4))
                .andExpect(jsonPath("$.data.cta.enabled").value(true));
    }

    @Test
    void shouldReturnZeroMetricsWhenStudentHasNoLogs() throws Exception {
        Student noLogsStudent = saveStudent("2026A2003", "student.nologs@utez.edu.mx", StudentStatus.ACTIVE, tecnologias);

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
                .andExpect(jsonPath("$.data.accountStatus.status").value("INACTIVE"))
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
        admin.setStatus(AdminStatus.ACTIVE);
        return adminRepository.save(admin);
    }

    private Student saveStudent(String matricula, String email, StudentStatus status, Career career) {
        Student student = new Student();
        student.setEnrollmentId(matricula);
        student.setName("Student");
        student.setLastNamePaternal("Portal");
        student.setLastNameMaternal("Summary");
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
        career.setStatus(CareerStatus.ACTIVE);
        return careerRepository.save(career);
    }

    private void saveAccessLog(Student student, ElibroAccessResult result, Instant occurredAt) {
        saveAccessLog(student, result, occurredAt, "ELIBRO");
    }

    private void saveAccessLog(Student student, ElibroAccessResult result, Instant occurredAt, String channelName) {
        ElibroAccessLog accessLog = new ElibroAccessLog();
        accessLog.setStudent(student);
        accessLog.setAttemptedEmail(student.getInstitutionalEmail());
        accessLog.setNormalizedEmail(student.getInstitutionalEmailNormalized());
        accessLog.setResult(result);
        accessLog.setLatencyMs(100L);
        accessLog.setRequestId("req-" + result.name() + "-" + occurredAt.toEpochMilli());
        accessLog.setCorrelationId("corr-" + result.name() + "-" + occurredAt.toEpochMilli());
        accessLog.setIpAddressMasked("127.0.0.0");
        accessLog.setIpAddressHash("hash-127.0.0.1");
        accessLog.setUserAgentSanitized("JUnit");
        accessLog.setChannelNameSnapshot(channelName);
        accessLog.setOccurredAt(occurredAt);
        accessLogRepository.save(accessLog);
    }
}
