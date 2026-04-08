package mx.edu.utez.server.modules.auth.service;

import mx.edu.utez.server.modules.auth.entity.AdminAuthEvent;
import mx.edu.utez.server.modules.auth.repository.AdminAuthEventRepository;
import mx.edu.utez.server.shared.util.SecurityLogSanitizer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class AdminAuthEventService {

    private final AdminAuthEventRepository adminAuthEventRepository;
    private final SecurityLogSanitizer securityLogSanitizer;

    public AdminAuthEventService(
            AdminAuthEventRepository adminAuthEventRepository,
            SecurityLogSanitizer securityLogSanitizer
    ) {
        this.adminAuthEventRepository = adminAuthEventRepository;
        this.securityLogSanitizer = securityLogSanitizer;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(AdminAuthEventCommand command) {
        AdminAuthEvent event = new AdminAuthEvent();
        event.setAdmin(command.admin());
        event.setAttemptedEmail(securityLogSanitizer.sanitizeEmail(command.attemptedEmail()));
        event.setNormalizedEmail(securityLogSanitizer.sanitizeEmail(command.normalizedEmail()));
        event.setResult(command.result());
        event.setErrorCode(securityLogSanitizer.sanitizeText(command.errorCode(), 60));
        event.setErrorDetail(securityLogSanitizer.sanitizeText(command.errorDetail(), 500));
        event.setRequestId(defaultValue(securityLogSanitizer.sanitizeText(command.requestId(), 80), "system"));
        event.setCorrelationId(defaultValue(securityLogSanitizer.sanitizeText(command.correlationId(), 80), "system"));
        event.setIpAddressMasked(defaultValue(securityLogSanitizer.maskIpAddress(command.ipAddress()), "0.0.0.0"));
        event.setIpAddressHash(securityLogSanitizer.hashIpAddress(command.ipAddress()));
        event.setUserAgentSanitized(securityLogSanitizer.sanitizeUserAgent(command.userAgent()));
        event.setSessionId(securityLogSanitizer.sanitizeText(command.sessionId(), 128));
        event.setOrigin(securityLogSanitizer.sanitizeText(command.origin(), 254));
        event.setReferer(securityLogSanitizer.sanitizeUrl(command.referer()));
        event.setHttpMethod(securityLogSanitizer.sanitizeText(command.httpMethod(), 10));
        event.setRequestPath(securityLogSanitizer.sanitizeUrl(command.requestPath()));
        event.setMetadataJson(securityLogSanitizer.sanitizeMetadataJson(command.metadataJson()));
        adminAuthEventRepository.save(event);
    }

    private String defaultValue(String value, String fallback) {
        return StringUtils.hasText(value) ? value : fallback;
    }
}
