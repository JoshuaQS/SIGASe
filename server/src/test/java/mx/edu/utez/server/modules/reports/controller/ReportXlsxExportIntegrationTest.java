package mx.edu.utez.server.modules.reports.controller;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.auth.repository.AdminPasswordResetTokenRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroConfigRepository;
import mx.edu.utez.server.modules.logs.access.entity.AccessLog;
import mx.edu.utez.server.modules.logs.access.repository.AccessLogRepository;
import mx.edu.utez.server.modules.logs.audit.entity.AuditLog;
import mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository;
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

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ReportXlsxExportIntegrationTest {

    private static final String CT_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    @Autowired private MockMvc mockMvc;
    @Autowired private AccessLogRepository accessLogRepository;
    @Autowired private AuditLogRepository auditLogRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private AdminRepository adminRepository;
    @Autowired private AdminPasswordResetTokenRepository passwordResetTokenRepository;
    @Autowired private ElibroConfigRepository elibroConfigRepository;

    private Admin adminTi;
    private Admin adminBiblioteca;
    private Student student;

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
            // Should have 3 sheets: Resumen, Datos de soporte, Detalle
            assertTrue(wb.getNumberOfSheets() >= 3,
                    "Access-logs XLSX should have at least 3 sheets, found: " + wb.getNumberOfSheets());

            assertNotNull(wb.getSheet("Resumen"), "Should have 'Resumen' sheet");
            assertNotNull(wb.getSheet("Datos de soporte"), "Should have 'Datos de soporte' sheet");
            assertNotNull(wb.getSheet("Detalle"), "Should have 'Detalle' sheet");

            // Support sheet should be hidden
            int supportIdx = wb.getSheetIndex("Datos de soporte");
            assertTrue(wb.isSheetHidden(supportIdx), "Support sheet should be hidden");
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
        assertTrue(lines.length >= 3, "Header + 2 data rows");
    }

    // ── 10. XLSX without date range should fail ────────────────────────

    @Test
    void shouldRejectXlsxExportWithoutDateRange() throws Exception {
        mockMvc.perform(get("/api/v1/reports/access-logs/export")
                        .param("format", "xlsx")
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isBadRequest());
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
        admin.setActive(true);
        return adminRepository.save(admin);
    }

    private Student saveStudent(Admin createdBy, String matricula, String email, String career, StudentStatus status) {
        Student s = new Student();
        s.setEnrollmentNumber(matricula);
        s.setName("Student");
        s.setLastNamePaternal("Paternal");
        s.setLastNameMaternal("Maternal");
        s.setSex(Sex.NOT_SPECIFIED);
        s.setQuarter(3);
        s.setInstitutionalEmail(email);
        s.setInstitutionalEmailNormalized(email.toLowerCase());
        s.setCareer(career);
        s.setStatus(status);
        s.setCreatedByAdmin(createdBy);
        s.setUpdatedByAdmin(createdBy);
        return studentRepository.save(s);
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
