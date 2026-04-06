package mx.edu.utez.server.modules.students.service;

import mx.edu.utez.server.modules.auth.entity.StudentPasswordResetToken;
import mx.edu.utez.server.modules.auth.repository.StudentPasswordResetTokenRepository;
import mx.edu.utez.server.modules.auth.service.StudentPasswordResetNotifier;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.careers.entity.Career;
import mx.edu.utez.server.modules.careers.service.CareerService;
import mx.edu.utez.server.modules.elibro.repository.ElibroAccessLogRepository;
import mx.edu.utez.server.modules.logs.audit.service.AuditTrailService;
import mx.edu.utez.server.modules.students.dto.CreateStudentRequest;
import mx.edu.utez.server.modules.students.dto.StudentResponse;
import mx.edu.utez.server.modules.students.dto.StudentStatusChangeRequest;
import mx.edu.utez.server.modules.students.dto.UpdateStudentRequest;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.mapper.StudentMapper;
import mx.edu.utez.server.modules.students.repository.StudentAuthEventRepository;
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
    private final ElibroAccessLogRepository elibroAccessLogRepository;
    private final StudentAuthEventRepository studentAuthEventRepository;
    private final StudentPasswordResetTokenRepository studentPasswordResetTokenRepository;
    private final StudentPasswordResetNotifier studentPasswordResetNotifier;
    private final CareerService careerService;

    public StudentService(
            StudentRepository studentRepository,
            StudentMapper studentMapper,
            EmailNormalizer emailNormalizer,
            AuditTrailService auditTrailService,
            ElibroAccessLogRepository elibroAccessLogRepository,
            StudentAuthEventRepository studentAuthEventRepository,
            StudentPasswordResetTokenRepository studentPasswordResetTokenRepository,
            StudentPasswordResetNotifier studentPasswordResetNotifier,
            CareerService careerService
    ) {
        this.studentRepository = studentRepository;
        this.studentMapper = studentMapper;
        this.emailNormalizer = emailNormalizer;
        this.auditTrailService = auditTrailService;
        this.elibroAccessLogRepository = elibroAccessLogRepository;
        this.studentAuthEventRepository = studentAuthEventRepository;
        this.studentPasswordResetTokenRepository = studentPasswordResetTokenRepository;
        this.studentPasswordResetNotifier = studentPasswordResetNotifier;
        this.careerService = careerService;
    }

    @Transactional
    public StudentResponse create(CreateStudentRequest request, Admin actorAdmin, HttpServletRequest httpRequest) {
        String normalizedEmail = emailNormalizer.normalize(request.institutionalEmail());
        validateCreateRules(request.enrollmentId(), normalizedEmail);
        Career career = careerService.resolveCareer(request.careerId(), request.careerCode());

        Student student = new Student();
        student.setEnrollmentId(request.enrollmentId().trim());
        student.setName(request.name().trim());
        student.setLastNamePaternal(request.lastNamePaternal().trim());
        student.setLastNameMaternal(trimToNull(request.lastNameMaternal()));
        student.setSex(request.sex());
        student.setQuarter(request.quarter());
        student.setInstitutionalEmail(request.institutionalEmail().trim());
        student.setInstitutionalEmailNormalized(normalizedEmail);
        student.setCareer(career);
        student.setStatus(StudentStatus.ACTIVE);
        student.setMustChangePassword(true);
        student.setCreatedByAdmin(actorAdmin);
        student.setUpdatedByAdmin(actorAdmin);

        Student saved = studentRepository.saveAndFlush(student);
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
        Career career = careerService.resolveCareer(request.careerId(), request.careerCode());

        student.setEnrollmentId(request.enrollmentId().trim());
        student.setName(request.name().trim());
        student.setLastNamePaternal(request.lastNamePaternal().trim());
        student.setLastNameMaternal(trimToNull(request.lastNameMaternal()));
        student.setSex(request.sex());
        student.setQuarter(request.quarter());
        student.setInstitutionalEmail(request.institutionalEmail().trim());
        student.setInstitutionalEmailNormalized(normalizedEmail);
        student.setCareer(career);
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
                        "careerCode", saved.getCareer().getCode()
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
            UUID careerId,
            String careerCode,
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
        Specification<Student> spec = buildSpecification(query, careerId, careerCode, status);
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

        elibroAccessLogRepository.detachStudentReferences(studentId);
        studentAuthEventRepository.detachStudentReferences(studentId);
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

    private Specification<Student> buildSpecification(String query, UUID careerId, String careerCode, StudentStatus status) {
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

            if (careerId != null) {
                predicate = cb.and(predicate, cb.equal(root.get("career").get("id"), careerId));
            } else if (StringUtils.hasText(careerCode)) {
                predicate = cb.and(
                        predicate,
                        cb.equal(
                                cb.lower(root.get("career").get("code")),
                                careerCode.trim().toLowerCase(Locale.ROOT)
                        )
                );
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
        if ("career".equals(safeSortBy)) {
            return Sort.by(direction, "career.name");
        }
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
        boolean emailSent = studentPasswordResetNotifier.sendStudentOnboardingPasswordSetup(
                student.getInstitutionalEmail(),
                rawToken
        );
        if (!emailSent) {
            throw new BusinessException(
                    ErrorCode.SERVICE_UNAVAILABLE,
                    "No se pudo enviar el correo para establecer la contraseña del estudiante."
            );
        }
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
