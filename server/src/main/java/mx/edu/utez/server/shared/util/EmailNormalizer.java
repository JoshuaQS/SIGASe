package mx.edu.utez.server.shared.util;

import java.util.Locale;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import mx.edu.utez.server.shared.validation.EnrollmentIdPolicy;

@Component
public class EmailNormalizer {

    private static final String INSTITUTIONAL_DOMAIN = "@utez.edu.mx";

    public String normalize(String rawEmail) {
        if (!StringUtils.hasText(rawEmail)) {
            return "";
        }
        return rawEmail.trim().toLowerCase(Locale.ROOT);
    }

    public String buildInstitutionalEmailFromEnrollmentId(String rawEnrollmentId) {
        String normalizedEnrollmentId = EnrollmentIdPolicy.normalize(rawEnrollmentId);
        if (!EnrollmentIdPolicy.isValid(normalizedEnrollmentId)) {
            return "";
        }

        String baseEnrollmentId = normalizedEnrollmentId.length() == EnrollmentIdPolicy.MAX_LENGTH
                ? normalizedEnrollmentId.substring(1)
                : normalizedEnrollmentId;
        return baseEnrollmentId.toLowerCase(Locale.ROOT) + INSTITUTIONAL_DOMAIN;
    }
}
