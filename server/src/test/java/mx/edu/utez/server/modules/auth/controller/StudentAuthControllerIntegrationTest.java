package mx.edu.utez.server.modules.auth.controller;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.auth.entity.StudentPasswordResetToken;
import mx.edu.utez.server.modules.auth.repository.StudentPasswordResetTokenRepository;
import mx.edu.utez.server.modules.careers.entity.Career;
import mx.edu.utez.server.modules.careers.repository.CareerRepository;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.shared.api.ApiRoutes;
import mx.edu.utez.server.shared.enums.AdminRole;
import mx.edu.utez.server.shared.enums.Sex;
import mx.edu.utez.server.shared.enums.StudentStatus;
import mx.edu.utez.server.shared.validation.PasswordPolicy;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class StudentAuthControllerIntegrationTest {

    private static final String BASE = "/api/v1/auth/student";

    /** Cumple {@link PasswordPolicy}; usar en tests que cambian contraseña o reset. */
    private static final String COMPLIANT_NEW_PASSWORD = "ValidPass1!xZ";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private CareerRepository careerRepository;

    @Autowired
    private PasswordEncoder encoder;

    @Autowired
    private StudentPasswordResetTokenRepository resetTokenRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private Admin admin;
    private Student activeStudent;

    @BeforeEach
    void setup() {
        resetTokenRepository.deleteAll();
        studentRepository.deleteAll();
        careerRepository.deleteAll();
        adminRepository.deleteAll();

        admin = saveAdmin("admin.ti@utez.edu.mx", AdminRole.ADMIN_TI);
        Career sistemas = saveCareer("SIS", "Sistemas");
        activeStudent = new Student();
        activeStudent.setEnrollmentId("2026AUTH01");
        activeStudent.setName("Auth Test");
        activeStudent.setLastNamePaternal("Paternal");
        activeStudent.setLastNameMaternal("Maternal");
        activeStudent.setSex(Sex.NON_BINARY);
        activeStudent.setQuarter(3);
        activeStudent.setInstitutionalEmail("test@utez.edu.mx");
        activeStudent.setInstitutionalEmailNormalized("test@utez.edu.mx");
        activeStudent.setCareer(sistemas);
        activeStudent.setStatus(StudentStatus.ACTIVE);
        activeStudent.setCreatedByAdmin(admin);
        activeStudent.setUpdatedByAdmin(admin);
        activeStudent.setPasswordHash(encoder.encode("password123"));
        activeStudent.setMustChangePassword(false);
        studentRepository.save(activeStudent);
    }

    @Test
    void loginLocal_validCredentials_returns200WithToken() throws Exception {
        mockMvc.perform(post(BASE + "/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"test@utez.edu.mx","password":"password123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.mustChangePassword").value(false));
    }

    @Test
    void loginLocal_invalidPassword_returns401() throws Exception {
        mockMvc.perform(post(BASE + "/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"test@utez.edu.mx","password":"wrong"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginLocal_nonExistentEmail_returns401() throws Exception {
        mockMvc.perform(post(BASE + "/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"noexist@utez.edu.mx","password":"any"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginLocal_inactiveStudent_returns403() throws Exception {
        activeStudent.setStatus(StudentStatus.INACTIVE);
        studentRepository.save(activeStudent);

        mockMvc.perform(post(BASE + "/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"test@utez.edu.mx","password":"password123"}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void loginLocal_mustChangePassword_trueInResponse() throws Exception {
        activeStudent.setMustChangePassword(true);
        studentRepository.save(activeStudent);

        mockMvc.perform(post(BASE + "/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"test@utez.edu.mx","password":"password123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.mustChangePassword").value(true));
    }

    @Test
    void mustChangePassword_allowsGetMe() throws Exception {
        activeStudent.setMustChangePassword(true);
        studentRepository.save(activeStudent);

        String token = loginAndGetToken();
        mockMvc.perform(get(BASE + "/me").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void mustChangePassword_allowsPostChangePassword() throws Exception {
        activeStudent.setMustChangePassword(true);
        studentRepository.save(activeStudent);

        String token = loginAndGetToken();
        mockMvc.perform(post(BASE + "/change-password")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {"currentPassword":"password123","newPassword":"%s"}
                                """, COMPLIANT_NEW_PASSWORD)))
                .andExpect(status().isNoContent());
    }

    @Test
    void mustChangePassword_blocksOtherProtectedStudentEndpoints() throws Exception {
        activeStudent.setMustChangePassword(true);
        studentRepository.save(activeStudent);

        String token = loginAndGetToken();
        String portalSummary = ApiRoutes.httpPath(ApiRoutes.STUDENT_PORTAL + "/summary");

        mockMvc.perform(get(portalSummary).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("PASSWORD_CHANGE_REQUIRED"))
                .andExpect(jsonPath("$.message").value("Debes cambiar tu contraseña antes de continuar"));
    }

    private String loginAndGetToken() throws Exception {
        MvcResult login = mockMvc.perform(post(BASE + "/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"test@utez.edu.mx","password":"password123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mustChangePassword").value(true))
                .andReturn();
        return objectMapper.readTree(login.getResponse().getContentAsString()).path("data").path("token").asText();
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    @Test
    void loginLocal_fiveFailedAttempts_locksAccount() throws Exception {
        String body = """
                {"email":"test@utez.edu.mx","password":"wrong"}
                """;
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post(BASE + "/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body));
        }
        mockMvc.perform(post(BASE + "/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void resetRequest_existingEmail_returns204() throws Exception {
        mockMvc.perform(post(BASE + "/reset-password/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"test@utez.edu.mx"}
                                """))
                .andExpect(status().isNoContent());
    }

    @Test
    void resetRequest_nonExistingEmail_stillReturns204() throws Exception {
        mockMvc.perform(post(BASE + "/reset-password/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"ghost@utez.edu.mx"}
                                """))
                .andExpect(status().isNoContent());
    }

    @Test
    void resetConfirm_invalidToken_returns401() throws Exception {
        mockMvc.perform(post(BASE + "/reset-password/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {"token":"faketoken","newPassword":"%s"}
                                """, COMPLIANT_NEW_PASSWORD)))
                .andExpect(status().isUnauthorized());
    }

    private String accessTokenLoginDefaultStudent() throws Exception {
        MvcResult login = mockMvc.perform(post(BASE + "/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"test@utez.edu.mx","password":"password123"}
                                """))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(login.getResponse().getContentAsString()).path("data").path("token").asText();
    }

    @Test
    void changePassword_rejectsWithoutUppercase() throws Exception {
        String token = accessTokenLoginDefaultStudent();
        mockMvc.perform(post(BASE + "/change-password")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"password123","newPassword":"abcdefghij1!"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value(PasswordPolicy.REQUIREMENTS_MESSAGE));
    }

    @Test
    void changePassword_rejectsWithoutDigit() throws Exception {
        String token = accessTokenLoginDefaultStudent();
        mockMvc.perform(post(BASE + "/change-password")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"password123","newPassword":"NoDigitHere!Ab"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void changePassword_rejectsWithoutSymbol() throws Exception {
        String token = accessTokenLoginDefaultStudent();
        mockMvc.perform(post(BASE + "/change-password")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"password123","newPassword":"NoSymbol12AbCd"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void changePassword_rejectsTooShort() throws Exception {
        String token = accessTokenLoginDefaultStudent();
        mockMvc.perform(post(BASE + "/change-password")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"password123","newPassword":"Ab1!short"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void changePassword_acceptsCompliantPassword() throws Exception {
        String token = accessTokenLoginDefaultStudent();
        mockMvc.perform(post(BASE + "/change-password")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {"currentPassword":"password123","newPassword":"%s"}
                                """, COMPLIANT_NEW_PASSWORD)))
                .andExpect(status().isNoContent());
    }

    @Test
    void changePassword_invalidatesPreviousToken() throws Exception {
        String token = accessTokenLoginDefaultStudent();

        mockMvc.perform(post(BASE + "/change-password")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {"currentPassword":"password123","newPassword":"%s"}
                                """, COMPLIANT_NEW_PASSWORD)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get(BASE + "/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("INVALID_TOKEN"));
    }

    @Test
    void confirmPasswordReset_rejectsWeakNewPassword() throws Exception {
        String rawToken = "student-reset-test-token-raw-value-001";
        resetTokenRepository.save(new StudentPasswordResetToken(
                sha256Hex(rawToken),
                activeStudent,
                Instant.now().plusSeconds(3600)
        ));

        mockMvc.perform(post(BASE + "/reset-password/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {"token":"%s","newPassword":"%s"}
                                """, rawToken, "alllowercase12!")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value(PasswordPolicy.REQUIREMENTS_MESSAGE));
    }

    @Test
    void confirmPasswordReset_acceptsCompliantPassword() throws Exception {
        String rawToken = "student-reset-test-token-raw-value-002";
        resetTokenRepository.save(new StudentPasswordResetToken(
                sha256Hex(rawToken),
                activeStudent,
                Instant.now().plusSeconds(3600)
        ));

        mockMvc.perform(post(BASE + "/reset-password/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {"token":"%s","newPassword":"%s"}
                                """, rawToken, COMPLIANT_NEW_PASSWORD)))
                .andExpect(status().isNoContent());
    }

    @Test
    void confirmPasswordReset_invalidatesPreviousToken() throws Exception {
        String oldToken = accessTokenLoginDefaultStudent();
        String rawToken = "student-reset-token-invalidates-003";
        resetTokenRepository.save(new StudentPasswordResetToken(
                sha256Hex(rawToken),
                activeStudent,
                Instant.now().plusSeconds(3600)
        ));

        mockMvc.perform(post(BASE + "/reset-password/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {"token":"%s","newPassword":"%s"}
                                """, rawToken, COMPLIANT_NEW_PASSWORD)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get(BASE + "/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(oldToken)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("INVALID_TOKEN"));
    }

    private static String sha256Hex(String raw) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private Admin saveAdmin(String email, AdminRole role) {
        Admin a = new Admin();
        a.setEmail(email);
        a.setName("Admin");
        a.setLastNamePaternal(role.name());
        a.setLastNameMaternal(null);
        a.setPasswordHash("$2a$10$123456789012345678901u2sNfJ0wYl8Bv0p5Wn4eC6zYkM8d8vS.");
        a.setRole(role);
        a.setActive(true);
        return adminRepository.save(a);
    }

    private Career saveCareer(String code, String name) {
        Career career = new Career();
        career.setCode(code);
        career.setName(name);
        career.setActive(true);
        return careerRepository.save(career);
    }
}
