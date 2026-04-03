package mx.edu.utez.server.modules.reports.service;

import jakarta.servlet.http.HttpServletRequest;
import java.io.OutputStream;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.StudentStatus;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class StudentReportService {

    private static final int CHUNK_SIZE = 500;
    private static final long MAX_STUDENTS_EXPORT = 10_000;

    static final String[] STUDENT_HEADERS = {
            "matricula", "fullName", "lastNamePaternal", "lastNameMaternal",
            "institutionalEmail", "career", "quarter", "sex", "status",
            "lastLoginAt", "createdAt"
    };

    private static final List<Function<Student, String>> STUDENT_EXTRACTORS = List.of(
            Student::getEnrollmentId,
            Student::getName,
            Student::getLastNamePaternal,
            s -> s.getLastNameMaternal() != null ? s.getLastNameMaternal() : "",
            Student::getInstitutionalEmail,
            s -> s.getCareer() != null ? s.getCareer().getName() : "",
            s -> String.valueOf(s.getQuarter()),
            s -> s.getSex() != null ? s.getSex().name() : "",
            s -> s.getStatus() != null ? s.getStatus().name() : "",
            s -> CsvExportService.formatInstant(s.getLastLoginAt()),
            s -> CsvExportService.formatInstant(s.getCreatedAt())
    );

    private final StudentRepository studentRepository;
    private final CsvExportService csvExportService;
    private final ReportExportAuditService reportExportAuditService;

    public StudentReportService(
            StudentRepository studentRepository,
            CsvExportService csvExportService,
            ReportExportAuditService reportExportAuditService
    ) {
        this.studentRepository = studentRepository;
        this.csvExportService = csvExportService;
        this.reportExportAuditService = reportExportAuditService;
    }

    @Transactional(readOnly = true)
    public void export(
            OutputStream out,
            String query,
            UUID careerId,
            String careerCode,
            StudentStatus status,
            Admin actor,
            HttpServletRequest request
    ) {
        Specification<Student> spec = buildSpec(query, careerId, careerCode, status);
        long total = studentRepository.count(spec);
        Map<String, Object> filterMeta = buildFilterMeta(query, careerId, careerCode, status);

        try {
            csvExportService.write(out, STUDENT_HEADERS, STUDENT_EXTRACTORS, page -> {
                PageRequest pageRequest = PageRequest.of(page, CHUNK_SIZE, Sort.by(Sort.Direction.ASC, "enrollmentId"));
                Page<Student> result = studentRepository.findAll(spec, pageRequest);
                return result.getContent();
            });
        } catch (Exception ex) {
            reportExportAuditService.auditCsvExport(actor, "STUDENTS", filterMeta, 0, AuditOutcome.FAILURE, request);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Error generando reporte de estudiantes.");
        }

        reportExportAuditService.auditCsvExport(actor, "STUDENTS", filterMeta, total, AuditOutcome.SUCCESS, request);
    }

    public Specification<Student> buildSpec(String query, UUID careerId, String careerCode, StudentStatus status) {
        return (root, q, cb) -> {
            var predicate = cb.conjunction();
            if (StringUtils.hasText(query)) {
                String normalized = "%" + query.trim().toLowerCase(Locale.ROOT) + "%";
                predicate = cb.and(predicate, cb.or(
                        cb.like(cb.lower(root.get("name")), normalized),
                        cb.like(cb.lower(root.get("lastNamePaternal")), normalized),
                        cb.like(cb.lower(root.get("lastNameMaternal")), normalized),
                        cb.like(cb.lower(root.get("enrollmentId")), normalized),
                        cb.like(cb.lower(root.get("institutionalEmailNormalized")), normalized)
                ));
            }
            if (careerId != null) {
                predicate = cb.and(predicate, cb.equal(root.get("career").get("id"), careerId));
            } else if (StringUtils.hasText(careerCode)) {
                predicate = cb.and(
                        predicate,
                        cb.equal(cb.lower(root.get("career").get("code")), careerCode.trim().toLowerCase(Locale.ROOT))
                );
            }
            if (status != null) {
                predicate = cb.and(predicate, cb.equal(root.get("status"), status));
            }
            return predicate;
        };
    }

    public void validateExport(String query, UUID careerId, String careerCode, StudentStatus status) {
        Specification<Student> spec = buildSpec(query, careerId, careerCode, status);
        long total = studentRepository.count(spec);
        if (total > MAX_STUDENTS_EXPORT) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "El resultado excede el límite de " + MAX_STUDENTS_EXPORT
                            + " registros. Aplique filtros más específicos."
            );
        }
    }

    private Map<String, Object> buildFilterMeta(String query, UUID careerId, String careerCode, StudentStatus status) {
        Map<String, Object> filters = new LinkedHashMap<>();
        if (StringUtils.hasText(query)) {
            filters.put("q", query);
        }
        if (careerId != null) {
            filters.put("careerId", careerId.toString());
        }
        if (StringUtils.hasText(careerCode)) {
            filters.put("careerCode", careerCode);
        }
        if (status != null) {
            filters.put("status", status.name());
        }
        return filters;
    }
}
