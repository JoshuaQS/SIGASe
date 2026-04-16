package mx.edu.utez.server.modules.dashboard.controller;

import io.swagger.v3.oas.annotations.Operation;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisExportRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisMetadataResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisOptionsRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisOptionsResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAutocompleteResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardCareerSearchItemResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardStudentSearchItemResponse;
import mx.edu.utez.server.modules.dashboard.service.analysis.DashboardAnalysisExportService;
import mx.edu.utez.server.modules.dashboard.service.analysis.DashboardAnalysisService;
import mx.edu.utez.server.modules.dashboard.service.analysis.DashboardAutocompleteService;
import mx.edu.utez.server.modules.dashboard.service.analysis.DashboardMetadataService;
import mx.edu.utez.server.modules.dashboard.service.analysis.DashboardOptionsService;
import mx.edu.utez.server.shared.api.ApiResponse;
import mx.edu.utez.server.shared.api.ApiRoutes;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiRoutes.DASHBOARD + "/analysis")
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN_TI','ROLE_ADMIN_BIBLIOTECA')")
public class DashboardAnalysisController {

    private final DashboardAnalysisService dashboardAnalysisService;
    private final DashboardAnalysisExportService dashboardAnalysisExportService;
    private final DashboardMetadataService dashboardMetadataService;
    private final DashboardOptionsService dashboardOptionsService;
    private final DashboardAutocompleteService dashboardAutocompleteService;

    public DashboardAnalysisController(
            DashboardAnalysisService dashboardAnalysisService,
            DashboardAnalysisExportService dashboardAnalysisExportService,
            DashboardMetadataService dashboardMetadataService,
            DashboardOptionsService dashboardOptionsService,
            DashboardAutocompleteService dashboardAutocompleteService
    ) {
        this.dashboardAnalysisService = dashboardAnalysisService;
        this.dashboardAnalysisExportService = dashboardAnalysisExportService;
        this.dashboardMetadataService = dashboardMetadataService;
        this.dashboardOptionsService = dashboardOptionsService;
        this.dashboardAutocompleteService = dashboardAutocompleteService;
    }

    @GetMapping("/metadata")
    @Operation(summary = "Obtener catálogo global del wizard de análisis")
    public ApiResponse<DashboardAnalysisMetadataResponse> metadata() {
        DashboardAnalysisMetadataResponse response = dashboardMetadataService.getMetadata();
        return new ApiResponse<>(true, "Metadata de analysis obtenida.", response, HttpStatus.OK.value());
    }

    @PostMapping("/options")
    @Operation(summary = "Resolver opciones contextuales del wizard de análisis")
    public ApiResponse<DashboardAnalysisOptionsResponse> options(
            @RequestBody(required = false) DashboardAnalysisOptionsRequest request
    ) {
        DashboardAnalysisOptionsResponse response = dashboardOptionsService.resolve(request);
        return new ApiResponse<>(true, "Options de analysis obtenidas.", response, HttpStatus.OK.value());
    }

    @GetMapping("/students/search")
    @Operation(summary = "Buscar alumnos para el wizard de analysis")
    public ApiResponse<DashboardAutocompleteResponse<DashboardStudentSearchItemResponse>> searchStudents(
            @RequestParam("q") String q,
            @RequestParam(value = "limit", required = false) Integer limit
    ) {
        DashboardAutocompleteResponse<DashboardStudentSearchItemResponse> response =
                dashboardAutocompleteService.searchStudents(q, limit);
        return new ApiResponse<>(true, "Autocomplete de alumnos obtenido.", response, HttpStatus.OK.value());
    }

    @GetMapping("/careers/search")
    @Operation(summary = "Buscar carreras para el wizard de analysis")
    public ApiResponse<DashboardAutocompleteResponse<DashboardCareerSearchItemResponse>> searchCareers(
            @RequestParam("q") String q,
            @RequestParam(value = "limit", required = false) Integer limit
    ) {
        DashboardAutocompleteResponse<DashboardCareerSearchItemResponse> response =
                dashboardAutocompleteService.searchCareers(q, limit);
        return new ApiResponse<>(true, "Autocomplete de carreras obtenido.", response, HttpStatus.OK.value());
    }

    @PostMapping
    @Operation(summary = "Resolver análisis adaptativo de dashboard")
    public ApiResponse<DashboardAnalysisResponse> analyze(@RequestBody DashboardAnalysisRequest request) {
        DashboardAnalysisResponse response = dashboardAnalysisService.analyze(request);
        return new ApiResponse<>(true, "Análisis de dashboard obtenido.", response, HttpStatus.OK.value());
    }

    @PostMapping("/export")
    @Operation(summary = "Exportar análisis adaptativo de dashboard")
    public ResponseEntity<byte[]> export(
            @RequestBody(required = false) DashboardAnalysisExportRequest request
    ) {
        DashboardAnalysisExportService.ExportedDashboardAnalysisFile exportedFile =
                dashboardAnalysisExportService.export(request);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(exportedFile.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + exportedFile.filename() + "\"")
                .body(exportedFile.content());
    }
}
