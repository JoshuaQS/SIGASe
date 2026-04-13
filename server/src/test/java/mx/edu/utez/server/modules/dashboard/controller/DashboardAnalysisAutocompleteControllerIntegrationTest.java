package mx.edu.utez.server.modules.dashboard.controller;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.auth.repository.AdminPasswordResetTokenRepository;
import mx.edu.utez.server.modules.careers.entity.Career;
import mx.edu.utez.server.modules.careers.repository.CareerRepository;
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
import mx.edu.utez.server.shared.enums.Sex;
import mx.edu.utez.server.shared.enums.StudentStatus;
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
class DashboardAnalysisAutocompleteControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ElibroAccessLogRepository accessLogRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private StudentAuthEventRepository studentAuthEventRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private CareerRepository careerRepository;

    @Autowired
    private AdminPasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private ElibroConfigRepository elibroConfigRepository;

    @Autowired
    private ElibroValidationRunRepository validationRunRepository;

    @Autowired
    private AdminRepository adminRepository;

    private Admin adminTi;
    private Career sistemas;

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

        adminTi = saveAdmin("autocomplete.ti@utez.edu.mx", AdminRole.ADMIN_TI);
        sistemas = saveCareer("SIS", "Sistemas", CareerStatus.ACTIVE);
        Career industrial = saveCareer("IND", "Industrial", CareerStatus.INACTIVE);
        saveStudent("2026D001", "Juan", "Perez", "Lopez", sistemas, StudentStatus.ACTIVE);
        saveStudent("2026D002", "Juana", "Perez", "Soto", sistemas, StudentStatus.INACTIVE);
        saveStudent("2026D003", "Carlos", "Mendez", "Ruiz", industrial, StudentStatus.ACTIVE);
    }

    @Test
    void shouldReturnStudentSearchShapeAndRespectLimit() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard/analysis/students/search")
                        .with(auth(RoleConstants.ADMIN_TI))
                        .param("q", "2026D0")
                        .param("limit", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.query").value("2026D0"))
                .andExpect(jsonPath("$.data.limit").value(2))
                .andExpect(jsonPath("$.data.items.length()").value(2))
                .andExpect(jsonPath("$.data.items[0].displayLabel").value("2026D001 - Juan Perez Lopez"))
                .andExpect(jsonPath("$.data.items[0].subtitle").value("Sistemas | Activo"))
                .andExpect(jsonPath("$.data.items[0].enrollmentId").value("2026D001"))
                .andExpect(jsonPath("$.data.items[0].fullName").value("Juan Perez Lopez"))
                .andExpect(jsonPath("$.data.items[0].career.id").value(sistemas.getId().toString()))
                .andExpect(jsonPath("$.data.items[0].career.code").value("SIS"))
                .andExpect(jsonPath("$.data.items[0].career.name").value("Sistemas"))
                .andExpect(jsonPath("$.data.items[0].status").value("ACTIVE"));
    }

    @Test
    void shouldReturnCareerSearchShape() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard/analysis/careers/search")
                        .with(auth(RoleConstants.ADMIN_TI))
                        .param("q", "ind"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.query").value("ind"))
                .andExpect(jsonPath("$.data.limit").value(10))
                .andExpect(jsonPath("$.data.items.length()").value(1))
                .andExpect(jsonPath("$.data.items[0].displayLabel").value("IND - Industrial"))
                .andExpect(jsonPath("$.data.items[0].subtitle").value("Inactivo"))
                .andExpect(jsonPath("$.data.items[0].code").value("IND"))
                .andExpect(jsonPath("$.data.items[0].name").value("Industrial"))
                .andExpect(jsonPath("$.data.items[0].status").value("INACTIVE"));
    }

    @Test
    void shouldRejectBlankStudentQuery() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard/analysis/students/search")
                        .with(auth(RoleConstants.ADMIN_TI))
                        .param("q", " "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void shouldRejectCareerLimitOutOfRange() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard/analysis/careers/search")
                        .with(auth(RoleConstants.ADMIN_TI))
                        .param("q", "si")
                        .param("limit", "99"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    private RequestPostProcessor auth(String authority) {
        return SecurityMockMvcRequestPostProcessors.authentication(
                new UsernamePasswordAuthenticationToken(
                        "autocomplete-admin",
                        "N/A",
                        java.util.List.of(new SimpleGrantedAuthority(authority))
                )
        );
    }

    private Admin saveAdmin(String email, AdminRole role) {
        Admin admin = new Admin();
        admin.setEmail(email);
        admin.setName("Autocomplete");
        admin.setLastNamePaternal("Admin");
        admin.setPasswordHash("$2a$10$123456789012345678901u2sNfJ0wYl8Bv0p5Wn4eC6zYkM8d8vS.");
        admin.setRole(role);
        admin.setStatus(AdminStatus.ACTIVE);
        return adminRepository.save(admin);
    }

    private Career saveCareer(String code, String name, CareerStatus status) {
        Career career = new Career();
        career.setCode(code);
        career.setName(name);
        career.setStatus(status);
        return careerRepository.save(career);
    }

    private Student saveStudent(
            String enrollmentId,
            String name,
            String paternal,
            String maternal,
            Career career,
            StudentStatus status
    ) {
        Student student = new Student();
        student.setEnrollmentId(enrollmentId);
        student.setName(name);
        student.setLastNamePaternal(paternal);
        student.setLastNameMaternal(maternal);
        student.setSex(Sex.MALE);
        student.setQuarter(5);
        student.setInstitutionalEmail(enrollmentId.toLowerCase() + "@utez.edu.mx");
        student.setInstitutionalEmailNormalized(enrollmentId.toLowerCase() + "@utez.edu.mx");
        student.setCareer(career);
        student.setStatus(status);
        student.setCreatedByAdmin(adminTi);
        student.setUpdatedByAdmin(adminTi);
        return studentRepository.save(student);
    }
}
