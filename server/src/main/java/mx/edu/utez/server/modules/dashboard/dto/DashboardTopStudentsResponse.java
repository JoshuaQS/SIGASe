package mx.edu.utez.server.modules.dashboard.dto;

import java.util.List;

public record DashboardTopStudentsResponse(
        String dateFrom,
        String dateTo,
        int limit,
        String sortDir,
        List<DashboardTopStudentItemResponse> students
) {
}
