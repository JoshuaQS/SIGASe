package mx.edu.utez.server.modules.auth.service;

import mx.edu.utez.server.config.AppProperties;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.auth.dto.AdminMeResponse;
import mx.edu.utez.server.modules.auth.dto.AuthTokenResponse;
import mx.edu.utez.server.security.JwtTokenProvider;
import mx.edu.utez.server.security.JwtTokenType;
import mx.edu.utez.server.security.RoleConstants;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import mx.edu.utez.server.shared.util.EmailNormalizer;
import java.time.Instant;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminAuthService {

    private final AdminRepository adminRepository;
    private final EmailNormalizer emailNormalizer;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AppProperties appProperties;
    private final AuthLockoutPolicy authLockoutPolicy;

    public AdminAuthService(
            AdminRepository adminRepository,
            EmailNormalizer emailNormalizer,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider,
            AppProperties appProperties,
            AuthLockoutPolicy authLockoutPolicy
    ) {
        this.adminRepository = adminRepository;
        this.emailNormalizer = emailNormalizer;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.appProperties = appProperties;
        this.authLockoutPolicy = authLockoutPolicy;
    }

    @Transactional
    public AuthTokenResponse login(String rawEmail, String rawPassword) {
        String normalizedEmail = emailNormalizer.normalize(rawEmail);
        Admin admin = adminRepository.findByEmail(normalizedEmail)
                .orElseThrow(this::invalidCredentials);

        if (!admin.isActive()) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Usuario administrador desactivado.");
        }

        if (authLockoutPolicy.isLocked(admin.getLockedUntil())) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, authLockoutPolicy.lockoutMessage());
        }

        if (!passwordEncoder.matches(rawPassword, admin.getPasswordHash())) {
            int attempts = admin.getFailedLoginAttempts() + 1;
            admin.setFailedLoginAttempts(attempts);
            if (attempts >= authLockoutPolicy.maxFailedAttempts()) {
                admin.setLockedUntil(authLockoutPolicy.calculateLockedUntil());
            }
            adminRepository.save(admin);
            throw invalidCredentials();
        }

        admin.setFailedLoginAttempts(0);
        admin.setLockedUntil(null);
        admin.setLastLoginAt(Instant.now());
        adminRepository.save(admin);

        String role = mapRole(admin);
        String token = jwtTokenProvider.generateToken(admin.getId(), role, JwtTokenType.ADMIN, admin.getTokenVersion());
        return new AuthTokenResponse(
                token,
                "Bearer",
                appProperties.getJwt().getAdminExpirationSeconds(),
                role
        );
    }

    @Transactional(readOnly = true)
    public AdminMeResponse me(UUID adminId) {
        Admin admin = adminRepository.findById(adminId)
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED, "Sesión inválida."));
        return new AdminMeResponse(
                admin.getId(),
                admin.getEmail(),
                admin.getName(),
                admin.getLastNamePaternal(),
                admin.getLastNameMaternal(),
                mapRole(admin)
        );
    }

    public void logout() {
        // Stateless JWT: logout is client-side session invalidation.
    }

    private String mapRole(Admin admin) {
        return switch (admin.getRole()) {
            case ADMIN_TI -> RoleConstants.ADMIN_TI;
            case ADMIN_BIBLIOTECA -> RoleConstants.ADMIN_BIBLIOTECA;
        };
    }

    private BusinessException invalidCredentials() {
        return new BusinessException(ErrorCode.UNAUTHORIZED, "Credenciales inválidas.");
    }
}
