package mx.edu.utez.server.shared.context;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestCorrelationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String requestId = firstNonBlank(request.getHeader(RequestContext.REQUEST_ID_HEADER), UUID.randomUUID().toString());
        String correlationId = firstNonBlank(request.getHeader(RequestContext.CORRELATION_ID_HEADER), requestId);
        request.setAttribute(RequestContext.REQUEST_ID_ATTR, requestId);
        request.setAttribute(RequestContext.CORRELATION_ID_ATTR, correlationId);
        response.setHeader(RequestContext.REQUEST_ID_HEADER, requestId);
        response.setHeader(RequestContext.CORRELATION_ID_HEADER, correlationId);
        RequestContext.set(requestId, correlationId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            RequestContext.clear();
        }
    }

    private String firstNonBlank(String value, String fallback) {
        if (!StringUtils.hasText(value)) {
            return fallback;
        }
        return value.trim();
    }
}
