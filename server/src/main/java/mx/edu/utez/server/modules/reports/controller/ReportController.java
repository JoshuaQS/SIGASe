package mx.edu.utez.server.modules.reports.controller;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.service.AdminContextService;
import mx.edu.utez.server.modules.accesslogs.dto.AccessLogActorType;
import mx.edu.utez.server.modules.accesslogs.dto.AccessLogQueryFilters;
import mx.edu.utez.server.modules.accesslogs.dto.AccessLogScope;
import mx.edu.utez.server.modules.logs.audit.dto.AuditLogFilterRequest;
import mx.edu.utez.server.modules.reports.service.ReportService;
import mx.edu.utez.server.modules.reports.service.ReportXlsxExportService;
import mx.edu.utez.server.modules.reports.service.StudentXlsxExportService;
import mx.edu.utez.server.modules.reports.service.UnifiedAccessLogExportService;
import mx.edu.utez.server.shared.api.ApiRoutes;
import mx.edu.utez.server.shared.enums.AuditActorType;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.AuditSeverity;
import mx.edu.utez.server.shared.enums.Sex;
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
    private final UnifiedAccessLogExportService unifiedAccessLogExportService;
    private final AdminContextService adminContextService;

    public ReportController(
            ReportService reportService,
            StudentXlsxExportService studentXlsxExportService,
            ReportXlsxExportService reportXlsxExportService,
            UnifiedAccessLogExportService unifiedAccessLogExportService,
            AdminContextService adminContextService
    ) {
        this.reportService = reportService;
        this.studentXlsxExportService = studentXlsxExportService;
        this.reportXlsxExportService = reportXlsxExportService;
        this.unifiedAccessLogExportService = unifiedAccessLogExportService;
        this.adminContextService = adminContextService;
    }

    @GetMapping("/students/export")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN_TI','ROLE_ADMIN_BIBLIOTECA')")
    @Operation(summary = "Exportar estudiantes a CSV o XLSX")
    public void exportStudents(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String enrollmentId,
            @RequestParam(required = false) String lastNamePaternal,
            @RequestParam(required = false) String lastNameMaternal,
            @RequestParam(required = false) UUID careerId,
            @RequestParam(required = false) String careerCode,
            @RequestParam(required = false) Sex sex,
            @RequestParam(required = false) Integer quarter,
            @RequestParam(required = false) StudentStatus status,
            @RequestParam(defaultValue = "csv") String format,
            Authentication authentication,
            HttpServletRequest request,
            HttpServletResponse response
    ) throws Exception {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        String fmt = validateFormat(format);
        reportService.validateStudentExport(
                q,
                enrollmentId,
                lastNamePaternal,
                lastNameMaternal,
                careerId,
                careerCode,
                sex,
                quarter,
                status
        );

        if ("xlsx".equals(fmt)) {
            String filename = ReportService.generateFilename("students", "xlsx");
            response.setContentType(CT_XLSX);
            response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
            studentXlsxExportService.export(
                    response.getOutputStream(),
                    q,
                    enrollmentId,
                    lastNamePaternal,
                    lastNameMaternal,
                    careerId,
                    careerCode,
                    sex,
                    quarter,
                    status,
                    actor,
                    request
            );
        } else {
            String filename = ReportService.generateFilename("students", "csv");
            response.setContentType(CT_CSV);
            response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
            reportService.exportStudents(
                    response.getOutputStream(),
                    q,
                    enrollmentId,
                    lastNamePaternal,
                    lastNameMaternal,
                    careerId,
                    careerCode,
                    sex,
                    quarter,
                    status,
                    actor,
                    request
            );
        }
    }

    @GetMapping("/access-logs/export")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN_TI','ROLE_ADMIN_BIBLIOTECA')")
    @Operation(summary = "Exportar access logs a CSV o XLSX")
    public void exportAccessLogs(
            @RequestParam(required = false, defaultValue = "ALL") AccessLogActorType actorType,
            @RequestParam(required = false, defaultValue = "ALL") AccessLogScope scope,
            @RequestParam(required = false) String result,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateTo,
            @RequestParam(required = false) UUID studentId,
            @RequestParam(required = false) UUID adminId,
            @RequestParam(required = false) UUID careerId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "occurredAt,desc") String sort,
            @RequestParam(defaultValue = "csv") String format,
            Authentication authentication,
            HttpServletRequest request,
            HttpServletResponse response
    ) throws Exception {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        String fmt = validateFormat(format);
        AccessLogQueryFilters filters = new AccessLogQueryFilters(
                actorType,
                scope,
                result,
                dateFrom,
                dateTo,
                studentId,
                adminId,
                careerId,
                search,
                0,
                1,
                sort
        );

        if ("xlsx".equals(fmt)) {
            String filename = ReportService.generateFilename("access-logs", "xlsx");
            response.setContentType(CT_XLSX);
            response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
            unifiedAccessLogExportService.exportXlsx(response.getOutputStream(), filters, actor, request);
        } else {
            String filename = ReportService.generateFilename("access-logs", "csv");
            response.setContentType(CT_CSV);
            response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
            unifiedAccessLogExportService.exportCsv(response.getOutputStream(), filters, actor, request);
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
            @RequestParam(required = false) String requestId,
            @RequestParam(required = false) String correlationId,
            @RequestParam(required = false) AuditSeverity severity,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "csv") String format,
            Authentication authentication,
            HttpServletRequest request,
            HttpServletResponse response
    ) throws Exception {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        String fmt = validateFormat(format);
        AuditLogFilterRequest filters = new AuditLogFilterRequest(
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
                search,
                null,
                null,
                "occurredAt",
                "desc"
        );
        reportService.validateAuditLogExport(filters);

        if ("xlsx".equals(fmt)) {
            String filename = ReportService.generateFilename("audit-logs", "xlsx");
            response.setContentType(CT_XLSX);
            response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
            reportXlsxExportService.exportAuditLogs(
                    response.getOutputStream(), filters, actor, request
            );
        } else {
            String filename = ReportService.generateFilename("audit-logs", "csv");
            response.setContentType(CT_CSV);
            response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
            reportService.exportAuditLogs(
                    response.getOutputStream(), filters, actor, request
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
