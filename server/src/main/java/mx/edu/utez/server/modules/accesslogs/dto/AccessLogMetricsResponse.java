package mx.edu.utez.server.modules.accesslogs.dto;

import java.util.List;

public record AccessLogMetricsResponse(
        List<AccessLogDailyCountResponse> dailyAccesses,
        List<AccessLogCareerDistributionResponse> careerDistribution,
        List<AccessLogHourlyVolumeResponse> hourlyVolumeToday
) {
}

