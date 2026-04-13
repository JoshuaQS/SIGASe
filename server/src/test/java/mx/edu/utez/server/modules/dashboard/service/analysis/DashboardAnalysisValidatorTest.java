package mx.edu.utez.server.modules.dashboard.service.analysis;

import java.time.Instant;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisWidgetControlsRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardDateFilterType;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterScope;
import mx.edu.utez.server.modules.dashboard.dto.DashboardRankingMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection;
import mx.edu.utez.server.modules.dashboard.dto.DashboardTableWidgetControlRequest;
import mx.edu.utez.server.shared.exception.BusinessException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class DashboardAnalysisValidatorTest {

    private final DashboardAnalysisSupportMatrix supportMatrix = new DashboardAnalysisSupportMatrix();
    private final DashboardAnalysisValidator validator = new DashboardAnalysisValidator(supportMatrix);

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
    void shouldAcceptCareerDetailRequest() {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.INDIVIDUAL,
                null,
                java.util.List.of(java.util.UUID.randomUUID()),
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

    @Test
    void shouldRejectCareerDetailWithoutExactlyOneCareerId() {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.INDIVIDUAL,
                null,
                java.util.List.of(),
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
    void shouldRejectCareerDetailWithMultipleCareerIds() {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.INDIVIDUAL,
                null,
                java.util.List.of(java.util.UUID.randomUUID(), java.util.UUID.randomUUID()),
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
    void shouldRejectCareerDetailWhenStudentIdIsAlsoProvided() {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.INDIVIDUAL,
                java.util.UUID.randomUUID(),
                java.util.List.of(java.util.UUID.randomUUID()),
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
    void shouldAcceptStudentRankingRequest() {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.STUDENTS,
                DashboardFilterMode.ALL,
                null,
                null,
                null,
                DashboardDateFilterType.CUSTOM_RANGE,
                Instant.parse("2026-03-01T00:00:00Z"),
                Instant.parse("2026-03-31T23:59:59Z"),
                DashboardRankingMode.TOP,
                10,
                null
        );

        assertDoesNotThrow(() -> validator.validate(request));
    }

    @Test
    void shouldRejectStudentRankingWithoutTopN() {
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

    @Test
    void shouldRejectStudentRankingWithUnsupportedTopN() {
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
                7,
                null
        );

        assertThrows(BusinessException.class, () -> validator.validate(request));
    }

    @Test
    void shouldAcceptCareerRankingRequest() {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.ALL,
                null,
                null,
                mx.edu.utez.server.modules.dashboard.dto.DashboardAccessResultFilter.SUCCESS,
                DashboardDateFilterType.CUSTOM_RANGE,
                Instant.parse("2026-03-01T00:00:00Z"),
                Instant.parse("2026-03-31T23:59:59Z"),
                DashboardRankingMode.TOP,
                10,
                null
        );

        assertDoesNotThrow(() -> validator.validate(request));
    }

    @Test
    void shouldAcceptCareerRankingSplitRequestForMultiScope() {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.MULTI,
                null,
                java.util.List.of(java.util.UUID.randomUUID(), java.util.UUID.randomUUID()),
                mx.edu.utez.server.modules.dashboard.dto.DashboardAccessResultFilter.ALL,
                DashboardDateFilterType.CUSTOM_RANGE,
                Instant.parse("2026-03-01T00:00:00Z"),
                Instant.parse("2026-03-31T23:59:59Z"),
                DashboardRankingMode.TOP,
                5,
                null
        );

        assertDoesNotThrow(() -> validator.validate(request));
    }

    @Test
    void shouldRejectCareerRankingWithoutTopN() {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.ALL,
                null,
                null,
                mx.edu.utez.server.modules.dashboard.dto.DashboardAccessResultFilter.SUCCESS,
                null,
                null,
                null,
                DashboardRankingMode.TOP,
                null,
                null
        );

        assertThrows(BusinessException.class, () -> validator.validate(request));
    }

    @Test
    void shouldRejectCareerRankingAllModeWhenCareerIdsAreProvided() {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.ALL,
                null,
                java.util.List.of(java.util.UUID.randomUUID()),
                mx.edu.utez.server.modules.dashboard.dto.DashboardAccessResultFilter.SUCCESS,
                null,
                null,
                null,
                DashboardRankingMode.TOP,
                10,
                null
        );

        assertThrows(BusinessException.class, () -> validator.validate(request));
    }

    @Test
    void shouldRejectCareerRankingMultiModeWithoutCareerIds() {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.MULTI,
                null,
                java.util.List.of(),
                mx.edu.utez.server.modules.dashboard.dto.DashboardAccessResultFilter.ALL,
                null,
                null,
                null,
                DashboardRankingMode.TOP,
                10,
                null
        );

        assertThrows(BusinessException.class, () -> validator.validate(request));
    }

    @Test
    void shouldRejectStudentActivityControlOutsideStudentDetail() {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.STUDENTS,
                DashboardFilterMode.ALL,
                null,
                null,
                null,
                null,
                null,
                null,
                DashboardRankingMode.NONE,
                null,
                null,
                new DashboardAnalysisWidgetControlsRequest(
                        new DashboardTableWidgetControlRequest(0, 10, "occurredAt", DashboardSortDirection.DESC),
                        null
                )
        );

        assertThrows(BusinessException.class, () -> validator.validate(request));
    }

    @Test
    void shouldRejectCareerStudentTableControlWithUnsupportedSortBy() {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.INDIVIDUAL,
                null,
                java.util.List.of(java.util.UUID.randomUUID()),
                null,
                null,
                null,
                null,
                DashboardRankingMode.NONE,
                null,
                null,
                new DashboardAnalysisWidgetControlsRequest(
                        null,
                        new DashboardTableWidgetControlRequest(0, 10, "careerName", DashboardSortDirection.DESC)
                )
        );

        assertThrows(BusinessException.class, () -> validator.validate(request));
    }

    @Test
    void shouldRejectStudentActivityControlWithInvalidPageOrSize() {
        DashboardAnalysisRequest request = new DashboardAnalysisRequest(
                DashboardFilterScope.STUDENTS,
                DashboardFilterMode.INDIVIDUAL,
                java.util.UUID.randomUUID(),
                null,
                null,
                null,
                null,
                null,
                DashboardRankingMode.NONE,
                null,
                null,
                new DashboardAnalysisWidgetControlsRequest(
                        new DashboardTableWidgetControlRequest(-1, 999, "occurredAt", DashboardSortDirection.DESC),
                        null
                )
        );

        assertThrows(BusinessException.class, () -> validator.validate(request));
    }
}
