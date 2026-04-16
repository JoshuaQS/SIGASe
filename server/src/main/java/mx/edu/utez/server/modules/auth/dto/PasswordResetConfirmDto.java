package mx.edu.utez.server.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordResetConfirmDto(
        @NotBlank
        @Size(max = 128) String token,

        @NotBlank
        @Size(min = 12, max = 128)
        String newPassword,

        @NotBlank
        @Size(min = 1, max = 128)
        String confirmNewPassword
) {
}
