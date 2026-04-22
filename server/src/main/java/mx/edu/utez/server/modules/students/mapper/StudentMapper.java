package mx.edu.utez.server.modules.students.mapper;

import mx.edu.utez.server.modules.students.dto.StudentResponse;
import mx.edu.utez.server.modules.students.entity.Student;
import java.time.Instant;
import org.springframework.stereotype.Component;

@Component
public class StudentMapper {

    public StudentResponse toResponse(Student student) {
        return toResponse(student, 0L, 0L, 0L);
    }

    public StudentResponse toResponse(
            Student student,
            Instant resolvedLastLoginAt,
            long totalAccesses,
            long successfulAccesses,
            long failedAccesses
    ) {
        return new StudentResponse(
                student.getId(),
                student.getEnrollmentId(),
                student.getName(),
                student.getLastNamePaternal(),
                student.getLastNameMaternal(),
                student.getSex(),
                student.getQuarter(),
                student.getInstitutionalEmail(),
                student.getCareer() == null
                        ? null
                        : new StudentResponse.CareerInfo(
                                student.getCareer().getId(),
                                student.getCareer().getCode(),
                                student.getCareer().getName()
                        ),
                student.getStatus(),
                student.isMustChangePassword(),
                resolvedLastLoginAt,
                totalAccesses,
                successfulAccesses,
                failedAccesses,
                student.getCreatedByAdmin() == null ? null : student.getCreatedByAdmin().getId(),
                student.getUpdatedByAdmin() == null ? null : student.getUpdatedByAdmin().getId(),
                student.getCreatedAt(),
                student.getUpdatedAt()
        );
    }

    public StudentResponse toResponse(
            Student student,
            long totalAccesses,
            long successfulAccesses,
            long failedAccesses
    ) {
        return toResponse(student, student.getLastLoginAt(), totalAccesses, successfulAccesses, failedAccesses);
    }
}
