package mx.edu.utez.server.modules.admins.dto;

import mx.edu.utez.server.shared.enums.AdminRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateAdminRequest(
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Size(max = 100) String lastNamePaternal,
        @Size(max = 100) String lastNameMaternal,
        @NotNull AdminRole role
) {
}
