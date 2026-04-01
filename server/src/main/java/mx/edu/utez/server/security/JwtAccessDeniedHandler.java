package mx.edu.utez.server.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import mx.edu.utez.server.shared.api.ApiErrorResponse;
import mx.edu.utez.server.shared.context.RequestContext;
import mx.edu.utez.server.shared.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

@Component
public class JwtAccessDeniedHandler implements AccessDeniedHandler {

    private final ObjectMapper objectMapper;

    public JwtAccessDeniedHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException accessDeniedException)
            throws IOException {
        String requestId = (String) request.getAttribute(RequestContext.REQUEST_ID_ATTR);
        ApiErrorResponse payload = new ApiErrorResponse(
                false,
                "No tienes permisos para esta operación.",
                ErrorCode.FORBIDDEN.name(),
                Instant.now(),
                requestId
        );
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setCharacterEncoding("UTF-8");
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), payload);
    }
}
