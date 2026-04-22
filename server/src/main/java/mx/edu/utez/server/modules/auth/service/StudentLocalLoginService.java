package mx.edu.utez.server.modules.auth.service;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.UUID;
import mx.edu.utez.server.modules.auth.dto.StudentAuthResponse;
import mx.edu.utez.server.modules.auth.dto.StudentLoginRequest;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.StudentAuthMethod;
import mx.edu.utez.server.shared.enums.StudentAuthResult;
import mx.edu.utez.server.shared.enums.StudentStatus;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import mx.edu.utez.server.shared.util.EmailNormalizer;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class StudentLocalLoginService {

    private final StudentRepository studentRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailNormalizer emailNormalizer;
    private final AuthLockoutPolicy authLockoutPolicy;
    private final StudentAccessLoggingFacade studentAccessLoggingFacade;
    private final StudentAuthAuditFacade studentAuthAuditFacade;
    private final StudentAuthTokenFactory studentAuthTokenFactory;

    public StudentLocalLoginService(
            StudentRepository studentRepository,
            PasswordEncoder passwordEncoder,
            EmailNormalizer emailNormalizer,
            AuthLockoutPolicy authLockoutPolicy,
            StudentAccessLoggingFacade studentAccessLoggingFacade,
            StudentAuthAuditFacade studentAuthAuditFacade,
            StudentAuthTokenFactory studentAuthTokenFactory
    ) {
        this.studentRepository = studentRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailNormalizer = emailNormalizer;
        this.authLockoutPolicy = authLockoutPolicy;
        this.studentAccessLoggingFacade = studentAccessLoggingFacade;
        this.studentAuthAuditFacade = studentAuthAuditFacade;
        this.studentAuthTokenFactory = studentAuthTokenFactory;
    }

    public StudentAuthResponse login(StudentLoginRequest req, HttpServletRequest request) {
        String normalizedEmail = emailNormalizer.normalize(req.email());
        Student student = studentRepository.findByInstitutionalEmail(normalizedEmail).orElse(null);
        if (student == null) {
            studentAccessLoggingFacade.log(
                    request,
                    null,
                    req.email(),
                    normalizedEmail,
                    null,
                    StudentAuthMethod.LOCAL,
                    StudentAuthResult.FAILED_INVALID_CREDENTIALS,
                    "INVALID_CREDENTIALS",
                    "Credenciales inválidas"
            );
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Credenciales inválidas");
        }

        UUID studentId = student.getId();
        if (authLockoutPolicy.isLocked(student.getLockedUntil())) {
            studentAccessLoggingFacade.log(
                    request,
                    student,
                    req.email(),
                    normalizedEmail,
                    null,
                    StudentAuthMethod.LOCAL,
                    StudentAuthResult.FAILED_ACCOUNT_LOCKED,
                    "ACCOUNT_LOCKED",
                    "Cuenta bloqueada temporalmente."
            );
            studentAuthAuditFacade.auditStudent(request, "STUDENT_LOGIN_LOCKED", studentId, AuditOutcome.FAILURE);
            throw new BusinessException(ErrorCode.UNAUTHORIZED, authLockoutPolicy.lockoutMessage());
        }

        if (student.getStatus() != StudentStatus.ACTIVE) {
            studentAccessLoggingFacade.log(
                    request,
                    student,
                    req.email(),
                    normalizedEmail,
                    null,
                    StudentAuthMethod.LOCAL,
                    StudentAuthResult.FAILED_STUDENT_INACTIVE,
                    "STUDENT_INACTIVE",
                    "Estudiante inactivo"
            );
            studentAuthAuditFacade.auditStudent(request, "STUDENT_LOGIN_INACTIVE", studentId, AuditOutcome.FAILURE);
            throw new BusinessException(ErrorCode.FORBIDDEN, "Estudiante inactivo");
        }

        if (student.getPasswordHash() == null
                || !passwordEncoder.matches(req.password(), student.getPasswordHash())) {
            boolean lockedByAttempt = handleFailedAttempt(student);
            studentAccessLoggingFacade.log(
                    request,
                    student,
                    req.email(),
                    normalizedEmail,
                    null,
                    StudentAuthMethod.LOCAL,
                    lockedByAttempt ? StudentAuthResult.FAILED_ACCOUNT_LOCKED : StudentAuthResult.FAILED_INVALID_CREDENTIALS,
                    lockedByAttempt ? "ACCOUNT_LOCKED" : "INVALID_CREDENTIALS",
                    lockedByAttempt ? "Cuenta bloqueada tras exceder intentos." : "Credenciales inválidas"
            );
            studentAuthAuditFacade.auditStudent(request, "STUDENT_LOGIN_FAILURE", studentId, AuditOutcome.FAILURE);
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Credenciales inválidas");
        }

        student.setFailedLoginAttempts(0);
        student.setLockedUntil(null);
        Instant now = Instant.now();
        student.setLastLoginAt(now);
        student.setLastActivityAt(now);
        studentRepository.save(student);

        studentAccessLoggingFacade.log(
                request,
                student,
                req.email(),
                normalizedEmail,
                null,
                StudentAuthMethod.LOCAL,
                StudentAuthResult.SUCCESS,
                null,
                null
        );
        studentAuthAuditFacade.auditStudent(request, "STUDENT_LOGIN_SUCCESS", studentId, AuditOutcome.SUCCESS);
        return studentAuthTokenFactory.build(student);
    }

    private boolean handleFailedAttempt(Student student) {
        int attempts = student.getFailedLoginAttempts() + 1;
        student.setFailedLoginAttempts(attempts);
        boolean locked = false;
        if (attempts >= authLockoutPolicy.maxFailedAttempts()) {
            student.setLockedUntil(authLockoutPolicy.calculateLockedUntil());
            student.setFailedLoginAttempts(0);
            locked = true;
        }
        studentRepository.save(student);
        return locked;
    }
}
