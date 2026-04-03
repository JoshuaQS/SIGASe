package mx.edu.utez.server.modules.logs.access.service;

import mx.edu.utez.server.modules.logs.access.entity.AccessLog;
import mx.edu.utez.server.modules.logs.access.repository.AccessLogRepository;
import mx.edu.utez.server.shared.util.SecurityLogSanitizer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class AccessLogService {

    private final AccessLogRepository accessLogRepository;
    private final SecurityLogSanitizer securityLogSanitizer;

    public AccessLogService(
            AccessLogRepository accessLogRepository,
            SecurityLogSanitizer securityLogSanitizer
    ) {
        this.accessLogRepository = accessLogRepository;
        this.securityLogSanitizer = securityLogSanitizer;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(AccessLogCommand command) {
        AccessLog accessLog = new AccessLog();
        accessLog.setStudent(command.student());
        accessLog.setAttemptedEmail(securityLogSanitizer.sanitizeEmail(command.attemptedEmail()));
        accessLog.setNormalizedEmail(securityLogSanitizer.sanitizeEmail(command.normalizedEmail()));
        accessLog.setResult(command.result());
        accessLog.setErrorCode(securityLogSanitizer.sanitizeText(command.errorCode(), 60));
        accessLog.setErrorDetail(securityLogSanitizer.sanitizeText(command.errorDetail(), 500));
        accessLog.setLatencyMs(command.latencyMs());
        accessLog.setRequestId(defaultValue(securityLogSanitizer.sanitizeText(command.requestId(), 80), "system"));
        accessLog.setCorrelationId(defaultValue(securityLogSanitizer.sanitizeText(command.correlationId(), 80), "system"));
        accessLog.setIpAddress(defaultValue(securityLogSanitizer.sanitizeIp(command.ipAddress()), "0.0.0.0"));
        accessLog.setUserAgent(securityLogSanitizer.sanitizeUserAgent(command.userAgent()));
        accessLog.setProviderName(securityLogSanitizer.sanitizeText(command.providerName(), 40));
        accessLog.setNextUrl(securityLogSanitizer.sanitizeUrl(command.nextUrl()));
        accessLog.setRedirectUrl(securityLogSanitizer.sanitizeUrl(command.redirectUrl()));
        accessLogRepository.save(accessLog);
    }

    private String defaultValue(String value, String defaultValue) {
        return StringUtils.hasText(value) ? value : defaultValue;
    }
}
