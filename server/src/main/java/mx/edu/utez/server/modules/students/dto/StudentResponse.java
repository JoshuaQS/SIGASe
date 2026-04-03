package mx.edu.utez.server.modules.students.dto;

import mx.edu.utez.server.shared.enums.Sex;
import mx.edu.utez.server.shared.enums.StudentStatus;
import java.time.Instant;
import java.util.UUID;

public record StudentResponse(
        UUID id,
        String enrollmentId,
        String name,
        String lastNamePaternal,
        String lastNameMaternal,
        Sex sex,
        Integer quarter,
        String institutionalEmail,
        CareerInfo career,
        StudentStatus status,
        Instant lastLoginAt,
        Instant deactivatedAt,
        String deactivationReason,
        Instant reactivatedAt,
        String reactivationReason,
        UUID createdByAdminId,
        UUID updatedByAdminId,
        Instant createdAt,
        Instant updatedAt
) {
    public record CareerInfo(
            UUID id,
            String code,
            String name
    ) {
    }
}
