package mx.edu.utez.server.modules.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.shared.entity.BaseUuidEntity;
import mx.edu.utez.server.shared.enums.AdminAuthResult;

@Entity
@Table(name = "admin_auth_events", indexes = {
        @Index(name = "idx_admin_auth_events_occurred_at", columnList = "occurred_at"),
        @Index(name = "idx_admin_auth_events_admin_id", columnList = "admin_id"),
        @Index(name = "idx_admin_auth_events_result", columnList = "result"),
        @Index(name = "idx_admin_auth_events_norm_email", columnList = "normalized_email"),
        @Index(name = "idx_admin_auth_events_request_id", columnList = "request_id")
})
public class AdminAuthEvent extends BaseUuidEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id")
    private Admin admin;

    @Column(name = "attempted_email", length = 254)
    private String attemptedEmail;

    @Column(name = "normalized_email", length = 254)
    private String normalizedEmail;

    @Enumerated(EnumType.STRING)
    @Column(name = "result", nullable = false, length = 50)
    private AdminAuthResult result;

    @Column(name = "error_code", length = 60)
    private String errorCode;

    @Column(name = "error_detail", length = 500)
    private String errorDetail;

    @Column(name = "request_id", nullable = false, length = 80)
    private String requestId;

    @Column(name = "correlation_id", nullable = false, length = 80)
    private String correlationId;

    @Column(name = "session_id", length = 128)
    private String sessionId;

    @Column(name = "ip_address_masked", length = 60)
    private String ipAddressMasked;

    @Column(name = "ip_address_hash", length = 64)
    private String ipAddressHash;

    @Column(name = "user_agent_sanitized", length = 255)
    private String userAgentSanitized;

    @Column(name = "origin", length = 254)
    private String origin;

    @Column(name = "referer", length = 512)
    private String referer;

    @Column(name = "http_method", length = 10)
    private String httpMethod;

    @Column(name = "request_path", length = 512)
    private String requestPath;

    @Column(name = "metadata_json", columnDefinition = "json")
    private String metadataJson;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt = Instant.now();

    public Admin getAdmin() {
        return admin;
    }

    public void setAdmin(Admin admin) {
        this.admin = admin;
    }

    public String getAttemptedEmail() {
        return attemptedEmail;
    }

    public void setAttemptedEmail(String attemptedEmail) {
        this.attemptedEmail = attemptedEmail;
    }

    public String getNormalizedEmail() {
        return normalizedEmail;
    }

    public void setNormalizedEmail(String normalizedEmail) {
        this.normalizedEmail = normalizedEmail;
    }

    public AdminAuthResult getResult() {
        return result;
    }

    public void setResult(AdminAuthResult result) {
        this.result = result;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public void setErrorCode(String errorCode) {
        this.errorCode = errorCode;
    }

    public String getErrorDetail() {
        return errorDetail;
    }

    public void setErrorDetail(String errorDetail) {
        this.errorDetail = errorDetail;
    }

    public String getRequestId() {
        return requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }

    public String getCorrelationId() {
        return correlationId;
    }

    public void setCorrelationId(String correlationId) {
        this.correlationId = correlationId;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getIpAddressMasked() {
        return ipAddressMasked;
    }

    public void setIpAddressMasked(String ipAddressMasked) {
        this.ipAddressMasked = ipAddressMasked;
    }

    public String getIpAddressHash() {
        return ipAddressHash;
    }

    public void setIpAddressHash(String ipAddressHash) {
        this.ipAddressHash = ipAddressHash;
    }

    public String getUserAgentSanitized() {
        return userAgentSanitized;
    }

    public void setUserAgentSanitized(String userAgentSanitized) {
        this.userAgentSanitized = userAgentSanitized;
    }

    public String getOrigin() {
        return origin;
    }

    public void setOrigin(String origin) {
        this.origin = origin;
    }

    public String getReferer() {
        return referer;
    }

    public void setReferer(String referer) {
        this.referer = referer;
    }

    public String getHttpMethod() {
        return httpMethod;
    }

    public void setHttpMethod(String httpMethod) {
        this.httpMethod = httpMethod;
    }

    public String getRequestPath() {
        return requestPath;
    }

    public void setRequestPath(String requestPath) {
        this.requestPath = requestPath;
    }

    public String getMetadataJson() {
        return metadataJson;
    }

    public void setMetadataJson(String metadataJson) {
        this.metadataJson = metadataJson;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public void setOccurredAt(Instant occurredAt) {
        this.occurredAt = occurredAt;
    }
}
