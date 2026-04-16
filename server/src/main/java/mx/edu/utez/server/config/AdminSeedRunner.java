package mx.edu.utez.server.config;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.shared.enums.AdminRole;
import mx.edu.utez.server.shared.enums.AdminStatus;
import mx.edu.utez.server.shared.util.EmailNormalizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Idempotent bootstrap that creates configured seed admin accounts.
 * <p>
 * Configured via environment variables:
 * <ul>
 *   <li>{@code APP_SEED_ADMIN_EMAIL} / {@code APP_SEED_ADMIN_PASSWORD} / {@code APP_SEED_ADMIN_FULL_NAME} for {@code ADMIN_TI}</li>
 *   <li>{@code APP_SEED_ADMIN_BIBLIOTECA_EMAIL} / {@code APP_SEED_ADMIN_BIBLIOTECA_PASSWORD} /
 *       {@code APP_SEED_ADMIN_BIBLIOTECA_FULL_NAME} for {@code ADMIN_BIBLIOTECA}</li>
 * </ul>
 * If email or password are blank for a specific role, that seed is skipped — it is not an error.
 * No default/hardcoded password is ever used.
 */
@Component
public class AdminSeedRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminSeedRunner.class);

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailNormalizer emailNormalizer;
    private final AppProperties appProperties;

    public AdminSeedRunner(
            AdminRepository adminRepository,
            PasswordEncoder passwordEncoder,
            EmailNormalizer emailNormalizer,
            AppProperties appProperties
    ) {
        this.adminRepository = adminRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailNormalizer = emailNormalizer;
        this.appProperties = appProperties;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedAdminIfConfigured(
                appProperties.getSeed().getAdminEmail(),
                appProperties.getSeed().getAdminPassword(),
                appProperties.getSeed().getAdminFullName(),
                "Administrador TI",
                AdminRole.ADMIN_TI
        );

        seedAdminIfConfigured(
                appProperties.getSeed().getAdminBibliotecaEmail(),
                appProperties.getSeed().getAdminBibliotecaPassword(),
                appProperties.getSeed().getAdminBibliotecaFullName(),
                "Administrador Biblioteca",
                AdminRole.ADMIN_BIBLIOTECA
        );
    }

    private void seedAdminIfConfigured(
            String email,
            String password,
            String fullName,
            String defaultFullName,
            AdminRole role
    ) {
        String roleName = role.name();
        if (!StringUtils.hasText(email) || !StringUtils.hasText(password)) {
            log.info("Seed {}: variables no configuradas, omitiendo.", roleName);
            return;
        }

        String normalizedEmail = emailNormalizer.normalize(email);
        if (adminRepository.existsByEmail(normalizedEmail)) {
            log.info("Seed {}: ya existe admin con email {}, omitiendo.", roleName, normalizedEmail);
            return;
        }

        Admin admin = new Admin();
        admin.setEmail(normalizedEmail);
        admin.setName(StringUtils.hasText(fullName) ? fullName.trim() : defaultFullName);
        // New schema splits last names; for seeds we keep it deterministic by role.
        admin.setLastNamePaternal(role == AdminRole.ADMIN_TI ? "TI" : "Biblioteca");
        admin.setLastNameMaternal(null);
        admin.setPasswordHash(passwordEncoder.encode(password));
        admin.setRole(role);
        admin.setStatus(AdminStatus.ACTIVE);
        adminRepository.save(admin);

        log.info("Seed {}: admin creado con email {}.", roleName, normalizedEmail);
    }
}
