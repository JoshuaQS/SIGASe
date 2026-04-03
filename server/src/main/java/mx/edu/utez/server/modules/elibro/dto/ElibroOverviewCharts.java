package mx.edu.utez.server.modules.elibro.dto;

import java.util.List;

public record ElibroOverviewCharts(
        List<ElibroOverviewLatencyPoint> latency24h,
        List<ElibroOverviewValidationPoint> validations7d,
        ElibroOverviewUptimeWeekly uptimeWeekly
) {
}
