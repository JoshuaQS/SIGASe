package mx.edu.utez.server.modules.elibro.entity;

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
import mx.edu.utez.server.shared.enums.ElibroValidationRunStatus;
import mx.edu.utez.server.shared.enums.ElibroValidationType;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Table(name = "elibro_validation_runs", indexes = {
        @Index(name = "idx_elibro_validation_runs_checked_at", columnList = "checked_at"),
        @Index(name = "idx_elibro_validation_runs_config_checked_at", columnList = "config_id,checked_at"),
        @Index(name = "idx_elibro_validation_runs_type_checked_at", columnList = "validation_type,checked_at"),
        @Index(name = "idx_elibro_validation_runs_status_checked_at", columnList = "status,checked_at")
})
public class ElibroValidationRun extends BaseUuidEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "config_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private ElibroConfig config;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "executed_by_admin_id")
    private Admin executedByAdmin;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ElibroValidationRunStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "validation_type", nullable = false, length = 20)
    private ElibroValidationType validationType;

    @Column(name = "message", length = 500)
    private String message;

    @Column(name = "latency_ms")
    private Long latencyMs;

    @Column(name = "error_code", length = 80)
    private String errorCode;

    @Column(name = "endpoint_tested", length = 512)
    private String endpointTested;

    @Column(name = "request_id", nullable = false, length = 80)
    private String requestId;

    @Column(name = "correlation_id", nullable = false, length = 80)
    private String correlationId;

    @Column(name = "checked_at", nullable = false)
    private Instant checkedAt = Instant.now();

    public ElibroConfig getConfig() {
        return config;
    }

    public void setConfig(ElibroConfig config) {
        this.config = config;
    }

    public Admin getExecutedByAdmin() {
        return executedByAdmin;
    }

    public void setExecutedByAdmin(Admin executedByAdmin) {
        this.executedByAdmin = executedByAdmin;
    }

    public ElibroValidationRunStatus getStatus() {
        return status;
    }

    public void setStatus(ElibroValidationRunStatus status) {
        this.status = status;
    }

    public ElibroValidationType getValidationType() {
        return validationType;
    }

    public void setValidationType(ElibroValidationType validationType) {
        this.validationType = validationType;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Long getLatencyMs() {
        return latencyMs;
    }

    public void setLatencyMs(Long latencyMs) {
        this.latencyMs = latencyMs;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public void setErrorCode(String errorCode) {
        this.errorCode = errorCode;
    }

    public String getEndpointTested() {
        return endpointTested;
    }

    public void setEndpointTested(String endpointTested) {
        this.endpointTested = endpointTested;
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

    public Instant getCheckedAt() {
        return checkedAt;
    }

    public void setCheckedAt(Instant checkedAt) {
        this.checkedAt = checkedAt;
    }
}
