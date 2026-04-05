package mx.edu.utez.server.modules.auth.service;

import java.time.Duration;
import java.time.Instant;
import mx.edu.utez.server.config.AppProperties;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

class AuthLockoutPolicyTest {

    @Test
    void shouldReadLockoutValuesFromAppProperties() {
        AppProperties properties = new AppProperties();
        properties.getAuth().getLockout().setMaxFailedAttempts(3);
        properties.getAuth().getLockout().setDurationMinutes(7);
        AuthLockoutPolicy policy = new AuthLockoutPolicy(properties);

        Assertions.assertEquals(3, policy.maxFailedAttempts());
        Assertions.assertEquals(7, policy.durationMinutes());
        Assertions.assertEquals(
                "Cuenta bloqueada temporalmente. Intenta nuevamente en 7 minutos",
                policy.lockoutMessage()
        );

        Instant before = Instant.now();
        Instant lockedUntil = policy.calculateLockedUntil();
        Instant after = Instant.now();
        long minExpected = Duration.between(before, lockedUntil).toMinutes();
        long maxExpected = Duration.between(after, lockedUntil).toMinutes();
        Assertions.assertTrue(minExpected >= 6, "lockout duration should be near configured value");
        Assertions.assertTrue(maxExpected <= 7, "lockout duration should not exceed configured value");
    }
}
