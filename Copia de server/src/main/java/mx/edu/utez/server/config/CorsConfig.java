package mx.edu.utez.server.config;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Stream;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource(AppProperties appProperties) {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> configuredOrigins = Arrays.stream(appProperties.getSecurity().getAllowedOrigins().split(","))
                .map(value -> value == null ? "" : value.trim())
                .map(value -> value.replace("\"", ""))
                .map(value -> value.replace("'", ""))
                .filter(value -> !value.isBlank())
                .toList();

        List<String> defaults = List.of(
                "http://localhost:5173",
                "http://localhost:18080",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:18080"
        );

        List<String> allowedOrigins = configuredOrigins.isEmpty()
                ? defaults
                : Stream.concat(configuredOrigins.stream(), defaults.stream()).distinct().toList();

        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedOriginPatterns(List.of("http://localhost:*", "http://127.0.0.1:*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("X-Request-Id", "X-Correlation-Id"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
