package mx.edu.utez.server.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import mx.edu.utez.server.security.JwtAccessDeniedHandler;
import mx.edu.utez.server.shared.context.RequestContext;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;

class JwtAccessDeniedHandlerTest {

    private JwtAccessDeniedHandler deniedHandler;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().findAndRegisterModules();
        deniedHandler = new JwtAccessDeniedHandler(objectMapper);
    }

    @Test
    void shouldReturnForbiddenPayload() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute(RequestContext.REQUEST_ID_ATTR, "req-999");
        MockHttpServletResponse response = new MockHttpServletResponse();

        deniedHandler.handle(request, response, new AccessDeniedException("forbidden"));

        Assertions.assertEquals(403, response.getStatus());
        JsonNode body = objectMapper.readTree(response.getContentAsString());
        Assertions.assertEquals("FORBIDDEN", body.get("errorCode").asText());
        Assertions.assertEquals("req-999", body.get("requestId").asText());
    }
}
