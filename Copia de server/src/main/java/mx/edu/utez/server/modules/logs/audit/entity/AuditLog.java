package mx.edu.utez.server.modules.logs.audit.entity;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.shared.entity.BaseUuidEntity;
import mx.edu.utez.server.shared.enums.AuditActorType;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.AuditSeverity;
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
@Table(name = "audit_logs", indexes = {
        @Index(name = "idx_audit_logs_occurred_at", columnList = "occurred_at"),
        @Index(name = "idx_audit_logs_action", columnList = "action"),
        @Index(name = "idx_audit_logs_entity", columnList = "entity_type,entity_id"),
        @Index(name = "idx_audit_logs_actor_type", columnList = "actor_type"),
        @Index(name = "idx_audit_logs_severity", columnList = "severity")
})
public class AuditLog extends BaseUuidEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "actor_type", nullable = false, length = 20)
    private AuditActorType actorType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_admin_id")
    private Admin actorAdmin;

    @Column(name = "actor_reference", length = 254)
    private String actorReference;

    @Column(name = "action", nullable = false, length = 80)
    private String action;

    @Column(name = "entity_type", nullable = false, length = 40)
    private String entityType;

    @Column(name = "entity_id", length = 36)
    private String entityId;

    @Enumerated(EnumType.STRING)
    @Column(name = "outcome", nullable = false, length = 20)
    private AuditOutcome outcome;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", length = 20)
    private AuditSeverity severity;

    @Column(name = "metadata_json", columnDefinition = "json")
    private String metadataJson;

    @Column(name = "request_id", nullable = false, length = 80)
    private String requestId;

    @Column(name = "correlation_id", nullable = false, length = 80)
    private String correlationId;

    @Column(name = "ip_address", nullable = false, length = 60)
    private String ipAddress;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt = Instant.now();

    public AuditActorType getActorType() {
        return actorType;
    }

    public void setActorType(AuditActorType actorType) {
        this.actorType = actorType;
    }

    public Admin getActorAdmin() {
        return actorAdmin;
    }

    public void setActorAdmin(Admin actorAdmin) {
        this.actorAdmin = actorAdmin;
    }

    public String getActorReference() {
        return actorReference;
    }

    public void setActorReference(String actorReference) {
        this.actorReference = actorReference;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getEntityType() {
        return entityType;
    }

    public void setEntityType(String entityType) {
        this.entityType = entityType;
    }

    public String getEntityId() {
        return entityId;
    }

    public void setEntityId(String entityId) {
        this.entityId = entityId;
    }

    public AuditOutcome getOutcome() {
        return outcome;
    }

    public void setOutcome(AuditOutcome outcome) {
        this.outcome = outcome;
    }

    public AuditSeverity getSeverity() {
        return severity;
    }

    public void setSeverity(AuditSeverity severity) {
        this.severity = severity;
    }

    public String getMetadataJson() {
        return metadataJson;
    }

    public void setMetadataJson(String metadataJson) {
        this.metadataJson = metadataJson;
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

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public void setOccurredAt(Instant occurredAt) {
        this.occurredAt = occurredAt;
    }
}
