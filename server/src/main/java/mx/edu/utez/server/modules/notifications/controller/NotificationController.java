package mx.edu.utez.server.modules.notifications.controller;

import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.service.AdminContextService;
import mx.edu.utez.server.modules.notifications.dto.NotificationPreferenceResponse;
import mx.edu.utez.server.modules.notifications.dto.NotificationResponse;
import mx.edu.utez.server.modules.notifications.dto.UnreadCountResponse;
import mx.edu.utez.server.modules.notifications.dto.UpdateNotificationPreferenceRequest;
import mx.edu.utez.server.modules.notifications.service.NotificationService;
import mx.edu.utez.server.shared.api.ApiResponse;
import mx.edu.utez.server.shared.api.ApiRoutes;
import mx.edu.utez.server.shared.api.PageResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiRoutes.NOTIFICATIONS)
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN_TI','ROLE_ADMIN_BIBLIOTECA')")
public class NotificationController {

    private final NotificationService notificationService;
    private final AdminContextService adminContextService;

    public NotificationController(
            NotificationService notificationService,
            AdminContextService adminContextService
    ) {
        this.notificationService = notificationService;
        this.adminContextService = adminContextService;
    }

    @GetMapping
    @Operation(summary = "Listar notificaciones del administrador autenticado")
    public ApiResponse<PageResponse<NotificationResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication
    ) {
        Admin admin = adminContextService.requireCurrentAdmin(authentication);
        PageResponse<NotificationResponse> response = notificationService.listForAdmin(admin, page, size);
        return new ApiResponse<>(true, "Listado de notificaciones.", response, HttpStatus.OK.value());
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Contar notificaciones no leídas del administrador autenticado")
    public ApiResponse<UnreadCountResponse> unreadCount(Authentication authentication) {
        Admin admin = adminContextService.requireCurrentAdmin(authentication);
        return new ApiResponse<>(
                true,
                "Conteo de notificaciones no leídas.",
                notificationService.getUnreadCount(admin),
                HttpStatus.OK.value()
        );
    }

    @PatchMapping("/{notificationId}/read")
    @Operation(summary = "Marcar una notificación como leída")
    public ApiResponse<Void> markAsRead(
            @PathVariable Long notificationId,
            Authentication authentication
    ) {
        Admin admin = adminContextService.requireCurrentAdmin(authentication);
        notificationService.markAsRead(admin, notificationId);
        return new ApiResponse<>(true, "Notificación marcada como leída.", null, HttpStatus.OK.value());
    }

    @PatchMapping("/read-all")
    @Operation(summary = "Marcar todas las notificaciones como leídas")
    public ApiResponse<Void> markAllAsRead(Authentication authentication) {
        Admin admin = adminContextService.requireCurrentAdmin(authentication);
        notificationService.markAllAsRead(admin);
        return new ApiResponse<>(true, "Notificaciones marcadas como leídas.", null, HttpStatus.OK.value());
    }

    @DeleteMapping("/{notificationId}")
    @Operation(summary = "Descartar una notificación")
    public ApiResponse<Void> dismiss(
            @PathVariable Long notificationId,
            Authentication authentication
    ) {
        Admin admin = adminContextService.requireCurrentAdmin(authentication);
        notificationService.dismiss(admin, notificationId);
        return new ApiResponse<>(true, "Notificación descartada.", null, HttpStatus.OK.value());
    }

    @DeleteMapping
    @Operation(summary = "Descartar todas las notificaciones")
    public ApiResponse<Void> dismissAll(Authentication authentication) {
        Admin admin = adminContextService.requireCurrentAdmin(authentication);
        notificationService.dismissAll(admin);
        return new ApiResponse<>(true, "Notificaciones descartadas.", null, HttpStatus.OK.value());
    }

    @GetMapping("/preferences")
    @Operation(summary = "Obtener preferencias de notificaciones del administrador autenticado")
    public ApiResponse<NotificationPreferenceResponse> getPreferences(Authentication authentication) {
        Admin admin = adminContextService.requireCurrentAdmin(authentication);
        return new ApiResponse<>(
                true,
                "Preferencias de notificaciones obtenidas.",
                notificationService.getPreferences(admin),
                HttpStatus.OK.value()
        );
    }

    @PutMapping("/preferences")
    @Operation(summary = "Actualizar preferencias de notificaciones del administrador autenticado")
    public ApiResponse<NotificationPreferenceResponse> updatePreferences(
            @Valid @RequestBody UpdateNotificationPreferenceRequest request,
            Authentication authentication
    ) {
        Admin admin = adminContextService.requireCurrentAdmin(authentication);
        NotificationPreferenceResponse response = notificationService.updatePreferences(admin, request);
        return new ApiResponse<>(true, "Preferencias de notificaciones actualizadas.", response, HttpStatus.OK.value());
    }
}
