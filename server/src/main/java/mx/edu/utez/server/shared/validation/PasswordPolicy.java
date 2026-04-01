package mx.edu.utez.server.shared.validation;

import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import java.security.SecureRandom;
import java.util.regex.Pattern;

/**
 * Política única de contraseñas para el dominio de autenticación (estudiante y, si aplica, admin).
 */
public final class PasswordPolicy {

    public static final String REQUIREMENTS_MESSAGE =
            "La contraseña debe tener al menos 10 caracteres e incluir mayúscula, minúscula, número y símbolo";

    private static final Pattern PASSWORD_PATTERN =
            Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{10,}$");

    private static final SecureRandom RANDOM = new SecureRandom();

    private static final String LOWER = "abcdefghjkmnpqrstuvwxyz";
    private static final String UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String DIGITS = "23456789";
    private static final String SYMBOLS = "!@#$%&*";

    private PasswordPolicy() {
    }

    public static void validateOrThrow(String password) {
        if (password == null || !PASSWORD_PATTERN.matcher(password).matches()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, REQUIREMENTS_MESSAGE);
        }
    }

    /**
     * Contraseña temporal aleatoria que cumple {@link #validateOrThrow(String)}.
     */
    public static String generateCompliantTemporaryPassword() {
        StringBuilder sb = new StringBuilder(14);
        sb.append(LOWER.charAt(RANDOM.nextInt(LOWER.length())));
        sb.append(UPPER.charAt(RANDOM.nextInt(UPPER.length())));
        sb.append(DIGITS.charAt(RANDOM.nextInt(DIGITS.length())));
        sb.append(SYMBOLS.charAt(RANDOM.nextInt(SYMBOLS.length())));
        String pool = LOWER + UPPER + DIGITS + SYMBOLS;
        while (sb.length() < 14) {
            sb.append(pool.charAt(RANDOM.nextInt(pool.length())));
        }
        char[] chars = sb.toString().toCharArray();
        for (int i = chars.length - 1; i > 0; i--) {
            int j = RANDOM.nextInt(i + 1);
            char t = chars[i];
            chars[i] = chars[j];
            chars[j] = t;
        }
        String candidate = new String(chars);
        validateOrThrow(candidate);
        return candidate;
    }
}
