package mx.edu.utez.server.modules.logs.access.service;

import mx.edu.utez.server.modules.logs.access.entity.AccessLog;
import mx.edu.utez.server.modules.logs.access.repository.AccessLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccessLogService {

    private final AccessLogRepository accessLogRepository;

    public AccessLogService(AccessLogRepository accessLogRepository) {
        this.accessLogRepository = accessLogRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(AccessLogCommand command) {
        AccessLog accessLog = new AccessLog();
        accessLog.setStudent(command.student());
        accessLog.setAttemptedEmail(command.attemptedEmail());
        accessLog.setNormalizedEmail(command.normalizedEmail());
        accessLog.setResult(command.result());
        accessLog.setErrorCode(command.errorCode());
        accessLog.setErrorDetail(command.errorDetail());
        accessLog.setLatencyMs(command.latencyMs());
        accessLog.setRequestId(command.requestId());
        accessLog.setCorrelationId(command.correlationId());
        accessLog.setIpAddress(command.ipAddress());
        accessLog.setUserAgent(command.userAgent());
        accessLog.setProviderName(command.providerName());
        accessLog.setNextUrl(command.nextUrl());
        accessLog.setRedirectUrl(command.redirectUrl());
        accessLogRepository.save(accessLog);
    }
}
