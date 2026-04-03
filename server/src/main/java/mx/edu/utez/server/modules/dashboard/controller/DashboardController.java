package mx.edu.utez.server.modules.dashboard.controller;

import mx.edu.utez.server.modules.dashboard.dto.DashboardAccessTrendsResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardSummaryResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTopStudentsResponse;
import mx.edu.utez.server.modules.dashboard.service.DashboardService;
import mx.edu.utez.server.shared.api.ApiResponse;
import mx.edu.utez.server.shared.api.ApiRoutes;
import mx.edu.utez.server.shared.enums.AccessResult;
import mx.edu.utez.server.shared.enums.StudentStatus;
import io.swagger.v3.oas.annotations.Operation;
import java.time.Instant;
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

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/summary")
    @Operation(summary = "Resumen general de KPIs de dashboard")
    public ApiResponse<DashboardSummaryResponse> summary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateTo,
            @RequestParam(required = false) UUID careerId,
            @RequestParam(required = false) String careerCode,
            @RequestParam(required = false) StudentStatus studentStatus
    ) {
        DashboardSummaryResponse response = dashboardService.getSummary(dateFrom, dateTo, careerId, careerCode, studentStatus);
        return new ApiResponse<>(true, "Resumen de dashboard obtenido.", response, HttpStatus.OK.value());
    }

    @GetMapping("/access-trends")
    @Operation(summary = "Serie temporal de accesos por día")
    public ApiResponse<DashboardAccessTrendsResponse> accessTrends(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateTo,
            @RequestParam(required = false) UUID careerId,
            @RequestParam(required = false) String careerCode,
            @RequestParam(required = false) StudentStatus studentStatus,
            @RequestParam(required = false) AccessResult result
    ) {
        DashboardAccessTrendsResponse response = dashboardService.getAccessTrends(
                dateFrom,
                dateTo,
                careerId,
                careerCode,
                studentStatus,
                result
        );
        return new ApiResponse<>(true, "Tendencias de acceso obtenidas.", response, HttpStatus.OK.value());
    }

    @GetMapping("/top-students")
    @Operation(summary = "Ranking de estudiantes por accesos exitosos")
    public ApiResponse<DashboardTopStudentsResponse> topStudents(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateTo,
            @RequestParam(required = false) UUID careerId,
            @RequestParam(required = false) String careerCode,
            @RequestParam(required = false) StudentStatus studentStatus,
            @RequestParam(required = false) AccessResult result,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String sortDir
    ) {
        DashboardTopStudentsResponse response = dashboardService.getTopStudents(
                dateFrom,
                dateTo,
                careerId,
                careerCode,
                studentStatus,
                result,
                limit,
                sortDir
        );
        return new ApiResponse<>(true, "Top de estudiantes obtenido.", response, HttpStatus.OK.value());
    }
}
