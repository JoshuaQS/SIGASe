package mx.edu.utez.server.modules.elibro.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpsertElibroConfigRequest(
        @NotBlank @Size(max = 512) String authToken,
        @NotBlank @Size(max = 512) String channelId,
        @NotBlank @Size(max = 512) String channelSecret,
        @NotBlank @Size(max = 120) String channelName,
        @NotBlank @Size(max = 512) String authEndpoint,
        boolean active
) {
}
