package mx.edu.utez.server.modules.auth.controller;

import mx.edu.utez.server.modules.auth.dto.ChangePasswordRequest;
import mx.edu.utez.server.modules.auth.dto.ResetPasswordConfirm;
import mx.edu.utez.server.modules.auth.dto.ResetPasswordRequest;
import mx.edu.utez.server.modules.auth.dto.StudentAuthResponse;
import mx.edu.utez.server.modules.auth.dto.StudentGoogleLoginRequest;
import mx.edu.utez.server.modules.auth.dto.StudentLoginRequest;
import mx.edu.utez.server.modules.auth.service.StudentAuthService;
import mx.edu.utez.server.modules.students.dto.StudentResponse;
import mx.edu.utez.server.shared.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/auth/student")
@Tag(name = "Student Auth")
public class StudentAuthController {

    private final StudentAuthService studentAuthService;

    public StudentAuthController(StudentAuthService studentAuthService) {
        this.studentAuthService = studentAuthService;
    }

    @PostMapping("/google")
    @Operation(summary = "Login con Google")
    public ApiResponse<StudentAuthResponse> loginWithGoogle(
            @Valid @RequestBody StudentGoogleLoginRequest request,
            HttpServletRequest httpServletRequest
    ) {
        StudentAuthResponse data = studentAuthService.loginWithGoogle(request.idToken(), httpServletRequest);
        return new ApiResponse<>(true, "Login exitoso.", data, HttpStatus.OK.value());
    }

    @PostMapping("/login")
    @Operation(summary = "Login local estudiante")
    public ApiResponse<StudentAuthResponse> login(
            @Valid @RequestBody StudentLoginRequest request,
            HttpServletRequest httpRequest
    ) {
        StudentAuthResponse data = studentAuthService.loginLocal(request, httpRequest);
        return new ApiResponse<>(true, "Login exitoso.", data, HttpStatus.OK.value());
    }

    @GetMapping("/me")
    @PreAuthorize("hasAuthority('ROLE_STUDENT')")
    @Operation(summary = "Perfil del estudiante autenticado")
    public ApiResponse<StudentResponse> me(Authentication authentication) {
        UUID studentId = UUID.fromString(authentication.getName());
        StudentResponse data = studentAuthService.getMe(studentId);
        return new ApiResponse<>(true, "Perfil obtenido.", data, HttpStatus.OK.value());
    }

    @PostMapping("/change-password")
    @PreAuthorize("hasAuthority('ROLE_STUDENT')")
    @Operation(summary = "Cambio de contraseña (incluye primer acceso)")
    public ResponseEntity<Void> changePassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletRequest httpRequest
    ) {
        UUID studentId = UUID.fromString(authentication.getName());
        studentAuthService.changePassword(studentId, request.currentPassword(), request.newPassword(), httpRequest);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reset-password/request")
    @Operation(summary = "Solicitar reset de contraseña")
    public ResponseEntity<Void> resetRequest(
            @Valid @RequestBody ResetPasswordRequest request,
            HttpServletRequest httpRequest
    ) {
        studentAuthService.requestPasswordReset(request.email(), httpRequest);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reset-password/confirm")
    @Operation(summary = "Confirmar reset con token")
    public ResponseEntity<Void> resetConfirm(
            @Valid @RequestBody ResetPasswordConfirm request,
            HttpServletRequest httpRequest
    ) {
        studentAuthService.confirmPasswordReset(request.token(), request.newPassword(), httpRequest);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/logout")
    @PreAuthorize("hasAuthority('ROLE_STUDENT')")
    @Operation(summary = "Logout (JWT stateless — client-side)")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent().build();
    }
}
