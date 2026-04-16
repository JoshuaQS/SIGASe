package mx.edu.utez.server.modules.dashboard.service.analysis;

import java.util.List;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisField;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisOptionsRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardDateFilterType;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterScope;
import mx.edu.utez.server.modules.dashboard.dto.DashboardRankingMode;
import mx.edu.utez.server.shared.exception.BusinessException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DashboardOptionsServiceTest {

    private final DashboardAnalysisSupportMatrix supportMatrix = new DashboardAnalysisSupportMatrix();
    private final DashboardAnalysisValidator validator = new DashboardAnalysisValidator(supportMatrix);
    private final DashboardOptionsService service = new DashboardOptionsService(supportMatrix, validator);

    @Test
    void shouldResolveCareerAllOptionsWithForcedRankingDefaults() {
        DashboardAnalysisOptionsRequest request = new DashboardAnalysisOptionsRequest(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.ALL,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );

        var response = service.resolve(request);

        assertEquals(List.of(DashboardFilterMode.INDIVIDUAL, DashboardFilterMode.ALL, DashboardFilterMode.MULTI), response.allowedModes());
        assertTrue(response.ranking().allowed());
        assertEquals(List.of(DashboardRankingMode.TOP), response.ranking().allowedModes());
        assertEquals(List.of(1, 5, 10, 20, 50), response.ranking().allowedTopN());
        assertEquals(DashboardRankingMode.TOP, response.effectiveDefaults().rankingMode());
        assertEquals(10, response.effectiveDefaults().topN());
        assertTrue(response.canSubmit());
        assertNull(response.nextStep());
    }

    @Test
    void shouldResolveStudentIndividualOptionsRequiringStudentId() {
        DashboardAnalysisOptionsRequest request = new DashboardAnalysisOptionsRequest(
                DashboardFilterScope.STUDENTS,
                DashboardFilterMode.INDIVIDUAL,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );

        var response = service.resolve(request);

        assertEquals(List.of(DashboardAnalysisField.STUDENT_ID), response.requiredFields());
        assertTrue(response.forbiddenFields().contains(DashboardAnalysisField.CAREER_IDS));
        assertTrue(response.forbiddenFields().contains(DashboardAnalysisField.RANKING_MODE));
        assertTrue(response.forbiddenFields().contains(DashboardAnalysisField.TOP_N));
        assertFalse(response.canSubmit());
        assertEquals(DashboardAnalysisField.STUDENT_ID, response.nextStep());
    }

    @Test
    void shouldResolveCustomRangeAsBlockingUntilDatesExist() {
        DashboardAnalysisOptionsRequest request = new DashboardAnalysisOptionsRequest(
                DashboardFilterScope.STUDENTS,
                DashboardFilterMode.ALL,
                null,
                null,
                null,
                DashboardDateFilterType.CUSTOM_RANGE,
                null,
                null,
                DashboardRankingMode.NONE,
                null,
                null
        );

        var response = service.resolve(request);

        assertTrue(response.missingRequiredFields().contains(DashboardAnalysisField.DATE_FROM));
        assertTrue(response.missingRequiredFields().contains(DashboardAnalysisField.DATE_TO));
        assertFalse(response.canSubmit());
        assertEquals(DashboardAnalysisField.DATE_FROM, response.nextStep());
    }

    @Test
    void shouldReturnCorrectionStepForUnsupportedCareerRankingModeSelection() {
        DashboardAnalysisOptionsRequest request = new DashboardAnalysisOptionsRequest(
                DashboardFilterScope.CAREERS,
                DashboardFilterMode.ALL,
                null,
                null,
                null,
                DashboardDateFilterType.NONE,
                null,
                null,
                DashboardRankingMode.NONE,
                null,
                null
        );

        var response = service.resolve(request);

        assertFalse(response.canSubmit());
        assertEquals(DashboardAnalysisField.RANKING_MODE, response.nextStep());
    }

    @Test
    void shouldRejectNullRequest() {
        assertThrows(BusinessException.class, () -> service.resolve(null));
    }
}
