package mx.edu.utez.server.modules.dashboard.controller;

import io.swagger.v3.oas.annotations.Operation;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisResponse;
import mx.edu.utez.server.modules.dashboard.service.analysis.DashboardAnalysisService;
import mx.edu.utez.server.shared.api.ApiResponse;
import mx.edu.utez.server.shared.api.ApiRoutes;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiRoutes.DASHBOARD + "/analysis")
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN_TI','ROLE_ADMIN_BIBLIOTECA')")
/**
 * Endpoint nuevo del dashboard adaptativo.
 *
 * <p>Compatibilidad:
 * no comparte lógica todavía con el dashboard legacy basado en query params; la migración será
 * progresiva por slices/layouts.
 */
public class DashboardAnalysisController {

    private final DashboardAnalysisService dashboardAnalysisService;

    public DashboardAnalysisController(DashboardAnalysisService dashboardAnalysisService) {
        this.dashboardAnalysisService = dashboardAnalysisService;
    }

    @PostMapping
    @Operation(summary = "Resolver análisis adaptativo de dashboard")
    public ApiResponse<DashboardAnalysisResponse> analyze(@RequestBody DashboardAnalysisRequest request) {
        DashboardAnalysisResponse response = dashboardAnalysisService.analyze(request);
        return new ApiResponse<>(true, "Análisis de dashboard obtenido.", response, HttpStatus.OK.value());
    }
}
