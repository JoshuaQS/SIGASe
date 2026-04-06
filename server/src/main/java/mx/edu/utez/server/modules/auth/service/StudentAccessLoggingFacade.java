package mx.edu.utez.server.modules.auth.service;

import jakarta.servlet.http.HttpServletRequest;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.service.StudentAuthEventCommand;
import mx.edu.utez.server.modules.students.service.StudentAuthEventService;
import mx.edu.utez.server.shared.context.RequestContext;
import mx.edu.utez.server.shared.enums.StudentAuthMethod;
import mx.edu.utez.server.shared.enums.StudentAuthResult;
import mx.edu.utez.server.shared.util.ClientIpResolver;
import org.springframework.stereotype.Service;

@Service
public class StudentAccessLoggingFacade {

    private final StudentAuthEventService studentAuthEventService;
    private final ClientIpResolver clientIpResolver;

    public StudentAccessLoggingFacade(
            StudentAuthEventService studentAuthEventService,
            ClientIpResolver clientIpResolver
    ) {
        this.studentAuthEventService = studentAuthEventService;
        this.clientIpResolver = clientIpResolver;
    }

    public void log(
            HttpServletRequest request,
            Student student,
            String attemptedEmail,
            String normalizedEmail,
            String googleSubject,
            StudentAuthMethod authMethod,
            StudentAuthResult result,
            String errorCode,
            String errorDetail
    ) {
        studentAuthEventService.log(new StudentAuthEventCommand(
                student,
                attemptedEmail,
                normalizedEmail,
                googleSubject,
                authMethod,
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
                null
        ));
    }
}
