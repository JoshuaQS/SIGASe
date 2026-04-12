package mx.edu.utez.server.modules.dashboard.dto;

import java.util.List;

public record DashboardStudentActivityTableResponse(
        int page,
        int size,
        long totalElements,
        List<DashboardStudentActivityItemResponse> items
) {
}
