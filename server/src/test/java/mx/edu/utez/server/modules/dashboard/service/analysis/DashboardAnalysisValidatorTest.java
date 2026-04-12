package mx.edu.utez.server.modules.dashboard.service.analysis;

import java.time.Instant;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardDateFilterType;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterScope;
import mx.edu.utez.server.modules.dashboard.dto.DashboardRankingMode;
import mx.edu.utez.server.shared.exception.BusinessException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class DashboardAnalysisValidatorTest {

    private final DashboardAnalysisValidator validator = new DashboardAnalysisValidator();

    @Test
    void shouldAcceptOverviewSliceRequest() {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.STUDENTS,
                DashboardFilterMode.ALL,
                null,
                null,
                null,
                DashboardDateFilterType.CUSTOM_RANGE,
                Instant.parse("2026-03-01T00:00:00Z"),
                Instant.parse("2026-03-31T23:59:59Z"),
                DashboardRankingMode.NONE,
                null,
                null
        );

        assertDoesNotThrow(() -> validator.validate(request));
    }

    @Test
    void shouldRejectUnsupportedScope() {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.ALL,
                null,
                null,
                null,
                null,
                null,
                null,
                DashboardRankingMode.NONE,
                null,
                null
        );

        assertThrows(BusinessException.class, () -> validator.validate(request));
    }

    @Test
    void shouldRejectDatesWithoutCustomRange() {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.STUDENTS,
                DashboardFilterMode.ALL,
                null,
                null,
                null,
                DashboardDateFilterType.NONE,
                Instant.parse("2026-03-01T00:00:00Z"),
                Instant.parse("2026-03-31T23:59:59Z"),
                DashboardRankingMode.NONE,
                null,
                null
        );

        assertThrows(BusinessException.class, () -> validator.validate(request));
    }

    @Test
    void shouldAcceptStudentDetailRequest() {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.STUDENTS,
                DashboardFilterMode.INDIVIDUAL,
                java.util.UUID.randomUUID(),
                null,
                null,
                DashboardDateFilterType.CUSTOM_RANGE,
                Instant.parse("2026-03-01T00:00:00Z"),
                Instant.parse("2026-03-31T23:59:59Z"),
                DashboardRankingMode.NONE,
                null,
                null
        );

        assertDoesNotThrow(() -> validator.validate(request));
    }

    @Test
    void shouldRejectRankingModeToProtectNonRankedWidgets() {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.STUDENTS,
                DashboardFilterMode.ALL,
                null,
                null,
                null,
                null,
                null,
                null,
                DashboardRankingMode.TOP,
                null,
                null
        );

        assertThrows(BusinessException.class, () -> validator.validate(request));
    }
}
