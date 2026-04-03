package mx.edu.utez.server.modules.students.controller;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.auth.repository.AdminPasswordResetTokenRepository;
import mx.edu.utez.server.modules.careers.entity.Career;
import mx.edu.utez.server.modules.careers.repository.CareerRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroConfigRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroValidationRunRepository;
import mx.edu.utez.server.modules.logs.access.repository.AccessLogRepository;
import mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.security.RoleConstants;
import mx.edu.utez.server.shared.enums.AdminRole;
import mx.edu.utez.server.shared.enums.Sex;
import mx.edu.utez.server.shared.enums.StudentStatus;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
class StudentImportIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private StudentRepository studentRepository;
    @Autowired private AdminRepository adminRepository;
    @Autowired private AdminPasswordResetTokenRepository passwordResetTokenRepository;
    @Autowired private AccessLogRepository accessLogRepository;
    @Autowired private AuditLogRepository auditLogRepository;
    @Autowired private ElibroConfigRepository elibroConfigRepository;
    @Autowired private ElibroValidationRunRepository validationRunRepository;
    @Autowired private CareerRepository careerRepository;

    private Admin adminTi;

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
        saveCareer("DSM", "Desarrollo de Software Multiplataforma");
        saveCareer("IRD", "Infraestructura en Redes Digitales");
    }

    // ── Valid CSV ───────────────────────────────────────────────────────

    @Test
    void shouldImportValidCsvSuccessfully() throws Exception {
        String csv = csvHeader()
                + "2026A0001,Alice,Paternal,Maternal,alice@utez.edu.mx,DSM,3,FEMALE\n"
                + "2026A0002,Bob,Gomez,,bob@utez.edu.mx,IRD,5,MALE\n";

        MockMultipartFile file = csvFile(csv);

        mockMvc.perform(multipart("/api/v1/students/import")
                        .file(file)
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.totalRows", is(2)))
                .andExpect(jsonPath("$.data.successCount", is(2)))
                .andExpect(jsonPath("$.data.errorCount", is(0)))
                .andExpect(jsonPath("$.data.errors", hasSize(0)));
    }

    // ── Row-level validation errors ────────────────────────────────────

    @Test
    void shouldReportRowLevelValidationErrors() throws Exception {
        String csv = csvHeader()
                + ",Alice,Paternal,Maternal,alice@utez.edu.mx,DSM,3,FEMALE\n"  // missing enrollmentId
                + "2026A0003,Bob,Gomez,,invalid-email,IRD,5,MALE\n";            // invalid email

        MockMultipartFile file = csvFile(csv);

        mockMvc.perform(multipart("/api/v1/students/import")
                        .file(file)
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalRows", is(2)))
                .andExpect(jsonPath("$.data.successCount", is(0)))
                .andExpect(jsonPath("$.data.errorCount", is(2)))
                .andExpect(jsonPath("$.data.errors[0].errorCode", is("MISSING_ENROLLMENT_ID")))
                .andExpect(jsonPath("$.data.errors[1].errorCode", is("INVALID_EMAIL")));
    }

    // ── Duplicate matricula in file ────────────────────────────────────

    @Test
    void shouldReportDuplicateMatriculaInFile() throws Exception {
        String csv = csvHeader()
                + "2026A0010,Alice,Paternal,Maternal,alice10@utez.edu.mx,DSM,3,FEMALE\n"
                + "2026A0010,Bob,Gomez,,bob10@utez.edu.mx,IRD,5,MALE\n";

        MockMultipartFile file = csvFile(csv);

        mockMvc.perform(multipart("/api/v1/students/import")
                        .file(file)
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.errorCount", is(2)))
                .andExpect(jsonPath("$.data.errors[0].errorCode", is("DUPLICATE_ENROLLMENT_ID_IN_FILE")))
                .andExpect(jsonPath("$.data.errors[1].errorCode", is("DUPLICATE_ENROLLMENT_ID_IN_FILE")));
    }

    // ── Duplicate email in file ────────────────────────────────────────

    @Test
    void shouldReportDuplicateEmailInFile() throws Exception {
        String csv = csvHeader()
                + "2026A0020,Alice,Paternal,Maternal,shared@utez.edu.mx,DSM,3,FEMALE\n"
                + "2026A0021,Bob,Gomez,,shared@utez.edu.mx,IRD,5,MALE\n";

        MockMultipartFile file = csvFile(csv);

        mockMvc.perform(multipart("/api/v1/students/import")
                        .file(file)
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.errorCount", is(2)))
                .andExpect(jsonPath("$.data.errors[0].errorCode", is("DUPLICATE_EMAIL_IN_FILE")))
                .andExpect(jsonPath("$.data.errors[1].errorCode", is("DUPLICATE_EMAIL_IN_FILE")));
    }

    // ── Duplicate matricula in DB ──────────────────────────────────────

    @Test
    void shouldReportDuplicateMatriculaInDb() throws Exception {
        saveStudent(adminTi, "2026A0030", "existing30@utez.edu.mx", "DSM", StudentStatus.ACTIVE);

        String csv = csvHeader()
                + "2026A0030,Alice,Paternal,Maternal,new30@utez.edu.mx,DSM,3,FEMALE\n";

        MockMultipartFile file = csvFile(csv);

        mockMvc.perform(multipart("/api/v1/students/import")
                        .file(file)
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.errorCount", is(1)))
                .andExpect(jsonPath("$.data.errors[0].errorCode", is("DUPLICATE_ENROLLMENT_ID_IN_DB")));
    }

    // ── Duplicate email in DB ──────────────────────────────────────────

    @Test
    void shouldReportDuplicateEmailInDb() throws Exception {
        saveStudent(adminTi, "2026A0040", "existing40@utez.edu.mx", "DSM", StudentStatus.ACTIVE);

        String csv = csvHeader()
                + "2026A0041,Alice,Paternal,Maternal,existing40@utez.edu.mx,DSM,3,FEMALE\n";

        MockMultipartFile file = csvFile(csv);

        mockMvc.perform(multipart("/api/v1/students/import")
                        .file(file)
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.errorCount", is(1)))
                .andExpect(jsonPath("$.data.errors[0].errorCode", is("DUPLICATE_EMAIL_IN_DB")));
    }

    // ── Empty file ─────────────────────────────────────────────────────

    @Test
    void shouldRejectEmptyFile() throws Exception {
        MockMultipartFile file = csvFile("");

        mockMvc.perform(multipart("/api/v1/students/import")
                        .file(file)
                        .with(auth(adminTi, RoleConstants.ADMIN_TI)))
                .andExpect(status().isBadRequest());
    }

    // ── RBAC: student role rejected ────────────────────────────────────

    @Test
    void shouldRejectImportForStudentRole() throws Exception {
        String csv = csvHeader()
                + "2026A0050,Alice,Paternal,Maternal,alice50@utez.edu.mx,DSM,3,FEMALE\n";

        MockMultipartFile file = csvFile(csv);

        mockMvc.perform(multipart("/api/v1/students/import")
                        .file(file)
                        .with(auth(adminTi, RoleConstants.STUDENT)))
                .andExpect(status().isForbidden());
    }

    // ── Helpers ────────────────────────────────────────────────────────

    private String csvHeader() {
        return "enrollmentId,name,lastNamePaternal,lastNameMaternal,institutionalEmail,careerCode,quarter,sex\n";
    }

    private MockMultipartFile csvFile(String content) {
        return new MockMultipartFile(
                "file", "students.csv", "text/csv",
                content.getBytes(StandardCharsets.UTF_8)
        );
    }

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

    private Student saveStudent(Admin createdBy, String matricula, String email, String careerCode, StudentStatus status) {
        Student s = new Student();
        s.setEnrollmentId(matricula);
        s.setName("Student");
        s.setLastNamePaternal("Paternal");
        s.setLastNameMaternal("Maternal");
        s.setSex(Sex.NON_BINARY);
        s.setQuarter(3);
        s.setInstitutionalEmail(email);
        s.setInstitutionalEmailNormalized(email.toLowerCase());
        s.setCareer(resolveCareer(careerCode));
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

    private Career resolveCareer(String code) {
        return careerRepository.findByCodeIgnoreCase(code)
                .orElseThrow(() -> new IllegalStateException("Career not seeded for test code: " + code));
    }
}
