package mx.edu.utez.server.modules.auth.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.UUID;
import jakarta.servlet.http.HttpServletRequest;
import mx.edu.utez.server.modules.auth.entity.StudentPasswordResetToken;
import mx.edu.utez.server.modules.auth.repository.StudentPasswordResetTokenRepository;
import mx.edu.utez.server.modules.logs.audit.service.AuditLogCommand;
import mx.edu.utez.server.modules.logs.audit.service.AuditLogService;
import mx.edu.utez.server.modules.notifications.service.EmailDispatchService;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.shared.context.RequestContext;
import mx.edu.utez.server.shared.enums.AuditActorType;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.AuditSeverity;
import mx.edu.utez.server.shared.enums.AuditSourceModule;
import mx.edu.utez.server.shared.enums.EmailDispatchJobType;
import mx.edu.utez.server.shared.enums.StudentStatus;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import mx.edu.utez.server.shared.util.ClientIpResolver;
import mx.edu.utez.server.shared.util.EmailNormalizer;
import mx.edu.utez.server.shared.validation.PasswordPolicy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class StudentPasswordLifecycleService {

    private static final int RESET_TOKEN_EXPIRATION_HOURS = 2;

    private final StudentRepository studentRepository;
    private final StudentPasswordResetTokenRepository studentPasswordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailNormalizer emailNormalizer;
    private final StudentPasswordResetNotifier studentPasswordResetNotifier;
    private final EmailDispatchService emailDispatchService;
    private final AuditLogService auditLogService;
    private final ClientIpResolver clientIpResolver;

    public StudentPasswordLifecycleService(
            StudentRepository studentRepository,
            StudentPasswordResetTokenRepository studentPasswordResetTokenRepository,
            PasswordEncoder passwordEncoder,
            EmailNormalizer emailNormalizer,
            StudentPasswordResetNotifier studentPasswordResetNotifier,
            EmailDispatchService emailDispatchService,
            AuditLogService auditLogService,
            ClientIpResolver clientIpResolver
    ) {
        this.studentRepository = studentRepository;
        this.studentPasswordResetTokenRepository = studentPasswordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailNormalizer = emailNormalizer;
        this.studentPasswordResetNotifier = studentPasswordResetNotifier;
        this.emailDispatchService = emailDispatchService;
        this.auditLogService = auditLogService;
        this.clientIpResolver = clientIpResolver;
    }

    @Transactional
    public void changePassword(UUID studentId, String currentPassword, String newPassword, String confirmNewPassword, HttpServletRequest request) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Estudiante no encontrado"));

        boolean requiresCurrentPassword = !student.isMustChangePassword();
        if (requiresCurrentPassword) {
            if (!StringUtils.hasText(currentPassword)
                    || student.getPasswordHash() == null
                    || !passwordEncoder.matches(currentPassword, student.getPasswordHash())) {
                throw new BusinessException(ErrorCode.UNAUTHORIZED, "Contraseña actual incorrecta");
            }
        }

        PasswordPolicy.validateOrThrow(newPassword);
        if (!newPassword.equals(confirmNewPassword)) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "La confirmación no coincide con la nueva contraseña.");
        }

        student.setPasswordHash(passwordEncoder.encode(newPassword));
        student.setMustChangePassword(false);
        student.setStatus(StudentStatus.ACTIVE);
        student.setLastPasswordChangeAt(Instant.now());
        student.setTokenVersion(student.getTokenVersion() + 1);
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

            enqueuePasswordResetEmail(student, rawToken);
            auditStudent(
                    httpRequest,
                    "STUDENT_RESET_PASSWORD_REQUESTED",
                    student.getId(),
                    AuditOutcome.SUCCESS
            );
        });
    }

    @Transactional
    public void confirmPasswordReset(String rawToken, String newPassword, String confirmNewPassword, HttpServletRequest httpRequest) {
        PasswordPolicy.validateOrThrow(newPassword);
        if (!newPassword.equals(confirmNewPassword)) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "La confirmación no coincide con la nueva contraseña.");
        }

        String tokenHash = sha256Hex(rawToken);

        StudentPasswordResetToken token = studentPasswordResetTokenRepository.findByTokenHashAndUsedFalse(tokenHash)
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED, "Token inválido"));

        if (token.isExpired()) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Token expirado o ya utilizado");
        }

        Student student = token.getStudent();
        student.setPasswordHash(passwordEncoder.encode(newPassword));
        student.setMustChangePassword(false);
        student.setStatus(StudentStatus.ACTIVE);
        student.setLastPasswordChangeAt(Instant.now());
        student.setTokenVersion(student.getTokenVersion() + 1);
        studentRepository.save(student);

        token.setUsedAt(Instant.now());
        studentPasswordResetTokenRepository.save(token);

        auditStudent(httpRequest, "STUDENT_RESET_PASSWORD_CONFIRMED", student.getId(), AuditOutcome.SUCCESS);
    }

    /**
     * Genera contraseña temporal para un estudiante recién creado; el llamador debe persistir el estudiante si aún no está guardado.
     */
    public String issueTemporaryPassword(Student student, HttpServletRequest httpRequest) {
        String tempPassword = PasswordPolicy.generateCompliantTemporaryPassword();
        student.setPasswordHash(passwordEncoder.encode(tempPassword));
        student.setMustChangePassword(true);
        if (student.getId() != null) {
            student.setTokenVersion(student.getTokenVersion() + 1);
            auditStudent(httpRequest, "STUDENT_TEMP_PASSWORD_ISSUED", student.getId(), AuditOutcome.SUCCESS);
        }
        return tempPassword;
    }

    private void auditStudent(HttpServletRequest request, String action, UUID studentId, AuditOutcome outcome) {
        String requestId = request != null ? (String) request.getAttribute(RequestContext.REQUEST_ID_ATTR) : null;
        String correlationId = request != null ? (String) request.getAttribute(RequestContext.CORRELATION_ID_ATTR) : null;
        String ipAddress = request != null ? clientIpResolver.resolve(request) : null;
        auditLogService.log(new AuditLogCommand(
                AuditActorType.SYSTEM,
                null,
                studentId.toString(),
                action,
                "STUDENT",
                studentId.toString(),
                outcome,
                outcome == AuditOutcome.SUCCESS ? AuditSeverity.INFO : AuditSeverity.WARNING,
                AuditSourceModule.AUTH,
                null,
                requestId,
                correlationId,
                ipAddress,
                request != null ? request.getHeader("User-Agent") : null,
                request != null ? request.getRequestedSessionId() : null,
                request != null ? request.getHeader("Origin") : null,
                request != null ? request.getMethod() : null,
                request != null ? request.getRequestURI() : null
        ));
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

    private void enqueuePasswordResetEmail(Student student, String rawToken) {
        try {
            String resetLink = studentPasswordResetNotifier.buildStudentResetLink(rawToken);
            String plainText = """
                    Hola,

                    Recibimos una solicitud para restablecer tu contraseña de SIGASe.

                    Usa este enlace para crear una nueva contraseña:
                    %s

                    Si no solicitaste este cambio, ignora este correo.
                    """.formatted(resetLink);
            String html = """
                    <!doctype html>
                    <html lang="es">
                      <body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
                        <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;">
                          <h1 style="margin:0 0 12px 0;font-size:22px;">Restablece tu contraseña</h1>
                          <p style="margin:0 0 16px 0;line-height:1.6;">Recibimos una solicitud para restablecer tu contraseña. Si fuiste tú, continúa con el siguiente botón.</p>
                          <a href="%s" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#059669;color:#fff;text-decoration:none;font-weight:700;">Restablecer contraseña</a>
                        </div>
                      </body>
                    </html>
                    """.formatted(resetLink);
            emailDispatchService.enqueue(
                    EmailDispatchJobType.STUDENT_PASSWORD_RESET,
                    student.getInstitutionalEmail(),
                    "SIGASe | Restablece tu contraseña",
                    plainText,
                    html,
                    "STUDENT",
                    student.getId().toString()
            );
        } catch (Exception ex) {
            auditStudent(null, "STUDENT_RESET_PASSWORD_EMAIL_QUEUE_FAILED", student.getId(), AuditOutcome.FAILURE);
        }
    }
}
