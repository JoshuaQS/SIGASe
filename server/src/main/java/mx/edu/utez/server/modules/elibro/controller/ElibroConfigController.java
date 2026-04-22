package mx.edu.utez.server.modules.elibro.controller;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.service.AdminContextService;
import mx.edu.utez.server.modules.elibro.dto.ElibroConfigOverviewResponse;
import mx.edu.utez.server.modules.elibro.dto.ElibroConfigResponse;
import mx.edu.utez.server.modules.elibro.dto.ElibroConfigStatusChangeRequest;
import mx.edu.utez.server.modules.elibro.dto.ElibroConfigValidationResponse;
import mx.edu.utez.server.modules.elibro.dto.ElibroControlledValidationRequest;
import mx.edu.utez.server.modules.elibro.dto.ElibroControlledValidationResponse;
import mx.edu.utez.server.modules.elibro.dto.ElibroDraftValidationRequest;
import mx.edu.utez.server.modules.elibro.dto.PatchElibroConfigRequest;
import mx.edu.utez.server.modules.elibro.dto.UpsertElibroConfigRequest;
import mx.edu.utez.server.modules.elibro.service.ElibroConfigOverviewService;
import mx.edu.utez.server.modules.elibro.service.ElibroConfigService;
import mx.edu.utez.server.shared.api.ApiRoutes;
import mx.edu.utez.server.shared.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiRoutes.ELIBRO_CONFIG)
@PreAuthorize("hasAuthority('ROLE_ADMIN_TI')")
public class ElibroConfigController {

    private final ElibroConfigService elibroConfigService;
    private final ElibroConfigOverviewService elibroConfigOverviewService;
    private final AdminContextService adminContextService;

    public ElibroConfigController(
            ElibroConfigService elibroConfigService,
            ElibroConfigOverviewService elibroConfigOverviewService,
            AdminContextService adminContextService
    ) {
        this.elibroConfigService = elibroConfigService;
        this.elibroConfigOverviewService = elibroConfigOverviewService;
        this.adminContextService = adminContextService;
    }

    @GetMapping
    @Operation(summary = "Listar configuraciones eLibro")
    public ApiResponse<List<ElibroConfigResponse>> list(
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        List<ElibroConfigResponse> response = elibroConfigService.listAll(actor, httpRequest);
        return new ApiResponse<>(true, "Listado de configuraciones eLibro.", response, HttpStatus.OK.value());
    }

    @GetMapping("/active")
    @Operation(summary = "Obtener configuración eLibro activa")
    public ApiResponse<ElibroConfigResponse> getActive(
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        ElibroConfigResponse response = elibroConfigService.getActive(actor, httpRequest);
        return new ApiResponse<>(true, "Configuración activa obtenida.", response, HttpStatus.OK.value());
    }

    @GetMapping("/active/overview")
    @Operation(summary = "Obtener overview agregado de configuración eLibro activa")
    public ApiResponse<ElibroConfigOverviewResponse> getActiveOverview(
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        ElibroConfigOverviewResponse response = elibroConfigOverviewService.getActiveOverview(actor, httpRequest);
        return new ApiResponse<>(true, "Overview de configuración eLibro obtenido.", response, HttpStatus.OK.value());
    }

    @PostMapping
    @Operation(summary = "Crear configuración eLibro")
    public ApiResponse<ElibroConfigResponse> create(
            @Valid @RequestBody UpsertElibroConfigRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        ElibroConfigResponse response = elibroConfigService.create(request, actor, httpRequest);
        return new ApiResponse<>(true, "Configuración eLibro creada.", response, HttpStatus.CREATED.value());
    }

    @PutMapping("/{configId}")
    @Operation(summary = "Actualizar configuración eLibro")
    public ApiResponse<ElibroConfigResponse> update(
            @PathVariable UUID configId,
            @Valid @RequestBody PatchElibroConfigRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        ElibroConfigResponse response = elibroConfigService.update(configId, request, actor, httpRequest);
        return new ApiResponse<>(true, "Configuración eLibro actualizada.", response, HttpStatus.OK.value());
    }

    @PatchMapping("/{configId}")
    @Operation(summary = "Actualizar parcialmente configuración eLibro")
    public ApiResponse<ElibroConfigResponse> patchUpdate(
            @PathVariable UUID configId,
            @Valid @RequestBody PatchElibroConfigRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        ElibroConfigResponse response = elibroConfigService.update(configId, request, actor, httpRequest);
        return new ApiResponse<>(true, "Configuración eLibro actualizada.", response, HttpStatus.OK.value());
    }

    @PatchMapping("/{configId}/activate")
    @Operation(summary = "Activar configuración eLibro")
    public ApiResponse<ElibroConfigResponse> activate(
            @PathVariable UUID configId,
            @Valid @RequestBody ElibroConfigStatusChangeRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        ElibroConfigResponse response = elibroConfigService.activate(configId, request, actor, httpRequest);
        return new ApiResponse<>(true, "Configuración eLibro activada.", response, HttpStatus.OK.value());
    }

    @PatchMapping("/{configId}/deactivate")
    @Operation(summary = "Desactivar configuración eLibro")
    public ApiResponse<ElibroConfigResponse> deactivate(
            @PathVariable UUID configId,
            @Valid @RequestBody ElibroConfigStatusChangeRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        ElibroConfigResponse response = elibroConfigService.deactivate(configId, request, actor, httpRequest);
        return new ApiResponse<>(true, "Configuración eLibro desactivada.", response, HttpStatus.OK.value());
    }

    @PostMapping("/{configId}/validate")
    @Operation(summary = "Validar configuración eLibro")
    public ApiResponse<ElibroConfigValidationResponse> validate(
            @PathVariable UUID configId,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        ElibroConfigValidationResponse response = elibroConfigService.validate(configId, actor, httpRequest);
        return new ApiResponse<>(true, "Validación ejecutada.", response, HttpStatus.OK.value());
    }

    @PostMapping("/validate-draft")
    @Operation(summary = "Validar conexión eLibro con datos del formulario sin persistir")
    public ApiResponse<ElibroConfigValidationResponse> validateDraft(
            @Valid @RequestBody ElibroDraftValidationRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        ElibroConfigValidationResponse response = elibroConfigService.validateDraft(request, actor, httpRequest);
        return new ApiResponse<>(true, "Validación temporal ejecutada.", response, HttpStatus.OK.value());
    }

    @PostMapping("/{configId}/validate-controlled")
    @Operation(summary = "Ejecutar prueba controlada de configuración eLibro")
    public ApiResponse<ElibroControlledValidationResponse> validateControlled(
            @PathVariable UUID configId,
            @Valid @RequestBody ElibroControlledValidationRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        ElibroControlledValidationResponse response = elibroConfigService.validateControlled(configId, request, actor, httpRequest);
        return new ApiResponse<>(true, "Prueba controlada ejecutada.", response, HttpStatus.OK.value());
    }

    @DeleteMapping("/{configId}")
    @Operation(summary = "Eliminar configuración eLibro")
    public ApiResponse<Void> delete(
            @PathVariable UUID configId,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        elibroConfigService.delete(configId, actor, httpRequest);
        return new ApiResponse<>(true, "Configuración eLibro eliminada.", null, HttpStatus.OK.value());
    }
}
