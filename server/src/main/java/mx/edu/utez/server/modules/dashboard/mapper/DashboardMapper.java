package mx.edu.utez.server.modules.dashboard.mapper;

import mx.edu.utez.server.modules.dashboard.dto.DashboardTopStudentItemResponse;
import mx.edu.utez.server.modules.dashboard.repository.DashboardMetricsRepository;
import org.springframework.stereotype.Component;

@Component
public class DashboardMapper {

    public DashboardTopStudentItemResponse toTopStudentItem(
            DashboardMetricsRepository.TopStudentProjection projection
    ) {
        return new DashboardTopStudentItemResponse(
                projection.getStudentId(),
                projection.getName(),
                projection.getEnrollmentId(),
                projection.getSuccessfulAccesses(),
                projection.getFailedAccesses(),
                projection.getTotalAccesses()
        );
    }
}
