package mx.edu.utez.server.config;

import mx.edu.utez.server.config.AdminSeedRunner;
import mx.edu.utez.server.config.AppProperties;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.auth.repository.AdminPasswordResetTokenRepository;
import mx.edu.utez.server.shared.enums.AdminRole;
import mx.edu.utez.server.shared.util.EmailNormalizer;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
class AdminSeedRunnerIntegrationTest {

    @Autowired private AdminRepository adminRepository;
    @Autowired private AdminPasswordResetTokenRepository passwordResetTokenRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private EmailNormalizer emailNormalizer;

    private static final String SEED_EMAIL = "seed.admin@utez.edu.mx";
    private static final String SEED_PASSWORD = "SeedPassword123!";
    private static final String SEED_FULL_NAME = "Seed Admin TI";

    @BeforeEach
    void setUp() {
        passwordResetTokenRepository.deleteAll();
        adminRepository.deleteAll();
    }

    @Test
    void shouldCreateAdminTiWhenNotExists() {
        AdminSeedRunner runner = buildRunner(SEED_EMAIL, SEED_PASSWORD, SEED_FULL_NAME);
        runner.run(emptyArgs());

        assertEquals(1, adminRepository.count());
        Optional<Admin> found = adminRepository.findByEmail(SEED_EMAIL);
        assertTrue(found.isPresent());

        Admin admin = found.get();
        assertEquals(AdminRole.ADMIN_TI, admin.getRole());
        assertTrue(admin.isActive());
        assertEquals(SEED_FULL_NAME, admin.getName());
        assertTrue(passwordEncoder.matches(SEED_PASSWORD, admin.getPasswordHash()));
    }

    @Test
    void shouldNotDuplicateOnSecondRun() {
        AdminSeedRunner runner = buildRunner(SEED_EMAIL, SEED_PASSWORD, SEED_FULL_NAME);
        runner.run(emptyArgs());
        runner.run(emptyArgs());

        assertEquals(1, adminRepository.count());
    }

    @Test
    void shouldSkipWhenEmailNotConfigured() {
        AdminSeedRunner runner = buildRunner("", SEED_PASSWORD, SEED_FULL_NAME);
        runner.run(emptyArgs());

        assertEquals(0, adminRepository.count());
    }

    @Test
    void shouldSkipWhenPasswordNotConfigured() {
        AdminSeedRunner runner = buildRunner(SEED_EMAIL, "", SEED_FULL_NAME);
        runner.run(emptyArgs());

        assertEquals(0, adminRepository.count());
    }

    // ── Helpers ────────────────────────────────────────────────────────

    private AdminSeedRunner buildRunner(String email, String password, String fullName) {
        AppProperties props = new AppProperties();
        props.getSeed().setAdminEmail(email);
        props.getSeed().setAdminPassword(password);
        props.getSeed().setAdminFullName(fullName);
        return new AdminSeedRunner(adminRepository, passwordEncoder, emailNormalizer, props);
    }

    private ApplicationArguments emptyArgs() {
        return new DefaultApplicationArguments();
    }
}
