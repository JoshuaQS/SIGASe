package mx.edu.utez.server.modules.students.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StudentStatusChangeRequest(
        @NotBlank @Size(min = 10, max = 500) String reason
) {
}
