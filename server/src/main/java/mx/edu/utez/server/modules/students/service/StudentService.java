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
import mx.edu.utez.server.modules.students.dto.StudentCareerDistributionResponse;
import mx.edu.utez.server.modules.students.dto.StudentMetricsPointResponse;
import mx.edu.utez.server.modules.students.dto.StudentMetricsResponse;
import mx.edu.utez.server.modules.students.dto.StudentResponse;
import mx.edu.utez.server.modules.students.dto.StudentStatusChangeRequest;
import mx.edu.utez.server.modules.students.dto.UpdateStudentRequest;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.mapper.StudentMapper;
import mx.edu.utez.server.modules.students.repository.StudentAuthEventRepository;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.modules.notifications.service.EmailDispatchService;
import mx.edu.utez.server.shared.api.PageResponse;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.EmailDispatchJobType;
import mx.edu.utez.server.shared.enums.Sex;
import mx.edu.utez.server.shared.enums.StudentStatus;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import mx.edu.utez.server.shared.util.EmailNormalizer;
import mx.edu.utez.server.shared.validation.DomainTextPolicy;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(StudentService.class);

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "createdAt", "updatedAt", "name", "lastNamePaternal", "lastNameMaternal", "enrollmentId", "career", "quarter", "status", "lastLoginAt"
    );

    private final StudentRepository studentRepository;
    private final StudentMapper studentMapper;
    private final EmailNormalizer emailNormalizer;
    private final AuditTrailService auditTrailService;
    private final ElibroAccessLogRepository elibroAccessLogRepository;
    private final StudentAuthEventRepository studentAuthEventRepository;
    private final StudentPasswordResetTokenRepository studentPasswordResetTokenRepository;
    private final StudentPasswordResetNotifier studentPasswordResetNotifier;
    private final EmailDispatchService emailDispatchService;
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
            EmailDispatchService emailDispatchService,
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
        this.emailDispatchService = emailDispatchService;
        this.careerService = careerService;
    }

    @Transactional
    public StudentResponse create(CreateStudentRequest request, Admin actorAdmin, HttpServletRequest httpRequest) {
        String normalizedEmail = emailNormalizer.normalize(request.institutionalEmail());
        String normalizedEnrollmentId = DomainTextPolicy.normalizeEnrollmentId(request.enrollmentId());
        String expectedInstitutionalEmail = emailNormalizer.buildInstitutionalEmailFromEnrollmentId(normalizedEnrollmentId);
        String normalizedName = DomainTextPolicy.normalizeHumanNameWithInitialCaps(request.name());
        String normalizedLastNamePaternal = DomainTextPolicy.normalizeHumanNameWithInitialCaps(request.lastNamePaternal());
        String normalizedLastNameMaternal = DomainTextPolicy.normalizeHumanNameWithInitialCaps(request.lastNameMaternal());
        validateCreateRules(normalizedEnrollmentId, normalizedEmail, expectedInstitutionalEmail);
        Career career = careerService.resolveCareer(request.careerId(), null);

        Student student = new Student();
        student.setEnrollmentId(normalizedEnrollmentId);
        student.setName(normalizedName);
        student.setLastNamePaternal(normalizedLastNamePaternal);
        student.setLastNameMaternal(normalizedLastNameMaternal);
        student.setSex(request.sex());
        student.setQuarter(request.quarter());
        student.setInstitutionalEmail(expectedInstitutionalEmail);
        student.setInstitutionalEmailNormalized(expectedInstitutionalEmail);
        student.setCareer(career);
        student.setStatus(StudentStatus.PENDING);
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
        return toResponseWithAccessMetrics(saved);
    }

    @Transactional
    public StudentResponse update(UUID studentId, UpdateStudentRequest request, Admin actorAdmin, HttpServletRequest httpRequest) {
        Student student = findByIdOrThrow(studentId);
        String normalizedEmail = emailNormalizer.normalize(request.institutionalEmail());
        String normalizedEnrollmentId = DomainTextPolicy.normalizeEnrollmentId(request.enrollmentId());
        String expectedInstitutionalEmail = emailNormalizer.buildInstitutionalEmailFromEnrollmentId(normalizedEnrollmentId);
        String normalizedName = DomainTextPolicy.normalizeHumanNameWithInitialCaps(request.name());
        String normalizedLastNamePaternal = DomainTextPolicy.normalizeHumanNameWithInitialCaps(request.lastNamePaternal());
        String normalizedLastNameMaternal = DomainTextPolicy.normalizeHumanNameWithInitialCaps(request.lastNameMaternal());
        validateUpdateRules(studentId, normalizedEnrollmentId, normalizedEmail, expectedInstitutionalEmail);
        Career career = careerService.resolveCareer(request.careerId(), null);

        student.setEnrollmentId(normalizedEnrollmentId);
        student.setName(normalizedName);
        student.setLastNamePaternal(normalizedLastNamePaternal);
        student.setLastNameMaternal(normalizedLastNameMaternal);
        student.setSex(request.sex());
        student.setQuarter(request.quarter());
        student.setInstitutionalEmail(expectedInstitutionalEmail);
        student.setInstitutionalEmailNormalized(expectedInstitutionalEmail);
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
        return toResponseWithAccessMetrics(saved);
    }

    @Transactional(readOnly = true)
    public StudentResponse getById(UUID studentId, Admin actorAdmin, HttpServletRequest httpRequest) {
        Student student = findByIdOrThrow(studentId);
        return toResponseWithAccessMetrics(student);
    }

    @Transactional(readOnly = true)
    public PageResponse<StudentResponse> list(
            String query,
            String enrollmentId,
            String lastNamePaternal,
            String lastNameMaternal,
            String institutionalEmail,
            UUID careerId,
            String careerCode,
            Sex sex,
            Integer quarter,
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
        if (quarter != null && (quarter < 1 || quarter > 11)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "quarter debe estar entre 1 y 11.");
        }
        Pageable pageable = PageRequest.of(page, size, buildSort(sortBy, sortDir));
        Specification<Student> spec = buildSpecification(
                query,
                enrollmentId,
                lastNamePaternal,
                lastNameMaternal,
                institutionalEmail,
                careerId,
                careerCode,
                sex,
                quarter,
                status
        );
        Page<Student> result = studentRepository.findAll(spec, pageable);
        List<UUID> studentIds = result.getContent().stream().map(Student::getId).toList();
        Map<UUID, StudentAccessMetrics> accessMetrics = summarizeAccessMetrics(
                studentIds
        );
        Map<UUID, Instant> lastEbookAccessAt = summarizeStudentLastAccess(studentIds);
        List<StudentResponse> content = result.getContent().stream()
                .map(student -> {
                    StudentAccessMetrics metrics = accessMetrics.getOrDefault(student.getId(), StudentAccessMetrics.empty());
                    // DataTables should reflect eLibro access only (Elseeder), not portal login.
                    Instant resolvedLastLoginAt = lastEbookAccessAt.get(student.getId());
                    return studentMapper.toResponse(
                            student,
                            resolvedLastLoginAt,
                            metrics.totalAccesses(),
                            metrics.successfulAccesses(),
                            metrics.failedAccesses()
                    );
                })
                .toList();

        return new PageResponse<>(
                content,
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages()
        );
    }

    @Transactional(readOnly = true)
    public StudentMetricsResponse getMetrics(Instant dateFrom, Instant dateTo) {
        MetricsRange range = resolveMetricsRange(dateFrom, dateTo);

        long totalStudents = studentRepository.count();
        long activeStudents = studentRepository.countByStatus(StudentStatus.ACTIVE);
        long disabledStudents = studentRepository.countByStatus(StudentStatus.INACTIVE);

        long totalAccesses = elibroAccessLogRepository.countByOccurredAtGreaterThanEqualAndOccurredAtLessThanEqual(
                range.dateFrom(),
                range.dateTo()
        );
        long successfulAccesses = elibroAccessLogRepository.countByOccurredAtGreaterThanEqualAndOccurredAtLessThanEqualAndResult(
                range.dateFrom(),
                range.dateTo(),
                mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS
        );
        long failedAccesses = Math.max(0, totalAccesses - successfulAccesses);

        Map<LocalDate, Long> totalsByDay = new HashMap<>();
        for (var row : elibroAccessLogRepository.countDailyAccesses(range.dateFrom(), range.dateTo())) {
            totalsByDay.put(row.getActivityDate(), row.getTotal());
        }

        List<StudentMetricsPointResponse> activityByDate = new ArrayList<>();
        LocalDate cursor = range.fromDay();
        while (!cursor.isAfter(range.toDay())) {
            activityByDate.add(new StudentMetricsPointResponse(
                    cursor.toString(),
                    totalsByDay.getOrDefault(cursor, 0L)
            ));
            cursor = cursor.plusDays(1);
        }

        List<StudentCareerDistributionResponse> careerDistribution = studentRepository
                .summarizeCareerDistribution()
                .stream()
                .map(item -> new StudentCareerDistributionResponse(item.getCareerCode(), item.getTotal()))
                .toList();

        return new StudentMetricsResponse(
                totalStudents,
                activeStudents,
                disabledStudents,
                totalAccesses,
                successfulAccesses,
                failedAccesses,
                calculateSuccessRate(successfulAccesses, failedAccesses),
                activityByDate,
                careerDistribution
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
        return toResponseWithAccessMetrics(saved);
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
        return toResponseWithAccessMetrics(saved);
    }

    @Transactional
    public StudentResponse resendOnboardingEmail(
            UUID studentId,
            Admin actorAdmin,
            HttpServletRequest httpRequest
    ) {
        Student student = findByIdOrThrow(studentId);
        if (student.getStatus() != StudentStatus.PENDING) {
            throw new BusinessException(
                    ErrorCode.BUSINESS_RULE_VIOLATION,
                    "Solo se puede reenviar el correo de onboarding a estudiantes pendientes."
            );
        }

        student.setMustChangePassword(true);
        student.setUpdatedByAdmin(actorAdmin);
        Student saved = studentRepository.save(student);
        issueStudentOnboardingReset(saved);

        auditTrailService.auditAdminAction(
                actorAdmin,
                "STUDENT_RESEND_ONBOARDING",
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

        return toResponseWithAccessMetrics(saved);
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

    private Specification<Student> buildSpecification(
            String query,
            String enrollmentId,
            String lastNamePaternal,
            String lastNameMaternal,
            String institutionalEmail,
            UUID careerId,
            String careerCode,
            Sex sex,
            Integer quarter,
            StudentStatus status
    ) {
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

            if (StringUtils.hasText(enrollmentId)) {
                predicate = cb.and(
                        predicate,
                        cb.like(
                                cb.lower(root.get("enrollmentId")),
                                "%" + enrollmentId.trim().toLowerCase(Locale.ROOT) + "%"
                        )
                );
            }

            if (StringUtils.hasText(lastNamePaternal)) {
                predicate = cb.and(
                        predicate,
                        cb.like(
                                cb.lower(root.get("lastNamePaternal")),
                                "%" + lastNamePaternal.trim().toLowerCase(Locale.ROOT) + "%"
                        )
                );
            }

            if (StringUtils.hasText(lastNameMaternal)) {
                predicate = cb.and(
                        predicate,
                        cb.like(
                                cb.lower(root.get("lastNameMaternal")),
                                "%" + lastNameMaternal.trim().toLowerCase(Locale.ROOT) + "%"
                        )
                );
            }

            if (StringUtils.hasText(institutionalEmail)) {
                String raw = institutionalEmail.trim().toLowerCase(Locale.ROOT);
                String localPart = raw.split("@", 2)[0].trim();
                if (StringUtils.hasText(localPart)) {
                    String pattern = "%" + localPart + "%";
                    predicate = cb.and(
                            predicate,
                            cb.like(cb.lower(root.get("institutionalEmailNormalized")), pattern)
                    );
                }
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

            if (sex != null) {
                predicate = cb.and(predicate, cb.equal(root.get("sex"), sex));
            }

            if (quarter != null) {
                predicate = cb.and(predicate, cb.equal(root.get("quarter"), quarter));
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

    private MetricsRange resolveMetricsRange(Instant dateFrom, Instant dateTo) {
        if (dateFrom == null && dateTo == null) {
            LocalDate today = LocalDate.now(ZoneOffset.UTC);
            LocalDate fromDay = today.minusDays(6);
            Instant resolvedFrom = fromDay.atStartOfDay().toInstant(ZoneOffset.UTC);
            Instant resolvedTo = today.atTime(LocalTime.MAX).toInstant(ZoneOffset.UTC);
            return new MetricsRange(resolvedFrom, resolvedTo, fromDay, today);
        }
        if (dateFrom == null || dateTo == null) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "dateFrom y dateTo deben enviarse juntos o ambos omitirse."
            );
        }
        if (dateFrom.isAfter(dateTo)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "dateFrom debe ser menor o igual a dateTo.");
        }

        LocalDate fromDay = dateFrom.atZone(ZoneOffset.UTC).toLocalDate();
        LocalDate toDay = dateTo.atZone(ZoneOffset.UTC).toLocalDate();
        return new MetricsRange(dateFrom, dateTo, fromDay, toDay);
    }

    private double calculateSuccessRate(long successfulAccesses, long failedAccesses) {
        long total = successfulAccesses + failedAccesses;
        if (total <= 0) {
            return 0.0;
        }
        return Math.round((successfulAccesses * 10000.0) / total) / 100.0;
    }

    private StudentResponse toResponseWithAccessMetrics(Student student) {
        StudentAccessMetrics metrics = summarizeAccessMetrics(List.of(student.getId()))
                .getOrDefault(student.getId(), StudentAccessMetrics.empty());
        Instant lastEbookAccessAt = summarizeStudentLastAccess(List.of(student.getId())).get(student.getId());
        // DataTables should reflect eLibro access only (Elseeder), not portal login.
        Instant resolvedLastLoginAt = lastEbookAccessAt;
        return studentMapper.toResponse(
                student,
                resolvedLastLoginAt,
                metrics.totalAccesses(),
                metrics.successfulAccesses(),
                metrics.failedAccesses()
        );
    }

    private Map<UUID, Instant> summarizeStudentLastAccess(List<UUID> studentIds) {
        if (studentIds == null || studentIds.isEmpty()) {
            return Map.of();
        }

        Map<UUID, Instant> summary = new HashMap<>();
        for (var row : elibroAccessLogRepository.summarizeStudentLastAccess(studentIds)) {
            if (row.getStudentId() == null || row.getLastOccurredAt() == null) continue;
            summary.put(row.getStudentId(), row.getLastOccurredAt());
        }
        return summary;
    }

    private Map<UUID, StudentAccessMetrics> summarizeAccessMetrics(List<UUID> studentIds) {
        if (studentIds == null || studentIds.isEmpty()) {
            return Map.of();
        }

        Map<UUID, StudentAccessMetrics> summary = new HashMap<>();
        for (var row : elibroAccessLogRepository.summarizeStudentAccessMetrics(studentIds)) {
            StudentAccessMetrics current = summary.getOrDefault(row.getStudentId(), StudentAccessMetrics.empty());
            long accessCount = row.getAccessCount();
            long successfulAccesses = current.successfulAccesses();
            long failedAccesses = current.failedAccesses();

            if (row.getResult() == mx.edu.utez.server.shared.enums.ElibroAccessResult.SUCCESS) {
                successfulAccesses += accessCount;
            } else {
                failedAccesses += accessCount;
            }

            summary.put(
                    row.getStudentId(),
                    new StudentAccessMetrics(
                            current.totalAccesses() + accessCount,
                            successfulAccesses,
                            failedAccesses
                    )
            );
        }
        return summary;
    }

    private void validateCreateRules(String enrollmentId, String normalizedEmail, String expectedInstitutionalEmail) {
        if (!DomainTextPolicy.isValidEnrollmentId(enrollmentId)) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "La matrícula tiene un formato inválido.");
        }
        if (!StringUtils.hasText(expectedInstitutionalEmail) || !expectedInstitutionalEmail.equals(normalizedEmail)) {
            throw new BusinessException(
                    ErrorCode.BUSINESS_RULE_VIOLATION,
                    "El correo institucional debe generarse a partir de la matrícula."
            );
        }
        if (studentRepository.existsByEnrollmentId(enrollmentId)) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "El enrollmentId ya existe.");
        }
        if (studentRepository.existsByInstitutionalEmailNormalized(expectedInstitutionalEmail)) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "El correo institucional ya existe.");
        }
    }

    private void validateUpdateRules(UUID studentId, String enrollmentId, String normalizedEmail, String expectedInstitutionalEmail) {
        if (!DomainTextPolicy.isValidEnrollmentId(enrollmentId)) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "La matrícula tiene un formato inválido.");
        }
        if (!StringUtils.hasText(expectedInstitutionalEmail) || !expectedInstitutionalEmail.equals(normalizedEmail)) {
            throw new BusinessException(
                    ErrorCode.BUSINESS_RULE_VIOLATION,
                    "El correo institucional debe generarse a partir de la matrícula."
            );
        }
        if (studentRepository.existsByEnrollmentIdAndIdNot(enrollmentId, studentId)) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "El enrollmentId ya está en uso.");
        }
        if (studentRepository.existsByInstitutionalEmailNormalizedAndIdNot(expectedInstitutionalEmail, studentId)) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "El correo institucional ya está en uso.");
        }
    }

    private Student findByIdOrThrow(UUID studentId) {
        return studentRepository.findById(studentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Estudiante no encontrado."));
    }

    private void issueStudentOnboardingReset(Student student) {
        studentPasswordResetTokenRepository.invalidatePendingByStudentId(student.getId(), Instant.now());
        String rawToken = UUID.randomUUID().toString();
        String tokenHash = sha256Hex(rawToken);
        studentPasswordResetTokenRepository.save(
                new StudentPasswordResetToken(tokenHash, student, Instant.now().plus(24, ChronoUnit.HOURS))
        );
        enqueueStudentOnboardingEmail(student, rawToken);
    }

    private void enqueueStudentOnboardingEmail(Student student, String rawToken) {
        try {
            String onboardingLink = studentPasswordResetNotifier.buildStudentOnboardingLink(rawToken);
            String plainText = """
                    Hola,

                    Se creó tu acceso en SIGASe y necesitas establecer tu contraseña.

                    Usa este enlace para crearla:
                    %s

                    Equipo SIGASe
                    """.formatted(onboardingLink);
            String html = """
                    <!doctype html>
                    <html lang="es">
                      <body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
                        <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;">
                          <h1 style="margin:0 0 12px 0;font-size:22px;">Configura tu contraseña</h1>
                          <p style="margin:0 0 16px 0;line-height:1.6;">Tu cuenta en SIGASe ya fue creada. Para activar tu acceso, configura tu contraseña con el siguiente botón.</p>
                          <a href="%s" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#2563eb;color:#fff;text-decoration:none;font-weight:700;">Configurar contraseña</a>
                        </div>
                      </body>
                    </html>
                    """.formatted(onboardingLink);
            emailDispatchService.enqueue(
                    EmailDispatchJobType.STUDENT_ONBOARDING_PASSWORD,
                    student.getInstitutionalEmail(),
                    "SIGASe | Configura tu contraseña",
                    plainText,
                    html,
                    "STUDENT",
                    student.getId().toString()
            );
        } catch (Exception enqueueEx) {
            log.warn("No se pudo encolar el correo de onboarding para el estudiante {}: {}", student.getId(), enqueueEx.getMessage());
            boolean sent = studentPasswordResetNotifier.sendStudentOnboardingPasswordSetup(student.getInstitutionalEmail(), rawToken);
            if (!sent) {
                log.error("Fallback directo falló para el correo de onboarding del estudiante {}", student.getId());
            }
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

    private record MetricsRange(
            Instant dateFrom,
            Instant dateTo,
            LocalDate fromDay,
            LocalDate toDay
    ) {
    }

    private record StudentAccessMetrics(
            long totalAccesses,
            long successfulAccesses,
            long failedAccesses
    ) {
        private static StudentAccessMetrics empty() {
            return new StudentAccessMetrics(0L, 0L, 0L);
        }
    }
}
