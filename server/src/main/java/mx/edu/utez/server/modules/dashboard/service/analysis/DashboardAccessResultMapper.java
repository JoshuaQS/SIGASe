package mx.edu.utez.server.modules.dashboard.service.analysis;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.Set;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAccessResultFilter;
import mx.edu.utez.server.shared.enums.ElibroAccessResult;
import org.springframework.stereotype.Component;

@Component
public class DashboardAccessResultMapper {

    public Set<ElibroAccessResult> map(DashboardAccessResultFilter filter) {
        DashboardAccessResultFilter effectiveFilter = filter == null ? DashboardAccessResultFilter.ALL : filter;
        return switch (effectiveFilter) {
            case ALL -> Set.of();
            case SUCCESS -> EnumSet.of(ElibroAccessResult.SUCCESS);
            case FAILED -> EnumSet.copyOf(Arrays.stream(ElibroAccessResult.values())
                    .filter(result -> result != ElibroAccessResult.SUCCESS)
                    .toList());
        };
    }
}
