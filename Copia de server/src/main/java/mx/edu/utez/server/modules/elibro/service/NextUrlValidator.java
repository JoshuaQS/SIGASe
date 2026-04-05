package mx.edu.utez.server.modules.elibro.service;

import mx.edu.utez.server.config.AppProperties;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import java.net.URI;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class NextUrlValidator {

    private final Set<String> allowedHosts;

    public NextUrlValidator(AppProperties appProperties) {
        this.allowedHosts = appProperties.getElibro().getAllowedNextHosts().stream()
                .map(host -> host.toLowerCase(Locale.ROOT).trim())
                .collect(Collectors.toSet());
    }

    public Optional<String> validateAndNormalize(String next) {
        if (!StringUtils.hasText(next)) {
            return Optional.empty();
        }
        final URI uri;
        try {
            uri = URI.create(next.trim());
        } catch (Exception ex) {
            throw invalidNext();
        }

        if (!uri.isAbsolute()) {
            throw invalidNext();
        }
        if (!"https".equalsIgnoreCase(uri.getScheme())) {
            throw invalidNext();
        }
        if (!StringUtils.hasText(uri.getHost())) {
            throw invalidNext();
        }
        if (StringUtils.hasText(uri.getUserInfo())) {
            throw invalidNext();
        }

        String host = uri.getHost().toLowerCase(Locale.ROOT);
        if (!allowedHosts.contains(host)) {
            throw invalidNext();
        }

        return Optional.of(uri.toString());
    }

    private BusinessException invalidNext() {
        return new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "Parámetro next inválido.");
    }
}
