package mx.edu.utez.server.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StudentGoogleLoginRequest(
        @NotBlank @Size(max = 4096) String idToken
) {
}
