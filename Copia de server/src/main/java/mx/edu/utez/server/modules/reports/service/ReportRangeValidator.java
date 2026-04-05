package mx.edu.utez.server.modules.reports.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import org.springframework.stereotype.Component;

@Component
public class ReportRangeValidator {

    public void validateDateRange(Instant dateFrom, Instant dateTo, long maxRangeDays) {
        if (dateFrom == null || dateTo == null) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "dateFrom y dateTo son obligatorios para exportación."
            );
        }
        if (dateFrom.isAfter(dateTo)) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "dateFrom debe ser menor o igual a dateTo."
            );
        }
        long days = ChronoUnit.DAYS.between(dateFrom, dateTo);
        if (days > maxRangeDays) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "Rango de fechas excede el máximo permitido de " + maxRangeDays + " días."
            );
        }
    }
}
