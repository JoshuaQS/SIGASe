package mx.edu.utez.server.modules.elibro.dto;

import jakarta.validation.constraints.Size;

public record PatchElibroConfigRequest(
        @Size(max = 160) String name,
        @Size(max = 512) String authToken,
        @Size(max = 512) String channelId,
        @Size(max = 512) String channelSecret,
        @Size(max = 120) String channelName,
        @Size(max = 512) String authEndpoint,
        Boolean active
) {
}
