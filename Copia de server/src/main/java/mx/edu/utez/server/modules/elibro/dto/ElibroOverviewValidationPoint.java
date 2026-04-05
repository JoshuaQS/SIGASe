package mx.edu.utez.server.modules.elibro.dto;

public record ElibroOverviewValidationPoint(
        String day,
        long ok,
        long err
) {
}
