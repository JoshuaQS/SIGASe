package mx.edu.utez.server.modules.auth.service;

import mx.edu.utez.server.config.AppProperties;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.auth.dto.AdminMeResponse;
import mx.edu.utez.server.modules.auth.dto.AuthTokenResponse;
import mx.edu.utez.server.security.JwtTokenProvider;
import mx.edu.utez.server.security.JwtTokenType;
import mx.edu.utez.server.security.RoleConstants;
import mx.edu.utez.server.shared.enums.AdminAuthResult;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import mx.edu.utez.server.shared.util.EmailNormalizer;
import jakarta.servlet.http.HttpServletRequest;
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
    private final AdminAccessLoggingFacade adminAccessLoggingFacade;

    public AdminAuthService(
            AdminRepository adminRepository,
            EmailNormalizer emailNormalizer,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider,
            AppProperties appProperties,
            AuthLockoutPolicy authLockoutPolicy,
            AdminAccessLoggingFacade adminAccessLoggingFacade
    ) {
        this.adminRepository = adminRepository;
        this.emailNormalizer = emailNormalizer;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.appProperties = appProperties;
        this.authLockoutPolicy = authLockoutPolicy;
        this.adminAccessLoggingFacade = adminAccessLoggingFacade;
    }

    @Transactional
    public AuthTokenResponse login(String rawEmail, String rawPassword, HttpServletRequest request) {
        String normalizedEmail = emailNormalizer.normalize(rawEmail);
        try {
            Admin admin = adminRepository.findByEmail(normalizedEmail).orElse(null);
            if (admin == null) {
                adminAccessLoggingFacade.log(
                        request,
                        null,
                        rawEmail,
                        normalizedEmail,
                        AdminAuthResult.FAILED_INVALID_CREDENTIALS,
                        "INVALID_CREDENTIALS",
                        "Credenciales inválidas.",
                        null
                );
                throw invalidCredentials();
            }

            if (!admin.isActive()) {
                adminAccessLoggingFacade.log(
                        request,
                        admin,
                        rawEmail,
                        normalizedEmail,
                        AdminAuthResult.FAILED_ADMIN_INACTIVE,
                        "ADMIN_INACTIVE",
                        "Usuario administrador desactivado.",
                        null
                );
                throw new BusinessException(ErrorCode.UNAUTHORIZED, "Usuario administrador desactivado.");
            }

            if (authLockoutPolicy.isLocked(admin.getLockedUntil())) {
                adminAccessLoggingFacade.log(
                        request,
                        admin,
                        rawEmail,
                        normalizedEmail,
                        AdminAuthResult.FAILED_ACCOUNT_LOCKED,
                        "ACCOUNT_LOCKED",
                        "Cuenta bloqueada temporalmente.",
                        null
                );
                throw new BusinessException(ErrorCode.UNAUTHORIZED, authLockoutPolicy.lockoutMessage());
            }

            if (!passwordEncoder.matches(rawPassword, admin.getPasswordHash())) {
                int attempts = admin.getFailedLoginAttempts() + 1;
                admin.setFailedLoginAttempts(attempts);
                boolean lockedByAttempt = false;
                if (attempts >= authLockoutPolicy.maxFailedAttempts()) {
                    admin.setLockedUntil(authLockoutPolicy.calculateLockedUntil());
                    lockedByAttempt = true;
                }
                adminRepository.save(admin);
                adminAccessLoggingFacade.log(
                        request,
                        admin,
                        rawEmail,
                        normalizedEmail,
                        lockedByAttempt ? AdminAuthResult.FAILED_ACCOUNT_LOCKED : AdminAuthResult.FAILED_INVALID_CREDENTIALS,
                        lockedByAttempt ? "ACCOUNT_LOCKED" : "INVALID_CREDENTIALS",
                        lockedByAttempt ? "Cuenta bloqueada tras exceder intentos." : "Credenciales inválidas.",
                        null
                );
                throw invalidCredentials();
            }

            admin.setFailedLoginAttempts(0);
            admin.setLockedUntil(null);
            admin.setLastLoginAt(Instant.now());
            adminRepository.save(admin);

            String role = mapRole(admin);
            String token = jwtTokenProvider.generateToken(admin.getId(), role, JwtTokenType.ADMIN, admin.getTokenVersion());
            adminAccessLoggingFacade.log(
                    request,
                    admin,
                    rawEmail,
                    normalizedEmail,
                    AdminAuthResult.SUCCESS,
                    null,
                    null,
                    null
            );
            return new AuthTokenResponse(
                    token,
                    "Bearer",
                    appProperties.getJwt().getAdminExpirationSeconds(),
                    role
            );
        } catch (BusinessException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            adminAccessLoggingFacade.log(
                    request,
                    null,
                    rawEmail,
                    normalizedEmail,
                    AdminAuthResult.FAILED_INTERNAL_ERROR,
                    "INTERNAL_ERROR",
                    "Fallo interno durante autenticación admin.",
                    "{\"source\":\"admin-login\"}"
            );
            throw ex;
        }
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
