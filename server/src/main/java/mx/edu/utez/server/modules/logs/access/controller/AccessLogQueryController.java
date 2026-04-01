package mx.edu.utez.server.modules.logs.access.controller;

import mx.edu.utez.server.modules.admins.service.AdminContextService;
import mx.edu.utez.server.modules.logs.access.dto.AccessLogResponse;
import mx.edu.utez.server.modules.logs.access.service.AccessLogQueryService;
import mx.edu.utez.server.shared.api.ApiResponse;
import mx.edu.utez.server.shared.api.ApiRoutes;
import mx.edu.utez.server.shared.api.PageResponse;
import mx.edu.utez.server.shared.enums.AccessResult;
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
@RequestMapping(ApiRoutes.ACCESS_LOGS)
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN_TI','ROLE_ADMIN_BIBLIOTECA')")
public class AccessLogQueryController {

    private final AccessLogQueryService accessLogQueryService;
    private final AdminContextService adminContextService;

    public AccessLogQueryController(
            AccessLogQueryService accessLogQueryService,
            AdminContextService adminContextService
    ) {
        this.accessLogQueryService = accessLogQueryService;
        this.adminContextService = adminContextService;
    }

    @GetMapping
    @Operation(summary = "Listar access logs con filtros")
    public ApiResponse<PageResponse<AccessLogResponse>> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateTo,
            @RequestParam(required = false) AccessResult result,
            @RequestParam(required = false) String normalizedEmail,
            @RequestParam(required = false) String attemptedEmail,
            @RequestParam(required = false) UUID studentId,
            @RequestParam(required = false) String ipAddress,
            @RequestParam(required = false) String requestId,
            @RequestParam(required = false) String correlationId,
            @RequestParam(required = false) String providerName,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "occurredAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            Authentication authentication
    ) {
        adminContextService.requireCurrentAdmin(authentication);
        PageResponse<AccessLogResponse> response = accessLogQueryService.list(
                dateFrom,
                dateTo,
                result,
                normalizedEmail,
                attemptedEmail,
                studentId,
                ipAddress,
                requestId,
                correlationId,
                providerName,
                page,
                size,
                sortBy,
                sortDir
        );
        return new ApiResponse<>(true, "Listado de access logs.", response, HttpStatus.OK.value());
    }

    @GetMapping("/{accessLogId}")
    @Operation(summary = "Obtener access log por id")
    public ApiResponse<AccessLogResponse> getById(
            @PathVariable UUID accessLogId,
            Authentication authentication
    ) {
        adminContextService.requireCurrentAdmin(authentication);
        AccessLogResponse response = accessLogQueryService.getById(accessLogId);
        return new ApiResponse<>(true, "Access log obtenido.", response, HttpStatus.OK.value());
    }
}
