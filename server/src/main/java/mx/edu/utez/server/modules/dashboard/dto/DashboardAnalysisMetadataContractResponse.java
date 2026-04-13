package mx.edu.utez.server.modules.dashboard.dto;

import java.util.List;

public record DashboardAnalysisMetadataContractResponse(
        String version,
        List<DashboardLayoutType> supportedLayouts,
        DashboardAnalysisMetadataCapabilitiesResponse capabilities
) {
}
