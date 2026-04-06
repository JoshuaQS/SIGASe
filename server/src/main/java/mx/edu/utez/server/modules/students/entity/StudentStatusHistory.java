package mx.edu.utez.server.modules.students.entity;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.shared.entity.BaseUuidEntity;
import mx.edu.utez.server.shared.enums.StudentStatus;
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
@Table(name = "student_status_history", indexes = {
        @Index(name = "idx_student_status_history_student_id", columnList = "student_id"),
        @Index(name = "idx_student_status_history_occurred_at", columnList = "occurred_at")
})
public class StudentStatusHistory extends BaseUuidEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 16)
    private StudentStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, length = 16)
    private StudentStatus toStatus;

    @Column(name = "reason", nullable = false, length = 500)
    private String reason;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "changed_by_admin_id", nullable = false)
    private Admin changedByAdmin;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt = Instant.now();

    public Student getStudent() {
        return student;
    }

    public void setStudent(Student student) {
        this.student = student;
    }

    public StudentStatus getFromStatus() {
        return fromStatus;
    }

    public void setFromStatus(StudentStatus fromStatus) {
        this.fromStatus = fromStatus;
    }

    public StudentStatus getToStatus() {
        return toStatus;
    }

    public void setToStatus(StudentStatus toStatus) {
        this.toStatus = toStatus;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public Admin getChangedByAdmin() {
        return changedByAdmin;
    }

    public void setChangedByAdmin(Admin changedByAdmin) {
        this.changedByAdmin = changedByAdmin;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public void setOccurredAt(Instant occurredAt) {
        this.occurredAt = occurredAt;
    }
}
