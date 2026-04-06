package mx.edu.utez.server.modules.logs.audit.entity;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.shared.entity.BaseUuidEntity;
import mx.edu.utez.server.shared.enums.AuditActorType;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.AuditSeverity;
import mx.edu.utez.server.shared.enums.AuditSourceModule;
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
        @Index(name = "idx_audit_logs_severity", columnList = "severity"),
        @Index(name = "idx_audit_logs_source_module", columnList = "source_module"),
        @Index(name = "idx_audit_logs_outcome", columnList = "outcome")
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
    @Column(name = "severity", nullable = false, length = 20)
    private AuditSeverity severity;

    @Column(name = "metadata_json", columnDefinition = "json")
    private String metadataJson;

    @Column(name = "request_id", nullable = false, length = 80)
    private String requestId;

    @Column(name = "correlation_id", nullable = false, length = 80)
    private String correlationId;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt = Instant.now();

    // ── Extended fields ──────────────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(name = "source_module", nullable = false, length = 20)
    private AuditSourceModule sourceModule = AuditSourceModule.SYSTEM;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "entity_snapshot_name", length = 160)
    private String entitySnapshotName;

    @Column(name = "target_label", length = 254)
    private String targetLabel;

    @Column(name = "http_method", length = 10)
    private String httpMethod;

    @Column(name = "endpoint", length = 512)
    private String endpoint;

    @Column(name = "route_pattern", length = 256)
    private String routePattern;

    @Column(name = "status_code")
    private Integer statusCode;

    @Column(name = "origin", length = 254)
    private String origin;

    @Column(name = "session_id", length = 128)
    private String sessionId;

    @Column(name = "ip_address_masked", length = 60)
    private String ipAddressMasked;

    @Column(name = "ip_address_hash", length = 64)
    private String ipAddressHash;

    @Column(name = "user_agent_sanitized", length = 300)
    private String userAgentSanitized;

    @Column(name = "changed_fields_json", columnDefinition = "json")
    private String changedFieldsJson;

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

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public void setOccurredAt(Instant occurredAt) {
        this.occurredAt = occurredAt;
    }

    public AuditSourceModule getSourceModule() {
        return sourceModule;
    }

    public void setSourceModule(AuditSourceModule sourceModule) {
        this.sourceModule = sourceModule;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getEntitySnapshotName() {
        return entitySnapshotName;
    }

    public void setEntitySnapshotName(String entitySnapshotName) {
        this.entitySnapshotName = entitySnapshotName;
    }

    public String getTargetLabel() {
        return targetLabel;
    }

    public void setTargetLabel(String targetLabel) {
        this.targetLabel = targetLabel;
    }

    public String getHttpMethod() {
        return httpMethod;
    }

    public void setHttpMethod(String httpMethod) {
        this.httpMethod = httpMethod;
    }

    public String getEndpoint() {
        return endpoint;
    }

    public void setEndpoint(String endpoint) {
        this.endpoint = endpoint;
    }

    public String getRoutePattern() {
        return routePattern;
    }

    public void setRoutePattern(String routePattern) {
        this.routePattern = routePattern;
    }

    public Integer getStatusCode() {
        return statusCode;
    }

    public void setStatusCode(Integer statusCode) {
        this.statusCode = statusCode;
    }

    public String getOrigin() {
        return origin;
    }

    public void setOrigin(String origin) {
        this.origin = origin;
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

    public String getChangedFieldsJson() {
        return changedFieldsJson;
    }

    public void setChangedFieldsJson(String changedFieldsJson) {
        this.changedFieldsJson = changedFieldsJson;
    }
}
