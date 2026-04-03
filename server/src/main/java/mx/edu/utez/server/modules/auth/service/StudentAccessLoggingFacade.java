package mx.edu.utez.server.modules.auth.service;

import jakarta.servlet.http.HttpServletRequest;
import mx.edu.utez.server.modules.logs.access.service.AccessLogCommand;
import mx.edu.utez.server.modules.logs.access.service.AccessLogService;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.shared.context.RequestContext;
import mx.edu.utez.server.shared.enums.AccessResult;
import mx.edu.utez.server.shared.util.ClientIpResolver;
import org.springframework.stereotype.Service;

@Service
public class StudentAccessLoggingFacade {

    private final AccessLogService accessLogService;
    private final ClientIpResolver clientIpResolver;

    public StudentAccessLoggingFacade(
            AccessLogService accessLogService,
            ClientIpResolver clientIpResolver
    ) {
        this.accessLogService = accessLogService;
        this.clientIpResolver = clientIpResolver;
    }

    public void log(
            HttpServletRequest request,
            long startMs,
            Student student,
            String attemptedEmail,
            String normalizedEmail,
            AccessResult result,
            String errorCode,
            String errorDetail
    ) {
        accessLogService.log(new AccessLogCommand(
                student,
                attemptedEmail,
                normalizedEmail,
                result,
                errorCode,
                errorDetail,
                elapsed(startMs),
                request != null ? (String) request.getAttribute(RequestContext.REQUEST_ID_ATTR) : null,
                request != null ? (String) request.getAttribute(RequestContext.CORRELATION_ID_ATTR) : null,
                request != null ? clientIpResolver.resolve(request) : null,
                request != null ? request.getHeader("User-Agent") : null,
                null,
                null,
                null
        ));
    }

    private long elapsed(long startMs) {
        return Math.max(0, System.currentTimeMillis() - startMs);
    }
}
