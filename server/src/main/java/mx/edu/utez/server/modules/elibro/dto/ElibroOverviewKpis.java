package mx.edu.utez.server.modules.elibro.dto;

public record ElibroOverviewKpis(
        String integrationStateLabel,
        Double uptimeWeeklyPct,
        Long avgLatency24hMs,
        long validations7dTotal
) {
}
