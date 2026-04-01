package mx.edu.utez.server.modules.elibro.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ElibroConfigStatusChangeRequest(
        @NotBlank @Size(max = 500) String reason
) {
}
