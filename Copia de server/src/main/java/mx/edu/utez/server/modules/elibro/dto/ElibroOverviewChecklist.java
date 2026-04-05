package mx.edu.utez.server.modules.elibro.dto;

public record ElibroOverviewChecklist(
        boolean hasAuthToken,
        boolean hasChannelId,
        boolean hasChannelSecret,
        boolean validEndpoint,
        boolean buildableChannel
) {
}
