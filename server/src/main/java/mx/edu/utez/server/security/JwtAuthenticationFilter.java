package mx.edu.utez.server.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Collections;
import java.util.Set;
import mx.edu.utez.server.shared.api.ApiRoutes;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

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
        boolean shouldSkip = HttpMethod.OPTIONS.matches(request.getMethod()) || PUBLIC_ROUTES_MATCHER.matches(request);

        if (shouldSkip) {
            log.debug("[JWT] skip filter method={} path={}", request.getMethod(), request.getRequestURI());
        }

        return shouldSkip;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String method = request.getMethod();
        String path = request.getRequestURI();
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);

        log.debug("[JWT] start method={} path={} hasAuthHeader={} bearerPrefix={}",
                method,
                path,
                StringUtils.hasText(header),
                StringUtils.hasText(header) && header.startsWith(BEARER_PREFIX));

        if (!StringUtils.hasText(header) || !header.startsWith(BEARER_PREFIX)) {
            log.debug("[JWT] missing or invalid Authorization header method={} path={}", method, path);
            filterChain.doFilter(request, response);
            log.debug("[JWT] passthrough complete method={} path={} status={}", method, path, response.getStatus());
            return;
        }

        String token = header.substring(BEARER_PREFIX.length()).trim();
        log.debug("[JWT] token extracted method={} path={} tokenLength={}", method, path, token.length());

        try {
            ParsedToken parsedToken = jwtTokenProvider.validateAndParse(token);

            log.debug("[JWT] token parsed method={} path={} userId={} role={} mustChangePassword={}",
                    method,
                    path,
                    parsedToken.userId(),
                    parsedToken.role(),
                    parsedToken.mustChangePassword());

            if (!sessionTokenValidationService.isTokenVersionCurrent(parsedToken)) {
                log.warn("[JWT] token version invalid method={} path={} userId={} role={}",
                        method,
                        path,
                        parsedToken.userId(),
                        parsedToken.role());
                throw new InvalidJwtAuthenticationException("Token revocado o desactualizado.");
            }

            if (RoleConstants.STUDENT.equals(parsedToken.role()) && parsedToken.mustChangePassword()) {
                boolean allowed = false;
                if (ALLOWED_WHEN_MUST_CHANGE.contains(path)) {
                    allowed =
                            (HttpMethod.GET.matches(method) && path.equals(ApiRoutes.httpPath(ApiRoutes.AUTH_STUDENT_ME)))
                                    || (HttpMethod.POST.matches(method) && path.equals(ApiRoutes.httpPath(ApiRoutes.AUTH_STUDENT_CHANGE_PASSWORD)))
                                    || (HttpMethod.POST.matches(method) && path.equals(ApiRoutes.httpPath(ApiRoutes.AUTH_STUDENT_LOGOUT)));
                }

                log.debug("[JWT] student must change password method={} path={} userId={} allowed={}",
                        method,
                        path,
                        parsedToken.userId(),
                        allowed);

                if (!allowed) {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    response.setCharacterEncoding("UTF-8");
                    response.getWriter().write(PASSWORD_CHANGE_REQUIRED_JSON);

                    log.warn("[JWT] request blocked by PASSWORD_CHANGE_REQUIRED method={} path={} status={}",
                            method,
                            path,
                            response.getStatus());
                    return;
                }
            }

            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    parsedToken.userId().toString(),
                    null,
                    Collections.singletonList(new SimpleGrantedAuthority(parsedToken.role()))
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);

            log.debug("[JWT] authentication set method={} path={} principal={} authorities={}",
                    method,
                    path,
                    authentication.getPrincipal(),
                    authentication.getAuthorities());

            filterChain.doFilter(request, response);

            log.debug("[JWT] success method={} path={} status={}", method, path, response.getStatus());

        } catch (SessionExpiredAuthenticationException | InvalidJwtAuthenticationException ex) {
            SecurityContextHolder.clearContext();

            log.warn("[JWT] auth failure method={} path={} message={} type={}",
                    method,
                    path,
                    ex.getMessage(),
                    ex.getClass().getSimpleName());

            authenticationEntryPoint.commence(request, response, ex);

            log.debug("[JWT] entry point invoked method={} path={} finalStatus={}",
                    method,
                    path,
                    response.getStatus());
        } catch (Exception ex) {
            SecurityContextHolder.clearContext();

            log.error("[JWT] unexpected failure method={} path={} message={} type={}",
                    method,
                    path,
                    ex.getMessage(),
                    ex.getClass().getSimpleName(),
                    ex);

            throw ex;
        }
    }
}
