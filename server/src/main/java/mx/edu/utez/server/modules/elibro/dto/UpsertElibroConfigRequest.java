package mx.edu.utez.server.modules.elibro.dto;

import mx.edu.utez.server.shared.enums.ElibroConfigStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpsertElibroConfigRequest(
        @Size(max = 160) String name,
        @NotBlank @Size(max = 512) String authToken,
        @NotBlank @Size(max = 512) String channelId,
        @NotBlank @Size(max = 512) String channelSecret,
        @NotBlank @Size(max = 120) String channelName,
        @Size(max = 512) String nextUrl,
        ElibroConfigStatus status
) {
}
