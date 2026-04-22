package mx.edu.utez.server.modules.auth.service;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.Map;
import mx.edu.utez.server.config.AppProperties;
import mx.edu.utez.server.modules.auth.dto.StudentAuthResponse;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.StudentAuthMethod;
import mx.edu.utez.server.shared.enums.StudentAuthResult;
import mx.edu.utez.server.shared.enums.AuditSeverity;
import mx.edu.utez.server.shared.enums.StudentStatus;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import mx.edu.utez.server.shared.util.EmailNormalizer;
import org.springframework.stereotype.Service;

@Service
public class StudentGoogleLoginService {

    private final GoogleTokenVerifierService googleTokenVerifierService;
    private final GoogleSubjectPolicyService googleSubjectPolicyService;
    private final StudentRepository studentRepository;
    private final AppProperties appProperties;
    private final EmailNormalizer emailNormalizer;
    private final StudentAccessLoggingFacade studentAccessLoggingFacade;
    private final StudentAuthAuditFacade studentAuthAuditFacade;
    private final AuthLockoutPolicy authLockoutPolicy;
    private final StudentAuthTokenFactory studentAuthTokenFactory;

    public StudentGoogleLoginService(
            GoogleTokenVerifierService googleTokenVerifierService,
            GoogleSubjectPolicyService googleSubjectPolicyService,
            StudentRepository studentRepository,
            AppProperties appProperties,
            EmailNormalizer emailNormalizer,
            StudentAccessLoggingFacade studentAccessLoggingFacade,
            StudentAuthAuditFacade studentAuthAuditFacade,
            AuthLockoutPolicy authLockoutPolicy,
            StudentAuthTokenFactory studentAuthTokenFactory
    ) {
        this.googleTokenVerifierService = googleTokenVerifierService;
        this.googleSubjectPolicyService = googleSubjectPolicyService;
        this.studentRepository = studentRepository;
        this.appProperties = appProperties;
        this.emailNormalizer = emailNormalizer;
        this.studentAccessLoggingFacade = studentAccessLoggingFacade;
        this.studentAuthAuditFacade = studentAuthAuditFacade;
        this.authLockoutPolicy = authLockoutPolicy;
        this.studentAuthTokenFactory = studentAuthTokenFactory;
    }

