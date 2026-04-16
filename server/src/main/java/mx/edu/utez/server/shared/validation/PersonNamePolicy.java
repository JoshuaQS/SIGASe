package mx.edu.utez.server.shared.validation;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.util.StringUtils;

public final class PersonNamePolicy {

    public static final int MIN_LENGTH = 2;
    public static final int MAX_LENGTH = 100;
    public static final String REGEX = "^[A-Za-zÀ-ÖØ-öø-ÿÑñ'\\-]+(?: [A-Za-zÀ-ÖØ-öø-ÿÑñ'\\-]+)*$";

    private static final Pattern INVALID_HTML = Pattern.compile("[<>]");
    private static final Pattern MULTIPLE_SPACES = Pattern.compile("\\s+");

    private PersonNamePolicy() {
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
}
