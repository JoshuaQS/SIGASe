package mx.edu.utez.server.modules.logs.audit.controller;

import mx.edu.utez.server.modules.admins.service.AdminContextService;
import mx.edu.utez.server.modules.logs.audit.dto.AuditLogFilterRequest;
import mx.edu.utez.server.modules.logs.audit.dto.AuditLogResponse;
import mx.edu.utez.server.modules.logs.audit.service.AuditLogQueryService;
import mx.edu.utez.server.modules.reports.service.AuditLogReportService;
import mx.edu.utez.server.modules.reports.service.ReportService;
import mx.edu.utez.server.modules.reports.service.ReportXlsxExportService;
import mx.edu.utez.server.shared.api.ApiResponse;
import mx.edu.utez.server.shared.api.ApiRoutes;
import mx.edu.utez.server.shared.api.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiRoutes.AUDIT_LOGS)
@PreAuthorize("hasAuthority('ROLE_ADMIN_TI')")
public class AuditLogQueryController {

    private final AuditLogQueryService auditLogQueryService;
    private final AuditLogReportService auditLogReportService;
    private final ReportXlsxExportService reportXlsxExportService;
    private final AdminContextService adminContextService;

    public AuditLogQueryController(
            AuditLogQueryService auditLogQueryService,
            AuditLogReportService auditLogReportService,
            ReportXlsxExportService reportXlsxExportService,
            AdminContextService adminContextService
    ) {
        this.auditLogQueryService = auditLogQueryService;
        this.auditLogReportService = auditLogReportService;
        this.reportXlsxExportService = reportXlsxExportService;
        this.adminContextService = adminContextService;
    }

    @GetMapping
    @Operation(summary = "Listar audit logs con filtros")
    public ApiResponse<PageResponse<AuditLogResponse>> list(
            @ModelAttribute AuditLogFilterRequest filters,
            Authentication authentication
    ) {
        adminContextService.requireCurrentAdmin(authentication);
        PageResponse<AuditLogResponse> response = auditLogQueryService.list(filters);
        return new ApiResponse<>(true, "Listado de audit logs.", response, HttpStatus.OK.value());
    }

    @PostMapping("/export")
    @Operation(summary = "Exportar audit logs usando exactamente los mismos filtros de consulta")
    public void export(
            @RequestBody(required = false) AuditLogFilterRequest filters,
            Authentication authentication,
            HttpServletRequest request,
            HttpServletResponse response,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "csv") String format
    ) throws Exception {
        var actor = adminContextService.requireCurrentAdmin(authentication);
        AuditLogFilterRequest safeFilters = filters == null ? AuditLogFilterRequest.empty() : filters;
        auditLogQueryService.validateForExport(safeFilters);
        String safeFormat = format == null ? "csv" : format.trim().toLowerCase();

        if ("xlsx".equals(safeFormat)) {
            String filename = ReportService.generateFilename("audit-logs", "xlsx");
            response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
            reportXlsxExportService.exportAuditLogs(response.getOutputStream(), safeFilters, actor, request);
            return;
        }

        if (!"csv".equals(safeFormat)) {
            throw new mx.edu.utez.server.shared.exception.BusinessException(
                    mx.edu.utez.server.shared.exception.ErrorCode.VALIDATION_ERROR,
                    "Formato inválido. Valores permitidos: csv, xlsx."
            );
        }

        String filename = ReportService.generateFilename("audit-logs", "csv");
        response.setContentType("text/csv; charset=UTF-8");
        response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
        auditLogReportService.export(response.getOutputStream(), safeFilters, actor, request);
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
