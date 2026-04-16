package mx.edu.utez.server.shared.validation;

import java.text.Normalizer;
import java.util.regex.Pattern;
import org.springframework.util.StringUtils;

public final class ReasonPolicy {

    public static final int MIN_LENGTH = 10;
    public static final int MAX_LENGTH = 500;
    public static final String REGEX = "^[A-Za-zÀ-ÖØ-öø-ÿÑñ0-9'\".,;:()!?\\-_/ ]+$";

    private static final Pattern MULTIPLE_SPACES = Pattern.compile("\\s+");
    private static final Pattern INVALID_HTML = Pattern.compile("[<>]");
    private static final Pattern HAS_LETTER_OR_DIGIT = Pattern.compile(".*[A-Za-zÀ-ÖØ-öø-ÿÑñ0-9].*");

    private ReasonPolicy() {
    }

    public static String normalize(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        String collapsed = MULTIPLE_SPACES.matcher(value.trim()).replaceAll(" ");
        return Normalizer.normalize(collapsed, Normalizer.Form.NFC);
    }

    public static boolean containsHtmlOrScript(String value) {
        if (!StringUtils.hasText(value)) {
            return false;
        }
        return INVALID_HTML.matcher(value).find();
    }

    public static boolean looksLikeReason(String value) {
        return StringUtils.hasText(value) && HAS_LETTER_OR_DIGIT.matcher(value).matches();
    }
}
