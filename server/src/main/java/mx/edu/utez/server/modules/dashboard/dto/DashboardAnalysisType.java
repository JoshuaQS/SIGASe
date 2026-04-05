package mx.edu.utez.server.modules.dashboard.dto;

import java.util.Locale;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import org.springframework.util.StringUtils;

public enum DashboardAnalysisType {
    STUDENTS_INDIVIDUAL,
    STUDENTS_ALL,
    CAREERS;

    public static DashboardAnalysisType fromNullable(String raw) {
        if (!StringUtils.hasText(raw)) {
            return STUDENTS_ALL;
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "STUDENTS_INDIVIDUAL" -> STUDENTS_INDIVIDUAL;
            case "STUDENTS_ALL" -> STUDENTS_ALL;
            case "CAREERS" -> CAREERS;
            default -> throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "analysisType inválido. Valores permitidos: students_individual, students_all, careers."
            );
        };
    }

    public String toApiValue() {
        return switch (this) {
            case STUDENTS_INDIVIDUAL -> "students_individual";
            case STUDENTS_ALL -> "students_all";
            case CAREERS -> "careers";
        };
    }
}
