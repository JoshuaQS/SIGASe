package mx.edu.utez.server.security;

import mx.edu.utez.server.config.AppProperties;
import mx.edu.utez.server.modules.students.entity.Student;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Component;

@Component
public class JwtTokenProvider {

    private final SecretKey signingKey;
    private final AppProperties appProperties;

    public JwtTokenProvider(AppProperties appProperties) {
        this.appProperties = appProperties;
        this.signingKey = Keys.hmacShaKeyFor(sha256(appProperties.getJwt().getSecret()));
    }

    public String generateToken(UUID userId, String role, JwtTokenType tokenType) {
        return generateToken(userId, role, tokenType, false, 0);
    }

    public String generateToken(UUID userId, String role, JwtTokenType tokenType, int tokenVersion) {
        return generateToken(userId, role, tokenType, false, tokenVersion);
    }

    public String generateToken(UUID userId, String role, JwtTokenType tokenType, boolean mustChangePassword) {
        return generateToken(userId, role, tokenType, mustChangePassword, 0);
    }

    public String generateToken(
            UUID userId,
            String role,
            JwtTokenType tokenType,
            boolean mustChangePassword,
            int tokenVersion
    ) {
        Instant now = Instant.now();
        long expirationSeconds = tokenType == JwtTokenType.ADMIN
                ? appProperties.getJwt().getAdminExpirationSeconds()
                : appProperties.getJwt().getStudentExpirationSeconds();
        Instant expiration = now.plusSeconds(expirationSeconds);

        return Jwts.builder()
                .subject(userId.toString())
                .issuer(appProperties.getJwt().getIssuer())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiration))
                .claim("role", role)
                .claim("tokenType", tokenType.name())
                .claim("mustChangePassword", mustChangePassword)
                .claim("tokenVersion", tokenVersion)
                .signWith(signingKey)
                .compact();
    }

    /**
     * JWT de acceso para login local de estudiante (misma base que {@link #generateToken} más bandera de cambio de contraseña).
     */
    public String generateStudentToken(Student student) {
        return generateToken(
                student.getId(),
                RoleConstants.STUDENT,
                JwtTokenType.STUDENT,
                student.isMustChangePassword(),
                student.getTokenVersion()
        );
    }

    public ParsedToken validateAndParse(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            UUID userId = UUID.fromString(claims.getSubject());
            String role = claims.get("role", String.class);
            String tokenType = claims.get("tokenType", String.class);
            Boolean mustChange = claims.get("mustChangePassword", Boolean.class);
            Integer tokenVersion = claims.get("tokenVersion", Integer.class);
            return new ParsedToken(
                    userId,
                    role,
                    JwtTokenType.valueOf(tokenType),
                    Boolean.TRUE.equals(mustChange),
                    tokenVersion != null ? tokenVersion : 0
            );
        } catch (ExpiredJwtException ex) {
            throw new SessionExpiredAuthenticationException("Sesión expirada.", ex);
        } catch (MalformedJwtException | SignatureException | UnsupportedJwtException | IllegalArgumentException ex) {
            throw new InvalidJwtAuthenticationException("Token inválido.", ex);
        }
    }

    private byte[] sha256(String secret) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.UTF_8));
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudo inicializar la llave JWT.", ex);
        }
    }
}
