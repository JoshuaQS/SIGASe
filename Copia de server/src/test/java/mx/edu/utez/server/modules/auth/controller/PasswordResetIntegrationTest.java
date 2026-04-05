package mx.edu.utez.server.modules.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.auth.entity.AdminPasswordResetToken;
import mx.edu.utez.server.modules.auth.repository.AdminPasswordResetTokenRepository;
import mx.edu.utez.server.modules.auth.service.PasswordResetService;
import mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository;
import mx.edu.utez.server.shared.enums.AdminRole;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
class PasswordResetIntegrationTest {

    private static final String REQUEST_URL = "/api/v1/auth/admin/reset-password/request";
    private static final String CONFIRM_URL = "/api/v1/auth/admin/reset-password/confirm";
    private static final String LOGIN_URL = "/api/v1/auth/admin/login";
    private static final String ME_URL = "/api/v1/auth/admin/me";
    private static final String INITIAL_PASSWORD = "AdminPass.123";
    private static final String VALID_PASSWORD = "NuevaContraseña123!";

    @Autowired private MockMvc mockMvc;
    @Autowired private AdminRepository adminRepository;
    @Autowired private AdminPasswordResetTokenRepository tokenRepository;
    @Autowired private AuditLogRepository auditLogRepository;
    @Autowired private PasswordResetService passwordResetService;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private ObjectMapper objectMapper;

    private Admin activeAdmin;

    @BeforeEach
    void setUp() {
        tokenRepository.deleteAll();
        auditLogRepository.deleteAll();
        adminRepository.deleteAll();

        activeAdmin = saveAdmin("admin.ti@utez.edu.mx", AdminRole.ADMIN_TI, true);
    }

    // ── Request endpoint ───────────────────────────────────────────────

    @Test
    void shouldAcceptResetRequestForExistingEmail() throws Exception {
        mockMvc.perform(post(REQUEST_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", "admin.ti@utez.edu.mx"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Si el correo está registrado, se enviará un enlace de recuperación.")));

