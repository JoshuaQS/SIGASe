package mx.edu.utez.server.shared.util;

import java.util.Locale;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class EmailNormalizer {

    public String normalize(String rawEmail) {
        if (!StringUtils.hasText(rawEmail)) {
            return "";
        }
        return rawEmail.trim().toLowerCase(Locale.ROOT);
    }
}
