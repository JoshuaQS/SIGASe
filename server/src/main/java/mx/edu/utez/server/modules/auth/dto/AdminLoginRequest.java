package mx.edu.utez.server.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminLoginRequest(
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(min = 1, max = 128) String password
) {
}
