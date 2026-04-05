package mx.edu.utez.server.modules.students.mapper;

import mx.edu.utez.server.modules.students.dto.StudentResponse;
import mx.edu.utez.server.modules.students.entity.Student;
import org.springframework.stereotype.Component;

@Component
public class StudentMapper {

    public StudentResponse toResponse(Student student) {
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
                student.getLastLoginAt(),
                student.getDeactivatedAt(),
                student.getDeactivationReason(),
                student.getReactivatedAt(),
                student.getReactivationReason(),
                student.getCreatedByAdmin() == null ? null : student.getCreatedByAdmin().getId(),
                student.getUpdatedByAdmin() == null ? null : student.getUpdatedByAdmin().getId(),
                student.getCreatedAt(),
                student.getUpdatedAt()
        );
    }
}
