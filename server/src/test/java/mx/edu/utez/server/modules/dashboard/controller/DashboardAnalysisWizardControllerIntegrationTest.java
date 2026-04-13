package mx.edu.utez.server.modules.dashboard.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisOptionsRequest;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterScope;
import mx.edu.utez.server.security.RoleConstants;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class DashboardAnalysisWizardControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void shouldReturnMetadataContract() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard/analysis/metadata")
                        .with(auth(RoleConstants.ADMIN_TI)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.scopes.length()").value(2))
                .andExpect(jsonPath("$.data.modes.length()").value(3))
                .andExpect(jsonPath("$.data.accessResults.length()").value(3))
                .andExpect(jsonPath("$.data.rankingModes.length()").value(2))
                .andExpect(jsonPath("$.data.dateStrategy.defaultType").value("NONE"))
                .andExpect(jsonPath("$.data.dateStrategy.defaultRollingRangeDays").value(30))
                .andExpect(jsonPath("$.data.defaults.accessResult").value("ALL"))
                .andExpect(jsonPath("$.data.defaults.rankingMode").value("NONE"))
                .andExpect(jsonPath("$.data.defaults.sortDirection").value("DESC"))
                .andExpect(jsonPath("$.data.contract.version").value("analysis-v1"))
                .andExpect(jsonPath("$.data.contract.supportedLayouts.length()").value(6))
                .andExpect(jsonPath("$.data.contract.capabilities.adaptiveAnalysis").value(true))
                .andExpect(jsonPath("$.data.contract.capabilities.contextualOptions").value(true))
                .andExpect(jsonPath("$.data.contract.capabilities.autocomplete").value(true))
                .andExpect(jsonPath("$.data.contract.capabilities.export").value(true));
    }

    @Test
    void shouldReturnCareerAllOptionsContract() throws Exception {
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

        mockMvc.perform(post("/api/v1/dashboard/analysis/options")
                        .with(auth(RoleConstants.ADMIN_TI))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.allowedModes.length()").value(3))
                .andExpect(jsonPath("$.data.allowedAccessResults.length()").value(3))
                .andExpect(jsonPath("$.data.ranking.allowed").value(true))
                .andExpect(jsonPath("$.data.ranking.allowedModes.length()").value(1))
                .andExpect(jsonPath("$.data.ranking.allowedModes[0]").value("TOP"))
                .andExpect(jsonPath("$.data.ranking.allowedTopN.length()").value(5))
                .andExpect(jsonPath("$.data.ranking.defaultTopN").value(10))
                .andExpect(jsonPath("$.data.effectiveDefaults.rankingMode").value("TOP"))
                .andExpect(jsonPath("$.data.effectiveDefaults.topN").value(10))
                .andExpect(jsonPath("$.data.canSubmit").value(true))
                .andExpect(jsonPath("$.data.nextStep").value(Matchers.nullValue()));
    }

    @Test
    void shouldReturnStudentIndividualOptionsContract() throws Exception {
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

        mockMvc.perform(post("/api/v1/dashboard/analysis/options")
                        .with(auth(RoleConstants.ADMIN_TI))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.requiredFields.length()").value(1))
                .andExpect(jsonPath("$.data.requiredFields[0]").value("STUDENT_ID"))
                .andExpect(jsonPath("$.data.forbiddenFields", Matchers.hasItem("CAREER_IDS")))
                .andExpect(jsonPath("$.data.forbiddenFields", Matchers.hasItem("RANKING_MODE")))
                .andExpect(jsonPath("$.data.forbiddenFields", Matchers.hasItem("TOP_N")))
                .andExpect(jsonPath("$.data.canSubmit").value(false))
                .andExpect(jsonPath("$.data.nextStep").value("STUDENT_ID"))
                .andExpect(jsonPath("$.data.missingRequiredFields[0]").value("STUDENT_ID"));
    }

    @Test
    void shouldRejectNullOptionsBody() throws Exception {
        mockMvc.perform(post("/api/v1/dashboard/analysis/options")
                        .with(auth(RoleConstants.ADMIN_TI))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    private RequestPostProcessor auth(String authority) {
        return SecurityMockMvcRequestPostProcessors.authentication(
                new UsernamePasswordAuthenticationToken(
                        "wizard-admin",
                        "N/A",
                        java.util.List.of(new SimpleGrantedAuthority(authority))
                )
        );
    }
}
