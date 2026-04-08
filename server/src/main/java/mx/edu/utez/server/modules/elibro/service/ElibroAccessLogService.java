package mx.edu.utez.server.modules.elibro.service;

import mx.edu.utez.server.modules.elibro.entity.ElibroAccessLog;
import mx.edu.utez.server.modules.elibro.repository.ElibroAccessLogRepository;
import mx.edu.utez.server.modules.notifications.service.NotificationService;
import mx.edu.utez.server.shared.util.SecurityLogSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class ElibroAccessLogService {

    private static final Logger log = LoggerFactory.getLogger(ElibroAccessLogService.class);

    private final ElibroAccessLogRepository elibroAccessLogRepository;
    private final SecurityLogSanitizer securityLogSanitizer;
    private final NotificationService notificationService;

    public ElibroAccessLogService(
            ElibroAccessLogRepository elibroAccessLogRepository,
            SecurityLogSanitizer securityLogSanitizer,
            NotificationService notificationService
    ) {
        this.elibroAccessLogRepository = elibroAccessLogRepository;
        this.securityLogSanitizer = securityLogSanitizer;
        this.notificationService = notificationService;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(ElibroAccessLogCommand command) {
        ElibroAccessLog accessLog = new ElibroAccessLog();
        accessLog.setStudent(command.student());
        accessLog.setAttemptedEmail(securityLogSanitizer.sanitizeEmail(command.attemptedEmail()));
        accessLog.setNormalizedEmail(securityLogSanitizer.sanitizeEmail(command.normalizedEmail()));
        accessLog.setResult(command.result());
        accessLog.setErrorCode(securityLogSanitizer.sanitizeText(command.errorCode(), 60));
        accessLog.setErrorDetail(securityLogSanitizer.sanitizeText(command.errorDetail(), 500));
        accessLog.setLatencyMs(command.latencyMs());
        accessLog.setRequestId(defaultValue(securityLogSanitizer.sanitizeText(command.requestId(), 80), "system"));
        accessLog.setCorrelationId(defaultValue(securityLogSanitizer.sanitizeText(command.correlationId(), 80), "system"));
        accessLog.setIpAddressMasked(defaultValue(securityLogSanitizer.maskIpAddress(command.ipAddress()), "0.0.0.0"));
        accessLog.setIpAddressHash(securityLogSanitizer.hashIpAddress(command.ipAddress()));
        accessLog.setUserAgentSanitized(securityLogSanitizer.sanitizeUserAgent(command.userAgent()));
        accessLog.setSessionId(securityLogSanitizer.sanitizeText(command.sessionId(), 128));
        accessLog.setOrigin(securityLogSanitizer.sanitizeText(command.origin(), 254));
        accessLog.setReferer(securityLogSanitizer.sanitizeUrl(command.referer()));
        accessLog.setHttpMethod(securityLogSanitizer.sanitizeText(command.httpMethod(), 10));
        accessLog.setRequestPath(securityLogSanitizer.sanitizeUrl(command.requestPath()));
        accessLog.setNextUrl(securityLogSanitizer.sanitizeUrl(command.nextUrl()));
        accessLog.setRedirectUrl(securityLogSanitizer.sanitizeUrl(command.redirectUrl()));
        accessLog.setChannelNameSnapshot(securityLogSanitizer.sanitizeText(command.channelNameSnapshot(), 120));
        accessLog.setProviderStatusCode(command.providerStatusCode());
        accessLog.setProviderErrorCode(securityLogSanitizer.sanitizeText(command.providerErrorCode(), 60));
        accessLog.setProviderErrorMessage(securityLogSanitizer.sanitizeText(command.providerErrorMessage(), 500));
        accessLog.setMetadataJson(securityLogSanitizer.sanitizeMetadataJson(command.metadataJson()));
        ElibroAccessLog saved = elibroAccessLogRepository.save(accessLog);

        try {
            notificationService.handleAccessEvent(saved);
        } catch (RuntimeException ex) {
            log.warn("No se pudo generar notificación para access log {}.", saved.getId(), ex);
        }
    }

    private String defaultValue(String value, String fallback) {
        return StringUtils.hasText(value) ? value : fallback;
    }
}
