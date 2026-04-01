package mx.edu.utez.server.modules.students.dto;

public record StudentImportRowError(
        int row,
        String enrollmentId,
        String errorCode,
        String detail
) {
}
