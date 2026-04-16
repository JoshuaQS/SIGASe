package mx.edu.utez.server.modules.notifications.service;

import java.time.Instant;
import java.util.UUID;
import mx.edu.utez.server.modules.notifications.entity.EmailDispatchJob;
import mx.edu.utez.server.modules.notifications.repository.EmailDispatchJobRepository;
import mx.edu.utez.server.shared.crypto.Aes256CryptoService;
import mx.edu.utez.server.shared.enums.EmailDispatchJobStatus;
import mx.edu.utez.server.shared.enums.EmailDispatchJobType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EmailDispatchService {

    private final EmailDispatchJobRepository emailDispatchJobRepository;
    private final Aes256CryptoService aes256CryptoService;

    public EmailDispatchService(
            EmailDispatchJobRepository emailDispatchJobRepository,
            Aes256CryptoService aes256CryptoService
    ) {
        this.emailDispatchJobRepository = emailDispatchJobRepository;
        this.aes256CryptoService = aes256CryptoService;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public EmailDispatchJob enqueue(
            EmailDispatchJobType jobType,
            String recipientEmail,
            String subject,
            String plainText,
            String htmlContent,
            String referenceType,
            String referenceId
    ) {
        EmailDispatchJob job = new EmailDispatchJob();
        job.setJobType(jobType);
        job.setStatus(EmailDispatchJobStatus.PENDING);
        job.setRecipientEmail(recipientEmail);
        job.setSubject(subject);
        job.setPlainTextEncrypted(aes256CryptoService.encrypt(plainText));
        job.setHtmlContentEncrypted(aes256CryptoService.encrypt(htmlContent));
        job.setReferenceType(referenceType);
        job.setReferenceId(referenceId);
        job.setAttempts(0);
        job.setNextAttemptAt(Instant.now());
        return emailDispatchJobRepository.save(job);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markForRetry(UUID jobId) {
        EmailDispatchJob job = emailDispatchJobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found"));
        if (job.getStatus() == EmailDispatchJobStatus.PERMANENT_FAILURE) {
            throw new IllegalStateException("Job reached permanent failure and cannot be retried automatically.");
        }
        job.setStatus(EmailDispatchJobStatus.PENDING);
        job.setLastErrorMessage(null);
        job.setNextAttemptAt(Instant.now());
        emailDispatchJobRepository.save(job);
    }
}
