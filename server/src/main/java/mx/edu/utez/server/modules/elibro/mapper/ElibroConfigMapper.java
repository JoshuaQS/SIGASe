package mx.edu.utez.server.modules.elibro.mapper;

import java.util.ArrayList;
import java.util.List;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.elibro.dto.ElibroConfigResponse;
import mx.edu.utez.server.modules.elibro.dto.ElibroOverviewConfig;
import mx.edu.utez.server.modules.elibro.entity.ElibroConfig;
import mx.edu.utez.server.shared.crypto.Aes256CryptoService;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class ElibroConfigMapper {

    private final Aes256CryptoService aes256CryptoService;

    public ElibroConfigMapper(Aes256CryptoService aes256CryptoService) {
        this.aes256CryptoService = aes256CryptoService;
    }

    public ElibroConfigResponse toResponse(ElibroConfig config) {
        Admin createdByAdmin = safeCreatedByAdmin(config);
        Admin updatedByAdmin = safeUpdatedByAdmin(config);
        return new ElibroConfigResponse(
                config.getId(),
                config.getName(),
                config.getChannelName(),
                maskChannelId(config),
                hasSecret(config.getAuthTokenEncrypted()),
                hasSecret(config.getChannelSecretEncrypted()),
                hasSecret(config.getChannelIdEncrypted()),
                config.getNextUrl(),
                config.getStatus(),
                config.getValidationStatus(),
                config.getValidationMessage(),
                config.getLastValidatedAt(),
                createdByAdmin == null ? null : createdByAdmin.getId(),
                adminDisplayName(createdByAdmin),
                updatedByAdmin == null ? null : updatedByAdmin.getId(),
                adminDisplayName(updatedByAdmin),
                config.getCreatedAt(),
                config.getUpdatedAt()
        );
    }

    public ElibroOverviewConfig toOverviewConfig(ElibroConfig config) {
        Admin createdByAdmin = safeCreatedByAdmin(config);
        Admin updatedByAdmin = safeUpdatedByAdmin(config);
        return new ElibroOverviewConfig(
                config.getId(),
                config.getName(),
                config.getChannelName(),
                maskChannelId(config),
                hasSecret(config.getAuthTokenEncrypted()),
                hasSecret(config.getChannelSecretEncrypted()),
                hasSecret(config.getChannelIdEncrypted()),
                adminDisplayName(createdByAdmin),
                adminDisplayName(updatedByAdmin),
                config.getCreatedAt(),
                config.getUpdatedAt(),
                config.getNextUrl(),
                config.getStatus()
        );
    }

    public String adminDisplayName(Admin admin) {
        if (admin == null) {
            return null;
        }
        List<String> parts = new ArrayList<>(3);
        if (StringUtils.hasText(admin.getName())) {
            parts.add(admin.getName().trim());
        }
        if (StringUtils.hasText(admin.getLastNamePaternal())) {
            parts.add(admin.getLastNamePaternal().trim());
        }
        if (StringUtils.hasText(admin.getLastNameMaternal())) {
            parts.add(admin.getLastNameMaternal().trim());
        }
        if (parts.isEmpty()) {
            return admin.getEmail();
        }
        return String.join(" ", parts);
    }

    private boolean hasSecret(String encryptedValue) {
        return StringUtils.hasText(encryptedValue);
    }

    private String maskChannelId(ElibroConfig config) {
        if (!StringUtils.hasText(config.getChannelIdEncrypted())) {
            return null;
        }
        try {
            String plainValue = aes256CryptoService.decrypt(config.getChannelIdEncrypted());
            if (!StringUtils.hasText(plainValue)) {
                return null;
            }
            String normalized = plainValue.trim();
            if (normalized.length() <= 4) {
                return "****";
            }
            int prefixLength = Math.min(3, normalized.length() / 2);
            int suffixLength = Math.min(2, normalized.length() - prefixLength);
            int hiddenLength = Math.max(1, normalized.length() - prefixLength - suffixLength);
            return normalized.substring(0, prefixLength)
                    + "*".repeat(hiddenLength)
                    + normalized.substring(normalized.length() - suffixLength);
        } catch (Exception ex) {
            return null;
        }
    }

    private Admin safeAdminReference(Admin admin) {
        try {
            return admin;
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private Admin safeCreatedByAdmin(ElibroConfig config) {
        try {
            return safeAdminReference(config.getCreatedByAdmin());
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private Admin safeUpdatedByAdmin(ElibroConfig config) {
        try {
            return safeAdminReference(config.getUpdatedByAdmin());
        } catch (RuntimeException ignored) {
            return null;
        }
    }
}
