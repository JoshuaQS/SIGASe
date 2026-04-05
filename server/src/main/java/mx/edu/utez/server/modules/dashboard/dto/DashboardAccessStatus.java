package mx.edu.utez.server.modules.dashboard.dto;

import java.util.Locale;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import org.springframework.util.StringUtils;

public enum DashboardAccessStatus {
    ALL,
    SUCCESS,
    FAILED;

    public static DashboardAccessStatus fromNullable(String raw) {
        if (!StringUtils.hasText(raw)) {
            return ALL;
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "ALL" -> ALL;
            case "SUCCESS" -> SUCCESS;
            case "FAILED" -> FAILED;
            default -> throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "status inválido. Valores permitidos: ALL, SUCCESS, FAILED."
            );
        };
    }
}
