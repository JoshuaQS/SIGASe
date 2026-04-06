package mx.edu.utez.server.modules.students.service;

import mx.edu.utez.server.modules.students.entity.StudentAuthEvent;
import mx.edu.utez.server.modules.students.repository.StudentAuthEventRepository;
import mx.edu.utez.server.shared.util.SecurityLogSanitizer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class StudentAuthEventService {

    private final StudentAuthEventRepository studentAuthEventRepository;
    private final SecurityLogSanitizer securityLogSanitizer;

    public StudentAuthEventService(
            StudentAuthEventRepository studentAuthEventRepository,
            SecurityLogSanitizer securityLogSanitizer
    ) {
        this.studentAuthEventRepository = studentAuthEventRepository;
        this.securityLogSanitizer = securityLogSanitizer;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(StudentAuthEventCommand command) {
        StudentAuthEvent event = new StudentAuthEvent();
        event.setStudent(command.student());
        event.setAttemptedEmail(securityLogSanitizer.sanitizeEmail(command.attemptedEmail()));
        event.setNormalizedEmail(securityLogSanitizer.sanitizeEmail(command.normalizedEmail()));
        event.setGoogleSubject(securityLogSanitizer.sanitizeText(command.googleSubject(), 128));
        event.setAuthMethod(command.authMethod());
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
        studentAuthEventRepository.save(event);
    }

    private String defaultValue(String value, String fallback) {
        return StringUtils.hasText(value) ? value : fallback;
    }
}
