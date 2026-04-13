package mx.edu.utez.server.modules.dashboard.dto;

import java.util.List;

public record DashboardAutocompleteResponse<T>(
        String query,
        int limit,
        List<T> items
) {
}
