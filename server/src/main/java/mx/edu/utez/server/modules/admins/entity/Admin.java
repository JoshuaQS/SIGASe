package mx.edu.utez.server.modules.admins.entity;

import mx.edu.utez.server.shared.entity.BaseAuditableEntity;
import mx.edu.utez.server.shared.enums.AdminRole;
import mx.edu.utez.server.shared.enums.AdminStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "admins", indexes = {
        @Index(name = "idx_admins_email", columnList = "email", unique = true),
        @Index(name = "idx_admins_role", columnList = "role"),
        @Index(name = "idx_admins_status", columnList = "status")
})
public class Admin extends BaseAuditableEntity {

    @Column(name = "email", nullable = false, length = 254, unique = true)
    private String email;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "last_name_paternal", nullable = false, length = 100)
    private String lastNamePaternal;

    @Column(name = "last_name_maternal", length = 100)
    private String lastNameMaternal;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 32)
    private AdminRole role;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private AdminStatus status = AdminStatus.ACTIVE;

    @Column(name = "has_changed_temporary_password", nullable = false)
    private boolean hasChangedTemporaryPassword = true;

    @Column(name = "temporary_password_generated_at")
    private Instant temporaryPasswordGeneratedAt;

    @Column(name = "temporary_password_notified_at")
    private Instant temporaryPasswordNotifiedAt;

    @Column(name = "password_changed_at")
    private Instant passwordChangedAt;

    @Column(name = "failed_login_attempts", nullable = false)
    private int failedLoginAttempts = 0;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @Column(name = "token_version", nullable = false)
    private int tokenVersion = 0;

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getLastNamePaternal() {
        return lastNamePaternal;
    }

    public void setLastNamePaternal(String lastNamePaternal) {
        this.lastNamePaternal = lastNamePaternal;
    }

    public String getLastNameMaternal() {
        return lastNameMaternal;
    }

    public void setLastNameMaternal(String lastNameMaternal) {
        this.lastNameMaternal = lastNameMaternal;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public AdminRole getRole() {
        return role;
    }

    public void setRole(AdminRole role) {
        this.role = role;
    }

    public AdminStatus getStatus() {
        return status;
    }

    public void setStatus(AdminStatus status) {
        this.status = status;
    }

    public boolean isHasChangedTemporaryPassword() {
        return hasChangedTemporaryPassword;
    }

    public void setHasChangedTemporaryPassword(boolean hasChangedTemporaryPassword) {
        this.hasChangedTemporaryPassword = hasChangedTemporaryPassword;
    }

    public Instant getTemporaryPasswordGeneratedAt() {
        return temporaryPasswordGeneratedAt;
    }

    public void setTemporaryPasswordGeneratedAt(Instant temporaryPasswordGeneratedAt) {
        this.temporaryPasswordGeneratedAt = temporaryPasswordGeneratedAt;
    }

    public Instant getTemporaryPasswordNotifiedAt() {
        return temporaryPasswordNotifiedAt;
    }

    public void setTemporaryPasswordNotifiedAt(Instant temporaryPasswordNotifiedAt) {
        this.temporaryPasswordNotifiedAt = temporaryPasswordNotifiedAt;
    }

    public Instant getPasswordChangedAt() {
        return passwordChangedAt;
    }

    public void setPasswordChangedAt(Instant passwordChangedAt) {
        this.passwordChangedAt = passwordChangedAt;
    }

    public int getFailedLoginAttempts() {
        return failedLoginAttempts;
    }

    public void setFailedLoginAttempts(int failedLoginAttempts) {
        this.failedLoginAttempts = failedLoginAttempts;
    }

    public Instant getLockedUntil() {
        return lockedUntil;
    }

    public void setLockedUntil(Instant lockedUntil) {
        this.lockedUntil = lockedUntil;
    }

    public Instant getLastLoginAt() {
        return lastLoginAt;
    }

    public void setLastLoginAt(Instant lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }

    public int getTokenVersion() {
        return tokenVersion;
    }

    public void setTokenVersion(int tokenVersion) {
        this.tokenVersion = tokenVersion;
    }
}
