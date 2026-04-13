package mx.edu.utez.server.modules.dashboard.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayInputStream;
import java.time.Instant;
import java.util.List;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.auth.repository.AdminPasswordResetTokenRepository;
import mx.edu.utez.server.modules.careers.entity.Career;
import mx.edu.utez.server.modules.careers.repository.CareerRepository;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAccessResultFilter;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisExportRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisWidgetControlsRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardDateFilterType;
import mx.edu.utez.server.modules.dashboard.dto.DashboardExportFormat;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterScope;
import mx.edu.utez.server.modules.dashboard.dto.DashboardLayoutType;
import mx.edu.utez.server.modules.dashboard.dto.DashboardRankingMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTableWidgetControlRequest;
import mx.edu.utez.server.modules.dashboard.service.analysis.DashboardAnalysisService;
import mx.edu.utez.server.modules.elibro.entity.ElibroAccessLog;
import mx.edu.utez.server.modules.elibro.entity.ElibroConfig;
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
import mx.edu.utez.server.shared.enums.ElibroConfigStatus;
import mx.edu.utez.server.shared.enums.ElibroValidationStatus;
import mx.edu.utez.server.shared.enums.Sex;
import mx.edu.utez.server.shared.enums.StudentStatus;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class DashboardAnalysisExportControllerIntegrationTest {

    private static final DataFormatter DATA_FORMATTER = new DataFormatter();

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private DashboardAnalysisService dashboardAnalysisService;

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
    private AdminPasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private CareerRepository careerRepository;

    private Admin adminTi;
    private Career sistemas;
    private Career industrial;
    private Student studentOne;
    private Student studentTwo;
    private Student studentThree;

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

        adminTi = saveAdmin("dashboard.export@utez.edu.mx", AdminRole.ADMIN_TI);
        sistemas = saveCareer("SIS", "Sistemas");
        industrial = saveCareer("IND", "Industrial");
        studentOne = saveStudent("2026D001", "one@utez.edu.mx", sistemas, StudentStatus.ACTIVE);
        studentTwo = saveStudent("2026D002", "two@utez.edu.mx", sistemas, StudentStatus.INACTIVE);
        studentThree = saveStudent("2026D003", "three@utez.edu.mx", industrial, StudentStatus.ACTIVE);
        saveElibroConfig();
        seedAccessLogs();
    }

    @Test
    void shouldExportAllSupportedLayoutsAsCsv() throws Exception {
        List<LayoutExportCase> cases = List.of(
                new LayoutExportCase(DashboardLayoutType.OVERVIEW, overviewRequest()),
                new LayoutExportCase(DashboardLayoutType.STUDENT_DETAIL, studentDetailRequest()),
                new LayoutExportCase(DashboardLayoutType.CAREER_DETAIL, careerDetailRequest()),
                new LayoutExportCase(DashboardLayoutType.STUDENT_RANKING, studentRankingRequest(1)),
                new LayoutExportCase(DashboardLayoutType.CAREER_RANKING, careerRankingRequest(1)),
                new LayoutExportCase(DashboardLayoutType.CAREER_RANKING_SPLIT, careerRankingSplitRequest(1))
        );

        for (LayoutExportCase exportCase : cases) {
            MvcResult result = performExport(exportCase.request(), DashboardExportFormat.CSV);
            String body = result.getResponse().getContentAsString();

            assertThat(result.getResponse().getStatus()).isEqualTo(200);
            assertThat(result.getResponse().getContentType()).isEqualTo("text/csv;charset=UTF-8");
            assertThat(result.getResponse().getHeader(HttpHeaders.CONTENT_DISPOSITION))
                    .contains("attachment; filename=\"dashboard-analysis_")
                    .contains(".csv\"");
            assertThat(body).contains("layoutType," + exportCase.layoutType().name());
            assertThat(body).contains("Filter Summary");
            assertThat(body).contains("Widget:");
        }
    }

    @Test
    void shouldExportStudentDetailAsXlsxWithExpectedSheets() throws Exception {
        MvcResult result = performExport(studentDetailRequest(), DashboardExportFormat.XLSX);

        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        assertThat(result.getResponse().getHeader(HttpHeaders.CONTENT_TYPE))
                .isEqualTo("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        assertThat(result.getResponse().getHeader(HttpHeaders.CONTENT_DISPOSITION)).contains(".xlsx\"");

        try (Workbook workbook = WorkbookFactory.create(new ByteArrayInputStream(result.getResponse().getContentAsByteArray()))) {
            assertThat(workbook.getNumberOfSheets()).isEqualTo(5);
            assertThat(workbook.getSheet("Resumen")).isNotNull();
            assertThat(workbook.getSheet("01_student-detail-kpis")).isNotNull();
            assertThat(workbook.getSheet("02_student-detail-trend")).isNotNull();
            assertThat(workbook.getSheet("03_student-access-summary")).isNotNull();
            assertThat(workbook.getSheet("04_student-activity-table")).isNotNull();
            assertThat(sheetContainsValue(workbook.getSheet("Resumen"), "Layout: STUDENT_DETAIL")).isTrue();
            assertThat(findValueByFirstCell(workbook.getSheet("04_student-activity-table"), "totalElements")).isEqualTo("3");
        }
    }

    @Test
    void shouldKeepExportParityForStudentRankingAndNotTruncateKpisByTopN() throws Exception {
        DashboardAnalysisRequest request = studentRankingRequest(1);
        DashboardAnalysisResponse analysisResponse = dashboardAnalysisService.analyze(request);

        MvcResult result = performExport(request, DashboardExportFormat.XLSX);

        try (Workbook workbook = WorkbookFactory.create(new ByteArrayInputStream(result.getResponse().getContentAsByteArray()))) {
            JsonNode rankingKpis = widgetData(analysisResponse, "student-ranking-kpis");
            JsonNode rankingTable = widgetData(analysisResponse, "student-ranking-table");
            JsonNode rankingBreakdown = widgetData(analysisResponse, "student-result-breakdown");

            assertThat(sheetContainsValue(workbook.getSheet("Resumen"), "Layout: STUDENT_RANKING")).isTrue();
            assertThat(findValueByFirstCell(workbook.getSheet("01_student-ranking-kpis"), "totalAccesses"))
                    .isEqualTo(rankingKpis.get("totalAccesses").asText());
            assertThat(findValueByFirstCell(workbook.getSheet("03_student-result-breakdown"), "totalAccesses"))
                    .isEqualTo(rankingBreakdown.get("totalAccesses").asText());
            assertThat(findValueByFirstCell(workbook.getSheet("02_student-ranking-table"), "totalCandidates"))
                    .isEqualTo(rankingTable.get("totalCandidates").asText());
            assertThat(countRowsAfterHeader(workbook.getSheet("02_student-ranking-table"), "position")).isEqualTo(1);
            assertThat(rankingKpis.get("totalAccesses").asLong()).isGreaterThan(1L);
        }
    }

    @Test
    void shouldKeepExportParityForCareerDetailTableControls() throws Exception {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.INDIVIDUAL,
                null,
                List.of(sistemas.getId()),
                null,
                DashboardDateFilterType.CUSTOM_RANGE,
                Instant.parse("2026-03-20T00:00:00Z"),
                Instant.parse("2026-03-22T23:59:59Z"),
                DashboardRankingMode.NONE,
                null,
                null,
                new DashboardAnalysisWidgetControlsRequest(
                        null,
                        new DashboardTableWidgetControlRequest(0, 1, "studentName", DashboardSortDirection.ASC)
                )
        );
        DashboardAnalysisResponse analysisResponse = dashboardAnalysisService.analyze(request);

        MvcResult result = performExport(request, DashboardExportFormat.XLSX);

        try (Workbook workbook = WorkbookFactory.create(new ByteArrayInputStream(result.getResponse().getContentAsByteArray()))) {
            JsonNode careerTable = widgetData(analysisResponse, "career-student-table");

            assertThat(sheetContainsValue(workbook.getSheet("Resumen"), "Layout: CAREER_DETAIL")).isTrue();
            assertThat(findValueByFirstCell(workbook.getSheet("04_career-student-table"), "page"))
                    .isEqualTo(careerTable.get("page").asText());
            assertThat(findValueByFirstCell(workbook.getSheet("04_career-student-table"), "size"))
                    .isEqualTo(careerTable.get("size").asText());
            assertThat(findValueByFirstCell(workbook.getSheet("04_career-student-table"), "sortBy"))
                    .isEqualTo(careerTable.get("sortBy").asText());
            assertThat(findValueByFirstCell(workbook.getSheet("04_career-student-table"), "sortDirection"))
                    .isEqualTo(careerTable.get("sortDirection").asText());
            assertThat(countRowsAfterHeader(workbook.getSheet("04_career-student-table"), "studentId")).isEqualTo(1);
        }
    }

    @Test
    void shouldRejectMissingExportBody() throws Exception {
        mockMvc.perform(post("/api/v1/dashboard/analysis/export")
                        .with(auth(adminTi.getId().toString(), RoleConstants.ADMIN_TI))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(header().doesNotExist(HttpHeaders.CONTENT_DISPOSITION));
    }

    private MvcResult performExport(DashboardAnalysisRequest analysis, DashboardExportFormat format) throws Exception {
        DashboardAnalysisExportRequest exportRequest = new DashboardAnalysisExportRequest(analysis, format);
        return mockMvc.perform(post("/api/v1/dashboard/analysis/export")
                        .with(auth(adminTi.getId().toString(), RoleConstants.ADMIN_TI))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(exportRequest)))
                .andExpect(status().isOk())
                .andReturn();
    }

    private JsonNode widgetData(DashboardAnalysisResponse response, String widgetId) {
        return response.widgets().stream()
                .filter(widget -> widget.widgetId().equals(widgetId))
                .findFirst()
                .map(widget -> objectMapper.convertValue(widget.data(), JsonNode.class))
                .orElseThrow(() -> new AssertionError("No se encontró widget " + widgetId));
    }

    private boolean sheetContainsValue(Sheet sheet, String expectedValue) {
        for (Row row : sheet) {
            for (Cell cell : row) {
                if (expectedValue.equals(cellValue(cell))) {
                    return true;
                }
            }
        }
        return false;
    }

    private String findValueByFirstCell(Sheet sheet, String key) {
        for (Row row : sheet) {
            if (key.equals(cellValue(row.getCell(0)))) {
                return cellValue(row.getCell(1));
            }
        }
        throw new AssertionError("No se encontró la clave " + key + " en el sheet " + sheet.getSheetName());
    }

    private int countRowsAfterHeader(Sheet sheet, String headerKey) {
        boolean headerFound = false;
        int count = 0;
        for (Row row : sheet) {
            String firstCell = cellValue(row.getCell(0));
            if (!headerFound) {
                if (headerKey.equals(firstCell)) {
                    headerFound = true;
                }
                continue;
            }
            if (firstCell.isBlank()) {
                break;
            }
            count++;
        }
        return count;
    }

    private String cellValue(Cell cell) {
        if (cell == null) {
            return "";
        }
        return DATA_FORMATTER.formatCellValue(cell);
    }

    private DashboardAnalysisRequest overviewRequest() {
        return new DashboardAnalysisRequest(
                DashboardFilterScope.STUDENTS,
                DashboardFilterMode.ALL,
                null,
                null,
                null,
                DashboardDateFilterType.CUSTOM_RANGE,
                Instant.parse("2026-03-20T00:00:00Z"),
                Instant.parse("2026-03-22T23:59:59Z"),
                DashboardRankingMode.NONE,
                null,
                null
        );
    }

    private DashboardAnalysisRequest studentDetailRequest() {
        return new DashboardAnalysisRequest(
                DashboardFilterScope.STUDENTS,
                DashboardFilterMode.INDIVIDUAL,
                studentOne.getId(),
                null,
                null,
                DashboardDateFilterType.CUSTOM_RANGE,
                Instant.parse("2026-03-20T00:00:00Z"),
                Instant.parse("2026-03-22T23:59:59Z"),
                DashboardRankingMode.NONE,
                null,
                null
        );
    }

    private DashboardAnalysisRequest careerDetailRequest() {
        return new DashboardAnalysisRequest(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.INDIVIDUAL,
                null,
                List.of(sistemas.getId()),
                null,
                DashboardDateFilterType.CUSTOM_RANGE,
                Instant.parse("2026-03-20T00:00:00Z"),
                Instant.parse("2026-03-22T23:59:59Z"),
                DashboardRankingMode.NONE,
                null,
                null
        );
    }

    private DashboardAnalysisRequest studentRankingRequest(int topN) {
        return new DashboardAnalysisRequest(
                DashboardFilterScope.STUDENTS,
                DashboardFilterMode.ALL,
                null,
                null,
                null,
                DashboardDateFilterType.CUSTOM_RANGE,
                Instant.parse("2026-03-20T00:00:00Z"),
                Instant.parse("2026-03-22T23:59:59Z"),
                DashboardRankingMode.TOP,
                topN,
                null
        );
    }

    private DashboardAnalysisRequest careerRankingRequest(int topN) {
        return new DashboardAnalysisRequest(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.ALL,
                null,
                null,
                DashboardAccessResultFilter.SUCCESS,
                DashboardDateFilterType.CUSTOM_RANGE,
                Instant.parse("2026-03-20T00:00:00Z"),
                Instant.parse("2026-03-22T23:59:59Z"),
                DashboardRankingMode.TOP,
                topN,
                null
        );
    }

    private DashboardAnalysisRequest careerRankingSplitRequest(int topN) {
        return new DashboardAnalysisRequest(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.ALL,
                null,
                null,
                DashboardAccessResultFilter.ALL,
                DashboardDateFilterType.CUSTOM_RANGE,
                Instant.parse("2026-03-20T00:00:00Z"),
                Instant.parse("2026-03-22T23:59:59Z"),
                DashboardRankingMode.TOP,
                topN,
                null
        );
    }

    private void seedAccessLogs() {
        saveAccessLog(studentOne, ElibroAccessResult.SUCCESS, "2026-03-20T10:00:00Z");
        saveAccessLog(studentTwo, ElibroAccessResult.SUCCESS, "2026-03-20T11:00:00Z");
        saveAccessLog(studentOne, ElibroAccessResult.SUCCESS, "2026-03-21T09:00:00Z");
        saveAccessLog(studentOne, ElibroAccessResult.FAILED_ELIBRO_API, "2026-03-21T10:00:00Z");
        saveAccessLog(studentThree, ElibroAccessResult.SUCCESS, "2026-03-22T08:00:00Z");
        saveAccessLog(null, ElibroAccessResult.FAILED_INTERNAL_ERROR, "2026-03-22T09:00:00Z");
    }

    private void saveElibroConfig() {
        ElibroConfig config = new ElibroConfig();
        config.setName("Configuración Dashboard Export");
        config.setAuthTokenEncrypted("enc-token");
        config.setChannelIdEncrypted("enc-channel-id");
        config.setChannelSecretEncrypted("enc-channel-secret");
        config.setChannelName("UTEZ");
        config.setNextUrl("https://elibro.net/es/lc/utez/inicio");
        config.setStatus(ElibroConfigStatus.ACTIVE);
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
        admin.setPasswordHash("$2a$10$123456789012345678901u2sNfJ0wYl8Bv0p5Wn4eC6zYkM8d8vS.");
        admin.setRole(role);
        admin.setStatus(AdminStatus.ACTIVE);
        return adminRepository.save(admin);
    }

    private Career saveCareer(String code, String name) {
        Career career = new Career();
        career.setCode(code);
        career.setName(name);
        career.setStatus(CareerStatus.ACTIVE);
        return careerRepository.save(career);
    }

    private Student saveStudent(String matricula, String email, Career career, StudentStatus status) {
        Student student = new Student();
        student.setEnrollmentId(matricula);
        student.setName("Student " + matricula);
        student.setLastNamePaternal("Paterno");
        student.setLastNameMaternal("Materno");
        student.setSex(Sex.MALE);
        student.setQuarter(5);
        student.setInstitutionalEmail(email);
        student.setInstitutionalEmailNormalized(email);
        student.setCareer(career);
        student.setStatus(status);
        student.setCreatedByAdmin(adminTi);
        student.setUpdatedByAdmin(adminTi);
        return studentRepository.save(student);
    }

    private void saveAccessLog(Student student, ElibroAccessResult result, String occurredAt) {
        ElibroAccessLog log = new ElibroAccessLog();
        log.setStudent(student);
        log.setAttemptedEmail(student != null ? student.getInstitutionalEmail() : "missing@utez.edu.mx");
        log.setNormalizedEmail(student != null ? student.getInstitutionalEmailNormalized() : "missing@utez.edu.mx");
        log.setResult(result);
        log.setLatencyMs(120L);
        log.setRequestId("req-" + occurredAt);
        log.setCorrelationId("corr-" + occurredAt);
        log.setOccurredAt(Instant.parse(occurredAt));
        accessLogRepository.save(log);
    }

    private RequestPostProcessor auth(String subject, String role) {
        return SecurityMockMvcRequestPostProcessors.authentication(
                new UsernamePasswordAuthenticationToken(
                        subject,
                        "N/A",
                        List.of(new SimpleGrantedAuthority(role))
                )
        );
    }

    private record LayoutExportCase(
            DashboardLayoutType layoutType,
            DashboardAnalysisRequest request
    ) {
    }
}
