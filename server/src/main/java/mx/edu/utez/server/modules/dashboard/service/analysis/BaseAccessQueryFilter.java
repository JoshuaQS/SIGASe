package mx.edu.utez.server.modules.dashboard.service.analysis;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import mx.edu.utez.server.shared.enums.ElibroAccessResult;

public record BaseAccessQueryFilter(
        UUID studentId,
        List<UUID> careerIds,
        Set<ElibroAccessResult> resolvedAccessResults,
        Instant effectiveDateFrom,
        Instant effectiveDateTo
) {

    public boolean hasCareerFilter() {
        return careerIds != null && !careerIds.isEmpty();
    }

    public boolean hasResultFilter() {
        return resolvedAccessResults != null && !resolvedAccessResults.isEmpty();
    }
}
