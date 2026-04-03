package mx.edu.utez.server.modules.elibro.dto;

public record ElibroOverviewLatencyPoint(
        String hour,
        Long avgLatencyMs
) {
}
