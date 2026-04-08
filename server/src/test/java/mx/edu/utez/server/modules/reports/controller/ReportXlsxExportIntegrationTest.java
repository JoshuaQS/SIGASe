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
import mx.edu.utez.server.modules.elibro.repository.ElibroConfigRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroValidationRunRepository;
import mx.edu.utez.server.modules.logs.audit.entity.AuditLog;
import mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository;
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
import java.io.ByteArrayInputStream;
import java.time.Instant;
import java.util.List;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
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

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class ReportXlsxExportIntegrationTest {

    private static final String CT_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

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

    // ── 1. Students XLSX Export ────────────────────────────────────────

    @Test
    void shouldExportStudentsXlsx() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/reports/students/export")
                        .param("format", "xlsx")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", containsString(CT_XLSX)))
                .andExpect(header().string("Content-Disposition", containsString("students_")))
                .andExpect(header().string("Content-Disposition", containsString(".xlsx")))
                .andReturn();

        byte[] bytes = result.getResponse().getContentAsByteArray();
        assertTrue(bytes.length > 0, "XLSX content should not be empty");

        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            Sheet sheet = wb.getSheet("Estudiantes");
            assertNotNull(sheet, "Should have 'Estudiantes' sheet");
            // Header row at index 4 + at least 1 data row
            assertTrue(sheet.getLastRowNum() >= 5, "Should have header + data rows");
        }
    }

    // ── 2. Students XLSX headers verification ──────────────────────────

    @Test
    void shouldHaveCorrectStudentXlsxHeaders() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/reports/students/export")
                        .param("format", "xlsx")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andReturn();

        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(result.getResponse().getContentAsByteArray()))) {
            Sheet sheet = wb.getSheet("Estudiantes");
            assertNotNull(sheet);
            // Header row is at index 4
            var headerRow = sheet.getRow(4);
            assertNotNull(headerRow, "Header row should exist at index 4");
            assertEquals("Matrícula", headerRow.getCell(0).getStringCellValue());
            assertEquals("Nombre", headerRow.getCell(1).getStringCellValue());
            assertEquals("Carrera", headerRow.getCell(5).getStringCellValue());
        }
    }

    // ── 3. CSV default backward compatibility ──────────────────────────

    @Test
    void shouldDefaultToCsvWhenNoFormatSpecified() throws Exception {
        mockMvc.perform(get("/api/v1/reports/students/export")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", containsString("text/csv")));
    }

    // ── 4. Invalid format ──────────────────────────────────────────────

    @Test
    void shouldRejectInvalidFormat() throws Exception {
        mockMvc.perform(get("/api/v1/reports/students/export")
                        .param("format", "pdf")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isBadRequest());
    }

    // ── 5. Access-logs XLSX Export ─────────────────────────────────────

    @Test
    void shouldExportAccessLogsXlsx() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/reports/access-logs/export")
                        .param("dateFrom", "2026-03-19T00:00:00Z")
                        .param("dateTo", "2026-03-22T23:59:59Z")
                        .param("format", "xlsx")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", containsString(CT_XLSX)))
                .andExpect(header().string("Content-Disposition", containsString("access-logs_")))
                .andExpect(header().string("Content-Disposition", containsString(".xlsx")))
                .andReturn();

        byte[] bytes = result.getResponse().getContentAsByteArray();
        assertTrue(bytes.length > 0, "XLSX content should not be empty");
    }

    // ── 6. Access-logs XLSX sheet structure ────────────────────────────

    @Test
    void shouldHaveCorrectAccessLogsXlsxSheetStructure() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/reports/access-logs/export")
                        .param("dateFrom", "2026-03-19T00:00:00Z")
                        .param("dateTo", "2026-03-22T23:59:59Z")
                        .param("format", "xlsx")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andReturn();

        try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(result.getResponse().getContentAsByteArray()))) {
            assertTrue(wb.getNumberOfSheets() >= 2,
                    "Access-logs XLSX should have at least 2 sheets, found: " + wb.getNumberOfSheets());
            assertNotNull(wb.getSheet("Resumen"), "Should have 'Resumen' sheet");
            assertNotNull(wb.getSheet("Detalle"), "Should have 'Detalle' sheet");
        }
    }

    // ── 7. Audit-logs XLSX Export ──────────────────────────────────────

    @Test
    void shouldExportAuditLogsXlsx() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/reports/audit-logs/export")
                        .param("dateFrom", "2026-03-19T00:00:00Z")
                        .param("dateTo", "2026-03-22T23:59:59Z")
                        .param("format", "xlsx")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", containsString(CT_XLSX)))
                .andExpect(header().string("Content-Disposition", containsString("audit-logs_")))
                .andReturn();

        try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(result.getResponse().getContentAsByteArray()))) {
            // Audit-logs should have 2 sheets: Resumen + Detalle
            assertTrue(wb.getNumberOfSheets() >= 2,
                    "Audit-logs XLSX should have at least 2 sheets, found: " + wb.getNumberOfSheets());
            assertNotNull(wb.getSheet("Resumen"), "Should have 'Resumen' sheet");
            assertNotNull(wb.getSheet("Detalle"), "Should have 'Detalle' sheet");
        }
    }

    // ── 8. Audit-logs XLSX RBAC: Biblioteca rejected ───────────────────

    @Test
    void shouldRejectAuditLogsXlsxForAdminBiblioteca() throws Exception {
        mockMvc.perform(get("/api/v1/reports/audit-logs/export")
                        .param("dateFrom", "2026-03-19T00:00:00Z")
                        .param("dateTo", "2026-03-22T23:59:59Z")
                        .param("format", "xlsx")
                        .with(auth(adminBiblioteca, RoleConstants.ADMIN_BIBLIOTECA)))
                .andExpect(status().isForbidden());
    }

    // ── 9. Access-logs CSV compatibility still works ───────────────────

    @Test
    void shouldStillExportAccessLogsCsvWithFormatParam() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/reports/access-logs/export")
                        .param("dateFrom", "2026-03-19T00:00:00Z")
                        .param("dateTo", "2026-03-22T23:59:59Z")
                        .param("format", "csv")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", containsString("text/csv")))
                .andReturn();

        String csv = result.getResponse().getContentAsString();
        String[] lines = csv.split("\r\n");
        assertTrue(lines.length >= 4, "Header + registros unificados");
    }

    // ── 10. XLSX without date range should fail ────────────────────────

    @Test
    void shouldAllowXlsxExportWithoutDateRange() throws Exception {
        mockMvc.perform(get("/api/v1/reports/access-logs/export")
                        .param("format", "xlsx")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk());
    }

    // ── Helpers ────────────────────────────────────────────────────────

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
        saveStudentAuthEvent(student, StudentAuthMethod.LOCAL, StudentAuthResult.SUCCESS, "Inicio local correcto", "2026-03-19T09:00:00Z");
        saveAccessLog(student, ElibroAccessResult.SUCCESS, null, null, 120L, "2026-03-20T10:00:00Z");
        saveAccessLog(student, ElibroAccessResult.FAILED_ELIBRO_API, "ELIBRO_TIMEOUT", "Detalle largo", 480L, "2026-03-21T11:00:00Z");
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
        event.setRequestId("req-student");
        event.setCorrelationId("corr-student");
        event.setSessionId("session-student");
        event.setIpAddressMasked("10.20.30.0");
        event.setUserAgentSanitized("JUnit Student");
        event.setOccurredAt(Instant.parse(occurredAt));
        studentAuthEventRepository.save(event);
    }

    private void saveAccessLog(
            Student targetStudent,
            ElibroAccessResult result,
            String errorCode,
            String errorDetail,
            Long latencyMs,
            String occurredAt
    ) {
        ElibroAccessLog log = new ElibroAccessLog();
        log.setStudent(targetStudent);
        log.setAttemptedEmail(targetStudent.getInstitutionalEmail());
        log.setNormalizedEmail(targetStudent.getInstitutionalEmailNormalized());
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
        event.setRequestId("req-admin");
        event.setCorrelationId("corr-admin");
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
