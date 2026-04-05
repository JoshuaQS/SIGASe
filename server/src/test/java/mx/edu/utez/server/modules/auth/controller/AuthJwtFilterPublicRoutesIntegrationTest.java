package mx.edu.utez.server.modules.auth.controller;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.auth.service.GoogleIdentity;
import mx.edu.utez.server.modules.auth.service.GoogleTokenVerifierService;
import mx.edu.utez.server.modules.careers.entity.Career;
import mx.edu.utez.server.modules.careers.repository.CareerRepository;
import mx.edu.utez.server.modules.logs.access.repository.AccessLogRepository;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.shared.api.ApiRoutes;
import mx.edu.utez.server.shared.enums.AdminRole;
import mx.edu.utez.server.shared.enums.Sex;
import mx.edu.utez.server.shared.enums.StudentStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class AuthJwtFilterPublicRoutesIntegrationTest {

    private static final String STUDENT_AUTH_BASE = ApiRoutes.httpPath(ApiRoutes.AUTH_STUDENT);
    private static final String ADMIN_AUTH_BASE = ApiRoutes.httpPath(ApiRoutes.AUTH_ADMIN);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private CareerRepository careerRepository;

    @Autowired
    private AccessLogRepository accessLogRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockBean
    private GoogleTokenVerifierService googleTokenVerifierService;

    @BeforeEach
    void setUp() {
        accessLogRepository.deleteAll();
        studentRepository.deleteAll();
        careerRepository.deleteAll();
        adminRepository.deleteAll();

        Admin admin = new Admin();
        admin.setEmail("admin.ti@utez.edu.mx");
        admin.setName("Admin");
        admin.setLastNamePaternal("TI");
        admin.setPasswordHash(passwordEncoder.encode("AdminPass.123"));
        admin.setRole(AdminRole.ADMIN_TI);
        admin.setActive(true);
        admin = adminRepository.save(admin);

        Career career = new Career();
        career.setCode("SIS");
        career.setName("Sistemas");
        career = careerRepository.save(career);

        Student student = new Student();
        student.setEnrollmentId("26FLT001");
        student.setName("Test");
        student.setLastNamePaternal("Filtro");
        student.setLastNameMaternal("Google");
        student.setSex(Sex.NON_BINARY);
        student.setQuarter(2);
        student.setInstitutionalEmail("test@utez.edu.mx");
        student.setInstitutionalEmailNormalized("test@utez.edu.mx");
        student.setCareer(career);
        student.setStatus(StudentStatus.ACTIVE);
        student.setCreatedByAdmin(admin);
        student.setUpdatedByAdmin(admin);
        student.setPasswordHash(passwordEncoder.encode("password123"));
        student.setMustChangePassword(false);
        studentRepository.save(student);
    }

    @Test
    void shouldAllowGoogleLoginWhenPublicRouteHasInvalidBearer() throws Exception {
        when(googleTokenVerifierService.verify(anyString()))
                .thenReturn(new GoogleIdentity("google-sub-1", "test@utez.edu.mx", true));

        mockMvc.perform(post(STUDENT_AUTH_BASE + "/google")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer invalid.jwt.value")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"idToken":"google-id-token"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").isNotEmpty());

        verify(googleTokenVerifierService).verify("google-id-token");
    }

    @Test
    void shouldAllowGoogleLoginOnPublicRouteWithoutAuthorizationHeader() throws Exception {
        when(googleTokenVerifierService.verify(anyString()))
                .thenReturn(new GoogleIdentity("google-sub-2", "test@utez.edu.mx", true));

        mockMvc.perform(post(STUDENT_AUTH_BASE + "/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"idToken":"google-id-token-2"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").isNotEmpty());
    }

    @Test
    void shouldRejectProtectedRouteWhenBearerIsInvalid() throws Exception {
        mockMvc.perform(get(STUDENT_AUTH_BASE + "/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer invalid.jwt.value"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("INVALID_TOKEN"));
    }

    @Test
    void shouldAllowStudentPasswordLoginEvenIfAuthorizationHeaderIsInvalid() throws Exception {
        mockMvc.perform(post(STUDENT_AUTH_BASE + "/login")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer expired.jwt.value")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"test@utez.edu.mx","password":"password123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").isNotEmpty());
    }

    @Test
    void shouldAllowAdminLoginEvenIfAuthorizationHeaderIsInvalid() throws Exception {
        mockMvc.perform(post(ADMIN_AUTH_BASE + "/login")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer expired.jwt.value")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"admin.ti@utez.edu.mx","password":"AdminPass.123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty());
    }
}
