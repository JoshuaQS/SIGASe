package mx.edu.utez.server.modules.auth.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import mx.edu.utez.server.config.AppProperties;
import org.springframework.stereotype.Component;

@Component
public class AuthLockoutPolicy {

    private final AppProperties appProperties;

    public AuthLockoutPolicy(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    public int maxFailedAttempts() {
        return Math.max(1, appProperties.getAuth().getLockout().getMaxFailedAttempts());
    }

    public long durationMinutes() {
        return Math.max(1, appProperties.getAuth().getLockout().getDurationMinutes());
    }

    public Instant calculateLockedUntil() {
        return Instant.now().plus(durationMinutes(), ChronoUnit.MINUTES);
    }

    public boolean isLocked(Instant lockedUntil) {
        return lockedUntil != null && Instant.now().isBefore(lockedUntil);
    }

    public String lockoutMessage() {
        return "Cuenta bloqueada temporalmente. Intenta nuevamente en " + durationMinutes() + " minutos";
    }
}
