package mx.edu.utez.server.modules.students.dto;

import java.util.List;

public record StudentImportResultResponse(
        int totalRows,
        int successCount,
        int errorCount,
        List<StudentImportRowError> errors
) {
}
