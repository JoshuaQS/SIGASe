package mx.edu.utez.server.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Collections;
import java.util.Set;
import mx.edu.utez.server.shared.api.ApiRoutes;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private static final RequestMatcher PUBLIC_ROUTES_MATCHER = SecurityPublicRoutes.publicRoutesMatcher();

    private static final Set<String> ALLOWED_WHEN_MUST_CHANGE = Set.of(
            ApiRoutes.httpPath(ApiRoutes.AUTH_STUDENT_ME),
            ApiRoutes.httpPath(ApiRoutes.AUTH_STUDENT_CHANGE_PASSWORD),
            ApiRoutes.httpPath(ApiRoutes.AUTH_STUDENT_LOGOUT)
    );

    private static final String PASSWORD_CHANGE_REQUIRED_JSON =
            "{\"code\":\"PASSWORD_CHANGE_REQUIRED\",\"message\":\"Debes cambiar tu contraseña antes de continuar\"}";

    private final JwtTokenProvider jwtTokenProvider;
    private final SessionTokenValidationService sessionTokenValidationService;
    private final AuthenticationEntryPoint authenticationEntryPoint;

    public JwtAuthenticationFilter(
            JwtTokenProvider jwtTokenProvider,
            SessionTokenValidationService sessionTokenValidationService,
            JwtAuthenticationEntryPoint authenticationEntryPoint
    ) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.sessionTokenValidationService = sessionTokenValidationService;
        this.authenticationEntryPoint = authenticationEntryPoint;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return HttpMethod.OPTIONS.matches(request.getMethod()) || PUBLIC_ROUTES_MATCHER.matches(request);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (!StringUtils.hasText(header) || !header.startsWith(BEARER_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(BEARER_PREFIX.length()).trim();
        try {
            ParsedToken parsedToken = jwtTokenProvider.validateAndParse(token);
            if (!sessionTokenValidationService.isTokenVersionCurrent(parsedToken)) {
                throw new InvalidJwtAuthenticationException("Token revocado o desactualizado.");
            }

            if (RoleConstants.STUDENT.equals(parsedToken.role()) && parsedToken.mustChangePassword()) {
                String path = request.getRequestURI();
                String method = request.getMethod();

                boolean allowed = false;
                if (ALLOWED_WHEN_MUST_CHANGE.contains(path)) {
                    allowed =
                            (HttpMethod.GET.matches(method) && path.equals(ApiRoutes.httpPath(ApiRoutes.AUTH_STUDENT_ME)))
                                    || (HttpMethod.POST.matches(method) && path.equals(ApiRoutes.httpPath(ApiRoutes.AUTH_STUDENT_CHANGE_PASSWORD)))
                                    || (HttpMethod.POST.matches(method) && path.equals(ApiRoutes.httpPath(ApiRoutes.AUTH_STUDENT_LOGOUT)));
                }

                if (!allowed) {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    response.setCharacterEncoding("UTF-8");
                    response.getWriter().write(PASSWORD_CHANGE_REQUIRED_JSON);
                    return;
                }
            }

            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    parsedToken.userId().toString(),
                    null,
                    Collections.singletonList(new SimpleGrantedAuthority(parsedToken.role()))
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
            filterChain.doFilter(request, response);
        } catch (SessionExpiredAuthenticationException | InvalidJwtAuthenticationException ex) {
            SecurityContextHolder.clearContext();
            authenticationEntryPoint.commence(request, response, ex);
        }
    }
}
