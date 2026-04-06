package mx.edu.utez.server.modules.elibro.entity;

import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.shared.entity.BaseUuidEntity;
import mx.edu.utez.server.shared.enums.ElibroAccessResult;
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

@Entity
@Table(name = "elibro_access_logs", indexes = {
        @Index(name = "idx_elibro_access_logs_occurred_at", columnList = "occurred_at"),
        @Index(name = "idx_elibro_access_logs_student_id", columnList = "student_id"),
        @Index(name = "idx_elibro_access_logs_result", columnList = "result"),
        @Index(name = "idx_elibro_access_logs_norm_email", columnList = "normalized_email"),
        @Index(name = "idx_elibro_access_logs_request_id", columnList = "request_id")
})
public class ElibroAccessLog extends BaseUuidEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id")
    private Student student;

    @Column(name = "attempted_email", length = 254)
    private String attemptedEmail;

    @Column(name = "normalized_email", length = 254)
    private String normalizedEmail;

    @Enumerated(EnumType.STRING)
    @Column(name = "result", nullable = false, length = 50)
    private ElibroAccessResult result;

    @Column(name = "error_code", length = 60)
    private String errorCode;

    @Column(name = "error_detail", length = 500)
    private String errorDetail;

    @Column(name = "latency_ms", nullable = false)
    private Long latencyMs = 0L;

    @Column(name = "request_id", nullable = false, length = 80)
    private String requestId;

    @Column(name = "correlation_id", nullable = false, length = 80)
    private String correlationId;

    @Column(name = "ip_address_masked", length = 60)
    private String ipAddressMasked;

    @Column(name = "ip_address_hash", length = 64)
    private String ipAddressHash;

    @Column(name = "user_agent_sanitized", length = 255)
    private String userAgentSanitized;

    @Column(name = "session_id", length = 128)
    private String sessionId;

    @Column(name = "origin", length = 254)
    private String origin;

    @Column(name = "referer", length = 512)
    private String referer;

    @Column(name = "http_method", length = 10)
    private String httpMethod;

    @Column(name = "request_path", length = 512)
    private String requestPath;

    @Column(name = "channel_name_snapshot", length = 120)
    private String channelNameSnapshot;

    @Column(name = "provider_status_code")
    private Integer providerStatusCode;

    @Column(name = "provider_error_code", length = 60)
    private String providerErrorCode;

    @Column(name = "provider_error_message", length = 500)
    private String providerErrorMessage;

    @Column(name = "metadata_json", columnDefinition = "json")
    private String metadataJson;

    @Column(name = "next_url", length = 1000)
    private String nextUrl;

    @Column(name = "redirect_url", length = 1000)
    private String redirectUrl;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt = Instant.now();

    public Student getStudent() {
        return student;
    }

    public void setStudent(Student student) {
        this.student = student;
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

    public ElibroAccessResult getResult() {
        return result;
    }

    public void setResult(ElibroAccessResult result) {
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

    public Long getLatencyMs() {
        return latencyMs;
    }

    public void setLatencyMs(Long latencyMs) {
        this.latencyMs = latencyMs;
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

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
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

    public String getChannelNameSnapshot() {
        return channelNameSnapshot;
    }

    public void setChannelNameSnapshot(String channelNameSnapshot) {
        this.channelNameSnapshot = channelNameSnapshot;
    }

    public Integer getProviderStatusCode() {
        return providerStatusCode;
    }

    public void setProviderStatusCode(Integer providerStatusCode) {
        this.providerStatusCode = providerStatusCode;
    }

    public String getProviderErrorCode() {
        return providerErrorCode;
    }

    public void setProviderErrorCode(String providerErrorCode) {
        this.providerErrorCode = providerErrorCode;
    }

    public String getProviderErrorMessage() {
        return providerErrorMessage;
    }

    public void setProviderErrorMessage(String providerErrorMessage) {
        this.providerErrorMessage = providerErrorMessage;
    }

    public String getMetadataJson() {
        return metadataJson;
    }

    public void setMetadataJson(String metadataJson) {
        this.metadataJson = metadataJson;
    }

    public String getNextUrl() {
        return nextUrl;
    }

    public void setNextUrl(String nextUrl) {
        this.nextUrl = nextUrl;
    }

    public String getRedirectUrl() {
        return redirectUrl;
    }

    public void setRedirectUrl(String redirectUrl) {
        this.redirectUrl = redirectUrl;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public void setOccurredAt(Instant occurredAt) {
        this.occurredAt = occurredAt;
    }
}
