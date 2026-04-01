package mx.edu.utez.server.modules.reports.controller;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.service.AdminContextService;
import mx.edu.utez.server.modules.reports.service.ReportService;
import mx.edu.utez.server.modules.reports.service.ReportXlsxExportService;
import mx.edu.utez.server.modules.reports.service.StudentXlsxExportService;
import mx.edu.utez.server.shared.api.ApiRoutes;
import mx.edu.utez.server.shared.enums.AccessResult;
import mx.edu.utez.server.shared.enums.AuditActorType;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.AuditSeverity;
import mx.edu.utez.server.shared.enums.StudentStatus;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiRoutes.REPORTS)
public class ReportController {

    private static final String CT_CSV = "text/csv; charset=UTF-8";
    private static final String CT_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private final ReportService reportService;
    private final StudentXlsxExportService studentXlsxExportService;
    private final ReportXlsxExportService reportXlsxExportService;
    private final AdminContextService adminContextService;

    public ReportController(
            ReportService reportService,
            StudentXlsxExportService studentXlsxExportService,
            ReportXlsxExportService reportXlsxExportService,
            AdminContextService adminContextService
    ) {
        this.reportService = reportService;
        this.studentXlsxExportService = studentXlsxExportService;
        this.reportXlsxExportService = reportXlsxExportService;
        this.adminContextService = adminContextService;
    }

    @GetMapping("/students/export")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN_TI','ROLE_ADMIN_BIBLIOTECA')")
    @Operation(summary = "Exportar estudiantes a CSV o XLSX")
    public void exportStudents(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String career,
            @RequestParam(required = false) StudentStatus status,
            @RequestParam(defaultValue = "csv") String format,
            Authentication authentication,
            HttpServletRequest request,
            HttpServletResponse response
    ) throws Exception {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        String fmt = validateFormat(format);
        reportService.validateStudentExport(q, career, status);

        if ("xlsx".equals(fmt)) {
            String filename = ReportService.generateFilename("students", "xlsx");
            response.setContentType(CT_XLSX);
            response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
            studentXlsxExportService.export(response.getOutputStream(), q, career, status, actor, request);
        } else {
            String filename = ReportService.generateFilename("students", "csv");
            response.setContentType(CT_CSV);
            response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
            reportService.exportStudents(response.getOutputStream(), q, career, status, actor, request);
        }
    }

    @GetMapping("/access-logs/export")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN_TI','ROLE_ADMIN_BIBLIOTECA')")
    @Operation(summary = "Exportar access logs a CSV o XLSX")
    public void exportAccessLogs(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateTo,
            @RequestParam(required = false) AccessResult result,
            @RequestParam(required = false) String normalizedEmail,
            @RequestParam(required = false) String attemptedEmail,
            @RequestParam(required = false) UUID studentId,
            @RequestParam(required = false) String ipAddress,
            @RequestParam(required = false) String providerName,
            @RequestParam(defaultValue = "csv") String format,
            Authentication authentication,
            HttpServletRequest request,
            HttpServletResponse response
    ) throws Exception {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        String fmt = validateFormat(format);
        reportService.validateLogExport(dateFrom, dateTo);

        if ("xlsx".equals(fmt)) {
            String filename = ReportService.generateFilename("access-logs", "xlsx");
            response.setContentType(CT_XLSX);
            response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
            reportXlsxExportService.exportAccessLogs(
                    response.getOutputStream(), dateFrom, dateTo, result, normalizedEmail,
                    attemptedEmail, studentId, ipAddress, providerName, actor, request
            );
        } else {
            String filename = ReportService.generateFilename("access-logs", "csv");
            response.setContentType(CT_CSV);
            response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
            reportService.exportAccessLogs(
                    response.getOutputStream(), dateFrom, dateTo, result, normalizedEmail,
                    attemptedEmail, studentId, ipAddress, providerName, actor, request
            );
        }
    }

    @GetMapping("/audit-logs/export")
    @PreAuthorize("hasAuthority('ROLE_ADMIN_TI')")
    @Operation(summary = "Exportar audit logs a CSV o XLSX (solo ADMIN_TI)")
    public void exportAuditLogs(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateTo,
            @RequestParam(required = false) AuditActorType actorType,
            @RequestParam(required = false) String actorEmail,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) AuditOutcome outcome,
            @RequestParam(required = false) AuditSeverity severity,
            @RequestParam(defaultValue = "csv") String format,
            Authentication authentication,
            HttpServletRequest request,
            HttpServletResponse response
    ) throws Exception {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        String fmt = validateFormat(format);
        reportService.validateLogExport(dateFrom, dateTo);

        if ("xlsx".equals(fmt)) {
            String filename = ReportService.generateFilename("audit-logs", "xlsx");
            response.setContentType(CT_XLSX);
            response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
            reportXlsxExportService.exportAuditLogs(
                    response.getOutputStream(), dateFrom, dateTo, actorType, actorEmail,
                    action, entityType, outcome, severity, actor, request
            );
        } else {
            String filename = ReportService.generateFilename("audit-logs", "csv");
            response.setContentType(CT_CSV);
            response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
            reportService.exportAuditLogs(
                    response.getOutputStream(), dateFrom, dateTo, actorType, actorEmail,
                    action, entityType, outcome, severity, actor, request
            );
        }
    }

    private String validateFormat(String format) {
        String fmt = format.trim().toLowerCase(Locale.ROOT);
        if (!"csv".equals(fmt) && !"xlsx".equals(fmt)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "Formato inválido. Valores permitidos: csv, xlsx.");
        }
        return fmt;
    }
}
