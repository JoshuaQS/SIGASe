package mx.edu.utez.server.modules.reports.controller;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.auth.repository.AdminPasswordResetTokenRepository;
import mx.edu.utez.server.modules.careers.entity.Career;
import mx.edu.utez.server.modules.careers.repository.CareerRepository;
import mx.edu.utez.server.modules.logs.access.entity.AccessLog;
import mx.edu.utez.server.modules.logs.access.repository.AccessLogRepository;
import mx.edu.utez.server.modules.logs.audit.entity.AuditLog;
import mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroConfigRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroValidationRunRepository;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.security.RoleConstants;
import mx.edu.utez.server.shared.enums.AccessResult;
import mx.edu.utez.server.shared.enums.AdminRole;
import mx.edu.utez.server.shared.enums.AuditActorType;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.AuditSeverity;
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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.startsWith;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ReportExportIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private AccessLogRepository accessLogRepository;
    @Autowired private AuditLogRepository auditLogRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private CareerRepository careerRepository;
    @Autowired private AdminRepository adminRepository;
    @Autowired private AdminPasswordResetTokenRepository passwordResetTokenRepository;
    @Autowired private ElibroConfigRepository elibroConfigRepository;
    @Autowired private ElibroValidationRunRepository validationRunRepository;

    private Admin adminTi;
    private Admin adminBiblioteca;
    private Student student;

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

        adminTi = saveAdmin("admin.ti@utez.edu.mx", AdminRole.ADMIN_TI);
        adminBiblioteca = saveAdmin("admin.biblioteca@utez.edu.mx", AdminRole.ADMIN_BIBLIOTECA);
        saveCareer("SIS", "Sistemas");
        saveCareer("RED", "Redes");
        student = saveStudent(adminTi, "2026A0001", "alice@utez.edu.mx", "Sistemas", StudentStatus.ACTIVE);

        saveAccessLog(student, "alice@utez.edu.mx", "alice@utez.edu.mx",
                AccessResult.SUCCESS, "10.10.10.10", "req-1", "corr-1",
                "ELIBRO", Instant.parse("2026-03-20T10:00:00Z"));
        saveAccessLog(null, "bob@utez.edu.mx", "bob@utez.edu.mx",
                AccessResult.FAILED_STUDENT_NOT_FOUND, "11.11.11.11", "req-2", "corr-2",
                null, Instant.parse("2026-03-21T10:00:00Z"));

        saveAuditLog(adminTi, "STUDENT_CREATE", "STUDENT", student.getId().toString(),
                AuditOutcome.SUCCESS, Instant.parse("2026-03-20T09:00:00Z"));
    }

    // ── Students Export ────────────────────────────────────────────────

    @Test
    void shouldExportStudentsCsvForAdminTi() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/reports/students/export")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", containsString("text/csv")))
                .andExpect(header().string("Content-Disposition", containsString("students_")))
                .andExpect(header().string("Content-Disposition", containsString(".csv")))
                .andReturn();

        String csv = result.getResponse().getContentAsString();
        String[] lines = csv.split("\r\n");
        assertTrue(lines.length >= 2, "Should have header + at least 1 data row");

        String headerLine = lines[0].replace("\uFEFF", "");
        assertEquals("matricula,fullName,lastNamePaternal,lastNameMaternal,"
                + "institutionalEmail,career,quarter,sex,status,lastLoginAt,createdAt", headerLine);

        assertThat(lines[1], startsWith("2026A0001"));
        assertThat(lines[1], containsString("alice@utez.edu.mx"));
        assertThat(lines[1], containsString("Sistemas"));
    }

    @Test
    void shouldExportStudentsCsvForAdminBiblioteca() throws Exception {
        mockMvc.perform(get("/api/v1/reports/students/export")
                        .with(auth(adminBiblioteca, RoleConstants.ADMIN_BIBLIOTECA)))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", containsString("text/csv")));
    }

    @Test
    void shouldExportStudentsWithFilters() throws Exception {
        saveStudent(adminTi, "2026A0002", "bob.student@utez.edu.mx", "Redes", StudentStatus.INACTIVE);

        MvcResult result = mockMvc.perform(get("/api/v1/reports/students/export")
                        .param("careerCode", "SIS")
                        .param("status", "ACTIVE")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andReturn();

        String csv = result.getResponse().getContentAsString();
        String[] lines = csv.split("\r\n");
        assertEquals(2, lines.length, "Header + 1 filtered row");
        assertThat(lines[1], containsString("Sistemas"));
    }

    @Test
    void shouldRejectStudentsExportForStudentRole() throws Exception {
        mockMvc.perform(get("/api/v1/reports/students/export")
                        .with(auth(adminTi, RoleConstants.STUDENT)))
                .andExpect(status().isForbidden());
    }

    // ── Access Logs Export ─────────────────────────────────────────────

    @Test
    void shouldExportAccessLogsCsvWithDateRange() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/reports/access-logs/export")
                        .param("dateFrom", "2026-03-19T00:00:00Z")
                        .param("dateTo", "2026-03-22T23:59:59Z")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", containsString("text/csv")))
                .andExpect(header().string("Content-Disposition", containsString("access-logs_")))
                .andReturn();

        String csv = result.getResponse().getContentAsString();
        String[] lines = csv.split("\r\n");
        assertTrue(lines.length >= 3, "Header + 2 data rows");

        String headerLine = lines[0].replace("\uFEFF", "");
        assertEquals("occurredAt,attemptedEmail,normalizedEmail,result,"
                + "errorCode,errorDetail,latencyMs,ipAddress,userAgent,"
                + "providerName,nextUrl,redirectUrl,requestId", headerLine);
    }

    @Test
    void shouldExportAccessLogsCsvForAdminBiblioteca() throws Exception {
        mockMvc.perform(get("/api/v1/reports/access-logs/export")
                        .param("dateFrom", "2026-03-19T00:00:00Z")
                        .param("dateTo", "2026-03-22T23:59:59Z")
                        .with(auth(adminBiblioteca, RoleConstants.ADMIN_BIBLIOTECA)))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", containsString("text/csv")));
    }

    @Test
    void shouldExportAccessLogsWithResultFilter() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/reports/access-logs/export")
                        .param("dateFrom", "2026-03-19T00:00:00Z")
                        .param("dateTo", "2026-03-22T23:59:59Z")
                        .param("result", "SUCCESS")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andReturn();

        String csv = result.getResponse().getContentAsString();
        String[] lines = csv.split("\r\n");
        assertEquals(2, lines.length, "Header + 1 SUCCESS row");
        assertThat(lines[1], containsString("SUCCESS"));
    }

    @Test
    void shouldRejectAccessLogsExportWithoutDateRange() throws Exception {
        mockMvc.perform(get("/api/v1/reports/access-logs/export")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldRejectAccessLogsExportWithInvertedDateRange() throws Exception {
        mockMvc.perform(get("/api/v1/reports/access-logs/export")
                        .param("dateFrom", "2026-03-22T00:00:00Z")
                        .param("dateTo", "2026-03-20T00:00:00Z")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldRejectAccessLogsExportExceedingMaxRange() throws Exception {
        mockMvc.perform(get("/api/v1/reports/access-logs/export")
                        .param("dateFrom", "2024-01-01T00:00:00Z")
                        .param("dateTo", "2026-03-22T00:00:00Z")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldRejectAccessLogsExportForStudentRole() throws Exception {
        mockMvc.perform(get("/api/v1/reports/access-logs/export")
                        .param("dateFrom", "2026-03-19T00:00:00Z")
                        .param("dateTo", "2026-03-22T23:59:59Z")
                        .with(auth(adminTi, RoleConstants.STUDENT)))
                .andExpect(status().isForbidden());
    }

    // ── Audit Logs Export ─────────────────────────────────────────────

    @Test
    void shouldExportAuditLogsCsvForAdminTi() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/reports/audit-logs/export")
                        .param("dateFrom", "2026-03-19T00:00:00Z")
                        .param("dateTo", "2026-03-22T23:59:59Z")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", containsString("text/csv")))
                .andExpect(header().string("Content-Disposition", containsString("audit-logs_")))
                .andReturn();

        String csv = result.getResponse().getContentAsString();
        String[] lines = csv.split("\r\n");
        // At least header + 1 seed audit log + the REPORT_EXPORT audit log itself may or may not be in range
        assertTrue(lines.length >= 2, "Header + at least 1 data row");

        String headerLine = lines[0].replace("\uFEFF", "");
        assertEquals("occurredAt,actorType,actorEmail,action,entityType,"
                + "entityId,outcome,severity,ipAddress,requestId", headerLine);
    }

    @Test
    void shouldRejectAuditLogsExportForAdminBiblioteca() throws Exception {
        mockMvc.perform(get("/api/v1/reports/audit-logs/export")
                        .param("dateFrom", "2026-03-19T00:00:00Z")
                        .param("dateTo", "2026-03-22T23:59:59Z")
                        .with(auth(adminBiblioteca, RoleConstants.ADMIN_BIBLIOTECA)))
                .andExpect(status().isForbidden());
    }

    @Test
    void shouldRejectAuditLogsExportForStudentRole() throws Exception {
        mockMvc.perform(get("/api/v1/reports/audit-logs/export")
                        .param("dateFrom", "2026-03-19T00:00:00Z")
                        .param("dateTo", "2026-03-22T23:59:59Z")
                        .with(auth(adminTi, RoleConstants.STUDENT)))
                .andExpect(status().isForbidden());
    }

    @Test
    void shouldRejectAuditLogsExportWithoutDateRange() throws Exception {
        mockMvc.perform(get("/api/v1/reports/audit-logs/export")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldRejectAuditLogsExportWithInvertedDateRange() throws Exception {
        mockMvc.perform(get("/api/v1/reports/audit-logs/export")
                        .param("dateFrom", "2026-03-22T00:00:00Z")
                        .param("dateTo", "2026-03-20T00:00:00Z")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isBadRequest());
    }

    // ── CSV Injection Protection ──────────────────────────────────────

    @Test
    void shouldSanitizeCsvInjectionInStudentData() throws Exception {
        saveStudent(adminTi, "2026A0099", "evil@utez.edu.mx", "=CMD('calc')", StudentStatus.ACTIVE);

        MvcResult result = mockMvc.perform(get("/api/v1/reports/students/export")
                        .param("q", "evil")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andReturn();

        String csv = result.getResponse().getContentAsString();
        assertThat(csv, containsString("'=CMD('calc')"));
    }

    // ── Error Detail Truncation ───────────────────────────────────────

    @Test
    void shouldTruncateErrorDetailInAccessLogExport() throws Exception {
        String longDetail = "A".repeat(200);
        AccessLog log = new AccessLog();
        log.setAttemptedEmail("long@utez.edu.mx");
        log.setNormalizedEmail("long@utez.edu.mx");
        log.setResult(AccessResult.FAILED_INTERNAL_ERROR);
        log.setErrorCode("INTERNAL");
        log.setErrorDetail(longDetail);
        log.setLatencyMs(50L);
        log.setRequestId("req-long");
        log.setCorrelationId("corr-long");
        log.setIpAddress("1.2.3.4");
        log.setOccurredAt(Instant.parse("2026-03-20T12:00:00Z"));
        accessLogRepository.save(log);

        MvcResult result = mockMvc.perform(get("/api/v1/reports/access-logs/export")
                        .param("dateFrom", "2026-03-19T00:00:00Z")
                        .param("dateTo", "2026-03-22T23:59:59Z")
                        .param("normalizedEmail", "long@utez.edu.mx")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andReturn();

        String csv = result.getResponse().getContentAsString();
        // errorDetail should be truncated to 100 chars + "..."
        assertThat(csv, containsString("A".repeat(100) + "..."));
        // Should NOT contain the full 200-char string
        assertTrue(!csv.contains("A".repeat(200)));
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private RequestPostProcessor auth(Admin admin, String role) {
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                admin.getId().toString(), null,
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

    private Student saveStudent(Admin createdBy, String matricula, String email, String career, StudentStatus status) {
        Student s = new Student();
        s.setEnrollmentId(matricula);
        s.setName("Student");
        s.setLastNamePaternal("Paternal");
        s.setLastNameMaternal("Maternal");
        s.setSex(Sex.NON_BINARY);
        s.setQuarter(3);
        s.setInstitutionalEmail(email);
        s.setInstitutionalEmailNormalized(email.toLowerCase());
        s.setCareer(resolveCareer(career));
        s.setStatus(status);
        s.setCreatedByAdmin(createdBy);
        s.setUpdatedByAdmin(createdBy);
        return studentRepository.save(s);
    }

    private Career saveCareer(String code, String name) {
        Career career = new Career();
        career.setCode(code);
        career.setName(name);
        career.setActive(true);
        return careerRepository.save(career);
    }

    private Career resolveCareer(String name) {
        return careerRepository.findByNameIgnoreCase(name)
                .orElseGet(() -> saveCareer(name.substring(0, Math.min(3, name.length())).toUpperCase(), name));
    }

    private AccessLog saveAccessLog(
            Student targetStudent, String attemptedEmail, String normalizedEmail,
            AccessResult result, String ipAddress, String requestId,
            String correlationId, String providerName, Instant occurredAt
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

    private AuditLog saveAuditLog(
            Admin actorAdmin, String action, String entityType,
            String entityId, AuditOutcome outcome, Instant occurredAt
    ) {
        AuditLog log = new AuditLog();
        log.setActorType(AuditActorType.ADMIN);
        log.setActorAdmin(actorAdmin);
        log.setActorReference(actorAdmin.getId().toString());
        log.setAction(action);
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setOutcome(outcome);
        log.setSeverity(AuditSeverity.INFO);
        log.setMetadataJson("{}");
        log.setRequestId("test-req");
        log.setCorrelationId("test-corr");
        log.setIpAddress("127.0.0.1");
        log.setOccurredAt(occurredAt);
        return auditLogRepository.save(log);
    }
}
