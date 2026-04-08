package mx.edu.utez.server.modules.auth.service;

import jakarta.servlet.http.HttpServletRequest;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.shared.context.RequestContext;
import mx.edu.utez.server.shared.enums.AdminAuthResult;
import mx.edu.utez.server.shared.util.ClientIpResolver;
import org.springframework.stereotype.Service;

@Service
public class AdminAccessLoggingFacade {

    private final AdminAuthEventService adminAuthEventService;
    private final ClientIpResolver clientIpResolver;

    public AdminAccessLoggingFacade(
            AdminAuthEventService adminAuthEventService,
            ClientIpResolver clientIpResolver
    ) {
        this.adminAuthEventService = adminAuthEventService;
        this.clientIpResolver = clientIpResolver;
    }

    public void log(
            HttpServletRequest request,
            Admin admin,
            String attemptedEmail,
            String normalizedEmail,
            AdminAuthResult result,
            String errorCode,
            String errorDetail,
            String metadataJson
    ) {
        adminAuthEventService.log(new AdminAuthEventCommand(
                admin,
                attemptedEmail,
                normalizedEmail,
                result,
                errorCode,
                errorDetail,
                request != null ? (String) request.getAttribute(RequestContext.REQUEST_ID_ATTR) : null,
                request != null ? (String) request.getAttribute(RequestContext.CORRELATION_ID_ATTR) : null,
                request != null ? clientIpResolver.resolve(request) : null,
                request != null ? request.getHeader("User-Agent") : null,
                request != null ? request.getRequestedSessionId() : null,
                request != null ? request.getHeader("Origin") : null,
                request != null ? request.getHeader("Referer") : null,
                request != null ? request.getMethod() : null,
                request != null ? request.getRequestURI() : null,
                metadataJson
        ));
    }
}
