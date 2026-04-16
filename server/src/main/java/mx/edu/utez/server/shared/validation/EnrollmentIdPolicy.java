package mx.edu.utez.server.shared.validation;

import java.util.Locale;
import org.springframework.util.StringUtils;

public final class EnrollmentIdPolicy {

    public static final int MIN_LENGTH = 10;
    public static final int MAX_LENGTH = 11;
    public static final String REGEX = "^[A-Za-z0-9]{10,11}$";

    private EnrollmentIdPolicy() {
    }

    public static String normalize(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        return value.trim().toUpperCase(Locale.ROOT);
    }

    public static boolean isValid(String value) {
        if (!StringUtils.hasText(value)) {
            return false;
        }
        String normalized = normalize(value);
        if (!normalized.matches(REGEX)) {
            return false;
        }
        if (normalized.length() == 11) {
            return normalized.startsWith("I");
        }
        return !normalized.startsWith("I");
    }
}
