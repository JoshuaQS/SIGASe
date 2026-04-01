package mx.edu.utez.server.security;

import mx.edu.utez.server.config.AppProperties;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import mx.edu.utez.server.security.*;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;
    private byte[] keyBytes;

    @BeforeEach
    void setUp() throws Exception {
        AppProperties appProperties = new AppProperties();
        appProperties.getJwt().setSecret("unit-test-secret-should-be-long-enough-1234567890");
        appProperties.getJwt().setIssuer("test-suite");
        appProperties.getJwt().setAdminExpirationSeconds(1800);
        appProperties.getJwt().setStudentExpirationSeconds(900);
        jwtTokenProvider = new JwtTokenProvider(appProperties);
        keyBytes = MessageDigest.getInstance("SHA-256")
                .digest(appProperties.getJwt().getSecret().getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void shouldThrowSessionExpiredWhenTokenIsExpired() {
        String expiredToken = Jwts.builder()
                .subject(UUID.randomUUID().toString())
                .issuer("test-suite")
                .issuedAt(Date.from(Instant.now().minusSeconds(3600)))
                .expiration(Date.from(Instant.now().minusSeconds(60)))
                .claim("role", RoleConstants.ADMIN_TI)
                .claim("tokenType", JwtTokenType.ADMIN.name())
                .signWith(Keys.hmacShaKeyFor(keyBytes))
                .compact();

        Assertions.assertThrows(
                SessionExpiredAuthenticationException.class,
                () -> jwtTokenProvider.validateAndParse(expiredToken)
        );
    }

    @Test
    void shouldThrowInvalidTokenWhenMalformed() {
        Assertions.assertThrows(
                InvalidJwtAuthenticationException.class,
                () -> jwtTokenProvider.validateAndParse("invalid-token")
        );
    }
}
