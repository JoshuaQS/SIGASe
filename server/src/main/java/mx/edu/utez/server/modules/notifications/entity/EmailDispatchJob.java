package mx.edu.utez.server.modules.notifications.entity;

import mx.edu.utez.server.shared.entity.BaseAuditableEntity;
import mx.edu.utez.server.shared.enums.EmailDispatchJobStatus;
import mx.edu.utez.server.shared.enums.EmailDispatchJobType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "email_dispatch_jobs", indexes = {
        @Index(name = "idx_email_dispatch_jobs_status", columnList = "status"),
        @Index(name = "idx_email_dispatch_jobs_type", columnList = "job_type"),
        @Index(name = "idx_email_dispatch_jobs_next_attempt_at", columnList = "next_attempt_at")
})
public class EmailDispatchJob extends BaseAuditableEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "job_type", nullable = false, length = 40)
    private EmailDispatchJobType jobType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private EmailDispatchJobStatus status = EmailDispatchJobStatus.PENDING;

    @Column(name = "recipient_email", nullable = false, length = 254)
    private String recipientEmail;

    @Column(name = "subject", nullable = false, length = 255)
    private String subject;

    @Lob
    @Column(name = "plain_text_encrypted", nullable = false)
    private String plainTextEncrypted;

    @Lob
    @Column(name = "html_content_encrypted", nullable = false)
    private String htmlContentEncrypted;

    @Column(name = "reference_type", length = 64)
    private String referenceType;

    @Column(name = "reference_id", length = 64)
    private String referenceId;

    @Column(name = "attempts", nullable = false)
    private int attempts = 0;

    @Column(name = "max_attempts", nullable = false)
    private int maxAttempts = 5;

    @Column(name = "next_attempt_at")
    private Instant nextAttemptAt;

    @Column(name = "last_attempt_at")
    private Instant lastAttemptAt;

    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(name = "permanently_failed_at")
    private Instant permanentlyFailedAt;

    @Lob
    @Column(name = "last_error_message")
    private String lastErrorMessage;

    public EmailDispatchJobType getJobType() {
        return jobType;
    }

    public void setJobType(EmailDispatchJobType jobType) {
        this.jobType = jobType;
    }

    public EmailDispatchJobStatus getStatus() {
        return status;
    }

    public void setStatus(EmailDispatchJobStatus status) {
        this.status = status;
    }

    public String getRecipientEmail() {
        return recipientEmail;
    }

    public void setRecipientEmail(String recipientEmail) {
        this.recipientEmail = recipientEmail;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getPlainTextEncrypted() {
        return plainTextEncrypted;
    }

    public void setPlainTextEncrypted(String plainTextEncrypted) {
        this.plainTextEncrypted = plainTextEncrypted;
    }

    public String getHtmlContentEncrypted() {
        return htmlContentEncrypted;
    }

    public void setHtmlContentEncrypted(String htmlContentEncrypted) {
        this.htmlContentEncrypted = htmlContentEncrypted;
    }

    public String getReferenceType() {
        return referenceType;
    }

    public void setReferenceType(String referenceType) {
        this.referenceType = referenceType;
    }

    public String getReferenceId() {
        return referenceId;
    }

    public void setReferenceId(String referenceId) {
        this.referenceId = referenceId;
    }

    public int getAttempts() {
        return attempts;
    }

    public void setAttempts(int attempts) {
        this.attempts = attempts;
    }

    public int getMaxAttempts() {
        return maxAttempts;
    }

    public void setMaxAttempts(int maxAttempts) {
        this.maxAttempts = maxAttempts;
    }

    public Instant getNextAttemptAt() {
        return nextAttemptAt;
    }

    public void setNextAttemptAt(Instant nextAttemptAt) {
        this.nextAttemptAt = nextAttemptAt;
    }

    public Instant getLastAttemptAt() {
        return lastAttemptAt;
    }

    public void setLastAttemptAt(Instant lastAttemptAt) {
        this.lastAttemptAt = lastAttemptAt;
    }

    public Instant getSentAt() {
        return sentAt;
    }

    public void setSentAt(Instant sentAt) {
        this.sentAt = sentAt;
    }

    public Instant getPermanentlyFailedAt() {
        return permanentlyFailedAt;
    }

    public void setPermanentlyFailedAt(Instant permanentlyFailedAt) {
        this.permanentlyFailedAt = permanentlyFailedAt;
    }

    public String getLastErrorMessage() {
        return lastErrorMessage;
    }

    public void setLastErrorMessage(String lastErrorMessage) {
        this.lastErrorMessage = lastErrorMessage;
    }
}
