package mx.edu.utez.server.modules.admins.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminStatusChangeRequest(
        @NotBlank @Size(max = 500) String reason
) {
}
