package mx.edu.utez.server.modules.elibro.entity;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.shared.entity.BaseAuditableEntity;
import mx.edu.utez.server.shared.enums.ElibroValidationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "elibro_configs")
public class ElibroConfig extends BaseAuditableEntity {

    @Column(name = "name", nullable = false, length = 160)
    private String name;

    @Column(name = "auth_token_encrypted", nullable = false, length = 1024)
    private String authTokenEncrypted;

    @Column(name = "channel_id_encrypted", nullable = false, length = 1024)
    private String channelIdEncrypted;

    @Column(name = "channel_secret_encrypted", nullable = false, length = 1024)
    private String channelSecretEncrypted;

    @Column(name = "channel_name", nullable = false, length = 120)
    private String channelName;

    @Column(name = "auth_endpoint", nullable = false, length = 512)
    private String authEndpoint;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "validation_status", nullable = false, length = 20)
    private ElibroValidationStatus validationStatus = ElibroValidationStatus.NOT_VALIDATED;

    @Column(name = "validation_message", length = 500)
    private String validationMessage;

    @Column(name = "last_validated_at")
    private Instant lastValidatedAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_admin_id", nullable = false)
    private Admin createdByAdmin;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "updated_by_admin_id", nullable = false)
    private Admin updatedByAdmin;

    public String getAuthTokenEncrypted() {
        return authTokenEncrypted;
    }

    public void setAuthTokenEncrypted(String authTokenEncrypted) {
        this.authTokenEncrypted = authTokenEncrypted;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getChannelIdEncrypted() {
        return channelIdEncrypted;
    }

    public void setChannelIdEncrypted(String channelIdEncrypted) {
        this.channelIdEncrypted = channelIdEncrypted;
    }

    public String getChannelSecretEncrypted() {
        return channelSecretEncrypted;
    }

    public void setChannelSecretEncrypted(String channelSecretEncrypted) {
        this.channelSecretEncrypted = channelSecretEncrypted;
    }

    public String getChannelName() {
        return channelName;
    }

    public void setChannelName(String channelName) {
        this.channelName = channelName;
    }

    public String getAuthEndpoint() {
        return authEndpoint;
    }

    public void setAuthEndpoint(String authEndpoint) {
        this.authEndpoint = authEndpoint;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public ElibroValidationStatus getValidationStatus() {
        return validationStatus;
    }

    public void setValidationStatus(ElibroValidationStatus validationStatus) {
        this.validationStatus = validationStatus;
    }

    public String getValidationMessage() {
        return validationMessage;
    }

    public void setValidationMessage(String validationMessage) {
        this.validationMessage = validationMessage;
    }

    public Instant getLastValidatedAt() {
        return lastValidatedAt;
    }

    public void setLastValidatedAt(Instant lastValidatedAt) {
        this.lastValidatedAt = lastValidatedAt;
    }

    public Admin getCreatedByAdmin() {
        return createdByAdmin;
    }

    public void setCreatedByAdmin(Admin createdByAdmin) {
        this.createdByAdmin = createdByAdmin;
    }

    public Admin getUpdatedByAdmin() {
        return updatedByAdmin;
    }

    public void setUpdatedByAdmin(Admin updatedByAdmin) {
        this.updatedByAdmin = updatedByAdmin;
    }
}
