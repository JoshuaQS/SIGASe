package mx.edu.utez.server.modules.dashboard.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.auth.repository.AdminPasswordResetTokenRepository;
import mx.edu.utez.server.modules.careers.entity.Career;
import mx.edu.utez.server.modules.careers.repository.CareerRepository;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisWidgetControlsRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardDateFilterType;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterScope;
import mx.edu.utez.server.modules.dashboard.dto.DashboardRankingMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAccessResultFilter;
import mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTableWidgetControlRequest;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class DashboardAnalysisControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

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

        adminTi = saveAdmin("dashboard.ti@utez.edu.mx", AdminRole.ADMIN_TI);
        sistemas = saveCareer("SIS", "Sistemas");
        Career industrial = saveCareer("IND", "Industrial");
        studentOne = saveStudent("2026D001", "one@utez.edu.mx", sistemas, StudentStatus.ACTIVE);
        studentTwo = saveStudent("2026D002", "two@utez.edu.mx", sistemas, StudentStatus.INACTIVE);
        studentThree = saveStudent("2026D003", "three@utez.edu.mx", industrial, StudentStatus.ACTIVE);
        saveElibroConfig();
        seedAccessLogs();
    }

    @Test
    void shouldReturnOverviewAnalysisResponseShape() throws Exception {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
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

        mockMvc.perform(post("/api/v1/dashboard/analysis")
                        .with(auth(adminTi.getId().toString(), RoleConstants.ADMIN_TI))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.layoutType").value("OVERVIEW"))
                .andExpect(jsonPath("$.data.widgets.length()").value(4))
                .andExpect(jsonPath("$.data.widgets[0].type").value("KPI_GROUP"))
                .andExpect(jsonPath("$.data.widgets[0].data.totalStudents").value(3))
                .andExpect(jsonPath("$.data.widgets[1].type").value("AREA_TREND"))
                .andExpect(jsonPath("$.data.widgets[1].data.points.length()").value(3))
                .andExpect(jsonPath("$.data.widgets[2].type").value("TOP_STUDENTS_TABLE"))
                .andExpect(jsonPath("$.data.widgets[2].data.students.length()").value(3))
                .andExpect(jsonPath("$.data.widgets[3].type").value("TOP_CAREERS_TABLE"))
                .andExpect(jsonPath("$.data.widgets[3].data.careers.length()").value(2));
    }

    @Test
    void shouldReturnStudentDetailAnalysisResponseShape() throws Exception {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
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

        mockMvc.perform(post("/api/v1/dashboard/analysis")
                        .with(auth(adminTi.getId().toString(), RoleConstants.ADMIN_TI))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.layoutType").value("STUDENT_DETAIL"))
                .andExpect(jsonPath("$.data.widgets.length()").value(4))
                .andExpect(jsonPath("$.data.widgets[0].type").value("KPI_GROUP"))
                .andExpect(jsonPath("$.data.widgets[0].data.totalStudents").value(1))
                .andExpect(jsonPath("$.data.widgets[1].type").value("AREA_TREND"))
                .andExpect(jsonPath("$.data.widgets[2].type").value("STUDENT_ACCESS_SUMMARY"))
                .andExpect(jsonPath("$.data.widgets[2].data.studentId").value(studentOne.getId().toString()))
                .andExpect(jsonPath("$.data.widgets[2].data.totalAccesses").value(3))
                .andExpect(jsonPath("$.data.widgets[3].type").value("STUDENT_ACTIVITY_TABLE"))
                .andExpect(jsonPath("$.data.widgets[3].config.page").value(0))
                .andExpect(jsonPath("$.data.widgets[3].config.sortBy").value("occurredAt"))
                .andExpect(jsonPath("$.data.widgets[3].data.totalElements").value(3))
                .andExpect(jsonPath("$.data.widgets[3].data.sortBy").value("occurredAt"))
                .andExpect(jsonPath("$.data.widgets[3].data.items.length()").value(3));
    }

    @Test
    void shouldReturnCareerDetailAnalysisResponseShape() throws Exception {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.INDIVIDUAL,
                null,
                java.util.List.of(sistemas.getId()),
                null,
                DashboardDateFilterType.CUSTOM_RANGE,
                Instant.parse("2026-03-20T00:00:00Z"),
                Instant.parse("2026-03-22T23:59:59Z"),
                DashboardRankingMode.NONE,
                null,
                null
        );

        mockMvc.perform(post("/api/v1/dashboard/analysis")
                        .with(auth(adminTi.getId().toString(), RoleConstants.ADMIN_TI))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.layoutType").value("CAREER_DETAIL"))
                .andExpect(jsonPath("$.data.widgets.length()").value(4))
                .andExpect(jsonPath("$.data.widgets[0].type").value("KPI_GROUP"))
                .andExpect(jsonPath("$.data.widgets[0].data.careerId").value(sistemas.getId().toString()))
                .andExpect(jsonPath("$.data.widgets[0].data.totalAccesses").value(4))
                .andExpect(jsonPath("$.data.widgets[1].type").value("AREA_TREND"))
                .andExpect(jsonPath("$.data.widgets[1].data.points.length()").value(3))
                .andExpect(jsonPath("$.data.widgets[2].type").value("CAREER_RESULT_BREAKDOWN"))
                .andExpect(jsonPath("$.data.widgets[2].data.items.length()").value(2))
                .andExpect(jsonPath("$.data.widgets[3].type").value("CAREER_STUDENT_TABLE"))
                .andExpect(jsonPath("$.data.widgets[3].config.page").value(0))
                .andExpect(jsonPath("$.data.widgets[3].config.sortBy").value("totalAccesses"))
                .andExpect(jsonPath("$.data.widgets[3].data.totalElements").value(2))
                .andExpect(jsonPath("$.data.widgets[3].data.sortBy").value("totalAccesses"))
                .andExpect(jsonPath("$.data.widgets[3].data.items.length()").value(2));
    }

    @Test
    void shouldApplyExplicitStudentActivityTableControls() throws Exception {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
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
                null,
                new DashboardAnalysisWidgetControlsRequest(
                        new DashboardTableWidgetControlRequest(1, 1, "latencyMs", DashboardSortDirection.ASC),
                        null
                )
        );

        mockMvc.perform(post("/api/v1/dashboard/analysis")
                        .with(auth(adminTi.getId().toString(), RoleConstants.ADMIN_TI))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.layoutType").value("STUDENT_DETAIL"))
                .andExpect(jsonPath("$.data.widgets[3].config.page").value(1))
                .andExpect(jsonPath("$.data.widgets[3].config.size").value(1))
                .andExpect(jsonPath("$.data.widgets[3].config.sortBy").value("latencyMs"))
                .andExpect(jsonPath("$.data.widgets[3].config.sortDirection").value("ASC"))
                .andExpect(jsonPath("$.data.widgets[3].data.page").value(1))
                .andExpect(jsonPath("$.data.widgets[3].data.size").value(1))
                .andExpect(jsonPath("$.data.widgets[3].data.sortBy").value("latencyMs"))
                .andExpect(jsonPath("$.data.widgets[3].data.sortDirection").value("ASC"))
                .andExpect(jsonPath("$.data.widgets[3].data.items.length()").value(1));
    }

    @Test
    void shouldApplyExplicitCareerStudentTableControls() throws Exception {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.INDIVIDUAL,
                null,
                java.util.List.of(sistemas.getId()),
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

        mockMvc.perform(post("/api/v1/dashboard/analysis")
                        .with(auth(adminTi.getId().toString(), RoleConstants.ADMIN_TI))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.layoutType").value("CAREER_DETAIL"))
                .andExpect(jsonPath("$.data.widgets[3].config.page").value(0))
                .andExpect(jsonPath("$.data.widgets[3].config.size").value(1))
                .andExpect(jsonPath("$.data.widgets[3].config.sortBy").value("studentName"))
                .andExpect(jsonPath("$.data.widgets[3].config.sortDirection").value("ASC"))
                .andExpect(jsonPath("$.data.widgets[3].data.page").value(0))
                .andExpect(jsonPath("$.data.widgets[3].data.size").value(1))
                .andExpect(jsonPath("$.data.widgets[3].data.sortBy").value("studentName"))
                .andExpect(jsonPath("$.data.widgets[3].data.sortDirection").value("ASC"))
                .andExpect(jsonPath("$.data.widgets[3].data.items.length()").value(1));
    }

    @Test
    void shouldRejectCareerScopeWithUnsupportedMode() throws Exception {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.ALL,
                null,
                java.util.List.of(sistemas.getId()),
                null,
                DashboardDateFilterType.CUSTOM_RANGE,
                Instant.parse("2026-03-20T00:00:00Z"),
                Instant.parse("2026-03-22T23:59:59Z"),
                DashboardRankingMode.NONE,
                null,
                null
        );

        mockMvc.perform(post("/api/v1/dashboard/analysis")
                        .with(auth(adminTi.getId().toString(), RoleConstants.ADMIN_TI))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void shouldRejectCareerDetailWithoutCareerId() throws Exception {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.INDIVIDUAL,
                null,
                java.util.List.of(),
                null,
                DashboardDateFilterType.CUSTOM_RANGE,
                Instant.parse("2026-03-20T00:00:00Z"),
                Instant.parse("2026-03-22T23:59:59Z"),
                DashboardRankingMode.NONE,
                null,
                null
        );

        mockMvc.perform(post("/api/v1/dashboard/analysis")
                        .with(auth(adminTi.getId().toString(), RoleConstants.ADMIN_TI))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void shouldRejectCareerDetailWithMultipleCareerIds() throws Exception {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.INDIVIDUAL,
                null,
                java.util.List.of(sistemas.getId(), studentThree.getCareer().getId()),
                null,
                DashboardDateFilterType.CUSTOM_RANGE,
                Instant.parse("2026-03-20T00:00:00Z"),
                Instant.parse("2026-03-22T23:59:59Z"),
                DashboardRankingMode.NONE,
                null,
                null
        );

        mockMvc.perform(post("/api/v1/dashboard/analysis")
                        .with(auth(adminTi.getId().toString(), RoleConstants.ADMIN_TI))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void shouldReturnStudentRankingResponseShapeAndKeepBaseUniverseUntouchedByTopN() throws Exception {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.STUDENTS,
                DashboardFilterMode.ALL,
                null,
                null,
                null,
                DashboardDateFilterType.CUSTOM_RANGE,
                Instant.parse("2026-03-20T00:00:00Z"),
                Instant.parse("2026-03-22T23:59:59Z"),
                DashboardRankingMode.TOP,
                1,
                null
        );

        mockMvc.perform(post("/api/v1/dashboard/analysis")
                        .with(auth(adminTi.getId().toString(), RoleConstants.ADMIN_TI))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.layoutType").value("STUDENT_RANKING"))
                .andExpect(jsonPath("$.data.summary.topN").value(1))
                .andExpect(jsonPath("$.data.widgets.length()").value(3))
                .andExpect(jsonPath("$.data.widgets[0].type").value("KPI_GROUP"))
                .andExpect(jsonPath("$.data.widgets[0].data.totalAccesses").value(5))
                .andExpect(jsonPath("$.data.widgets[0].data.uniqueStudentsImpacted").value(3))
                .andExpect(jsonPath("$.data.widgets[1].type").value("STUDENT_RANKING_TABLE"))
                .andExpect(jsonPath("$.data.widgets[1].data.topN").value(1))
                .andExpect(jsonPath("$.data.widgets[1].data.items.length()").value(1))
                .andExpect(jsonPath("$.data.widgets[1].data.items[0].studentId").value(studentOne.getId().toString()))
                .andExpect(jsonPath("$.data.widgets[2].type").value("STUDENT_RESULT_BREAKDOWN"))
                .andExpect(jsonPath("$.data.widgets[2].data.totalAccesses").value(5))
                .andExpect(jsonPath("$.data.widgets[2].data.items.length()").value(2));
    }

    @Test
    void shouldRejectStudentRankingWithoutTopN() throws Exception {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.STUDENTS,
                DashboardFilterMode.ALL,
                null,
                null,
                null,
                DashboardDateFilterType.CUSTOM_RANGE,
                Instant.parse("2026-03-20T00:00:00Z"),
                Instant.parse("2026-03-22T23:59:59Z"),
                DashboardRankingMode.TOP,
                null,
                null
        );

        mockMvc.perform(post("/api/v1/dashboard/analysis")
                        .with(auth(adminTi.getId().toString(), RoleConstants.ADMIN_TI))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void shouldReturnCareerRankingResponseShapeAndKeepBaseUniverseUntouchedByTopN() throws Exception {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.ALL,
                null,
                null,
                DashboardAccessResultFilter.SUCCESS,
                DashboardDateFilterType.CUSTOM_RANGE,
                Instant.parse("2026-03-20T00:00:00Z"),
                Instant.parse("2026-03-22T23:59:59Z"),
                DashboardRankingMode.TOP,
                1,
                null
        );

        mockMvc.perform(post("/api/v1/dashboard/analysis")
                        .with(auth(adminTi.getId().toString(), RoleConstants.ADMIN_TI))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.layoutType").value("CAREER_RANKING"))
                .andExpect(jsonPath("$.data.summary.topN").value(1))
                .andExpect(jsonPath("$.data.widgets.length()").value(3))
                .andExpect(jsonPath("$.data.widgets[0].type").value("KPI_GROUP"))
                .andExpect(jsonPath("$.data.widgets[0].data.totalAccesses").value(4))
                .andExpect(jsonPath("$.data.widgets[0].data.uniqueCareersImpacted").value(2))
                .andExpect(jsonPath("$.data.widgets[1].type").value("CAREER_RANKING_TABLE"))
                .andExpect(jsonPath("$.data.widgets[1].data.items.length()").value(1))
                .andExpect(jsonPath("$.data.widgets[1].data.items[0].careerId").value(sistemas.getId().toString()))
                .andExpect(jsonPath("$.data.widgets[2].type").value("CAREER_COMPARISON_TABLE"))
                .andExpect(jsonPath("$.data.widgets[2].data.totalCareers").value(2))
                .andExpect(jsonPath("$.data.widgets[2].data.items.length()").value(2));
    }

    @Test
    void shouldReturnCareerRankingSplitResponseShapeAndKeepBaseUniverseUntouchedByTopN() throws Exception {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.ALL,
                null,
                null,
                DashboardAccessResultFilter.ALL,
                DashboardDateFilterType.CUSTOM_RANGE,
                Instant.parse("2026-03-20T00:00:00Z"),
                Instant.parse("2026-03-22T23:59:59Z"),
                DashboardRankingMode.TOP,
                1,
                null
        );

        mockMvc.perform(post("/api/v1/dashboard/analysis")
                        .with(auth(adminTi.getId().toString(), RoleConstants.ADMIN_TI))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.layoutType").value("CAREER_RANKING_SPLIT"))
                .andExpect(jsonPath("$.data.summary.topN").value(1))
                .andExpect(jsonPath("$.data.widgets.length()").value(3))
                .andExpect(jsonPath("$.data.widgets[0].type").value("KPI_GROUP"))
                .andExpect(jsonPath("$.data.widgets[0].data.totalAccesses").value(5))
                .andExpect(jsonPath("$.data.widgets[0].data.uniqueCareersImpacted").value(2))
                .andExpect(jsonPath("$.data.widgets[1].type").value("CAREER_RANKING_SUCCESS_TABLE"))
                .andExpect(jsonPath("$.data.widgets[1].data.items.length()").value(1))
                .andExpect(jsonPath("$.data.widgets[2].type").value("CAREER_RANKING_FAILED_TABLE"))
                .andExpect(jsonPath("$.data.widgets[2].data.items.length()").value(1));
    }

    @Test
    void shouldRejectCareerRankingMultiWithoutCareerIds() throws Exception {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.MULTI,
                null,
                java.util.List.of(),
                DashboardAccessResultFilter.ALL,
                DashboardDateFilterType.CUSTOM_RANGE,
                Instant.parse("2026-03-20T00:00:00Z"),
                Instant.parse("2026-03-22T23:59:59Z"),
                DashboardRankingMode.TOP,
                10,
                null
        );

        mockMvc.perform(post("/api/v1/dashboard/analysis")
                        .with(auth(adminTi.getId().toString(), RoleConstants.ADMIN_TI))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void shouldRejectInvalidWidgetControlsForUnsupportedLayout() throws Exception {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
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
                null,
                new DashboardAnalysisWidgetControlsRequest(
                        new DashboardTableWidgetControlRequest(0, 10, "occurredAt", DashboardSortDirection.DESC),
                        null
                )
        );

        mockMvc.perform(post("/api/v1/dashboard/analysis")
                        .with(auth(adminTi.getId().toString(), RoleConstants.ADMIN_TI))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
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
        config.setName("Configuración Dashboard eLibro");
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
                        java.util.List.of(new SimpleGrantedAuthority(role))
                )
        );
    }
}
