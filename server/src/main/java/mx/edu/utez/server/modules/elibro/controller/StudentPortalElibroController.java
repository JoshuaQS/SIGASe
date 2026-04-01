package mx.edu.utez.server.modules.elibro.controller;

import mx.edu.utez.server.modules.elibro.dto.StudentElibroAccessRequest;
import mx.edu.utez.server.modules.elibro.dto.StudentElibroAccessResponse;
import mx.edu.utez.server.modules.elibro.dto.StudentPortalSummaryResponse;
import mx.edu.utez.server.modules.elibro.service.ElibroSsoService;
import mx.edu.utez.server.modules.elibro.service.StudentPortalSummaryService;
import mx.edu.utez.server.shared.api.ApiRoutes;
import mx.edu.utez.server.shared.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiRoutes.STUDENT_PORTAL)
public class StudentPortalElibroController {

    private final ElibroSsoService elibroSsoService;
    private final StudentPortalSummaryService studentPortalSummaryService;

    public StudentPortalElibroController(
            ElibroSsoService elibroSsoService,
            StudentPortalSummaryService studentPortalSummaryService
    ) {
        this.elibroSsoService = elibroSsoService;
        this.studentPortalSummaryService = studentPortalSummaryService;
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('ROLE_STUDENT')")
    @Operation(
            summary = "Resumen del portal estudiante",
            description = "Devuelve datos personales y métricas de acceso calculadas desde AccessLog."
    )
    public ApiResponse<StudentPortalSummaryResponse> summary(Authentication authentication) {
        UUID studentId = UUID.fromString(authentication.getName());
        StudentPortalSummaryResponse response = studentPortalSummaryService.getSummary(studentId);
        return new ApiResponse<>(true, "Resumen de portal obtenido.", response, HttpStatus.OK.value());
    }

    @PostMapping("/elibro-access")
    @PreAuthorize("hasAuthority('ROLE_STUDENT')")
    @Operation(
            summary = "Generar acceso eLibro",
            description = "Valida estado del estudiante, valida parámetro next con política estricta y genera redirect URL de eLibro."
    )
    public ApiResponse<StudentElibroAccessResponse> elibroAccess(
            @RequestBody(required = false) StudentElibroAccessRequest request,
            Authentication authentication,
            HttpServletRequest httpServletRequest
    ) {
        UUID studentId = UUID.fromString(authentication.getName());
        String next = request == null ? null : request.next();
        StudentElibroAccessResponse response = elibroSsoService.generateAccess(studentId, next, httpServletRequest);
        return new ApiResponse<>(true, "Acceso a eLibro generado.", response, HttpStatus.OK.value());
    }
}
