package mx.edu.utez.server.modules.dashboard.service.analysis;

import java.util.List;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAccessResultFilter;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisMetadataCapabilitiesResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisMetadataContractResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisMetadataDateStrategyResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisMetadataDefaultsResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisMetadataResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardDateFilterType;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterScope;
import mx.edu.utez.server.modules.dashboard.dto.DashboardRankingMode;
import mx.edu.utez.server.modules.dashboard.dto.DashboardSortDirection;
import org.springframework.stereotype.Service;

@Service
public class DashboardMetadataService {

    private final DashboardAnalysisSupportMatrix supportMatrix;

    public DashboardMetadataService(DashboardAnalysisSupportMatrix supportMatrix) {
        this.supportMatrix = supportMatrix;
    }

    public DashboardAnalysisMetadataResponse getMetadata() {
        return new DashboardAnalysisMetadataResponse(
                List.of(DashboardFilterScope.values()),
                List.of(DashboardFilterMode.values()),
                List.of(DashboardAccessResultFilter.values()),
                List.of(DashboardRankingMode.values()),
                new DashboardAnalysisMetadataDateStrategyResponse(
                        List.of(DashboardDateFilterType.values()),
                        DashboardDateFilterType.NONE,
                        DashboardAnalysisSupportMatrix.DEFAULT_ROLLING_RANGE_DAYS
                ),
                new DashboardAnalysisMetadataDefaultsResponse(
                        DashboardAccessResultFilter.ALL,
                        DashboardDateFilterType.NONE,
                        DashboardRankingMode.NONE,
                        DashboardSortDirection.DESC
                ),
                new DashboardAnalysisMetadataContractResponse(
                        DashboardAnalysisSupportMatrix.CONTRACT_VERSION,
                        supportMatrix.supportedLayouts(),
                        new DashboardAnalysisMetadataCapabilitiesResponse(
                                true,
                                true,
                                true,
                                true
                        )
                )
        );
    }
}
