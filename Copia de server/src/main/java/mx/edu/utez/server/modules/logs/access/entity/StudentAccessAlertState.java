package mx.edu.utez.server.modules.logs.access.entity;

import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.shared.entity.BaseUuidEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;

@Entity
@Table(name = "student_access_alert_states", indexes = {
        @Index(name = "idx_student_alert_failed_count", columnList = "consecutive_failed_attempts"),
        @Index(name = "idx_student_alert_normalized_email", columnList = "normalized_email", unique = true)
})
public class StudentAccessAlertState extends BaseUuidEntity {

    @Column(name = "normalized_email", nullable = false, unique = true, length = 254)
    private String normalizedEmail;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id")
    private Student student;

    @Column(name = "consecutive_failed_attempts", nullable = false)
    private int consecutiveFailedAttempts = 0;

    @Column(name = "last_failed_at")
    private Instant lastFailedAt;

    @Column(name = "alert_triggered_at")
    private Instant alertTriggeredAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public String getNormalizedEmail() {
        return normalizedEmail;
    }

    public void setNormalizedEmail(String normalizedEmail) {
        this.normalizedEmail = normalizedEmail;
    }

    public Student getStudent() {
        return student;
    }

    public void setStudent(Student student) {
        this.student = student;
    }

    public int getConsecutiveFailedAttempts() {
        return consecutiveFailedAttempts;
    }

    public void setConsecutiveFailedAttempts(int consecutiveFailedAttempts) {
        this.consecutiveFailedAttempts = consecutiveFailedAttempts;
    }

    public Instant getLastFailedAt() {
        return lastFailedAt;
    }

    public void setLastFailedAt(Instant lastFailedAt) {
        this.lastFailedAt = lastFailedAt;
    }

    public Instant getAlertTriggeredAt() {
        return alertTriggeredAt;
    }

    public void setAlertTriggeredAt(Instant alertTriggeredAt) {
        this.alertTriggeredAt = alertTriggeredAt;
    }

    public long getVersion() {
        return version;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
