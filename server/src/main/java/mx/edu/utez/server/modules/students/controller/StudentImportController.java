package mx.edu.utez.server.modules.students.controller;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.service.AdminContextService;
import mx.edu.utez.server.modules.students.dto.StudentImportResultResponse;
import mx.edu.utez.server.modules.students.service.StudentImportService;
import mx.edu.utez.server.shared.api.ApiResponse;
import mx.edu.utez.server.shared.api.ApiRoutes;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
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
    @Operation(summary = "Importar estudiantes desde CSV o XLSX")
    public ApiResponse<StudentImportResultResponse> importCsv(
            @RequestParam("file") MultipartFile file,
            Authentication authentication,
            HttpServletRequest request
    ) throws Exception {
        Admin actor = adminContextService.requireCurrentAdmin(authentication);
        StudentImportResultResponse result = studentImportService.importFile(
                file.getInputStream(), file.getOriginalFilename(), actor, request
        );
        return new ApiResponse<>(true, "Importación completada.", result, HttpStatus.OK.value());
    }

    @GetMapping("/import-template")
    @Operation(summary = "Descargar plantilla de importación de estudiantes en CSV o XLSX")
    public void downloadTemplate(
            @RequestParam(defaultValue = "csv") String format,
            HttpServletResponse response
    ) throws Exception {
        String safeFormat = format.trim().toLowerCase();
        if ("xlsx".equals(safeFormat)) {
            response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            response.setHeader("Content-Disposition", "attachment; filename=\"students-import-template.xlsx\"");
        } else {
            response.setContentType("text/csv; charset=UTF-8");
            response.setHeader("Content-Disposition", "attachment; filename=\"students-import-template.csv\"");
        }
        studentImportService.writeTemplate(response.getOutputStream(), safeFormat);
    }
}
