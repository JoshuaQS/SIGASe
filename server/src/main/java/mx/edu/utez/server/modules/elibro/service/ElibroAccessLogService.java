package mx.edu.utez.server.modules.elibro.service;

import mx.edu.utez.server.modules.elibro.entity.ElibroAccessLog;
import mx.edu.utez.server.modules.elibro.repository.ElibroAccessLogRepository;
import mx.edu.utez.server.shared.util.SecurityLogSanitizer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class ElibroAccessLogService {

    private final ElibroAccessLogRepository elibroAccessLogRepository;
    private final SecurityLogSanitizer securityLogSanitizer;

    public ElibroAccessLogService(
            ElibroAccessLogRepository elibroAccessLogRepository,
            SecurityLogSanitizer securityLogSanitizer
    ) {
        this.elibroAccessLogRepository = elibroAccessLogRepository;
        this.securityLogSanitizer = securityLogSanitizer;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(ElibroAccessLogCommand command) {
        ElibroAccessLog log = new ElibroAccessLog();
        log.setStudent(command.student());
        log.setAttemptedEmail(securityLogSanitizer.sanitizeEmail(command.attemptedEmail()));
        log.setNormalizedEmail(securityLogSanitizer.sanitizeEmail(command.normalizedEmail()));
        log.setResult(command.result());
        log.setErrorCode(securityLogSanitizer.sanitizeText(command.errorCode(), 60));
        log.setErrorDetail(securityLogSanitizer.sanitizeText(command.errorDetail(), 500));
        log.setLatencyMs(command.latencyMs());
        log.setRequestId(defaultValue(securityLogSanitizer.sanitizeText(command.requestId(), 80), "system"));
        log.setCorrelationId(defaultValue(securityLogSanitizer.sanitizeText(command.correlationId(), 80), "system"));
        log.setIpAddressMasked(defaultValue(securityLogSanitizer.maskIpAddress(command.ipAddress()), "0.0.0.0"));
        log.setIpAddressHash(securityLogSanitizer.hashIpAddress(command.ipAddress()));
        log.setUserAgentSanitized(securityLogSanitizer.sanitizeUserAgent(command.userAgent()));
        log.setSessionId(securityLogSanitizer.sanitizeText(command.sessionId(), 128));
        log.setOrigin(securityLogSanitizer.sanitizeText(command.origin(), 254));
        log.setReferer(securityLogSanitizer.sanitizeUrl(command.referer()));
        log.setHttpMethod(securityLogSanitizer.sanitizeText(command.httpMethod(), 10));
        log.setRequestPath(securityLogSanitizer.sanitizeUrl(command.requestPath()));
        log.setNextUrl(securityLogSanitizer.sanitizeUrl(command.nextUrl()));
        log.setRedirectUrl(securityLogSanitizer.sanitizeUrl(command.redirectUrl()));
        log.setChannelNameSnapshot(securityLogSanitizer.sanitizeText(command.channelNameSnapshot(), 120));
        log.setProviderStatusCode(command.providerStatusCode());
        log.setProviderErrorCode(securityLogSanitizer.sanitizeText(command.providerErrorCode(), 60));
        log.setProviderErrorMessage(securityLogSanitizer.sanitizeText(command.providerErrorMessage(), 500));
        log.setMetadataJson(securityLogSanitizer.sanitizeMetadataJson(command.metadataJson()));
        elibroAccessLogRepository.save(log);
    }

    private String defaultValue(String value, String fallback) {
        return StringUtils.hasText(value) ? value : fallback;
    }
}
