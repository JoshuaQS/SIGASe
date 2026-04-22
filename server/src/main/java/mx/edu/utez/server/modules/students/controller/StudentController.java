package mx.edu.utez.server.modules.students.controller;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.service.AdminContextService;
import mx.edu.utez.server.modules.students.dto.CreateStudentRequest;
import mx.edu.utez.server.modules.students.dto.StudentMetricsResponse;
import mx.edu.utez.server.modules.students.dto.StudentResponse;
import mx.edu.utez.server.modules.students.dto.StudentStatusChangeRequest;
import mx.edu.utez.server.modules.students.dto.UpdateStudentRequest;
import mx.edu.utez.server.modules.students.service.StudentService;
import mx.edu.utez.server.shared.api.ApiRoutes;
import mx.edu.utez.server.shared.api.ApiResponse;
import mx.edu.utez.server.shared.api.PageResponse;
import mx.edu.utez.server.shared.enums.Sex;
import mx.edu.utez.server.shared.enums.StudentStatus;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiRoutes.STUDENTS)
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN_TI','ROLE_ADMIN_BIBLIOTECA')")
public class StudentController {

    private final StudentService studentService;
    private final AdminContextService adminContextService;

    public StudentController(StudentService studentService, AdminContextService adminContextService) {
        this.studentService = studentService;
        this.adminContextService = adminContextService;
    }

    @PostMapping
    @Operation(summary = "Crear estudiante")
    public ApiResponse<StudentResponse> create(
            @Valid @RequestBody CreateStudentRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        StudentResponse response = studentService.create(request, actor, httpRequest);
        return new ApiResponse<>(true, "Estudiante creado.", response, HttpStatus.CREATED.value());
    }

    @PutMapping("/{studentId}")
    @Operation(summary = "Actualizar estudiante")
    public ApiResponse<StudentResponse> update(
            @PathVariable UUID studentId,
            @Valid @RequestBody UpdateStudentRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        StudentResponse response = studentService.update(studentId, request, actor, httpRequest);
        return new ApiResponse<>(true, "Estudiante actualizado.", response, HttpStatus.OK.value());
    }

    @GetMapping("/{studentId}")
    @Operation(summary = "Obtener estudiante por id")
    public ApiResponse<StudentResponse> getById(
            @PathVariable UUID studentId,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        StudentResponse response = studentService.getById(studentId, actor, httpRequest);
        return new ApiResponse<>(true, "Estudiante obtenido.", response, HttpStatus.OK.value());
    }

    @GetMapping
    @Operation(summary = "Listar estudiantes con filtros")
    public ApiResponse<PageResponse<StudentResponse>> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String enrollmentId,
            @RequestParam(required = false) String lastNamePaternal,
            @RequestParam(required = false) String lastNameMaternal,
            @RequestParam(required = false) String institutionalEmail,
            @RequestParam(required = false) UUID careerId,
            @RequestParam(required = false) String careerCode,
            @RequestParam(required = false) Sex sex,
            @RequestParam(required = false) Integer quarter,
            @RequestParam(required = false) StudentStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        PageResponse<StudentResponse> response = studentService.list(
                q,
                enrollmentId,
                lastNamePaternal,
                lastNameMaternal,
                institutionalEmail,
                careerId,
                careerCode,
                sex,
                quarter,
                status,
                page,
                size,
                sortBy,
                sortDir,
                actor,
                httpRequest
        );
        return new ApiResponse<>(true, "Listado de estudiantes.", response, HttpStatus.OK.value());
    }

    @GetMapping("/metrics")
    @Operation(summary = "Obtener métricas administrativas reales de estudiantes")
    public ApiResponse<StudentMetricsResponse> metrics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateTo,
            Authentication authentication
    ) {
        adminContextService.requireCurrentAdmin(authentication);
        StudentMetricsResponse response = studentService.getMetrics(dateFrom, dateTo);
        return new ApiResponse<>(true, "Métricas de estudiantes obtenidas.", response, HttpStatus.OK.value());
    }

    @PatchMapping("/{studentId}/deactivate")
    @Operation(summary = "Dar de baja estudiante")
    public ApiResponse<StudentResponse> deactivate(
            @PathVariable UUID studentId,
            @Valid @RequestBody StudentStatusChangeRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        StudentResponse response = studentService.deactivate(studentId, request, actor, httpRequest);
        return new ApiResponse<>(true, "Estudiante desactivado.", response, HttpStatus.OK.value());
    }

    @PatchMapping("/{studentId}/reactivate")
    @Operation(summary = "Reactivar estudiante")
    public ApiResponse<StudentResponse> reactivate(
            @PathVariable UUID studentId,
            @Valid @RequestBody StudentStatusChangeRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        StudentResponse response = studentService.reactivate(studentId, request, actor, httpRequest);
        return new ApiResponse<>(true, "Estudiante reactivado.", response, HttpStatus.OK.value());
    }

    @PostMapping("/{studentId}/resend-onboarding")
    @Operation(summary = "Reenviar correo de onboarding de estudiante")
    public ApiResponse<StudentResponse> resendOnboarding(
            @PathVariable UUID studentId,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        StudentResponse response = studentService.resendOnboardingEmail(studentId, actor, httpRequest);
        return new ApiResponse<>(true, "Correo de onboarding reenviado.", response, HttpStatus.OK.value());
    }

    @DeleteMapping("/{studentId}")
    @Operation(summary = "Eliminar estudiante")
    public ApiResponse<Void> delete(
            @PathVariable UUID studentId,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        studentService.delete(studentId, actor, httpRequest);
        return new ApiResponse<>(true, "Estudiante eliminado.", null, HttpStatus.OK.value());
    }
}
