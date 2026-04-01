package mx.edu.utez.server.modules.students.entity;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.shared.entity.BaseAuditableEntity;
import mx.edu.utez.server.shared.enums.Sex;
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
@Table(name = "students", indexes = {
        @Index(name = "idx_students_enrollment_id", columnList = "enrollment_id", unique = true),
        @Index(name = "idx_students_email", columnList = "institutional_email", unique = true),
        @Index(name = "idx_students_email_norm", columnList = "institutional_email_normalized", unique = true),
        @Index(name = "idx_students_google_sub", columnList = "google_subject", unique = true),
        @Index(name = "idx_students_status", columnList = "status"),
        @Index(name = "idx_students_career", columnList = "career")
})
public class Student extends BaseAuditableEntity {

    @Column(name = "enrollment_id", nullable = false, length = 10, unique = true)
    private String enrollmentId;

    @Column(name = "full_name", nullable = false, length = 100)
    private String name;

    @Column(name = "last_name_paternal", nullable = false, length = 100)
    private String lastNamePaternal;

    @Column(name = "last_name_maternal", length = 100)
    private String lastNameMaternal;

    @Enumerated(EnumType.STRING)
    @Column(name = "sex", nullable = false, length = 16)
    private Sex sex;

    @Column(name = "quarter", nullable = false)
    private Integer quarter;

    @Column(name = "institutional_email", nullable = false, length = 254, unique = true)
    private String institutionalEmail;

    @Column(name = "institutional_email_normalized", nullable = false, length = 254, unique = true)
    private String institutionalEmailNormalized;

    @Column(name = "career", nullable = false, length = 120)
    private String career;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private StudentStatus status = StudentStatus.ACTIVE;

    @Column(name = "google_subject", unique = true, length = 255)
    private String googleSubject;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @Column(name = "deactivated_at")
    private Instant deactivatedAt;

    @Column(name = "deactivation_reason", length = 500)
    private String deactivationReason;

    @Column(name = "reactivated_at")
    private Instant reactivatedAt;

    @Column(name = "reactivation_reason", length = 500)
    private String reactivationReason;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_admin_id", nullable = false)
    private Admin createdByAdmin;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by_admin_id")
    private Admin updatedByAdmin;

    @Column(name = "password_hash", nullable = true, length = 255)
    private String passwordHash;

    @Column(name = "must_change_password", nullable = false)
    private boolean mustChangePassword = false;

    @Column(name = "failed_login_attempts", nullable = false)
    private int failedLoginAttempts = 0;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    @Column(name = "last_password_change_at")
    private Instant lastPasswordChangeAt;

    public String getEnrollmentId() {
        return enrollmentId;
    }

    public void setEnrollmentId(String enrollmentId) {
        this.enrollmentId = enrollmentId;
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

    public Sex getSex() {
        return sex;
    }

    public void setSex(Sex sex) {
        this.sex = sex;
    }

    public Integer getQuarter() {
        return quarter;
    }

    public void setQuarter(Integer quarter) {
        this.quarter = quarter;
    }

    public String getInstitutionalEmail() {
        return institutionalEmail;
    }

    public void setInstitutionalEmail(String institutionalEmail) {
        this.institutionalEmail = institutionalEmail;
    }

    public String getInstitutionalEmailNormalized() {
        return institutionalEmailNormalized;
    }

    public void setInstitutionalEmailNormalized(String institutionalEmailNormalized) {
        this.institutionalEmailNormalized = institutionalEmailNormalized;
    }

    public String getCareer() {
        return career;
    }

    public void setCareer(String career) {
        this.career = career;
    }

    public StudentStatus getStatus() {
        return status;
    }

    public void setStatus(StudentStatus status) {
        this.status = status;
    }

    public String getGoogleSubject() {
        return googleSubject;
    }

    public void setGoogleSubject(String googleSubject) {
        this.googleSubject = googleSubject;
    }

    public Instant getLastLoginAt() {
        return lastLoginAt;
    }

    public void setLastLoginAt(Instant lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }

    public Instant getDeactivatedAt() {
        return deactivatedAt;
    }

    public void setDeactivatedAt(Instant deactivatedAt) {
        this.deactivatedAt = deactivatedAt;
    }

    public String getDeactivationReason() {
        return deactivationReason;
    }

    public void setDeactivationReason(String deactivationReason) {
        this.deactivationReason = deactivationReason;
    }

    public Instant getReactivatedAt() {
        return reactivatedAt;
    }

    public void setReactivatedAt(Instant reactivatedAt) {
        this.reactivatedAt = reactivatedAt;
    }

    public String getReactivationReason() {
        return reactivationReason;
    }

    public void setReactivationReason(String reactivationReason) {
        this.reactivationReason = reactivationReason;
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

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public boolean isMustChangePassword() {
        return mustChangePassword;
    }

    public void setMustChangePassword(boolean mustChangePassword) {
        this.mustChangePassword = mustChangePassword;
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

    public Instant getLastPasswordChangeAt() {
        return lastPasswordChangeAt;
    }

    public void setLastPasswordChangeAt(Instant lastPasswordChangeAt) {
        this.lastPasswordChangeAt = lastPasswordChangeAt;
    }
}
