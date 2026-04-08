package mx.edu.utez.server.modules.accesslogs.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.auth.entity.AdminAuthEvent;
import mx.edu.utez.server.modules.auth.repository.AdminAuthEventRepository;
import mx.edu.utez.server.modules.careers.entity.Career;
import mx.edu.utez.server.modules.careers.repository.CareerRepository;
import mx.edu.utez.server.modules.elibro.entity.ElibroAccessLog;
import mx.edu.utez.server.modules.elibro.repository.ElibroAccessLogRepository;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.entity.StudentAuthEvent;
import mx.edu.utez.server.modules.students.repository.StudentAuthEventRepository;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.security.JwtTokenProvider;
import mx.edu.utez.server.security.JwtTokenType;
import mx.edu.utez.server.security.RoleConstants;
import mx.edu.utez.server.shared.api.ApiRoutes;
import mx.edu.utez.server.shared.enums.AdminAuthResult;
import mx.edu.utez.server.shared.enums.AdminRole;
import mx.edu.utez.server.shared.enums.AdminStatus;
import mx.edu.utez.server.shared.enums.CareerStatus;
import mx.edu.utez.server.shared.enums.ElibroAccessResult;
import mx.edu.utez.server.shared.enums.Sex;
import mx.edu.utez.server.shared.enums.StudentAuthMethod;
import mx.edu.utez.server.shared.enums.StudentAuthResult;
import mx.edu.utez.server.shared.enums.StudentStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class AccessLogQueryControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private AdminAuthEventRepository adminAuthEventRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private StudentAuthEventRepository studentAuthEventRepository;

    @Autowired
    private ElibroAccessLogRepository elibroAccessLogRepository;

    @Autowired
    private CareerRepository careerRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private Admin admin;
    private Student student;

    @BeforeEach
    void setUp() {
        adminAuthEventRepository.deleteAll();
        elibroAccessLogRepository.deleteAll();
        studentAuthEventRepository.deleteAll();
        studentRepository.deleteAll();
        careerRepository.deleteAll();
        adminRepository.deleteAll();

        admin = new Admin();
        admin.setEmail("admin.ti@utez.edu.mx");
        admin.setName("Admin");
        admin.setLastNamePaternal("TI");
        admin.setPasswordHash("$2a$10$dummy");
        admin.setRole(AdminRole.ADMIN_TI);
        admin.setStatus(AdminStatus.ACTIVE);
        admin = adminRepository.save(admin);

        Career career = new Career();
        career.setCode("SIS");
        career.setName("Sistemas");
        career.setStatus(CareerStatus.ACTIVE);
        career = careerRepository.save(career);

        student = new Student();
        student.setEnrollmentId("26LOG001");
        student.setName("Access");
        student.setLastNamePaternal("Student");
        student.setLastNameMaternal("Query");
        student.setSex(Sex.NON_BINARY);
        student.setQuarter(5);
        student.setInstitutionalEmail("access@utez.edu.mx");
        student.setInstitutionalEmailNormalized("access@utez.edu.mx");
        student.setCareer(career);
        student.setStatus(StudentStatus.ACTIVE);
        student.setCreatedByAdmin(admin);
        student.setUpdatedByAdmin(admin);
        studentRepository.save(student);

        StudentAuthEvent studentEvent = new StudentAuthEvent();
        studentEvent.setStudent(student);
        studentEvent.setAttemptedEmail("sha256:test");
        studentEvent.setNormalizedEmail("sha256:test");
        studentEvent.setAuthMethod(StudentAuthMethod.LOCAL);
        studentEvent.setResult(StudentAuthResult.SUCCESS);
        studentEvent.setRequestId("req-student");
        studentEvent.setCorrelationId("corr-student");
        studentEvent.setIpAddressMasked("127.0.0.0");
        studentEvent.setUserAgentSanitized("Student UA");
        studentEvent.setRequestPath("/api/v1/auth/student/login");
        studentEvent.setOccurredAt(Instant.parse("2026-04-06T10:00:00Z"));
        studentAuthEventRepository.save(studentEvent);

        ElibroAccessLog elibroEvent = new ElibroAccessLog();
        elibroEvent.setStudent(student);
        elibroEvent.setAttemptedEmail("sha256:test");
        elibroEvent.setNormalizedEmail("sha256:test");
        elibroEvent.setResult(ElibroAccessResult.FAILED_ELIBRO_CONFIG);
        elibroEvent.setErrorCode("ELIBRO_CONFIG_MISSING");
        elibroEvent.setErrorDetail("Configuración eLibro incompleta o inactiva.");
        elibroEvent.setLatencyMs(25L);
        elibroEvent.setRequestId("req-elibro");
        elibroEvent.setCorrelationId("corr-elibro");
        elibroEvent.setIpAddressMasked("127.0.0.0");
        elibroEvent.setUserAgentSanitized("Student UA");
        elibroEvent.setRequestPath("/api/v1/student/portal/elibro-access");
        elibroEvent.setOccurredAt(Instant.parse("2026-04-06T11:00:00Z"));
        elibroAccessLogRepository.save(elibroEvent);

        AdminAuthEvent adminEvent = new AdminAuthEvent();
        adminEvent.setAdmin(admin);
        adminEvent.setAttemptedEmail("sha256:admin");
        adminEvent.setNormalizedEmail("sha256:admin");
        adminEvent.setResult(AdminAuthResult.SUCCESS);
        adminEvent.setRequestId("req-admin");
        adminEvent.setCorrelationId("corr-admin");
        adminEvent.setIpAddressMasked("127.0.0.0");
        adminEvent.setUserAgentSanitized("Admin UA");
        adminEvent.setRequestPath("/api/v1/auth/admin/login");
        adminEvent.setOccurredAt(Instant.parse("2026-04-06T12:00:00Z"));
        adminAuthEventRepository.save(adminEvent);
    }

    @Test
    void shouldReturnUnifiedAccessLogs() throws Exception {
        mockMvc.perform(get(ApiRoutes.httpPath(ApiRoutes.ACCESS_LOGS))
                        .header("Authorization", "Bearer " + adminToken())
                        .param("size", "10")
                        .param("sort", "occurredAt,desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(3))
                .andExpect(jsonPath("$.data.content[0].scope").value("ADMIN_LOGIN"))
                .andExpect(jsonPath("$.data.content[1].scope").value("ELIBRO"))
                .andExpect(jsonPath("$.data.content[2].scope").value("SIGASE_LOCAL"));
    }

    private String adminToken() {
        return jwtTokenProvider.generateToken(
                admin.getId(),
                RoleConstants.ADMIN_TI,
                JwtTokenType.ADMIN,
                admin.getTokenVersion()
        );
    }
}
