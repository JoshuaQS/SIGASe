package mx.edu.utez.server.modules.auth.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.auth.repository.AdminAuthEventRepository;
import mx.edu.utez.server.shared.enums.AdminRole;
import mx.edu.utez.server.shared.enums.AdminStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class AdminAuthControllerIntegrationTest {

    private static final String BASE = "/api/v1/auth/admin";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private AdminAuthEventRepository adminAuthEventRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        adminAuthEventRepository.deleteAll();
        adminRepository.deleteAll();

        Admin admin = new Admin();
        admin.setEmail("admin.ti@utez.edu.mx");
        admin.setName("Admin");
        admin.setLastNamePaternal("TI");
        admin.setLastNameMaternal("SIGASe");
        admin.setPasswordHash(passwordEncoder.encode("AdminPass.123"));
        admin.setRole(AdminRole.ADMIN_TI);
        admin.setStatus(AdminStatus.ACTIVE);
        adminRepository.save(admin);
    }

    @Test
    void loginAdmin_validCredentials_writesAdminAuthEvent() throws Exception {
        mockMvc.perform(post(BASE + "/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("User-Agent", "SIGASe-Test-Agent/1.0")
                        .header("Origin", "http://localhost:5173")
                        .header("Referer", "http://localhost:5173/login")
                        .content("""
                                {"email":"admin.ti@utez.edu.mx","password":"AdminPass.123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty());

        assertEquals(1, adminAuthEventRepository.count());
        var event = adminAuthEventRepository.findAll().get(0);
        assertEquals("SUCCESS", event.getResult().name());
        assertNotNull(event.getNormalizedEmail());
        assertNotNull(event.getRequestId());
        assertNotNull(event.getCorrelationId());
        assertNotNull(event.getIpAddressMasked());
        assertNotNull(event.getUserAgentSanitized());
        assertEquals("/api/v1/auth/admin/login", event.getRequestPath());
    }
}
