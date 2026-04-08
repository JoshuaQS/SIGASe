package mx.edu.utez.server.security;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import mx.edu.utez.server.shared.api.ApiRoutes;
import org.springframework.http.HttpMethod;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;

/**
 * Catálogo único de rutas públicas usadas por SecurityConfig y JwtAuthenticationFilter.
 */
public final class SecurityPublicRoutes {

    private static final String[] PUBLIC_ANY_METHOD_PATTERNS = {
            "/v3/api-docs/**",
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/actuator/health",
            ApiRoutes.httpPath(ApiRoutes.AUTH_ADMIN_LOGIN),
            ApiRoutes.httpPath(ApiRoutes.AUTH_ADMIN_RESET_PASSWORD_REQUEST),
            ApiRoutes.httpPath(ApiRoutes.AUTH_ADMIN_RESET_PASSWORD_CONFIRM),
            ApiRoutes.httpPath(ApiRoutes.AUTH_STUDENT_GOOGLE)
    };

    private static final String[] PUBLIC_POST_ONLY_PATTERNS = {
            ApiRoutes.httpPath(ApiRoutes.AUTH_STUDENT_LOGIN),
            ApiRoutes.httpPath(ApiRoutes.AUTH_STUDENT_RESET_PASSWORD_REQUEST),
            ApiRoutes.httpPath(ApiRoutes.AUTH_STUDENT_RESET_PASSWORD_CONFIRM)
    };

    private static final RequestMatcher PUBLIC_ROUTES_MATCHER = buildPublicRoutesMatcher();

    private SecurityPublicRoutes() {
    }

    public static String[] publicAnyMethodPatterns() {
        return Arrays.copyOf(PUBLIC_ANY_METHOD_PATTERNS, PUBLIC_ANY_METHOD_PATTERNS.length);
    }

    public static String[] publicPostOnlyPatterns() {
        return Arrays.copyOf(PUBLIC_POST_ONLY_PATTERNS, PUBLIC_POST_ONLY_PATTERNS.length);
    }

    public static RequestMatcher publicRoutesMatcher() {
        return PUBLIC_ROUTES_MATCHER;
    }

    private static RequestMatcher buildPublicRoutesMatcher() {
        List<RequestMatcher> matchers = new ArrayList<>(PUBLIC_ANY_METHOD_PATTERNS.length + PUBLIC_POST_ONLY_PATTERNS.length);

        for (String pattern : PUBLIC_ANY_METHOD_PATTERNS) {
            matchers.add(PathPatternRequestMatcher.withDefaults().matcher(pattern));
        }

        for (String pattern : PUBLIC_POST_ONLY_PATTERNS) {
            matchers.add(PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.POST, pattern));
        }

        return new OrRequestMatcher(matchers);
    }
}