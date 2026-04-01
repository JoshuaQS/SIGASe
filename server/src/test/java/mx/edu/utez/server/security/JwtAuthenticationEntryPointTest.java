package mx.edu.utez.server.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import mx.edu.utez.server.security.InvalidJwtAuthenticationException;
import mx.edu.utez.server.security.JwtAuthenticationEntryPoint;
import mx.edu.utez.server.security.SessionExpiredAuthenticationException;
import mx.edu.utez.server.shared.context.RequestContext;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.InsufficientAuthenticationException;

class JwtAuthenticationEntryPointTest {

    private JwtAuthenticationEntryPoint entryPoint;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().findAndRegisterModules();
        entryPoint = new JwtAuthenticationEntryPoint(objectMapper);
    }

    @Test
    void shouldReturnSessionExpiredPayload() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute(RequestContext.REQUEST_ID_ATTR, "req-123");
        MockHttpServletResponse response = new MockHttpServletResponse();

        entryPoint.commence(
                request,
                response,
                new SessionExpiredAuthenticationException("expired", null)
        );

        Assertions.assertEquals(401, response.getStatus());
        JsonNode body = objectMapper.readTree(response.getContentAsString());
        Assertions.assertEquals("SESSION_EXPIRED", body.get("errorCode").asText());
        Assertions.assertEquals("Sesión expirada. Inicia sesión nuevamente.", body.get("message").asText());
        Assertions.assertEquals("req-123", body.get("requestId").asText());
    }

    @Test
    void shouldReturnInvalidTokenPayload() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute(RequestContext.REQUEST_ID_ATTR, "req-456");
        MockHttpServletResponse response = new MockHttpServletResponse();

        entryPoint.commence(
                request,
                response,
                new InvalidJwtAuthenticationException("invalid", null)
        );

        Assertions.assertEquals(401, response.getStatus());
        JsonNode body = objectMapper.readTree(response.getContentAsString());
        Assertions.assertEquals("INVALID_TOKEN", body.get("errorCode").asText());
    }

    @Test
    void shouldReturnUnauthorizedPayloadWhenNoToken() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute(RequestContext.REQUEST_ID_ATTR, "req-789");
        MockHttpServletResponse response = new MockHttpServletResponse();

        entryPoint.commence(
                request,
                response,
                new InsufficientAuthenticationException("missing auth")
        );

        Assertions.assertEquals(401, response.getStatus());
        JsonNode body = objectMapper.readTree(response.getContentAsString());
        Assertions.assertEquals("UNAUTHORIZED", body.get("errorCode").asText());
    }
}
