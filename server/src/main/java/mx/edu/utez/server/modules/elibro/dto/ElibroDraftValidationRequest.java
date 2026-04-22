package mx.edu.utez.server.modules.elibro.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record ElibroDraftValidationRequest(
        UUID baseConfigId,
        @NotBlank @Size(max = 512) String authToken,
        @NotBlank @Size(max = 512) String channelId,
        @NotBlank @Size(max = 512) String channelSecret,
        @Size(max = 512) String nextUrl
) {
}
