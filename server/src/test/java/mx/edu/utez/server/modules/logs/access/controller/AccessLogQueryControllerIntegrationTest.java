package mx.edu.utez.server.modules.logs.access.controller;

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
class AccessLogQueryControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AccessLogRepository accessLogRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private ElibroConfigRepository elibroConfigRepository;

    @Autowired
    private AdminPasswordResetTokenRepository passwordResetTokenRepository;

    private Admin adminTi;
    private Admin adminBiblioteca;
    private Student student;
    private AccessLog firstAliceSuccess;

    @BeforeEach
    void setUp() {
        accessLogRepository.deleteAll();
        auditLogRepository.deleteAll();
        elibroConfigRepository.deleteAll();
        studentRepository.deleteAll();
        passwordResetTokenRepository.deleteAll();
        adminRepository.deleteAll();

        adminTi = saveAdmin("admin.ti@utez.edu.mx", AdminRole.ADMIN_TI);
        adminBiblioteca = saveAdmin("admin.biblioteca@utez.edu.mx", AdminRole.ADMIN_BIBLIOTECA);
        student = saveStudent(adminTi);

        firstAliceSuccess = saveAccessLog(
                student,
                "alice@utez.edu.mx",
                "alice@utez.edu.mx",
                AccessResult.SUCCESS,
                "10.10.10.10",
                "req-1",
                "corr-1",
                "ELIBRO",
                Instant.parse("2026-03-20T10:00:00Z")
        );
        saveAccessLog(
                student,
                "alice@utez.edu.mx",
                "alice@utez.edu.mx",
                AccessResult.SUCCESS,
                "10.10.10.10",
                "req-2",
                "corr-2",
                "ELIBRO",
                Instant.parse("2026-03-21T10:00:00Z")
        );
        saveAccessLog(
                null,
                "other@utez.edu.mx",
                "other@utez.edu.mx",
                AccessResult.FAILED_STUDENT_NOT_FOUND,
                "11.11.11.11",
                "req-3",
                "corr-3",
                null,
                Instant.parse("2026-03-22T10:00:00Z")
        );
    }

    @Test
    void shouldListAccessLogsWithFiltersPaginationAndSort() throws Exception {
        mockMvc.perform(get("/api/v1/access-logs")
                        .param("normalizedEmail", "alice@utez.edu.mx")
                        .param("result", "SUCCESS")
                        .param("page", "0")
                        .param("size", "1")
                        .param("sortBy", "occurredAt")
                        .param("sortDir", "asc")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalElements").value(2))
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].id").value(firstAliceSuccess.getId().toString()))
                .andExpect(jsonPath("$.data.content[0].normalizedEmail").value("alice@utez.edu.mx"));
    }

    @Test
    void shouldGetAccessLogByIdForTiAndBiblioteca() throws Exception {
        mockMvc.perform(get("/api/v1/access-logs/{id}", firstAliceSuccess.getId())
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(firstAliceSuccess.getId().toString()));

        mockMvc.perform(get("/api/v1/access-logs/{id}", firstAliceSuccess.getId())
                        .with(auth(adminBiblioteca, RoleConstants.ADMIN_BIBLIOTECA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(firstAliceSuccess.getId().toString()));
    }

    @Test
    void shouldRejectAccessLogEndpointsForStudentRole() throws Exception {
        mockMvc.perform(get("/api/v1/access-logs")
                        .with(auth(adminTi, RoleConstants.STUDENT)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
    }

    @Test
    void shouldRejectInvalidSortByForAccessLogs() throws Exception {
        mockMvc.perform(get("/api/v1/access-logs")
                        .param("sortBy", "passwordHash")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void shouldRejectInvalidAccessLogPaginationAndDateRange() throws Exception {
        mockMvc.perform(get("/api/v1/access-logs")
                        .param("size", "201")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));

        mockMvc.perform(get("/api/v1/access-logs")
                        .param("dateFrom", "2026-03-22T00:00:00Z")
                        .param("dateTo", "2026-03-20T00:00:00Z")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
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
        admin.setName("Admin");
        admin.setLastNamePaternal(role.name());
        admin.setLastNameMaternal(null);
        admin.setPasswordHash("$2a$10$123456789012345678901u2sNfJ0wYl8Bv0p5Wn4eC6zYkM8d8vS.");
        admin.setRole(role);
        admin.setActive(true);
        return adminRepository.save(admin);
    }

    private Student saveStudent(Admin createdBy) {
        Student newStudent = new Student();
        newStudent.setEnrollmentNumber("2026A0001");
        newStudent.setName("Alice");
        newStudent.setLastNamePaternal("Tester");
        newStudent.setLastNameMaternal("Integration");
        newStudent.setSex(Sex.FEMALE);
        newStudent.setQuarter(3);
        newStudent.setInstitutionalEmail("alice@utez.edu.mx");
        newStudent.setInstitutionalEmailNormalized("alice@utez.edu.mx");
        newStudent.setCareer("Sistemas");
        newStudent.setStatus(StudentStatus.ACTIVE);
        newStudent.setCreatedByAdmin(createdBy);
        newStudent.setUpdatedByAdmin(createdBy);
        return studentRepository.save(newStudent);
    }

    private AccessLog saveAccessLog(
            Student targetStudent,
            String attemptedEmail,
            String normalizedEmail,
            AccessResult result,
            String ipAddress,
            String requestId,
            String correlationId,
            String providerName,
            Instant occurredAt
    ) {
        AccessLog log = new AccessLog();
        log.setStudent(targetStudent);
        log.setAttemptedEmail(attemptedEmail);
        log.setNormalizedEmail(normalizedEmail);
        log.setResult(result);
        log.setErrorCode(result == AccessResult.SUCCESS ? null : "ERR");
        log.setErrorDetail(result == AccessResult.SUCCESS ? null : "detail");
        log.setLatencyMs(120L);
        log.setRequestId(requestId);
        log.setCorrelationId(correlationId);
        log.setIpAddress(ipAddress);
        log.setUserAgent("JUnit");
        log.setProviderName(providerName);
        log.setNextUrl("https://elibro.net/home");
        log.setRedirectUrl(result == AccessResult.SUCCESS ? "https://elibro.net/ticket" : null);
        log.setOccurredAt(occurredAt);
        return accessLogRepository.save(log);
    }
}
