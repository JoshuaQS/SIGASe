package mx.edu.utez.server.modules.auth.controller;

import mx.edu.utez.server.modules.auth.dto.AdminLoginRequest;
import mx.edu.utez.server.modules.auth.dto.AdminMeResponse;
import mx.edu.utez.server.modules.auth.dto.AuthTokenResponse;
import mx.edu.utez.server.modules.auth.dto.PasswordResetConfirmDto;
import mx.edu.utez.server.modules.auth.dto.PasswordResetRequestDto;
import mx.edu.utez.server.modules.auth.service.AdminAuthService;
import mx.edu.utez.server.modules.auth.service.PasswordResetService;
import mx.edu.utez.server.shared.api.ApiRoutes;
import mx.edu.utez.server.shared.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiRoutes.AUTH_ADMIN)
public class AdminAuthController {

    private final AdminAuthService adminAuthService;
    private final PasswordResetService passwordResetService;

    public AdminAuthController(AdminAuthService adminAuthService,
                               PasswordResetService passwordResetService) {
        this.adminAuthService = adminAuthService;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/login")
    @Operation(summary = "Login administrador", description = "Autentica administrador y entrega JWT de corta duración.")
    public ApiResponse<AuthTokenResponse> login(@Valid @RequestBody AdminLoginRequest request) {
        AuthTokenResponse token = adminAuthService.login(request.email(), request.password());
        return new ApiResponse<>(true, "Login exitoso.", token, HttpStatus.OK.value());
    }

    @PostMapping("/logout")
    @Operation(
            summary = "Logout administrador (lógico)",
            description = "En esta fase el logout es lógico del lado cliente. "
                    + "No existe revocación server-side ni denylist de JWT. "
                    + "El cliente debe eliminar access token y estado de sesión local."
    )
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN_TI','ROLE_ADMIN_BIBLIOTECA')")
    public ApiResponse<Void> logout() {
        adminAuthService.logout();
        return new ApiResponse<>(true, "Logout exitoso.", null, HttpStatus.OK.value());
    }

    @GetMapping("/me")
    @Operation(summary = "Perfil del administrador autenticado")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN_TI','ROLE_ADMIN_BIBLIOTECA')")
    public ApiResponse<AdminMeResponse> me(Authentication authentication) {
        AdminMeResponse response = adminAuthService.me(UUID.fromString(authentication.getName()));
        return new ApiResponse<>(true, "Perfil obtenido exitosamente.", response, HttpStatus.OK.value());
    }

    // ── Public password reset flow ─────────────────────────────────────

    @PostMapping("/reset-password/request")
    @Operation(
            summary = "Solicitar recuperación de contraseña",
            description = "Genera un token de recuperación. En esta fase el token se "
                    + "imprime en el log del servidor en vez de enviarse por email."
    )
    public ApiResponse<Void> requestPasswordReset(
            @Valid @RequestBody PasswordResetRequestDto request,
            HttpServletRequest httpRequest
    ) {
        passwordResetService.requestReset(request.email(), httpRequest);
        return new ApiResponse<>(true,
                "Si el correo está registrado, se enviará un enlace de recuperación.",
                null, HttpStatus.OK.value());
    }

    @PostMapping("/reset-password/confirm")
    @Operation(
            summary = "Confirmar nueva contraseña con token",
            description = "Valida el token de recuperación y establece la nueva contraseña. "
                    + "El token es de un solo uso y expira en 30 minutos. "
                    + "Nota: esta operación NO revoca JWT previos ya emitidos."
    )
    public ApiResponse<Void> confirmPasswordReset(
            @Valid @RequestBody PasswordResetConfirmDto request,
            HttpServletRequest httpRequest
    ) {
        passwordResetService.confirmReset(request.token(), request.newPassword(), httpRequest);
        return new ApiResponse<>(true,
                "Contraseña restablecida exitosamente.",
                null, HttpStatus.OK.value());
    }
}
