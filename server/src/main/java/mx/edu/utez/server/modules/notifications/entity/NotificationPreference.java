package mx.edu.utez.server.modules.notifications.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.util.UUID;
import mx.edu.utez.server.modules.admins.entity.Admin;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.type.SqlTypes;
import org.springframework.data.domain.Persistable;

@Entity
@Table(name = "notification_preferences")
public class NotificationPreference implements Persistable<UUID> {

    @Id
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "admin_id", nullable = false, updatable = false, columnDefinition = "char(36)")
    private UUID adminId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "admin_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Admin admin;

    @Column(name = "notify_critical", nullable = false)
    private boolean notifyCritical = true;

    @Column(name = "notify_security", nullable = false)
    private boolean notifySecurity = true;

    @Column(name = "notify_access_failures", nullable = false)
    private boolean notifyAccessFailures = true;

    @Column(name = "notify_student_changes", nullable = false)
    private boolean notifyStudentChanges = true;

    @Column(name = "notify_config_changes", nullable = false)
    private boolean notifyConfigChanges = true;

    @Column(name = "notify_admin_changes", nullable = false)
    private boolean notifyAdminChanges = true;

    @Transient
    private boolean isNew = true;

    public UUID getAdminId() {
        return adminId;
    }

    @Override
    public UUID getId() {
        return adminId;
    }

    public Admin getAdmin() {
        return admin;
    }

    public void setAdmin(Admin admin) {
        this.admin = admin;
        this.adminId = admin == null ? null : admin.getId();
    }

    public boolean isNotifyCritical() {
        return notifyCritical;
    }

    public void setNotifyCritical(boolean notifyCritical) {
        this.notifyCritical = notifyCritical;
    }

    public boolean isNotifySecurity() {
        return notifySecurity;
    }

    public void setNotifySecurity(boolean notifySecurity) {
        this.notifySecurity = notifySecurity;
    }

    public boolean isNotifyAccessFailures() {
        return notifyAccessFailures;
    }

    public void setNotifyAccessFailures(boolean notifyAccessFailures) {
        this.notifyAccessFailures = notifyAccessFailures;
    }

    public boolean isNotifyStudentChanges() {
        return notifyStudentChanges;
    }

    public void setNotifyStudentChanges(boolean notifyStudentChanges) {
        this.notifyStudentChanges = notifyStudentChanges;
    }

    public boolean isNotifyConfigChanges() {
        return notifyConfigChanges;
    }

    public void setNotifyConfigChanges(boolean notifyConfigChanges) {
        this.notifyConfigChanges = notifyConfigChanges;
    }

    public boolean isNotifyAdminChanges() {
        return notifyAdminChanges;
    }

    public void setNotifyAdminChanges(boolean notifyAdminChanges) {
        this.notifyAdminChanges = notifyAdminChanges;
    }

    @Override
    public boolean isNew() {
        return isNew;
    }

    @PostLoad
    @PostPersist
    void markNotNew() {
        this.isNew = false;
    }
}
