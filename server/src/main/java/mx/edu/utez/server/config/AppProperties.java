package mx.edu.utez.server.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

@Component
@Validated
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private final Jwt jwt = new Jwt();
    private final Security security = new Security();
    private final Elibro elibro = new Elibro();
    private final Google google = new Google();
    private final Seed seed = new Seed();

    public Jwt getJwt() {
        return jwt;
    }

    public Security getSecurity() {
        return security;
    }

    public Elibro getElibro() {
        return elibro;
    }

    public Google getGoogle() {
        return google;
    }

    public Seed getSeed() {
        return seed;
    }

    public static class Jwt {
        @NotBlank
        private String secret;
        @NotBlank
        private String issuer;
        private long adminExpirationSeconds = 1800;
        private long studentExpirationSeconds = 900;

        public String getSecret() {
            return secret;
        }

        public void setSecret(String secret) {
            this.secret = secret;
        }

        public String getIssuer() {
            return issuer;
        }

        public void setIssuer(String issuer) {
            this.issuer = issuer;
        }

        public long getAdminExpirationSeconds() {
            return adminExpirationSeconds;
        }

        public void setAdminExpirationSeconds(long adminExpirationSeconds) {
            this.adminExpirationSeconds = adminExpirationSeconds;
        }

        public long getStudentExpirationSeconds() {
            return studentExpirationSeconds;
        }

        public void setStudentExpirationSeconds(long studentExpirationSeconds) {
            this.studentExpirationSeconds = studentExpirationSeconds;
        }
    }

    public static class Security {
        private String allowedOrigins = "http://localhost:5173,http://localhost:18080";

        public String getAllowedOrigins() {
            return allowedOrigins;
        }

        public void setAllowedOrigins(String allowedOrigins) {
            this.allowedOrigins = allowedOrigins;
        }
    }

    public static class Elibro {
        @NotBlank
        private String baseUrl;
        @NotBlank
        private String encryptionKey;
        @NotEmpty
        private List<String> allowedNextHosts = new ArrayList<>();

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public String getEncryptionKey() {
            return encryptionKey;
        }

        public void setEncryptionKey(String encryptionKey) {
            this.encryptionKey = encryptionKey;
        }

        public List<String> getAllowedNextHosts() {
            return allowedNextHosts;
        }

        public void setAllowedNextHosts(List<String> allowedNextHosts) {
            this.allowedNextHosts = allowedNextHosts;
        }
    }

    public static class Google {
        @NotBlank
        private String allowedDomain;
        @NotEmpty
        private List<String> audience = new ArrayList<>();

        public String getAllowedDomain() {
            return allowedDomain;
        }

        public void setAllowedDomain(String allowedDomain) {
            this.allowedDomain = allowedDomain;
        }

        public List<String> getAudience() {
            return audience;
        }

        public void setAudience(List<String> audience) {
            this.audience = audience;
        }
    }

    public static class Seed {
        private String adminEmail = "";
        private String adminPassword = "";
        private String adminFullName = "Administrador TI";
        private String adminBibliotecaEmail = "";
        private String adminBibliotecaPassword = "";
        private String adminBibliotecaFullName = "Administrador Biblioteca";

        public String getAdminEmail() {
            return adminEmail;
        }

        public void setAdminEmail(String adminEmail) {
            this.adminEmail = adminEmail;
        }

        public String getAdminPassword() {
            return adminPassword;
        }

        public void setAdminPassword(String adminPassword) {
            this.adminPassword = adminPassword;
        }

        public String getAdminFullName() {
            return adminFullName;
        }

        public void setAdminFullName(String adminFullName) {
            this.adminFullName = adminFullName;
        }

        public String getAdminBibliotecaEmail() {
            return adminBibliotecaEmail;
        }

        public void setAdminBibliotecaEmail(String adminBibliotecaEmail) {
            this.adminBibliotecaEmail = adminBibliotecaEmail;
        }

        public String getAdminBibliotecaPassword() {
            return adminBibliotecaPassword;
        }

        public void setAdminBibliotecaPassword(String adminBibliotecaPassword) {
            this.adminBibliotecaPassword = adminBibliotecaPassword;
        }

        public String getAdminBibliotecaFullName() {
            return adminBibliotecaFullName;
        }

        public void setAdminBibliotecaFullName(String adminBibliotecaFullName) {
            this.adminBibliotecaFullName = adminBibliotecaFullName;
        }
    }
}
