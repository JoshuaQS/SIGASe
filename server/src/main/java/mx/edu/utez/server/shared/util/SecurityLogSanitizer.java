package mx.edu.utez.server.shared.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.TextNode;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import mx.edu.utez.server.config.AppProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class SecurityLogSanitizer {

    private static final String REDACTED = "***REDACTED***";
    private static final String HASH_PREFIX = "sha256:";
    private static final Pattern CONTROL_CHARS = Pattern.compile("[\\r\\n\\t]");

    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;

    public SecurityLogSanitizer(AppProperties appProperties, ObjectMapper objectMapper) {
        this.appProperties = appProperties;
        this.objectMapper = objectMapper;
    }

    public String sanitizeEmail(String email) {
        if (!StringUtils.hasText(email)) {
            return null;
        }
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        if (normalized.startsWith(HASH_PREFIX)) {
            return normalized;
        }
        return HASH_PREFIX + sha256Hex(normalized);
    }

    public String sanitizeEmailForLookup(String email) {
        return sanitizeEmail(email);
    }

    public String sanitizeIp(String ipAddress) {
        if (!StringUtils.hasText(ipAddress)) {
            return null;
        }

        String normalized = ipAddress.trim();
        if (normalized.startsWith(HASH_PREFIX)) {
            return normalized;
        }
        if (appProperties.getLogs().getSanitization().isHashIp()) {
            return HASH_PREFIX + sha256Hex(normalized.toLowerCase(Locale.ROOT));
        }
        if (appProperties.getLogs().getSanitization().isMaskIp()) {
            return maskIp(normalized);
        }
        return normalized;
    }

    public String maskIpAddress(String ipAddress) {
        if (!StringUtils.hasText(ipAddress)) {
            return null;
        }
        return maskIp(ipAddress.trim());
    }

    public String hashIpAddress(String ipAddress) {
        if (!StringUtils.hasText(ipAddress)) {
            return null;
        }
        return sha256Hex(ipAddress.trim().toLowerCase(Locale.ROOT));
    }

    public String sanitizeIpForLookup(String ipAddress) {
        return sanitizeIp(ipAddress);
    }

    public String sanitizeUserAgent(String userAgent) {
        int maxLength = appProperties.getLogs().getSanitization().getUserAgentMaxLength();
        return sanitizeText(userAgent, maxLength);
    }

    public String sanitizeUrl(String url) {
        if (!StringUtils.hasText(url)) {
            return null;
        }
        int maxLength = appProperties.getLogs().getSanitization().getUrlMaxLength();
        String sanitized = sanitizeText(url, maxLength * 2);
        sanitized = redactSensitiveQueryParams(sanitized);
        return truncate(sanitized, maxLength);
    }

    public Map<String, Object> sanitizeMetadata(Map<String, Object> metadata) {
        if (metadata == null || metadata.isEmpty()) {
            return Map.of();
        }
        JsonNode sanitizedTree = sanitizeJsonNode(null, objectMapper.valueToTree(metadata));
        return objectMapper.convertValue(sanitizedTree, new TypeReference<LinkedHashMap<String, Object>>() {});
    }

    public String sanitizeMetadataJson(String metadataJson) {
        if (!StringUtils.hasText(metadataJson)) {
            return null;
        }

        int maxLength = appProperties.getLogs().getSanitization().getMetadataMaxLength();
        try {
            JsonNode rawTree = objectMapper.readTree(metadataJson);
            JsonNode sanitizedTree = sanitizeJsonNode(null, rawTree);
            return truncate(objectMapper.writeValueAsString(sanitizedTree), maxLength);
        } catch (Exception ex) {
            return truncate(sanitizeText(metadataJson, maxLength), maxLength);
        }
    }

    public String redactToken(String token) {
        if (!StringUtils.hasText(token)) {
            return REDACTED;
        }
        String normalized = token.trim();
        int visible = Math.min(8, normalized.length());
        return normalized.substring(0, visible) + "...(redacted)";
    }

    public String sanitizeText(String value, int maxLength) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String sanitized = CONTROL_CHARS.matcher(value).replaceAll(" ").trim();
        return truncate(sanitized, maxLength);
    }

    public String redactSensitiveQueryParams(String url) {
        if (!StringUtils.hasText(url)) {
            return url;
        }
        try {
            URI uri = URI.create(url);
            String rawQuery = uri.getRawQuery();
            if (!StringUtils.hasText(rawQuery)) {
                return url;
            }
            StringBuilder rebuiltQuery = new StringBuilder();
            String[] pairs = rawQuery.split("&");
            for (int i = 0; i < pairs.length; i++) {
                String pair = pairs[i];
                int sep = pair.indexOf('=');
                String key = sep >= 0 ? pair.substring(0, sep) : pair;
                String value = sep >= 0 ? pair.substring(sep + 1) : "";
                if (isSensitiveKey(key)) {
                    value = REDACTED;
                }
                if (i > 0) {
                    rebuiltQuery.append('&');
                }
                rebuiltQuery.append(key);
                if (sep >= 0) {
                    rebuiltQuery.append('=').append(value);
                }
            }

            String base = url.substring(0, url.indexOf('?'));
            String fragment = uri.getRawFragment();
            if (StringUtils.hasText(fragment)) {
                return base + "?" + rebuiltQuery + "#" + fragment;
            }
            return base + "?" + rebuiltQuery;
        } catch (Exception ex) {
            return url;
        }
    }

    private JsonNode sanitizeJsonNode(String parentKey, JsonNode node) {
        if (node == null || node.isNull()) {
            return node;
        }
        if (isSensitiveKey(parentKey)) {
            return TextNode.valueOf(REDACTED);
        }
        if (node.isObject()) {
            ObjectNode result = objectMapper.createObjectNode();
            node.fields().forEachRemaining(entry ->
                    result.set(entry.getKey(), sanitizeJsonNode(entry.getKey(), entry.getValue())));
            return result;
        }
        if (node.isArray()) {
            ArrayNode result = objectMapper.createArrayNode();
            for (JsonNode item : node) {
                result.add(sanitizeJsonNode(parentKey, item));
            }
            return result;
        }
        if (node.isTextual()) {
            int maxLength = appProperties.getLogs().getSanitization().getMetadataMaxLength();
            return TextNode.valueOf(sanitizeText(node.asText(), maxLength));
        }
        return node;
    }

    private boolean isSensitiveKey(String key) {
        if (!StringUtils.hasText(key)) {
            return false;
        }
        String normalized = key.trim().toLowerCase(Locale.ROOT);
        List<String> keys = appProperties.getLogs().getSanitization().getSensitiveKeys();
        if (keys == null || keys.isEmpty()) {
            return false;
        }
        for (String configured : keys) {
            if (!StringUtils.hasText(configured)) {
                continue;
            }
            String candidate = configured.trim().toLowerCase(Locale.ROOT);
            if (normalized.contains(candidate)) {
                return true;
            }
        }
        return false;
    }

    private String maskIp(String ipAddress) {
        if (ipAddress.contains(".")) {
            String[] parts = ipAddress.split("\\.");
            if (parts.length == 4) {
                parts[3] = "0";
                return String.join(".", parts);
            }
        }
        if (ipAddress.contains(":")) {
            String[] parts = ipAddress.split(":");
            List<String> masked = new ArrayList<>();
            for (int i = 0; i < parts.length; i++) {
                masked.add(i < 4 ? parts[i] : "0000");
            }
            return String.join(":", masked);
        }
        return ipAddress;
    }

    private String sha256Hex(String value) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudo sanitizar dato sensible.", ex);
        }
    }

    private String truncate(String value, int maxLength) {
        if (!StringUtils.hasText(value)) {
            return value;
        }
        if (maxLength <= 0 || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }
}
