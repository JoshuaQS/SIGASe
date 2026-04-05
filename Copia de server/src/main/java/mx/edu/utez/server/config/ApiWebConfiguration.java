package mx.edu.utez.server.config;

import mx.edu.utez.server.shared.api.ApiRoutes;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Prefijo global {@link ApiRoutes#API_SERVLET_PREFIX} para todos los {@link RestController}.
 */
@Configuration
public class ApiWebConfiguration implements WebMvcConfigurer {

    @Override
    public void configurePathMatch(PathMatchConfigurer configurer) {
        configurer.addPathPrefix(ApiRoutes.API_SERVLET_PREFIX, c -> c.isAnnotationPresent(RestController.class));
    }
}
