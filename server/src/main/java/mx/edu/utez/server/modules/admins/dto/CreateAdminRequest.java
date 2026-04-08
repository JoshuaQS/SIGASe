package mx.edu.utez.server.modules.admins.dto;

import mx.edu.utez.server.shared.enums.AdminRole;
import mx.edu.utez.server.shared.enums.AdminStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateAdminRequest(
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Size(max = 100) String lastNamePaternal,
        @Size(max = 100) String lastNameMaternal,
        @NotBlank
        @Size(min = 12, max = 128)
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\w\\s]).{12,}$",
                message = "La contraseña debe incluir mayúsculas, minúsculas, números y símbolo."
        )
        String password,
        @NotNull AdminRole role,
        @NotNull AdminStatus status
) {
}
