package mx.edu.utez.server.modules.students.dto;

import java.util.List;

public record StudentMetricsResponse(
        long totalStudents,
        long activeStudents,
        long disabledStudents,
        long totalAccesses,
        long successfulAccesses,
        long failedAccesses,
        double successRate,
        List<StudentMetricsPointResponse> activityByDate,
        List<StudentCareerDistributionResponse> careerDistribution
) {
}
