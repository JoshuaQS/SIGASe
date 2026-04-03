package mx.edu.utez.server.modules.students.dto;

import mx.edu.utez.server.shared.enums.Sex;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record UpdateStudentRequest(
        @NotBlank @Size(max = 10) String enrollmentId,
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Size(max = 100) String lastNamePaternal,
        @Size(max = 100) String lastNameMaternal,
        @NotNull Sex sex,
        @NotNull @Min(1) @Max(12) Integer quarter,
        @NotBlank @Email @Size(max = 254) String institutionalEmail,
        UUID careerId,
        @Size(max = 20) String careerCode
) {
}
