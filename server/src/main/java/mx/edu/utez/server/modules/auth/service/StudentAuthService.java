package mx.edu.utez.server.modules.auth.service;

import mx.edu.utez.server.config.AppProperties;
import mx.edu.utez.server.modules.auth.dto.StudentAuthResponse;
import mx.edu.utez.server.modules.auth.dto.StudentLoginRequest;
import mx.edu.utez.server.modules.auth.entity.StudentPasswordResetToken;
import mx.edu.utez.server.modules.auth.repository.StudentPasswordResetTokenRepository;
import mx.edu.utez.server.modules.logs.access.service.AccessLogCommand;
import mx.edu.utez.server.modules.logs.access.service.AccessLogService;
import mx.edu.utez.server.modules.logs.access.service.StudentAccessAlertService;
import mx.edu.utez.server.modules.logs.audit.service.AuditLogCommand;
import mx.edu.utez.server.modules.logs.audit.service.AuditLogService;
import mx.edu.utez.server.modules.students.dto.StudentResponse;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.mapper.StudentMapper;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.security.JwtTokenProvider;
import mx.edu.utez.server.shared.context.RequestContext;
import mx.edu.utez.server.shared.enums.AccessResult;
import mx.edu.utez.server.shared.enums.AuditActorType;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.AuditSeverity;
import mx.edu.utez.server.shared.enums.StudentStatus;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import mx.edu.utez.server.shared.validation.PasswordPolicy;
import mx.edu.utez.server.shared.util.ClientIpResolver;
import mx.edu.utez.server.shared.util.EmailNormalizer;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudentAuthService {

    private static final int RESET_TOKEN_EXPIRATION_HOURS = 2;

    private final GoogleTokenVerifierService googleTokenVerifierService;
    private final GoogleSubjectPolicyService googleSubjectPolicyService;
    private final StudentRepository studentRepository;
    private final StudentPasswordResetTokenRepository studentPasswordResetTokenRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final AppProperties appProperties;
    private final EmailNormalizer emailNormalizer;
    private final ClientIpResolver clientIpResolver;
    private final AccessLogService accessLogService;
    private final StudentAccessAlertService studentAccessAlertService;
    private final AuditLogService auditLogService;
    private final PasswordEncoder passwordEncoder;
    private final StudentPasswordResetNotifier studentPasswordResetNotifier;
    private final StudentMapper studentMapper;

    public StudentAuthService(
            GoogleTokenVerifierService googleTokenVerifierService,
            GoogleSubjectPolicyService googleSubjectPolicyService,
            StudentRepository studentRepository,
            StudentPasswordResetTokenRepository studentPasswordResetTokenRepository,
            JwtTokenProvider jwtTokenProvider,
            AppProperties appProperties,
            EmailNormalizer emailNormalizer,
            ClientIpResolver clientIpResolver,
            AccessLogService accessLogService,
            StudentAccessAlertService studentAccessAlertService,
            AuditLogService auditLogService,
            PasswordEncoder passwordEncoder,
            StudentPasswordResetNotifier studentPasswordResetNotifier,
            StudentMapper studentMapper
    ) {
        this.googleTokenVerifierService = googleTokenVerifierService;
        this.googleSubjectPolicyService = googleSubjectPolicyService;
        this.studentRepository = studentRepository;
        this.studentPasswordResetTokenRepository = studentPasswordResetTokenRepository;
        this.jwtTokenProvider = jwtTokenProvider;
        this.appProperties = appProperties;
        this.emailNormalizer = emailNormalizer;
        this.clientIpResolver = clientIpResolver;
        this.accessLogService = accessLogService;
        this.studentAccessAlertService = studentAccessAlertService;
        this.auditLogService = auditLogService;
        this.passwordEncoder = passwordEncoder;
        this.studentPasswordResetNotifier = studentPasswordResetNotifier;
        this.studentMapper = studentMapper;
    }

    @Transactional
    public StudentAuthResponse loginLocal(StudentLoginRequest req, HttpServletRequest httpRequest) {
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        Student student = studentRepository.findByInstitutionalEmail(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED, "Credenciales inválidas"));

        if (student.getLockedUntil() != null && Instant.now().isBefore(student.getLockedUntil())) {
            auditStudent(httpRequest, "STUDENT_LOGIN_LOCKED", student.getId(), AuditOutcome.FAILURE);
            throw new BusinessException(ErrorCode.UNAUTHORIZED,
                    "Cuenta bloqueada temporalmente. Intenta nuevamente en 15 minutos");
        }

        if (student.getStatus() != StudentStatus.ACTIVE) {
            auditStudent(httpRequest, "STUDENT_LOGIN_INACTIVE", student.getId(), AuditOutcome.FAILURE);
            throw new BusinessException(ErrorCode.FORBIDDEN, "Estudiante inactivo");
        }

        if (student.getPasswordHash() == null
                || !passwordEncoder.matches(req.password(), student.getPasswordHash())) {
            handleFailedAttempt(student);
            auditStudent(httpRequest, "STUDENT_LOGIN_FAILURE", student.getId(), AuditOutcome.FAILURE);
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Credenciales inválidas");
        }

        student.setFailedLoginAttempts(0);
        student.setLockedUntil(null);
        studentRepository.save(student);

        auditStudent(httpRequest, "STUDENT_LOGIN_SUCCESS", student.getId(), AuditOutcome.SUCCESS);
        return buildAuthResponse(student);
    }

    @Transactional
    public void changePassword(UUID studentId, String currentPassword, String newPassword, HttpServletRequest request) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Estudiante no encontrado"));

        if (student.getPasswordHash() == null
                || !passwordEncoder.matches(currentPassword, student.getPasswordHash())) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Contraseña actual incorrecta");
        }

        PasswordPolicy.validateOrThrow(newPassword);

        student.setPasswordHash(passwordEncoder.encode(newPassword));
        student.setMustChangePassword(false);
        student.setLastPasswordChangeAt(Instant.now());
        studentRepository.save(student);

        auditStudent(request, "STUDENT_PASSWORD_CHANGED", studentId, AuditOutcome.SUCCESS);
    }

    /**
     * No revela si el correo existe. El controlador responde {@code 204 No Content} siempre que la petición sea válida.
     */
    @Transactional
    public void requestPasswordReset(String email, HttpServletRequest httpRequest) {
        String normalized = emailNormalizer.normalize(email);
        studentRepository.findByInstitutionalEmailNormalized(normalized).ifPresent(student -> {
            if (student.getStatus() != StudentStatus.ACTIVE) {
                return;
            }

            studentPasswordResetTokenRepository.invalidatePendingByStudentId(student.getId(), Instant.now());

            String rawToken = UUID.randomUUID().toString();
            String tokenHash = sha256Hex(rawToken);

            studentPasswordResetTokenRepository.save(new StudentPasswordResetToken(
                    tokenHash,
                    student,
                    Instant.now().plus(RESET_TOKEN_EXPIRATION_HOURS, ChronoUnit.HOURS)
            ));

            studentPasswordResetNotifier.sendStudentPasswordReset(student.getInstitutionalEmail(), rawToken);
            auditStudent(httpRequest, "STUDENT_RESET_PASSWORD_REQUESTED", student.getId(), AuditOutcome.SUCCESS);
        });
    }

    @Transactional
    public void confirmPasswordReset(String rawToken, String newPassword, HttpServletRequest httpRequest) {
        PasswordPolicy.validateOrThrow(newPassword);

        String tokenHash = sha256Hex(rawToken);

        StudentPasswordResetToken token = studentPasswordResetTokenRepository.findByTokenHashAndUsedFalse(tokenHash)
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED, "Token inválido"));

        if (token.isExpired()) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Token expirado o ya utilizado");
        }

        Student student = token.getStudent();
        student.setPasswordHash(passwordEncoder.encode(newPassword));
        student.setMustChangePassword(false);
        student.setLastPasswordChangeAt(Instant.now());
        studentRepository.save(student);

        token.setUsedAt(Instant.now());
        studentPasswordResetTokenRepository.save(token);

        auditStudent(httpRequest, "STUDENT_RESET_PASSWORD_CONFIRMED", student.getId(), AuditOutcome.SUCCESS);
    }

    public StudentResponse getMe(UUID studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Estudiante no encontrado"));
        return studentMapper.toResponse(student);
    }

    /**
     * Genera contraseña temporal para un estudiante recién creado; el llamador debe persistir el estudiante si aún no está guardado.
     */
    public String issueTemporaryPassword(Student student, HttpServletRequest httpRequest) {
        String tempPassword = PasswordPolicy.generateCompliantTemporaryPassword();
        student.setPasswordHash(passwordEncoder.encode(tempPassword));
        student.setMustChangePassword(true);
        if (student.getId() != null) {
            auditStudent(httpRequest, "STUDENT_TEMP_PASSWORD_ISSUED", student.getId(), AuditOutcome.SUCCESS);
        }
        return tempPassword;
    }

    @Transactional
    public StudentAuthResponse loginWithGoogle(String idToken, HttpServletRequest request) {
        long startMs = System.currentTimeMillis();
        String requestId = (String) request.getAttribute(RequestContext.REQUEST_ID_ATTR);
        String correlationId = (String) request.getAttribute(RequestContext.CORRELATION_ID_ATTR);
        String ipAddress = clientIpResolver.resolve(request);
        String userAgent = request.getHeader("User-Agent");
        GoogleIdentity identity;
        try {
            identity = googleTokenVerifierService.verify(idToken);
        } catch (BusinessException ex) {
            accessLogService.log(new AccessLogCommand(
                    null,
                    null,
                    null,
                    AccessResult.FAILED_INVALID_GOOGLE_TOKEN,
                    "INVALID_GOOGLE_TOKEN",
                    "Google token verification failed before extracting email.",
                    elapsed(startMs),
                    requestId,
                    correlationId,
                    ipAddress,
                    userAgent,
                    null,
                    null,
                    null
            ));
            throw ex;
        }
        String normalizedEmail = emailNormalizer.normalize(identity.email());

        if (!isAllowedDomain(normalizedEmail)) {
            studentAccessAlertService.registerFailedAttempt(normalizedEmail, null);
            accessLogService.log(new AccessLogCommand(
                    null,
                    identity.email(),
                    normalizedEmail,
                    AccessResult.FAILED_INSTITUTIONAL_DOMAIN,
                    "EMAIL_DOMAIN_DENIED",
                    "Dominio institucional inválido.",
                    elapsed(startMs),
                    requestId,
                    correlationId,
                    ipAddress,
                    userAgent,
                    null,
                    null,
                    null
            ));
            throw new BusinessException(ErrorCode.FORBIDDEN, "Correo institucional inválido.");
        }

        Student student = studentRepository.findByInstitutionalEmailNormalized(normalizedEmail)
                .orElse(null);
        if (student == null) {
            studentAccessAlertService.registerFailedAttempt(normalizedEmail, null);
            accessLogService.log(new AccessLogCommand(
                    null,
                    identity.email(),
                    normalizedEmail,
                    AccessResult.FAILED_STUDENT_NOT_FOUND,
                    "STUDENT_NOT_FOUND",
                    "El correo no está registrado.",
                    elapsed(startMs),
                    requestId,
                    correlationId,
                    ipAddress,
                    userAgent,
                    null,
                    null,
                    null
            ));
            throw new BusinessException(ErrorCode.FORBIDDEN, "No autorizado.");
        }

        if (student.getStatus() != StudentStatus.ACTIVE) {
            studentAccessAlertService.registerFailedAttempt(normalizedEmail, student);
            accessLogService.log(new AccessLogCommand(
                    student,
                    identity.email(),
                    normalizedEmail,
                    AccessResult.FAILED_STUDENT_INACTIVE,
                    "STUDENT_INACTIVE",
                    "Estudiante inactivo.",
                    elapsed(startMs),
                    requestId,
                    correlationId,
                    ipAddress,
                    userAgent,
                    null,
                    null,
                    null
            ));
            throw new BusinessException(ErrorCode.FORBIDDEN, "Estudiante inactivo.");
        }

        if (student.getLockedUntil() != null && Instant.now().isBefore(student.getLockedUntil())) {
            studentAccessAlertService.registerFailedAttempt(normalizedEmail, student);
            accessLogService.log(new AccessLogCommand(
                    student,
                    identity.email(),
                    normalizedEmail,
                    AccessResult.FAILED_ACCOUNT_LOCKED,
                    "ACCOUNT_LOCKED",
                    "Cuenta bloqueada temporalmente.",
                    elapsed(startMs),
                    requestId,
                    correlationId,
                    ipAddress,
                    userAgent,
                    null,
                    null,
                    null
            ));
            auditLogService.log(new AuditLogCommand(
                    AuditActorType.STUDENT,
                    null,
                    student.getId().toString(),
                    "STUDENT_GOOGLE_LOGIN_LOCKED",
                    "STUDENT",
                    student.getId().toString(),
                    AuditOutcome.FAILURE,
                    AuditSeverity.WARN,
                    null,
                    requestId,
                    correlationId,
                    ipAddress
            ));
            throw new BusinessException(
                    ErrorCode.UNAUTHORIZED,
                    "Cuenta bloqueada temporalmente. Intenta nuevamente en 15 minutos"
            );
        }

        try {
            googleSubjectPolicyService.enforceAndBind(student, identity.subject());
        } catch (BusinessException ex) {
            boolean alertTriggered = studentAccessAlertService.registerFailedAttempt(normalizedEmail, student);
            accessLogService.log(new AccessLogCommand(
                    student,
                    identity.email(),
                    normalizedEmail,
                    AccessResult.FAILED_GOOGLE_SUBJECT_MISMATCH,
                    "GOOGLE_SUBJECT_MISMATCH",
                    "Subject de Google no coincide.",
                    elapsed(startMs),
                    requestId,
                    correlationId,
                    ipAddress,
                    userAgent,
                    null,
                    null,
                    null
            ));
            auditLogService.log(new AuditLogCommand(
                    AuditActorType.SYSTEM,
                    null,
                    identity.subject(),
                    "STUDENT_GOOGLE_SUBJECT_MISMATCH",
                    "STUDENT",
                    student.getId().toString(),
                    AuditOutcome.FAILURE,
                    AuditSeverity.CRITICAL,
                    "{\"reason\":\"google_subject_mismatch\",\"alertTriggered\":" + alertTriggered + "}",
                    requestId,
                    correlationId,
                    ipAddress
            ));
            throw new BusinessException(ErrorCode.FORBIDDEN, "No autorizado.");
        }

        student.setLastLoginAt(Instant.now());
        if (student.getPasswordHash() == null || student.getPasswordHash().isBlank()) {
            student.setMustChangePassword(true);
        }
        studentRepository.save(student);
        studentAccessAlertService.registerSuccess(normalizedEmail);

        accessLogService.log(new AccessLogCommand(
                student,
                identity.email(),
                normalizedEmail,
                AccessResult.SUCCESS,
                null,
                null,
                elapsed(startMs),
                requestId,
                correlationId,
                ipAddress,
                userAgent,
                null,
                null,
                null
        ));

        return buildAuthResponse(student);
    }

    private void handleFailedAttempt(Student student) {
        int attempts = student.getFailedLoginAttempts() + 1;
        student.setFailedLoginAttempts(attempts);
        if (attempts >= 5) {
            student.setLockedUntil(Instant.now().plus(15, ChronoUnit.MINUTES));
            student.setFailedLoginAttempts(0);
        }
        studentRepository.save(student);
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

    private StudentAuthResponse buildAuthResponse(Student student) {
        String token = jwtTokenProvider.generateStudentToken(student);
        return new StudentAuthResponse(token, student.isMustChangePassword());
    }

    private void auditStudent(HttpServletRequest request, String action, UUID studentId, AuditOutcome outcome) {
        String requestId = request != null ? (String) request.getAttribute(RequestContext.REQUEST_ID_ATTR) : null;
        String correlationId = request != null ? (String) request.getAttribute(RequestContext.CORRELATION_ID_ATTR) : null;
        String ipAddress = request != null ? clientIpResolver.resolve(request) : null;
        auditLogService.log(new AuditLogCommand(
                AuditActorType.STUDENT,
                null,
                studentId.toString(),
                action,
                "STUDENT",
                studentId.toString(),
                outcome,
                outcome == AuditOutcome.SUCCESS ? AuditSeverity.INFO : AuditSeverity.WARN,
                null,
                requestId,
                correlationId,
                ipAddress
        ));
    }

    private boolean isAllowedDomain(String normalizedEmail) {
        String suffix = "@" + appProperties.getGoogle().getAllowedDomain().trim().toLowerCase();
        return normalizedEmail.endsWith(suffix);
    }

    private long elapsed(long startMs) {
        return Math.max(0, System.currentTimeMillis() - startMs);
    }
}
