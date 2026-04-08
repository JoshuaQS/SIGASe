package mx.edu.utez.server.modules.elibro.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ElibroControlledValidationRequest(
        @NotBlank @Email @Size(max = 180) String testUser,
        @Size(max = 512) String nextUrl
) {
}