        // A token should have been created in the database.
        assertEquals(1, tokenRepository.count());
    }

    @Test
    void shouldAcceptResetRequestForNonExistentEmail() throws Exception {
        mockMvc.perform(post(REQUEST_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", "nobody@utez.edu.mx"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Si el correo está registrado, se enviará un enlace de recuperación.")));

        // No token should have been created.
        assertEquals(0, tokenRepository.count());
    }

    // ── Confirm endpoint ───────────────────────────────────────────────

    @Test
    void shouldConfirmResetWithValidToken() throws Exception {
        // Prepare a known token directly in the database.
        String rawToken = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
        String tokenHash = sha256Hex(rawToken);
        saveResetToken(activeAdmin, tokenHash, Instant.now().plus(30, ChronoUnit.MINUTES));

        mockMvc.perform(post(CONFIRM_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("token", rawToken, "newPassword", VALID_PASSWORD))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Contraseña restablecida exitosamente.")));

        // Token should be marked as used.
        AdminPasswordResetToken used = tokenRepository.findByTokenHash(tokenHash).orElseThrow();
        assertNotNull(used.getUsedAt());

        // Admin lockout fields should be cleared.
        Admin refreshed = adminRepository.findById(activeAdmin.getId()).orElseThrow();
        assertEquals(0, refreshed.getFailedLoginAttempts());
        assertNull(refreshed.getLockedUntil());
    }

    @Test
    void shouldRejectConfirmWithInvalidToken() throws Exception {
        mockMvc.perform(post(CONFIRM_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("token", "invalid_random_token_value", "newPassword", VALID_PASSWORD))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode", is("INVALID_TOKEN")));
    }

    @Test
    void shouldRejectConfirmWithExpiredToken() throws Exception {
        String rawToken = "expired01234567890expired01234567890expired01234567890expired0123";
        String tokenHash = sha256Hex(rawToken);
        saveResetToken(activeAdmin, tokenHash, Instant.now().minus(1, ChronoUnit.HOURS));

        mockMvc.perform(post(CONFIRM_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("token", rawToken, "newPassword", VALID_PASSWORD))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode", is("INVALID_TOKEN")));
    }

    @Test
    void shouldRejectConfirmWithAlreadyUsedToken() throws Exception {
        String rawToken = "usedtoken1234567890usedtoken1234567890usedtoken1234567890usedto12";
        String tokenHash = sha256Hex(rawToken);
        AdminPasswordResetToken token = saveResetToken(activeAdmin, tokenHash,
                Instant.now().plus(30, ChronoUnit.MINUTES));
        token.setUsedAt(Instant.now().minus(5, ChronoUnit.MINUTES));
        tokenRepository.save(token);

        mockMvc.perform(post(CONFIRM_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("token", rawToken, "newPassword", VALID_PASSWORD))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode", is("INVALID_TOKEN")));
    }

    @Test
    void shouldRejectConfirmWithWeakPassword() throws Exception {
        String rawToken = "weakpw01234567890weakpw01234567890weakpw01234567890weakpw0123456";
        String tokenHash = sha256Hex(rawToken);
        saveResetToken(activeAdmin, tokenHash, Instant.now().plus(30, ChronoUnit.MINUTES));

        mockMvc.perform(post(CONFIRM_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("token", rawToken, "newPassword", "short"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode", is("VALIDATION_ERROR")));
    }

    @Test
    void shouldInvalidatePreviousTokensOnNewRequest() throws Exception {
        // First request — creates token #1.
        mockMvc.perform(post(REQUEST_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", "admin.ti@utez.edu.mx"))))
                .andExpect(status().isOk());

        assertEquals(1, tokenRepository.count());
        AdminPasswordResetToken firstToken = tokenRepository.findAll().get(0);
        assertNull(firstToken.getUsedAt(), "First token should be pending");

        // Second request — should invalidate token #1 and create token #2.
        mockMvc.perform(post(REQUEST_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", "admin.ti@utez.edu.mx"))))
                .andExpect(status().isOk());

        assertEquals(2, tokenRepository.count());
        AdminPasswordResetToken refreshedFirst = tokenRepository.findById(firstToken.getId()).orElseThrow();
        assertNotNull(refreshedFirst.getUsedAt(), "First token should be invalidated");
    }

    @Test
    void shouldClearLockoutOnReset() throws Exception {
        // Lock the admin account.
        activeAdmin.setFailedLoginAttempts(5);
        activeAdmin.setLockedUntil(Instant.now().plus(15, ChronoUnit.MINUTES));
        adminRepository.save(activeAdmin);

        String rawToken = "lockout1234567890lockout1234567890lockout1234567890lockout12345";
        String tokenHash = sha256Hex(rawToken);
        saveResetToken(activeAdmin, tokenHash, Instant.now().plus(30, ChronoUnit.MINUTES));

        mockMvc.perform(post(CONFIRM_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("token", rawToken, "newPassword", VALID_PASSWORD))))
                .andExpect(status().isOk());

        Admin refreshed = adminRepository.findById(activeAdmin.getId()).orElseThrow();
        assertEquals(0, refreshed.getFailedLoginAttempts());
        assertNull(refreshed.getLockedUntil());
    }

    @Test
    void shouldInvalidatePreviousAdminTokenOnResetConfirm() throws Exception {
        String oldToken = loginAndGetAdminToken(activeAdmin.getEmail(), INITIAL_PASSWORD);
        String rawToken = "revocation1234567890revocation1234567890revocation1234567890revocation";
        String tokenHash = sha256Hex(rawToken);
        saveResetToken(activeAdmin, tokenHash, Instant.now().plus(30, ChronoUnit.MINUTES));

        mockMvc.perform(post(CONFIRM_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("token", rawToken, "newPassword", VALID_PASSWORD))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/auth/admin/logout")
                        .header("Authorization", "Bearer " + oldToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode", is("INVALID_TOKEN")));

        mockMvc.perform(post(LOGIN_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", activeAdmin.getEmail(), "password", VALID_PASSWORD))))
                .andExpect(status().isOk());
    }

    @Test
    void shouldRejectConfirmForInactiveAdmin() throws Exception {
        Admin inactiveAdmin = saveAdmin("inactive@utez.edu.mx", AdminRole.ADMIN_BIBLIOTECA, false);

        String rawToken = "inactive234567890inactive234567890inactive234567890inactive23456";
        String tokenHash = sha256Hex(rawToken);
        saveResetToken(inactiveAdmin, tokenHash, Instant.now().plus(30, ChronoUnit.MINUTES));

        mockMvc.perform(post(CONFIRM_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("token", rawToken, "newPassword", VALID_PASSWORD))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode", is("BUSINESS_RULE_VIOLATION")));
    }

    // ── Helpers ────────────────────────────────────────────────────────

    private Admin saveAdmin(String email, AdminRole role, boolean active) {
        Admin admin = new Admin();
        admin.setEmail(email);
        admin.setName("Admin");
        admin.setLastNamePaternal(role.name());
        admin.setLastNameMaternal(null);
        admin.setPasswordHash(passwordEncoder.encode(INITIAL_PASSWORD));
        admin.setRole(role);
        admin.setActive(active);
        return adminRepository.save(admin);
    }

    private AdminPasswordResetToken saveResetToken(Admin admin, String tokenHash, Instant expiresAt) {
        AdminPasswordResetToken token = new AdminPasswordResetToken();
        token.setAdmin(admin);
        token.setTokenHash(tokenHash);
        token.setExpiresAt(expiresAt);
        return tokenRepository.save(token);
    }

    private String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception ex) {
            throw new RuntimeException(ex);
        }
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception ex) {
            throw new RuntimeException(ex);
        }
    }

    private String loginAndGetAdminToken(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post(LOGIN_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", email, "password", password))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data")
                .path("token")
                .asText();
    }
}
