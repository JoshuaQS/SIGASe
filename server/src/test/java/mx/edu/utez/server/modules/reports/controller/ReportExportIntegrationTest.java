package mx.edu.utez.server.modules.reports.controller;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.auth.entity.AdminAuthEvent;
import mx.edu.utez.server.modules.auth.repository.AdminAuthEventRepository;
import mx.edu.utez.server.modules.auth.repository.AdminPasswordResetTokenRepository;
import mx.edu.utez.server.modules.careers.entity.Career;
import mx.edu.utez.server.modules.careers.repository.CareerRepository;
import mx.edu.utez.server.modules.elibro.entity.ElibroAccessLog;
import mx.edu.utez.server.modules.elibro.repository.ElibroAccessLogRepository;
import mx.edu.utez.server.modules.logs.audit.entity.AuditLog;
import mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroConfigRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroValidationRunRepository;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.entity.StudentAuthEvent;
import mx.edu.utez.server.modules.students.repository.StudentAuthEventRepository;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.security.RoleConstants;
import mx.edu.utez.server.shared.enums.AdminRole;
import mx.edu.utez.server.shared.enums.AdminStatus;
import mx.edu.utez.server.shared.enums.AdminAuthResult;
import mx.edu.utez.server.shared.enums.AuditActorType;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.AuditSeverity;
import mx.edu.utez.server.shared.enums.CareerStatus;
import mx.edu.utez.server.shared.enums.ElibroAccessResult;
import mx.edu.utez.server.shared.enums.Sex;
import mx.edu.utez.server.shared.enums.StudentAuthMethod;
import mx.edu.utez.server.shared.enums.StudentAuthResult;
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
@ActiveProfiles("test")
@AutoConfigureMockMvc
class ReportExportIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ElibroAccessLogRepository accessLogRepository;
    @Autowired private AuditLogRepository auditLogRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private StudentAuthEventRepository studentAuthEventRepository;
    @Autowired private AdminAuthEventRepository adminAuthEventRepository;
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
        adminAuthEventRepository.deleteAll();
        studentAuthEventRepository.deleteAll();
        studentRepository.deleteAll();
        careerRepository.deleteAll();
        passwordResetTokenRepository.deleteAll();
        adminRepository.deleteAll();

        adminTi = saveAdmin("admin.ti@utez.edu.mx", AdminRole.ADMIN_TI);
        adminBiblioteca = saveAdmin("admin.biblioteca@utez.edu.mx", AdminRole.ADMIN_BIBLIOTECA);
        saveCareer("SIS", "Sistemas");
        saveCareer("RED", "Redes");
        student = saveStudent(adminTi, "2026A0001", "alice@utez.edu.mx", "Sistemas", StudentStatus.ACTIVE);

        saveAuditLog(adminTi, "STUDENT_CREATE", "STUDENT", student.getId().toString(),
                AuditOutcome.SUCCESS, Instant.parse("2026-03-20T09:00:00Z"));
        seedAccessLogs();
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
        assertTrue(lines.length >= 4, "Header + registros de student auth, eLibro y admin auth");

        String headerLine = lines[0].replace("\uFEFF", "");
        assertEquals("occurredAt,actorType,scope,actorId,actorName,actorEmail,result,"
                + "reason,requestId,correlationId,sessionId,ipAddressMasked,userAgentSanitized,"
                + "latencyMs,nextUrl,redirectUrl,providerStatusCode,providerErrorCode,providerErrorMessage,channelName,metadata", headerLine);
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
        assertTrue(lines.length >= 2, "Header + filas SUCCESS");
        for (int i = 1; i < lines.length; i++) {
            assertThat(lines[i], containsString("SUCCESS"));
        }
    }

    @Test
    void shouldExportAccessLogsWithoutDateRange() throws Exception {
        mockMvc.perform(get("/api/v1/reports/access-logs/export")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk());
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
                + "entityId,outcome,severity,ipAddressMasked,ipAddressHash,userAgentSanitized,requestId", headerLine);
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
        admin.setStatus(AdminStatus.ACTIVE);
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
        career.setStatus(CareerStatus.ACTIVE);
        return careerRepository.save(career);
    }

    private Career resolveCareer(String name) {
        return careerRepository.findByNameIgnoreCase(name)
                .orElseGet(() -> saveCareer(name.substring(0, Math.min(3, name.length())).toUpperCase(), name));
    }

    private void seedAccessLogs() {
        saveStudentAuthEvent(student, StudentAuthMethod.LOCAL, StudentAuthResult.SUCCESS, "Inicio local correcto", "2026-03-19T08:00:00Z");
        saveAccessLog(
                student,
                "alice@utez.edu.mx",
                "alice@utez.edu.mx",
                ElibroAccessResult.SUCCESS,
                null,
                null,
                120L,
                "2026-03-20T10:00:00Z"
        );
        saveAccessLog(
                student,
                "long@utez.edu.mx",
                "long@utez.edu.mx",
                ElibroAccessResult.FAILED_ELIBRO_API,
                "ELIBRO_TIMEOUT",
                "A".repeat(200),
                480L,
                "2026-03-21T11:00:00Z"
        );
        saveAdminAuthEvent(adminTi, AdminAuthResult.SUCCESS, "Login admin correcto", "2026-03-22T12:00:00Z");
    }

    private void saveStudentAuthEvent(
            Student targetStudent,
            StudentAuthMethod method,
            StudentAuthResult result,
            String reason,
            String occurredAt
    ) {
        StudentAuthEvent event = new StudentAuthEvent();
        event.setStudent(targetStudent);
        event.setAttemptedEmail("sha256:student");
        event.setNormalizedEmail("sha256:student");
        event.setAuthMethod(method);
        event.setResult(result);
        event.setErrorDetail(reason);
        event.setRequestId("req-student-" + method.name());
        event.setCorrelationId("corr-student-" + method.name());
        event.setSessionId("session-student");
        event.setIpAddressMasked("10.20.30.0");
        event.setUserAgentSanitized("JUnit Student");
        event.setOccurredAt(Instant.parse(occurredAt));
        studentAuthEventRepository.save(event);
    }

    private void saveAccessLog(
            Student targetStudent,
            String attemptedEmail,
            String normalizedEmail,
            ElibroAccessResult result,
            String errorCode,
            String errorDetail,
            Long latencyMs,
            String occurredAt
    ) {
        ElibroAccessLog log = new ElibroAccessLog();
        log.setStudent(targetStudent);
        log.setAttemptedEmail(attemptedEmail);
        log.setNormalizedEmail(normalizedEmail);
        log.setResult(result);
        log.setErrorCode(errorCode);
        log.setErrorDetail(errorDetail);
        log.setLatencyMs(latencyMs);
        log.setIpAddressMasked("10.20.30.0");
        log.setIpAddressHash("ip-hash");
        log.setUserAgentSanitized("JUnit");
        log.setChannelNameSnapshot("utez");
        log.setNextUrl("https://elibro.net/next?token=***REDACTED***");
        log.setRedirectUrl("https://elibro.net/redirect");
        log.setRequestId("req-" + result.name());
        log.setCorrelationId("corr-" + result.name());
        log.setOccurredAt(Instant.parse(occurredAt));
        accessLogRepository.save(log);
    }

    private void saveAdminAuthEvent(
            Admin targetAdmin,
            AdminAuthResult result,
            String reason,
            String occurredAt
    ) {
        AdminAuthEvent event = new AdminAuthEvent();
        event.setAdmin(targetAdmin);
        event.setAttemptedEmail("sha256:admin");
        event.setNormalizedEmail("sha256:admin");
        event.setResult(result);
        event.setErrorDetail(reason);
        event.setRequestId("req-admin-login");
        event.setCorrelationId("corr-admin-login");
        event.setSessionId("session-admin");
        event.setIpAddressMasked("10.20.30.0");
        event.setUserAgentSanitized("JUnit Admin");
        event.setOccurredAt(Instant.parse(occurredAt));
        adminAuthEventRepository.save(event);
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
        log.setOccurredAt(occurredAt);
        return auditLogRepository.save(log);
    }
}
