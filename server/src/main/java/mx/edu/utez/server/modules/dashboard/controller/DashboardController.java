package mx.edu.utez.server.modules.dashboard.controller;

import mx.edu.utez.server.modules.dashboard.dto.DashboardAccessTrendsResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTopCareersResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardSummaryResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTopStudentsResponse;
import mx.edu.utez.server.modules.dashboard.service.DashboardExportService;
import mx.edu.utez.server.modules.dashboard.service.DashboardService;
import mx.edu.utez.server.shared.api.ApiResponse;
import mx.edu.utez.server.shared.api.ApiRoutes;
import mx.edu.utez.server.shared.enums.StudentStatus;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiRoutes.DASHBOARD)
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN_TI','ROLE_ADMIN_BIBLIOTECA')")
public class DashboardController {

    private final DashboardService dashboardService;
    private final DashboardExportService dashboardExportService;

    public DashboardController(DashboardService dashboardService, DashboardExportService dashboardExportService) {
        this.dashboardService = dashboardService;
        this.dashboardExportService = dashboardExportService;
    }

    @GetMapping("/summary")
    @Operation(summary = "Resumen general de KPIs de dashboard")
    public ApiResponse<DashboardSummaryResponse> summary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateTo,
            @RequestParam(required = false) String analysisType,
            @RequestParam(required = false) UUID studentId,
            @RequestParam(required = false) List<String> careerCodes,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) StudentStatus studentStatus,
            @RequestParam(required = false) String sortDir,
            @RequestParam(required = false) Boolean topEnabled,
            @RequestParam(required = false) Integer topN
    ) {
        DashboardSummaryResponse response = dashboardService.getSummary(
                dateFrom, dateTo, analysisType, studentId, careerCodes, status, studentStatus, sortDir, topEnabled, topN
        );
        return new ApiResponse<>(true, "Resumen de dashboard obtenido.", response, HttpStatus.OK.value());
    }

    @GetMapping("/access-trends")
    @Operation(summary = "Serie temporal de accesos por día")
    public ApiResponse<DashboardAccessTrendsResponse> accessTrends(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateTo,
            @RequestParam(required = false) String analysisType,
            @RequestParam(required = false) UUID studentId,
            @RequestParam(required = false) List<String> careerCodes,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) StudentStatus studentStatus,
            @RequestParam(required = false) String sortDir,
            @RequestParam(required = false) Boolean topEnabled,
            @RequestParam(required = false) Integer topN
    ) {
        DashboardAccessTrendsResponse response = dashboardService.getAccessTrends(
                dateFrom,
                dateTo,
                analysisType,
                studentId,
                careerCodes,
                status,
                studentStatus,
                sortDir,
                topEnabled,
                topN
        );
        return new ApiResponse<>(true, "Tendencias de acceso obtenidas.", response, HttpStatus.OK.value());
    }

    @GetMapping("/top-students")
    @Operation(summary = "Ranking de estudiantes por accesos exitosos")
    public ApiResponse<DashboardTopStudentsResponse> topStudents(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateTo,
            @RequestParam(required = false) String analysisType,
            @RequestParam(required = false) UUID studentId,
            @RequestParam(required = false) List<String> careerCodes,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) StudentStatus studentStatus,
            @RequestParam(required = false) String sortDir,
            @RequestParam(required = false) Boolean topEnabled,
            @RequestParam(required = false) Integer topN
    ) {
        DashboardTopStudentsResponse response = dashboardService.getTopStudents(
                dateFrom,
                dateTo,
                analysisType,
                studentId,
                careerCodes,
                status,
                studentStatus,
                sortDir,
                topEnabled,
                topN
        );
        return new ApiResponse<>(true, "Top de estudiantes obtenido.", response, HttpStatus.OK.value());
    }

    @GetMapping("/top-careers")
    @Operation(summary = "Ranking de carreras por accesos exitosos")
    public ApiResponse<DashboardTopCareersResponse> topCareers(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateTo,
            @RequestParam(required = false) String analysisType,
            @RequestParam(required = false) UUID studentId,
            @RequestParam(required = false) List<String> careerCodes,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) StudentStatus studentStatus,
            @RequestParam(required = false) String sortDir,
            @RequestParam(required = false) Boolean topEnabled,
            @RequestParam(required = false) Integer topN
    ) {
        DashboardTopCareersResponse response = dashboardService.getTopCareers(
                dateFrom,
                dateTo,
                analysisType,
                studentId,
                careerCodes,
                status,
                studentStatus,
                sortDir,
                topEnabled,
                topN
        );
        return new ApiResponse<>(true, "Top de carreras obtenido.", response, HttpStatus.OK.value());
    }

    @GetMapping("/export")
    @Operation(summary = "Exportar estadísticas de monitoreo (CSV o XLSX)")
    public void export(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateTo,
            @RequestParam(required = false) String analysisType,
            @RequestParam(required = false) UUID studentId,
            @RequestParam(required = false) List<String> careerCodes,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) StudentStatus studentStatus,
            @RequestParam(required = false) String sortDir,
            @RequestParam(required = false) Boolean topEnabled,
            @RequestParam(required = false) Integer topN,
            @RequestParam(defaultValue = "csv") String format,
            HttpServletResponse response
    ) throws Exception {
        String safeFormat = format == null ? "csv" : format.trim().toLowerCase();
        if (!"csv".equals(safeFormat) && !"xlsx".equals(safeFormat)) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "Formato inválido. Valores permitidos: csv, xlsx."
            );
        }
        String filename = dashboardExportService.buildFilename(safeFormat);
        response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
        response.setContentType("xlsx".equals(safeFormat)
                ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                : "text/csv; charset=UTF-8");

        dashboardExportService.export(
                response.getOutputStream(),
                safeFormat,
                dateFrom,
                dateTo,
                analysisType,
                studentId,
                careerCodes,
                status,
                studentStatus,
                sortDir,
                topEnabled,
                topN
        );
    }
}
