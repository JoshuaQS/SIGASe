package mx.edu.utez.server.security;

import java.time.Duration;
import java.time.Instant;
import mx.edu.utez.server.config.AppProperties;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SessionIdleTimeoutService {

    private final AdminRepository adminRepository;
    private final StudentRepository studentRepository;
    private final AppProperties appProperties;

    public SessionIdleTimeoutService(
            AdminRepository adminRepository,
            StudentRepository studentRepository,
            AppProperties appProperties
    ) {
        this.adminRepository = adminRepository;
        this.studentRepository = studentRepository;
        this.appProperties = appProperties;
    }

    @Transactional
    public void assertNotIdleAndTouch(ParsedToken parsedToken) {
        long idleTimeoutSeconds = appProperties.getAuth().getIdleTimeoutSeconds();
        long touchIntervalSeconds = appProperties.getAuth().getIdleTouchIntervalSeconds();

        if (idleTimeoutSeconds <= 0) {
            // Idle timeout disabled (still keep JWT exp enforcement).
            return;
        }

        Instant now = Instant.now();
        // No usar Optional.map(getLastActivityAt): si lastActivityAt es null, map descarta el valor y parece "vacío".
        Instant lastActivity = switch (parsedToken.tokenType()) {
            case ADMIN -> {
                Admin admin = adminRepository.findById(parsedToken.userId())
                        .orElseThrow(() -> new InvalidJwtAuthenticationException("Sesión inválida (usuario no encontrado)."));
                yield admin.getLastActivityAt();
            }
            case STUDENT -> {
                Student student = studentRepository.findById(parsedToken.userId())
                        .orElseThrow(() -> new InvalidJwtAuthenticationException("Sesión inválida (usuario no encontrado)."));
                yield student.getLastActivityAt();
            }
        };

        if (lastActivity == null) {
            // Primera actividad registrada: inicializa y permite continuar.
            switch (parsedToken.tokenType()) {
                case ADMIN -> adminRepository.updateLastActivityAt(parsedToken.userId(), now);
                case STUDENT -> studentRepository.updateLastActivityAt(parsedToken.userId(), now);
            }
            return;
        }

        long idleSeconds = Duration.between(lastActivity, now).getSeconds();
        if (idleSeconds > idleTimeoutSeconds) {
            throw new SessionExpiredAuthenticationException("Sesión expirada por inactividad.", null);
        }

        if (touchIntervalSeconds > 0) {
            long sinceLastTouchSeconds = Duration.between(lastActivity, now).getSeconds();
            if (sinceLastTouchSeconds < touchIntervalSeconds) {
                return;
            }
        }

        switch (parsedToken.tokenType()) {
            case ADMIN -> adminRepository.updateLastActivityAt(parsedToken.userId(), now);
            case STUDENT -> studentRepository.updateLastActivityAt(parsedToken.userId(), now);
        }
    }
}

