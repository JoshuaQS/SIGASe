package mx.edu.utez.server.modules.students.controller;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.service.AdminContextService;
import mx.edu.utez.server.modules.students.dto.StudentImportResultResponse;
import mx.edu.utez.server.modules.students.service.StudentImportService;
import mx.edu.utez.server.shared.api.ApiResponse;
import mx.edu.utez.server.shared.api.ApiRoutes;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping(ApiRoutes.STUDENTS)
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN_TI','ROLE_ADMIN_BIBLIOTECA')")
public class StudentImportController {

    private final StudentImportService studentImportService;
    private final AdminContextService adminContextService;

    public StudentImportController(
            StudentImportService studentImportService,
            AdminContextService adminContextService
    ) {
        this.studentImportService = studentImportService;
        this.adminContextService = adminContextService;
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Importar estudiantes desde CSV")
    public ApiResponse<StudentImportResultResponse> importCsv(
            @RequestParam("file") MultipartFile file,
            Authentication authentication,
            HttpServletRequest request
    ) throws Exception {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        StudentImportResultResponse result = studentImportService.importCsv(
                file.getInputStream(), actor, request
        );
        return new ApiResponse<>(true, "Importación completada.", result, HttpStatus.OK.value());
    }
}
