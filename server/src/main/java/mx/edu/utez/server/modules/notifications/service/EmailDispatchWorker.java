package mx.edu.utez.server.modules.notifications.service;

import jakarta.mail.internet.MimeMessage;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.notifications.entity.EmailDispatchJob;
import mx.edu.utez.server.modules.notifications.repository.EmailDispatchJobRepository;
import mx.edu.utez.server.shared.crypto.Aes256CryptoService;
import mx.edu.utez.server.shared.enums.EmailDispatchJobType;
import mx.edu.utez.server.shared.enums.EmailDispatchJobStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Component
public class EmailDispatchWorker {

    private static final Logger log = LoggerFactory.getLogger(EmailDispatchWorker.class);
    private static final int MAX_ATTEMPTS = 5;

    private final EmailDispatchJobRepository emailDispatchJobRepository;
    private final AdminRepository adminRepository;
    private final JavaMailSender mailSender;
    private final Aes256CryptoService aes256CryptoService;

    public EmailDispatchWorker(
            EmailDispatchJobRepository emailDispatchJobRepository,
            AdminRepository adminRepository,
            JavaMailSender mailSender,
            Aes256CryptoService aes256CryptoService
    ) {
        this.emailDispatchJobRepository = emailDispatchJobRepository;
        this.adminRepository = adminRepository;
        this.mailSender = mailSender;
        this.aes256CryptoService = aes256CryptoService;
    }

    @Scheduled(fixedDelayString = "${app.mail.dispatch-delay-ms:5000}")
    @Transactional
    public void processQueue() {
        List<EmailDispatchJob> jobs = emailDispatchJobRepository.findReadyJobs(
                List.of(EmailDispatchJobStatus.PENDING, EmailDispatchJobStatus.FAILED),
                Instant.now(),
                PageRequest.of(0, 25)
        );

        for (EmailDispatchJob job : jobs) {
            dispatch(job);
        }
    }

    private void dispatch(EmailDispatchJob job) {
        job.setLastAttemptAt(Instant.now());
        job.setAttempts(job.getAttempts() + 1);
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(job.getRecipientEmail());
            helper.setSubject(job.getSubject());
            helper.setText(
                    aes256CryptoService.decrypt(job.getPlainTextEncrypted()),
                    aes256CryptoService.decrypt(job.getHtmlContentEncrypted())
            );
            mailSender.send(message);

            job.setStatus(EmailDispatchJobStatus.SENT);
            job.setSentAt(Instant.now());
            job.setLastErrorMessage(null);
            job.setNextAttemptAt(null);
            markAdminTemporaryPasswordAsNotified(job);
        } catch (Exception ex) {
            boolean exhausted = job.getAttempts() >= Math.min(MAX_ATTEMPTS, Math.max(1, job.getMaxAttempts()));
            if (exhausted) {
                job.setStatus(EmailDispatchJobStatus.PERMANENT_FAILURE);
                job.setPermanentlyFailedAt(Instant.now());
                job.setNextAttemptAt(null);
            } else {
                job.setStatus(EmailDispatchJobStatus.FAILED);
                job.setNextAttemptAt(Instant.now().plus(10L * Math.max(1, job.getAttempts()), ChronoUnit.SECONDS));
            }
            job.setLastErrorMessage(sanitizeError(ex.getMessage()));
            log.warn("Failed to dispatch email job {}: {}", job.getId(), ex.getMessage());
        }
        emailDispatchJobRepository.save(job);
    }

    private void markAdminTemporaryPasswordAsNotified(EmailDispatchJob job) {
        if (job.getJobType() != EmailDispatchJobType.ADMIN_TEMPORARY_PASSWORD
                && job.getJobType() != EmailDispatchJobType.ADMIN_PASSWORD_RESET) {
            return;
        }
        if (!"ADMIN".equalsIgnoreCase(job.getReferenceType())) {
            return;
        }
        try {
            UUID adminId = UUID.fromString(job.getReferenceId());
            Admin admin = adminRepository.findById(adminId).orElse(null);
            if (admin == null) {
                return;
            }
            admin.setTemporaryPasswordNotifiedAt(Instant.now());
            adminRepository.save(admin);
        } catch (Exception ex) {
            log.warn("Failed to update admin temporaryPasswordNotifiedAt for job {}: {}", job.getId(), ex.getMessage());
        }
    }

    private String sanitizeError(String message) {
        return StringUtils.hasText(message) ? message.substring(0, Math.min(message.length(), 1000)) : "unknown";
    }
}
