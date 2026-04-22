package mx.edu.utez.server.modules.dashboard.service.analysis;

import java.util.List;
import java.util.Map;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAnalysisResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardFilterSummary;
import mx.edu.utez.server.modules.dashboard.dto.DashboardLayoutType;
import mx.edu.utez.server.modules.dashboard.dto.DashboardWidgetData;
import mx.edu.utez.server.modules.dashboard.dto.DashboardWidgetResponse;
import org.springframework.stereotype.Component;

@Component
public class DashboardResponseAssembler {

    public DashboardAnalysisResponse assemble(
            ResolvedDashboardAnalysisContext context,
            DashboardLayoutType layoutType,
            List<DashboardWidgetComposer.DashboardWidgetDefinition> definitions,
            Map<String, DashboardWidgetData> widgetData
    ) {
        List<DashboardWidgetResponse> widgets = definitions.stream()
                .map(definition -> new DashboardWidgetResponse(
                        definition.widgetId(),
                        definition.type(),
                        definition.title(),
                        definition.order(),
                        definition.config(),
                        widgetData.get(definition.widgetId())
                ))
                .toList();

        DashboardFilterSummary summary = new DashboardFilterSummary(
                context.scope(),
                context.mode(),
                context.accessResult(),
                context.dateFilterType(),
                context.effectiveDateFrom(),
                context.effectiveDateTo(),
                context.rankingMode(),
                context.effectiveTopN(),
                context.effectiveSortDirection()
        );
        return new DashboardAnalysisResponse(summary, layoutType, widgets);
    }
}
