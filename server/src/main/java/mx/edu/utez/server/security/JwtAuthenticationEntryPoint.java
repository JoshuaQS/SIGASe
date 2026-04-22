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
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    public JwtAuthenticationEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException)
            throws IOException {
        ErrorCode errorCode;
        String message;

        if (authException instanceof SessionExpiredAuthenticationException) {
            errorCode = ErrorCode.SESSION_EXPIRED;
            message = authException.getMessage() != null && !authException.getMessage().isBlank()
                    ? authException.getMessage()
                    : "Sesión expirada. Inicia sesión nuevamente.";
        } else if (authException instanceof InvalidJwtAuthenticationException) {
            errorCode = ErrorCode.INVALID_TOKEN;
            message = authException.getMessage() != null && !authException.getMessage().isBlank()
                    ? authException.getMessage()
                    : "Token inválido.";
        } else {
            errorCode = ErrorCode.UNAUTHORIZED;
            message = "No autenticado.";
        }

        String requestId = (String) request.getAttribute(RequestContext.REQUEST_ID_ATTR);
        ApiErrorResponse payload = new ApiErrorResponse(
                false,
                message,
                errorCode.name(),
                Instant.now(),
                requestId
        );

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setCharacterEncoding("UTF-8");
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), payload);
    }
}
