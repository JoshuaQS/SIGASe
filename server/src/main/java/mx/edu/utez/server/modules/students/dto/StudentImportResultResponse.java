package mx.edu.utez.server.modules.students.dto;

import java.util.List;
import mx.edu.utez.server.modules.notifications.dto.EmailDispatchJobResponse;

public record StudentImportResultResponse(
        int totalRows,
        int successCount,
        int errorCount,
        List<StudentImportRowError> errors,
        List<EmailDispatchJobResponse> emailJobs
) {
}
