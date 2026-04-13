package mx.edu.utez.server.modules.admins.controller;

import mx.edu.utez.server.modules.admins.dto.AdminDashboardMetricsResponse;
import mx.edu.utez.server.modules.admins.dto.AdminResetPasswordRequest;
import mx.edu.utez.server.modules.admins.dto.AdminResponse;
import mx.edu.utez.server.modules.admins.dto.AdminStatusChangeRequest;
import mx.edu.utez.server.modules.admins.dto.CreateAdminRequest;
import mx.edu.utez.server.modules.admins.dto.UpdateAdminRequest;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.service.AdminContextService;
import mx.edu.utez.server.modules.admins.service.AdminDashboardService;
import mx.edu.utez.server.modules.admins.service.AdminManagementService;
import mx.edu.utez.server.shared.api.ApiRoutes;
import mx.edu.utez.server.shared.api.ApiResponse;
import mx.edu.utez.server.shared.api.PageResponse;
import mx.edu.utez.server.shared.enums.AdminRole;
import mx.edu.utez.server.shared.enums.AdminStatus;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiRoutes.ADMINS)
@PreAuthorize("hasAuthority('ROLE_ADMIN_TI')")
public class AdminManagementController {

    private final AdminManagementService adminManagementService;
    private final AdminContextService adminContextService;
    private final AdminDashboardService adminDashboardService;

    public AdminManagementController(
            AdminManagementService adminManagementService,
            AdminContextService adminContextService,
            AdminDashboardService adminDashboardService
    ) {
        this.adminManagementService = adminManagementService;
        this.adminContextService = adminContextService;
        this.adminDashboardService = adminDashboardService;
    }

    @GetMapping("/dashboard-metrics")
    @Operation(summary = "Métricas agregadas para el dashboard de administradores")
    public ApiResponse<AdminDashboardMetricsResponse> dashboardMetrics(
            Authentication authentication
    ) {
        adminContextService.requireCurrentAdmin(authentication);
        AdminDashboardMetricsResponse response = adminDashboardService.getDashboardMetrics();
        return new ApiResponse<>(true, "Métricas de dashboard obtenidas.", response, HttpStatus.OK.value());
    }

    @PostMapping
    @Operation(summary = "Crear administrador")
    public ResponseEntity<ApiResponse<AdminResponse>> create(
            @Valid @RequestBody CreateAdminRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        AdminResponse response = adminManagementService.create(request, actor, httpRequest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Administrador creado.", response, HttpStatus.CREATED.value()));
    }

    @PutMapping("/{adminId}")
    @Operation(summary = "Actualizar administrador")
    public ApiResponse<AdminResponse> update(
            @PathVariable UUID adminId,
            @Valid @RequestBody UpdateAdminRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        AdminResponse response = adminManagementService.update(adminId, request, actor, httpRequest);
        return new ApiResponse<>(true, "Administrador actualizado.", response, HttpStatus.OK.value());
    }

    @GetMapping("/{adminId}")
    @Operation(summary = "Obtener administrador por id")
    public ApiResponse<AdminResponse> getById(
            @PathVariable UUID adminId,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        AdminResponse response = adminManagementService.getById(adminId, actor, httpRequest);
        return new ApiResponse<>(true, "Administrador obtenido.", response, HttpStatus.OK.value());
    }

    @GetMapping
    @Operation(summary = "Listar administradores")
    public ApiResponse<PageResponse<AdminResponse>> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) AdminStatus status,
            @RequestParam(required = false) AdminRole role,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        PageResponse<AdminResponse> response = adminManagementService.list(
                q, status, role, sortBy, sortDir, page, size, actor, httpRequest
        );
        return new ApiResponse<>(true, "Listado de administradores.", response, HttpStatus.OK.value());
    }

    @PatchMapping("/{adminId}/activate")
    @Operation(summary = "Activar administrador")
    public ApiResponse<AdminResponse> activate(
            @PathVariable UUID adminId,
            @Valid @RequestBody AdminStatusChangeRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        AdminResponse response = adminManagementService.activate(adminId, request, actor, httpRequest);
        return new ApiResponse<>(true, "Administrador activado.", response, HttpStatus.OK.value());
    }

    @PatchMapping("/{adminId}/deactivate")
    @Operation(summary = "Desactivar administrador")
    public ApiResponse<AdminResponse> deactivate(
            @PathVariable UUID adminId,
            @Valid @RequestBody AdminStatusChangeRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        AdminResponse response = adminManagementService.deactivate(adminId, request, actor, httpRequest);
        return new ApiResponse<>(true, "Administrador desactivado.", response, HttpStatus.OK.value());
    }

    @PostMapping("/{adminId}/reset-password")
    @Operation(summary = "Reset de contraseña de administrador")
    public ApiResponse<Void> resetPassword(
            @PathVariable UUID adminId,
            @Valid @RequestBody AdminResetPasswordRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        adminManagementService.resetPassword(adminId, request, actor, httpRequest);
        return new ApiResponse<>(true, "Contraseña restablecida.", null, HttpStatus.OK.value());
    }

    @DeleteMapping("/{adminId}")
    @Operation(summary = "Eliminar administrador")
    public ApiResponse<Void> delete(
            @PathVariable UUID adminId,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        adminManagementService.delete(adminId, actor, httpRequest);
        return new ApiResponse<>(true, "Administrador eliminado.", null, HttpStatus.OK.value());
    }
}
