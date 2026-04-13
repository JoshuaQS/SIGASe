package mx.edu.utez.server.modules.dashboard.dto;

import java.util.UUID;

public record DashboardStudentSearchItemResponse(
        UUID id,
        String displayLabel,
        String subtitle,
        String enrollmentId,
        String fullName,
        DashboardAutocompleteCareerRefResponse career,
        String status
) {
}
