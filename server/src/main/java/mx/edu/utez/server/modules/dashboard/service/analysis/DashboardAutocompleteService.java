package mx.edu.utez.server.modules.dashboard.service.analysis;

import java.util.List;
import mx.edu.utez.server.modules.careers.entity.Career;
import mx.edu.utez.server.modules.careers.repository.CareerRepository;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAutocompleteCareerRefResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardAutocompleteResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardCareerSearchItemResponse;
import mx.edu.utez.server.modules.dashboard.dto.DashboardStudentSearchItemResponse;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class DashboardAutocompleteService {

    public static final int DEFAULT_LIMIT = 10;
    public static final int MAX_LIMIT = 20;
    public static final int MIN_QUERY_LENGTH = 2;

    private final StudentRepository studentRepository;
    private final CareerRepository careerRepository;

    public DashboardAutocompleteService(
            StudentRepository studentRepository,
            CareerRepository careerRepository
    ) {
        this.studentRepository = studentRepository;
        this.careerRepository = careerRepository;
    }

    public DashboardAutocompleteResponse<DashboardStudentSearchItemResponse> searchStudents(String q, Integer limit) {
        String normalizedQuery = normalizeQuery(q);
        int effectiveLimit = normalizeLimit(limit);
        List<DashboardStudentSearchItemResponse> items = studentRepository.searchForDashboardAnalysis(
                        normalizedQuery,
                        PageRequest.of(0, effectiveLimit)
                ).stream()
                .map(this::mapStudent)
                .toList();
        return new DashboardAutocompleteResponse<>(normalizedQuery, effectiveLimit, items);
    }

    public DashboardAutocompleteResponse<DashboardCareerSearchItemResponse> searchCareers(String q, Integer limit) {
        String normalizedQuery = normalizeQuery(q);
        int effectiveLimit = normalizeLimit(limit);
        List<DashboardCareerSearchItemResponse> items = careerRepository.searchForDashboardAnalysis(
                        normalizedQuery,
                        PageRequest.of(0, effectiveLimit)
                ).stream()
                .map(this::mapCareer)
                .toList();
        return new DashboardAutocompleteResponse<>(normalizedQuery, effectiveLimit, items);
    }

    private String normalizeQuery(String q) {
        if (!StringUtils.hasText(q)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "q es obligatorio para autocomplete.");
        }
        String normalized = q.trim();
        if (normalized.length() < MIN_QUERY_LENGTH) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "q debe tener al menos " + MIN_QUERY_LENGTH + " caracteres para autocomplete."
            );
        }
        return normalized;
    }

    private int normalizeLimit(Integer limit) {
        if (limit == null) {
            return DEFAULT_LIMIT;
        }
        if (limit < 1 || limit > MAX_LIMIT) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "limit debe estar entre 1 y " + MAX_LIMIT + " para autocomplete."
            );
        }
        return limit;
    }

    private DashboardStudentSearchItemResponse mapStudent(Student student) {
        String fullName = buildStudentFullName(student);
        String statusLabel = toStudentStatusLabel(student.getStatus().name());
        return new DashboardStudentSearchItemResponse(
                student.getId(),
                student.getEnrollmentId() + " - " + fullName,
                student.getCareer().getName() + " | " + statusLabel,
                student.getEnrollmentId(),
                fullName,
                new DashboardAutocompleteCareerRefResponse(
                        student.getCareer().getId(),
                        student.getCareer().getCode(),
                        student.getCareer().getName()
                ),
                student.getStatus().name()
        );
    }

    private DashboardCareerSearchItemResponse mapCareer(Career career) {
        return new DashboardCareerSearchItemResponse(
                career.getId(),
                career.getCode() + " - " + career.getName(),
                toCareerStatusLabel(career.getStatus().name()),
                career.getCode(),
                career.getName(),
                career.getStatus().name()
        );
    }

    private String buildStudentFullName(Student student) {
        return String.join(
                " ",
                List.of(
                        student.getName(),
                        student.getLastNamePaternal(),
                        student.getLastNameMaternal() == null ? "" : student.getLastNameMaternal()
                ).stream().filter(StringUtils::hasText).toList()
        );
    }

    private String toStudentStatusLabel(String status) {
        return switch (status) {
            case "ACTIVE" -> "Activo";
            case "INACTIVE" -> "Inactivo";
            default -> status;
        };
    }

    private String toCareerStatusLabel(String status) {
        return switch (status) {
            case "ACTIVE" -> "Activo";
            case "INACTIVE" -> "Inactivo";
            default -> status;
        };
    }
}
