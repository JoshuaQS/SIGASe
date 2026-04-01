package mx.edu.utez.server.modules.students.service;

import mx.edu.utez.server.modules.auth.entity.StudentPasswordResetToken;
import mx.edu.utez.server.modules.auth.repository.StudentPasswordResetTokenRepository;
import mx.edu.utez.server.modules.auth.service.StudentPasswordResetNotifier;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.logs.audit.service.AuditTrailService;
import mx.edu.utez.server.modules.logs.access.repository.AccessLogRepository;
import mx.edu.utez.server.modules.logs.access.repository.StudentAccessAlertStateRepository;
import mx.edu.utez.server.modules.students.dto.CreateStudentRequest;
import mx.edu.utez.server.modules.students.dto.StudentResponse;
import mx.edu.utez.server.modules.students.dto.StudentStatusChangeRequest;
import mx.edu.utez.server.modules.students.dto.UpdateStudentRequest;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.mapper.StudentMapper;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.shared.api.PageResponse;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.StudentStatus;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import mx.edu.utez.server.shared.util.EmailNormalizer;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class StudentService {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "createdAt", "updatedAt", "name", "lastNamePaternal", "lastNameMaternal", "enrollmentId", "career", "status", "lastLoginAt"
    );

    private final StudentRepository studentRepository;
    private final StudentMapper studentMapper;
    private final EmailNormalizer emailNormalizer;
    private final AuditTrailService auditTrailService;
    private final AccessLogRepository accessLogRepository;
    private final StudentAccessAlertStateRepository studentAccessAlertStateRepository;
    private final StudentPasswordResetTokenRepository studentPasswordResetTokenRepository;
    private final StudentPasswordResetNotifier studentPasswordResetNotifier;

    public StudentService(
            StudentRepository studentRepository,
            StudentMapper studentMapper,
            EmailNormalizer emailNormalizer,
            AuditTrailService auditTrailService,
            AccessLogRepository accessLogRepository,
            StudentAccessAlertStateRepository studentAccessAlertStateRepository,
            StudentPasswordResetTokenRepository studentPasswordResetTokenRepository,
            StudentPasswordResetNotifier studentPasswordResetNotifier
    ) {
        this.studentRepository = studentRepository;
        this.studentMapper = studentMapper;
        this.emailNormalizer = emailNormalizer;
        this.auditTrailService = auditTrailService;
        this.accessLogRepository = accessLogRepository;
        this.studentAccessAlertStateRepository = studentAccessAlertStateRepository;
        this.studentPasswordResetTokenRepository = studentPasswordResetTokenRepository;
        this.studentPasswordResetNotifier = studentPasswordResetNotifier;
    }

    @Transactional
    public StudentResponse create(CreateStudentRequest request, Admin actorAdmin, HttpServletRequest httpRequest) {
        String normalizedEmail = emailNormalizer.normalize(request.institutionalEmail());
        validateCreateRules(request.enrollmentId(), normalizedEmail);

        Student student = new Student();
        student.setEnrollmentId(request.enrollmentId().trim());
        student.setName(request.name().trim());
        student.setLastNamePaternal(request.lastNamePaternal().trim());
        student.setLastNameMaternal(trimToNull(request.lastNameMaternal()));
        student.setSex(request.sex());
        student.setQuarter(request.quarter());
        student.setInstitutionalEmail(request.institutionalEmail().trim());
        student.setInstitutionalEmailNormalized(normalizedEmail);
        student.setCareer(request.career().trim());
        student.setStatus(StudentStatus.ACTIVE);
        student.setMustChangePassword(true);
        student.setCreatedByAdmin(actorAdmin);
        student.setUpdatedByAdmin(actorAdmin);

        Student saved = studentRepository.save(student);
        issueStudentOnboardingReset(saved);
        auditTrailService.auditAdminAction(
                actorAdmin,
                "STUDENT_CREATE",
                "STUDENT",
                saved.getId().toString(),
                AuditOutcome.SUCCESS,
                Map.of(
                        "enrollmentId", saved.getEnrollmentId(),
                        "institutionalEmailNormalized", saved.getInstitutionalEmailNormalized(),
                        "status", saved.getStatus().name()
                ),
                httpRequest
        );
        return studentMapper.toResponse(saved);
    }

    @Transactional
    public StudentResponse update(UUID studentId, UpdateStudentRequest request, Admin actorAdmin, HttpServletRequest httpRequest) {
        Student student = findByIdOrThrow(studentId);
        String normalizedEmail = emailNormalizer.normalize(request.institutionalEmail());
        validateUpdateRules(studentId, request.enrollmentId(), normalizedEmail);

        student.setEnrollmentId(request.enrollmentId().trim());
        student.setName(request.name().trim());
        student.setLastNamePaternal(request.lastNamePaternal().trim());
        student.setLastNameMaternal(trimToNull(request.lastNameMaternal()));
        student.setSex(request.sex());
        student.setQuarter(request.quarter());
        student.setInstitutionalEmail(request.institutionalEmail().trim());
        student.setInstitutionalEmailNormalized(normalizedEmail);
        student.setCareer(request.career().trim());
        student.setUpdatedByAdmin(actorAdmin);

        Student saved = studentRepository.save(student);
        auditTrailService.auditAdminAction(
                actorAdmin,
                "STUDENT_UPDATE",
                "STUDENT",
                saved.getId().toString(),
                AuditOutcome.SUCCESS,
                Map.of(
                        "enrollmentId", saved.getEnrollmentId(),
                        "institutionalEmailNormalized", saved.getInstitutionalEmailNormalized(),
                        "career", saved.getCareer()
                ),
                httpRequest
        );
        return studentMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public StudentResponse getById(UUID studentId, Admin actorAdmin, HttpServletRequest httpRequest) {
        Student student = findByIdOrThrow(studentId);
        return studentMapper.toResponse(student);
    }

    @Transactional(readOnly = true)
    public PageResponse<StudentResponse> list(
            String query,
            String career,
            StudentStatus status,
            int page,
            int size,
            String sortBy,
            String sortDir,
            Admin actorAdmin,
            HttpServletRequest httpRequest
    ) {
        if (page < 0 || size <= 0 || size > 500) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Parámetros de paginación inválidos.");
        }
        Pageable pageable = PageRequest.of(page, size, buildSort(sortBy, sortDir));
        Specification<Student> spec = buildSpecification(query, career, status);
        Page<StudentResponse> result = studentRepository.findAll(spec, pageable).map(studentMapper::toResponse);

        return new PageResponse<>(
                result.getContent(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages()
        );
    }

    @Transactional
    public StudentResponse deactivate(
            UUID studentId,
            StudentStatusChangeRequest request,
            Admin actorAdmin,
            HttpServletRequest httpRequest
    ) {
        Student student = findByIdOrThrow(studentId);
        if (student.getStatus() == StudentStatus.INACTIVE) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "El estudiante ya está inactivo.");
        }

        student.setStatus(StudentStatus.INACTIVE);
        student.setDeactivatedAt(Instant.now());
        student.setDeactivationReason(request.reason().trim());
        student.setUpdatedByAdmin(actorAdmin);

        Student saved = studentRepository.save(student);
        auditTrailService.auditAdminAction(
                actorAdmin,
                "STUDENT_DEACTIVATE",
                "STUDENT",
                saved.getId().toString(),
                AuditOutcome.SUCCESS,
                Map.of("reason", request.reason().trim()),
                httpRequest
        );
        return studentMapper.toResponse(saved);
    }

    @Transactional
    public StudentResponse reactivate(
            UUID studentId,
            StudentStatusChangeRequest request,
            Admin actorAdmin,
            HttpServletRequest httpRequest
    ) {
        Student student = findByIdOrThrow(studentId);
        if (student.getStatus() == StudentStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "El estudiante ya está activo.");
        }

        student.setStatus(StudentStatus.ACTIVE);
        student.setReactivatedAt(Instant.now());
        student.setReactivationReason(request.reason().trim());
        student.setUpdatedByAdmin(actorAdmin);

        Student saved = studentRepository.save(student);
        auditTrailService.auditAdminAction(
                actorAdmin,
                "STUDENT_REACTIVATE",
                "STUDENT",
                saved.getId().toString(),
                AuditOutcome.SUCCESS,
                Map.of("reason", request.reason().trim()),
                httpRequest
        );
        return studentMapper.toResponse(saved);
    }

    @Transactional
    public void delete(UUID studentId, Admin actorAdmin, HttpServletRequest httpRequest) {
        Student student = findByIdOrThrow(studentId);
        String studentEntityId = student.getId().toString();

        accessLogRepository.detachStudentReferences(studentId);
        studentAccessAlertStateRepository.detachStudentReferences(studentId);
        studentPasswordResetTokenRepository.deleteByStudentId(studentId);
        studentPasswordResetTokenRepository.flush();
        studentRepository.delete(student);
        studentRepository.flush();

        auditTrailService.auditAdminAction(
                actorAdmin,
                "STUDENT_DELETE",
                "STUDENT",
                studentEntityId,
                AuditOutcome.SUCCESS,
                Map.of(
                        "enrollmentId", student.getEnrollmentId(),
                        "institutionalEmailNormalized", student.getInstitutionalEmailNormalized()
                ),
                httpRequest
        );
    }

    private Specification<Student> buildSpecification(String query, String career, StudentStatus status) {
        return (root, q, cb) -> {
            var predicate = cb.conjunction();

            if (StringUtils.hasText(query)) {
                String normalizedQuery = "%" + query.trim().toLowerCase(Locale.ROOT) + "%";
                predicate = cb.and(predicate, cb.or(
                        cb.like(cb.lower(root.get("name")), normalizedQuery),
                        cb.like(cb.lower(root.get("lastNamePaternal")), normalizedQuery),
                        cb.like(cb.lower(root.get("lastNameMaternal")), normalizedQuery),
                        cb.like(cb.lower(root.get("enrollmentId")), normalizedQuery),
                        cb.like(cb.lower(root.get("institutionalEmailNormalized")), normalizedQuery)
                ));
            }

            if (StringUtils.hasText(career)) {
                predicate = cb.and(predicate, cb.equal(cb.lower(root.get("career")), career.trim().toLowerCase(Locale.ROOT)));
            }

            if (status != null) {
                predicate = cb.and(predicate, cb.equal(root.get("status"), status));
            }

            return predicate;
        };
    }

    private Sort buildSort(String sortBy, String sortDir) {
        String safeSortBy = StringUtils.hasText(sortBy) ? sortBy.trim() : "createdAt";
        if (!ALLOWED_SORT_FIELDS.contains(safeSortBy)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "sortBy no permitido.");
        }
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(direction, safeSortBy);
    }

    private void validateCreateRules(String enrollmentId, String normalizedEmail) {
        if (studentRepository.existsByEnrollmentId(enrollmentId.trim())) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "El enrollmentId ya existe.");
        }
        if (studentRepository.existsByInstitutionalEmailNormalized(normalizedEmail)) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "El correo institucional ya existe.");
        }
    }

    private void validateUpdateRules(UUID studentId, String enrollmentId, String normalizedEmail) {
        if (studentRepository.existsByEnrollmentIdAndIdNot(enrollmentId.trim(), studentId)) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "El enrollmentId ya está en uso.");
        }
        if (studentRepository.existsByInstitutionalEmailNormalizedAndIdNot(normalizedEmail, studentId)) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "El correo institucional ya está en uso.");
        }
    }

    private Student findByIdOrThrow(UUID studentId) {
        return studentRepository.findById(studentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Estudiante no encontrado."));
    }

    private String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private void issueStudentOnboardingReset(Student student) {
        studentPasswordResetTokenRepository.invalidatePendingByStudentId(student.getId(), Instant.now());
        String rawToken = UUID.randomUUID().toString();
        String tokenHash = sha256Hex(rawToken);
        studentPasswordResetTokenRepository.save(
                new StudentPasswordResetToken(tokenHash, student, Instant.now().plus(24, ChronoUnit.HOURS))
        );
        studentPasswordResetNotifier.sendStudentPasswordReset(student.getInstitutionalEmail(), rawToken);
    }

    private static String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 error", e);
        }
    }
}
