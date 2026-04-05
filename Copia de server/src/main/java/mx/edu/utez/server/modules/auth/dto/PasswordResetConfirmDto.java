package mx.edu.utez.server.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PasswordResetConfirmDto(
        @NotBlank
        @Size(max = 128) String token,

        @NotBlank
        @Size(min = 12, max = 128)
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\w\\s]).{12,}$",
                message = "La contraseña debe incluir mayúsculas, minúsculas, números y símbolo."
        )
        String newPassword
) {
}
