package mx.edu.utez.server.shared.validation;

import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.util.StringUtils;

public final class DomainTextPolicy {

    private static final Pattern HUMAN_NAME_PATTERN =
            Pattern.compile("^[\\p{L}]+(?:[ '\\-][\\p{L}]+)*$");
    private static final Pattern REASON_PATTERN =
            Pattern.compile("^[\\p{L}\\p{N} .,;:¡!¿?'\"()\\-_/&]+$");
    private static final Pattern ENROLLMENT_10_PATTERN =
            Pattern.compile("^[A-HJ-Z0-9][A-Z0-9]{9}$");
    private static final Pattern ENROLLMENT_11_PATTERN =
            Pattern.compile("^I[A-Z0-9]{10}$");

    private DomainTextPolicy() {
    }

    public static String normalizeHumanName(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return collapseSpaces(value).trim();
    }

    public static String normalizeHumanNameWithInitialCaps(String value) {
        String normalized = normalizeHumanName(value);
        if (!StringUtils.hasText(normalized)) {
            return null;
        }
        StringBuilder builder = new StringBuilder(normalized.length());
        boolean capitalizeNext = true;
        for (int offset = 0; offset < normalized.length();) {
            int codePoint = normalized.codePointAt(offset);
            if (Character.isWhitespace(codePoint)) {
                builder.appendCodePoint(codePoint);
                capitalizeNext = true;
            } else if (codePoint == '\'' || codePoint == '-') {
                builder.appendCodePoint(codePoint);
                capitalizeNext = true;
            } else if (capitalizeNext) {
                builder.appendCodePoint(Character.toTitleCase(codePoint));
                capitalizeNext = false;
            } else {
                builder.appendCodePoint(Character.toLowerCase(codePoint));
            }
            offset += Character.charCount(codePoint);
        }
        return builder.toString();
    }

    public static String normalizeReason(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return collapseSpaces(value).trim();
    }

    public static String normalizeEnrollmentId(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim().replaceAll("\\s+", "").toUpperCase(Locale.ROOT);
    }

    public static boolean isValidHumanName(String value) {
        return StringUtils.hasText(value) && HUMAN_NAME_PATTERN.matcher(value).matches();
    }

    public static boolean isValidReason(String value) {
        return StringUtils.hasText(value)
                && value.length() <= 500
                && !value.contains("<")
                && !value.contains(">")
                && !value.toLowerCase(Locale.ROOT).contains("script")
                && REASON_PATTERN.matcher(value).matches();
    }

    public static boolean isValidEnrollmentId(String value) {
        return StringUtils.hasText(value)
                && (ENROLLMENT_10_PATTERN.matcher(value).matches()
                || ENROLLMENT_11_PATTERN.matcher(value).matches());
    }

    public static boolean hasOnlySafeWhitespace(String value) {
        return value == null || value.equals(collapseSpaces(value).trim());
    }

    private static String collapseSpaces(String value) {
        return value.replaceAll("\\s+", " ");
    }
}
