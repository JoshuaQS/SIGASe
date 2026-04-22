package mx.edu.utez.server.modules.accesslogs.controller;

import io.swagger.v3.oas.annotations.Operation;
import java.time.Instant;
import java.util.UUID;
import mx.edu.utez.server.modules.accesslogs.dto.AccessLogActorType;
import mx.edu.utez.server.modules.accesslogs.dto.AccessLogMetricsResponse;
import mx.edu.utez.server.modules.accesslogs.dto.AccessLogQueryFilters;
import mx.edu.utez.server.modules.accesslogs.dto.AccessLogResponse;
import mx.edu.utez.server.modules.accesslogs.dto.AccessLogScope;
import mx.edu.utez.server.modules.accesslogs.dto.AccessLogSummaryResponse;
import mx.edu.utez.server.modules.accesslogs.service.AccessLogQueryService;
import mx.edu.utez.server.modules.admins.service.AdminContextService;
import mx.edu.utez.server.shared.api.ApiResponse;
import mx.edu.utez.server.shared.api.ApiRoutes;
import mx.edu.utez.server.shared.api.PageResponse;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
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
    @Operation(summary = "Listar access logs unificados")
    public ApiResponse<PageResponse<AccessLogResponse>> list(
            @RequestParam(required = false, defaultValue = "ALL") AccessLogActorType actorType,
            @RequestParam(required = false, defaultValue = "ALL") AccessLogScope scope,
            @RequestParam(required = false) String result,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateTo,
            @RequestParam(required = false) UUID studentId,
            @RequestParam(required = false) UUID adminId,
            @RequestParam(required = false) UUID careerId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "occurredAt,desc") String sort,
            Authentication authentication
    ) {
        adminContextService.requireCurrentAdmin(authentication);
        PageResponse<AccessLogResponse> response = accessLogQueryService.list(new AccessLogQueryFilters(
                actorType,
                scope,
                result,
                dateFrom,
                dateTo,
                studentId,
                adminId,
                careerId,
                search,
                page,
                size,
                sort
        ));
        return new ApiResponse<>(true, "Listado de access logs.", response, HttpStatus.OK.value());
    }

    @GetMapping("/metrics")
    @Operation(summary = "Métricas agregadas para access logs")
    public ApiResponse<AccessLogMetricsResponse> metrics(
            @RequestParam(required = false, defaultValue = "ALL") AccessLogActorType actorType,
            @RequestParam(required = false, defaultValue = "ALL") AccessLogScope scope,
            @RequestParam(required = false) String result,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateTo,
            @RequestParam(required = false) UUID studentId,
            @RequestParam(required = false) UUID adminId,
            @RequestParam(required = false) UUID careerId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "7") int windowDays,
            Authentication authentication
    ) {
        adminContextService.requireCurrentAdmin(authentication);
        Instant now = Instant.now();
        Instant effectiveFrom = dateFrom != null ? dateFrom : now.minusSeconds(Math.max(1, windowDays) * 24L * 60L * 60L);
        Instant effectiveTo = dateTo != null ? dateTo : now;

        AccessLogMetricsResponse response = accessLogQueryService.metrics(new AccessLogQueryFilters(
                actorType,
                scope,
                result,
                effectiveFrom,
                effectiveTo,
                studentId,
                adminId,
                careerId,
                search,
                0,
                1,
                "occurredAt,desc"
        ));
        return new ApiResponse<>(true, "Métricas de access logs.", response, HttpStatus.OK.value());
    }

    @GetMapping("/summary")
    @Operation(summary = "Resumen agregado (totales) para access logs")
    public ApiResponse<AccessLogSummaryResponse> summary(
            @RequestParam(required = false, defaultValue = "ALL") AccessLogActorType actorType,
            @RequestParam(required = false, defaultValue = "ALL") AccessLogScope scope,
            @RequestParam(required = false) String result,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateTo,
            @RequestParam(required = false) UUID studentId,
            @RequestParam(required = false) UUID adminId,
            @RequestParam(required = false) UUID careerId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "7") int windowDays,
            Authentication authentication
    ) {
        adminContextService.requireCurrentAdmin(authentication);
        Instant now = Instant.now();
        Instant effectiveFrom = dateFrom != null ? dateFrom : now.minusSeconds(Math.max(1, windowDays) * 24L * 60L * 60L);
        Instant effectiveTo = dateTo != null ? dateTo : now;

        AccessLogSummaryResponse response = accessLogQueryService.summary(new AccessLogQueryFilters(
                actorType,
                scope,
                result,
                effectiveFrom,
                effectiveTo,
                studentId,
                adminId,
                careerId,
                search,
                0,
                1,
                "occurredAt,desc"
        ));
        return new ApiResponse<>(true, "Resumen de access logs.", response, HttpStatus.OK.value());
    }
}
