package mx.edu.utez.server.modules.logs.audit.controller;

import mx.edu.utez.server.modules.admins.service.AdminContextService;
import mx.edu.utez.server.modules.logs.audit.dto.AuditLogResponse;
import mx.edu.utez.server.modules.logs.audit.service.AuditLogQueryService;
import mx.edu.utez.server.shared.api.ApiResponse;
import mx.edu.utez.server.shared.api.ApiRoutes;
import mx.edu.utez.server.shared.api.PageResponse;
import mx.edu.utez.server.shared.enums.AuditActorType;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.AuditSeverity;
import io.swagger.v3.oas.annotations.Operation;
import java.time.Instant;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiRoutes.AUDIT_LOGS)
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN_TI','ROLE_ADMIN_BIBLIOTECA')")
public class AuditLogQueryController {

    private final AuditLogQueryService auditLogQueryService;
    private final AdminContextService adminContextService;

    public AuditLogQueryController(
            AuditLogQueryService auditLogQueryService,
            AdminContextService adminContextService
    ) {
        this.auditLogQueryService = auditLogQueryService;
        this.adminContextService = adminContextService;
    }

    @GetMapping
    @Operation(summary = "Listar audit logs con filtros")
    public ApiResponse<PageResponse<AuditLogResponse>> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateTo,
            @RequestParam(required = false) AuditActorType actorType,
            @RequestParam(required = false) String actorEmail,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) AuditOutcome outcome,
            @RequestParam(required = false) String requestId,
            @RequestParam(required = false) String correlationId,
            @RequestParam(required = false) AuditSeverity severity,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "occurredAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            Authentication authentication
    ) {
        adminContextService.requireCurrentAdmin(authentication);
        PageResponse<AuditLogResponse> response = auditLogQueryService.list(
                dateFrom,
                dateTo,
                actorType,
                actorEmail,
                action,
                entityType,
                outcome,
                requestId,
                correlationId,
                severity,
                page,
                size,
                sortBy,
                sortDir
        );
        return new ApiResponse<>(true, "Listado de audit logs.", response, HttpStatus.OK.value());
    }

    @GetMapping("/{auditLogId}")
    @Operation(summary = "Obtener audit log por id")
    public ApiResponse<AuditLogResponse> getById(
            @PathVariable UUID auditLogId,
            Authentication authentication
    ) {
        adminContextService.requireCurrentAdmin(authentication);
        AuditLogResponse response = auditLogQueryService.getById(auditLogId);
        return new ApiResponse<>(true, "Audit log obtenido.", response, HttpStatus.OK.value());
    }
}
