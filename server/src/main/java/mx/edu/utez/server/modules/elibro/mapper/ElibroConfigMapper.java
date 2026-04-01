package mx.edu.utez.server.modules.elibro.mapper;

import mx.edu.utez.server.modules.elibro.dto.ElibroConfigResponse;
import mx.edu.utez.server.modules.elibro.entity.ElibroConfig;
import org.springframework.stereotype.Component;

@Component
public class ElibroConfigMapper {

    public ElibroConfigResponse toResponse(ElibroConfig config) {
        return new ElibroConfigResponse(
                config.getId(),
                config.getChannelName(),
                config.getAuthEndpoint(),
                config.isActive(),
                config.getValidationStatus(),
                config.getValidationMessage(),
                config.getLastValidatedAt(),
                config.getCreatedByAdmin() == null ? null : config.getCreatedByAdmin().getId(),
                config.getUpdatedByAdmin() == null ? null : config.getUpdatedByAdmin().getId(),
                config.getCreatedAt(),
                config.getUpdatedAt()
        );
    }
}
