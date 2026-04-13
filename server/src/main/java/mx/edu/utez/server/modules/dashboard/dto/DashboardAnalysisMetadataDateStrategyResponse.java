package mx.edu.utez.server.modules.dashboard.dto;

import java.util.List;

public record DashboardAnalysisMetadataDateStrategyResponse(
        List<DashboardDateFilterType> allowed,
        DashboardDateFilterType defaultType,
        long defaultRollingRangeDays
) {
}