    public StudentAuthResponse loginWithGoogle(String idToken, HttpServletRequest request) {
        GoogleIdentity identity;
        try {
            identity = googleTokenVerifierService.verify(idToken);
        } catch (BusinessException ex) {
            GoogleVerifierFailureLog failureLog = mapGoogleVerifierFailure(ex);
            studentAccessLoggingFacade.log(
                    request,
                    null,
                    null,
                    null,
                    null,
                    StudentAuthMethod.GOOGLE,
                    failureLog.result(),
                    failureLog.errorCode(),
                    failureLog.errorDetail()
            );
            throw ex;
        }

        String normalizedEmail = emailNormalizer.normalize(identity.email());
        if (!isAllowedDomain(normalizedEmail)) {
            studentAccessLoggingFacade.log(
                    request,
                    null,
                    identity.email(),
                    normalizedEmail,
                    identity.subject(),
                    StudentAuthMethod.GOOGLE,
                    StudentAuthResult.FAILED_INSTITUTIONAL_DOMAIN,
                    "EMAIL_DOMAIN_DENIED",
                    "Dominio institucional inválido."
            );
            throw new BusinessException(ErrorCode.FORBIDDEN, "Correo institucional inválido.");
        }

        Student student = studentRepository.findByInstitutionalEmailNormalized(normalizedEmail).orElse(null);
        if (student == null) {
            studentAccessLoggingFacade.log(
                    request,
                    null,
                    identity.email(),
                    normalizedEmail,
                    identity.subject(),
                    StudentAuthMethod.GOOGLE,
                    StudentAuthResult.FAILED_STUDENT_NOT_FOUND,
                    "STUDENT_NOT_FOUND",
                    "El correo no está registrado."
            );
            throw new BusinessException(ErrorCode.FORBIDDEN, "No autorizado.");
        }

        if (student.getStatus() == StudentStatus.INACTIVE) {
            studentAccessLoggingFacade.log(
                    request,
                    student,
                    identity.email(),
                    normalizedEmail,
                    identity.subject(),
                    StudentAuthMethod.GOOGLE,
                    StudentAuthResult.FAILED_STUDENT_INACTIVE,
                    "STUDENT_INACTIVE",
                    "Estudiante inactivo."
            );
            throw new BusinessException(ErrorCode.FORBIDDEN, "Estudiante inactivo.");
        }

        if (student.getStatus() == StudentStatus.PENDING) {
            student.setMustChangePassword(true);
        }

        if (authLockoutPolicy.isLocked(student.getLockedUntil())) {
            studentAccessLoggingFacade.log(
                    request,
                    student,
                    identity.email(),
                    normalizedEmail,
                    identity.subject(),
                    StudentAuthMethod.GOOGLE,
                    StudentAuthResult.FAILED_ACCOUNT_LOCKED,
                    "ACCOUNT_LOCKED",
                    "Cuenta bloqueada temporalmente."
            );
            studentAuthAuditFacade.auditStudent(request, "STUDENT_GOOGLE_LOGIN_LOCKED", student.getId(), AuditOutcome.FAILURE);
            throw new BusinessException(ErrorCode.UNAUTHORIZED, authLockoutPolicy.lockoutMessage());
        }

        try {
            googleSubjectPolicyService.enforceAndBind(student, identity.subject());
        } catch (BusinessException ex) {
            studentAccessLoggingFacade.log(
                    request,
                    student,
                    identity.email(),
                    normalizedEmail,
                    identity.subject(),
                    StudentAuthMethod.GOOGLE,
                    StudentAuthResult.FAILED_GOOGLE_SUBJECT_MISMATCH,
                    "GOOGLE_SUBJECT_MISMATCH",
                    "Subject de Google no coincide."
            );
            studentAuthAuditFacade.auditSystemForStudent(
                    request,
                    "STUDENT_GOOGLE_SUBJECT_MISMATCH",
                    identity.subject(),
                    student.getId(),
                    AuditSeverity.CRITICAL,
                    Map.of("reason", "google_subject_mismatch")
            );
            throw new BusinessException(ErrorCode.FORBIDDEN, "No autorizado.");
        }

        Instant now = Instant.now();
        student.setLastLoginAt(now);
        student.setLastActivityAt(now);
        if (student.getPasswordHash() == null || student.getPasswordHash().isBlank() || student.getStatus() == StudentStatus.PENDING) {
            student.setMustChangePassword(true);
        }
        studentRepository.save(student);
        studentAccessLoggingFacade.log(
                request,
                student,
                identity.email(),
                normalizedEmail,
                identity.subject(),
                StudentAuthMethod.GOOGLE,
                StudentAuthResult.SUCCESS,
                null,
                null
        );

        return studentAuthTokenFactory.build(student);
    }

    private boolean isAllowedDomain(String normalizedEmail) {
        String suffix = "@" + appProperties.getGoogle().getAllowedDomain().trim().toLowerCase();
        return normalizedEmail.endsWith(suffix);
    }

    private GoogleVerifierFailureLog mapGoogleVerifierFailure(BusinessException ex) {
        return switch (ex.getErrorCode()) {
            case INVALID_TOKEN -> new GoogleVerifierFailureLog(
                    StudentAuthResult.FAILED_INVALID_GOOGLE_TOKEN,
                    "INVALID_GOOGLE_TOKEN",
                    "Google token is invalid or cannot be verified."
            );
            case SERVICE_UNAVAILABLE -> new GoogleVerifierFailureLog(
                    StudentAuthResult.FAILED_GOOGLE_PROVIDER_UNAVAILABLE,
                    "GOOGLE_PROVIDER_UNAVAILABLE",
                    "Google token verification is temporarily unavailable."
            );
            case PROVIDER_ERROR -> new GoogleVerifierFailureLog(
                    StudentAuthResult.FAILED_GOOGLE_PROVIDER_ERROR,
                    "GOOGLE_PROVIDER_ERROR",
                    "Google provider error during token verification."
            );
            default -> new GoogleVerifierFailureLog(
                    StudentAuthResult.FAILED_INTERNAL_ERROR,
                    "GOOGLE_VERIFICATION_UNEXPECTED",
                    "Unexpected failure before extracting Google identity."
            );
        };
    }

    private record GoogleVerifierFailureLog(
            StudentAuthResult result,
            String errorCode,
            String errorDetail
    ) {
    }
}
