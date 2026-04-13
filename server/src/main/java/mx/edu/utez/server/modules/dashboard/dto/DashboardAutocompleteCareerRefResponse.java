package mx.edu.utez.server.modules.dashboard.dto;

import java.util.UUID;

public record DashboardAutocompleteCareerRefResponse(
        UUID id,
        String code,
        String name
) {
}
