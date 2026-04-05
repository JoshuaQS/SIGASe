package mx.edu.utez.server.modules.logs.access.entity;

import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.shared.entity.BaseUuidEntity;
import mx.edu.utez.server.shared.enums.AccessResult;
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
@Table(name = "access_logs", indexes = {
        @Index(name = "idx_access_logs_occurred_at", columnList = "occurred_at"),
        @Index(name = "idx_access_logs_result", columnList = "result"),
        @Index(name = "idx_access_logs_norm_email", columnList = "normalized_email"),
        @Index(name = "idx_access_logs_request_id", columnList = "request_id"),
        @Index(name = "idx_access_logs_provider_name", columnList = "provider_name")
})
public class AccessLog extends BaseUuidEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id")
    private Student student;

    @Column(name = "attempted_email", length = 254)
    private String attemptedEmail;

    @Column(name = "normalized_email", length = 254)
    private String normalizedEmail;

    @Enumerated(EnumType.STRING)
    @Column(name = "result", nullable = false, length = 40)
    private AccessResult result;

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

    @Column(name = "ip_address", nullable = false, length = 60)
    private String ipAddress;

    @Column(name = "user_agent", length = 255)
    private String userAgent;

    @Column(name = "provider_name", length = 40)
    private String providerName;

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

    public AccessResult getResult() {
        return result;
    }

    public void setResult(AccessResult result) {
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

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public void setUserAgent(String userAgent) {
        this.userAgent = userAgent;
    }

    public String getNextUrl() {
        return nextUrl;
    }

    public void setNextUrl(String nextUrl) {
        this.nextUrl = nextUrl;
    }

    public String getProviderName() {
        return providerName;
    }

    public void setProviderName(String providerName) {
        this.providerName = providerName;
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
