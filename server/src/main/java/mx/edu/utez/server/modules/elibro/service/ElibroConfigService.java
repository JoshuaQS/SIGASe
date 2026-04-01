package mx.edu.utez.server.modules.elibro.service;

import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.elibro.dto.ElibroConfigResponse;
import mx.edu.utez.server.modules.elibro.dto.ElibroConfigStatusChangeRequest;
import mx.edu.utez.server.modules.elibro.dto.ElibroConfigValidationResponse;
import mx.edu.utez.server.modules.elibro.dto.PatchElibroConfigRequest;
import mx.edu.utez.server.modules.elibro.dto.UpsertElibroConfigRequest;
import mx.edu.utez.server.modules.elibro.entity.ElibroConfig;
import mx.edu.utez.server.modules.elibro.mapper.ElibroConfigMapper;
import mx.edu.utez.server.modules.elibro.repository.ElibroConfigRepository;
import mx.edu.utez.server.modules.logs.audit.service.AuditTrailService;
import mx.edu.utez.server.shared.crypto.Aes256CryptoService;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.ElibroValidationStatus;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class ElibroConfigService {

    private final ElibroConfigRepository elibroConfigRepository;
    private final ElibroConfigMapper mapper;
    private final Aes256CryptoService aes256CryptoService;
    private final AuditTrailService auditTrailService;

    public ElibroConfigService(
            ElibroConfigRepository elibroConfigRepository,
            ElibroConfigMapper mapper,
            Aes256CryptoService aes256CryptoService,
            AuditTrailService auditTrailService
    ) {
        this.elibroConfigRepository = elibroConfigRepository;
        this.mapper = mapper;
        this.aes256CryptoService = aes256CryptoService;
        this.auditTrailService = auditTrailService;
    }

    @Transactional(readOnly = true)
    public ElibroConfigResponse getActive(Admin actorAdmin, HttpServletRequest httpRequest) {
        ElibroConfig config = elibroConfigRepository.findFirstByActiveTrueOrderByUpdatedAtDesc()
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "No hay configuración eLibro activa."));
        return mapper.toResponse(config);
    }

    @Transactional
    public ElibroConfigResponse create(
            UpsertElibroConfigRequest request,
            Admin actorAdmin,
            HttpServletRequest httpRequest
    ) {
        validateAuthEndpoint(request.authEndpoint());
        ElibroConfig config = new ElibroConfig();
        config.setAuthTokenEncrypted(aes256CryptoService.encrypt(request.authToken().trim()));
        config.setChannelIdEncrypted(aes256CryptoService.encrypt(request.channelId().trim()));
        config.setChannelSecretEncrypted(aes256CryptoService.encrypt(request.channelSecret().trim()));
        config.setChannelName(request.channelName().trim());
        config.setAuthEndpoint(request.authEndpoint().trim());
        config.setActive(request.active());
        config.setCreatedByAdmin(actorAdmin);
        config.setUpdatedByAdmin(actorAdmin);

        if (request.active()) {
            deactivateOthers(null);
        }

        applyValidationStatus(config);
        ElibroConfig saved = elibroConfigRepository.save(config);
        auditTrailService.auditAdminAction(
                actorAdmin,
                "ELIBRO_CONFIG_CREATE",
                "ELIBRO_CONFIG",
                saved.getId().toString(),
                AuditOutcome.SUCCESS,
                Map.of(
                        "channelName", saved.getChannelName(),
                        "authEndpoint", saved.getAuthEndpoint(),
                        "active", saved.isActive(),
                        "validationStatus", saved.getValidationStatus().name()
                ),
                httpRequest
        );
        return mapper.toResponse(saved);
    }

    @Transactional
    public ElibroConfigResponse update(
            UUID configId,
            PatchElibroConfigRequest request,
            Admin actorAdmin,
            HttpServletRequest httpRequest
    ) {
        ElibroConfig config = findByIdOrThrow(configId);

        boolean changed = false;
        if (StringUtils.hasText(request.authToken())) {
            config.setAuthTokenEncrypted(aes256CryptoService.encrypt(request.authToken().trim()));
            changed = true;
        }
        if (StringUtils.hasText(request.channelId())) {
            config.setChannelIdEncrypted(aes256CryptoService.encrypt(request.channelId().trim()));
            changed = true;
        }
        if (StringUtils.hasText(request.channelSecret())) {
            config.setChannelSecretEncrypted(aes256CryptoService.encrypt(request.channelSecret().trim()));
            changed = true;
        }
        if (StringUtils.hasText(request.channelName())) {
            config.setChannelName(request.channelName().trim());
            changed = true;
        }
        if (StringUtils.hasText(request.authEndpoint())) {
            validateAuthEndpoint(request.authEndpoint());
            config.setAuthEndpoint(request.authEndpoint().trim());
            changed = true;
        }
        if (request.active() != null) {
            config.setActive(request.active());
            changed = true;
        }

        if (!changed) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "No hay cambios válidos para actualizar.");
        }

        config.setUpdatedByAdmin(actorAdmin);

        if (config.isActive()) {
            deactivateOthers(config.getId());
        }

        applyValidationStatus(config);
        ElibroConfig saved = elibroConfigRepository.save(config);
        auditTrailService.auditAdminAction(
                actorAdmin,
                "ELIBRO_CONFIG_UPDATE",
                "ELIBRO_CONFIG",
                saved.getId().toString(),
                AuditOutcome.SUCCESS,
                Map.of(
                        "channelName", saved.getChannelName(),
                        "authEndpoint", saved.getAuthEndpoint(),
                        "active", saved.isActive(),
                        "validationStatus", saved.getValidationStatus().name()
                ),
                httpRequest
        );
        return mapper.toResponse(saved);
    }

    @Transactional
    public ElibroConfigResponse activate(
            UUID configId,
            ElibroConfigStatusChangeRequest request,
            Admin actorAdmin,
            HttpServletRequest httpRequest
    ) {
        ElibroConfig config = findByIdOrThrow(configId);
        if (!config.isActive()) {
            config.setActive(true);
            config.setUpdatedByAdmin(actorAdmin);
            deactivateOthers(config.getId());
            applyValidationStatus(config);
            config = elibroConfigRepository.save(config);
        }
        auditTrailService.auditAdminAction(
                actorAdmin,
                "ELIBRO_CONFIG_ACTIVATE",
                "ELIBRO_CONFIG",
                config.getId().toString(),
                AuditOutcome.SUCCESS,
                Map.of("reason", request.reason().trim()),
                httpRequest
        );
        return mapper.toResponse(config);
    }

    @Transactional
    public ElibroConfigResponse deactivate(
            UUID configId,
            ElibroConfigStatusChangeRequest request,
            Admin actorAdmin,
            HttpServletRequest httpRequest
    ) {
        ElibroConfig config = findByIdOrThrow(configId);
        if (config.isActive()) {
            config.setActive(false);
            config.setUpdatedByAdmin(actorAdmin);
            config = elibroConfigRepository.save(config);
        }
        auditTrailService.auditAdminAction(
                actorAdmin,
                "ELIBRO_CONFIG_DEACTIVATE",
                "ELIBRO_CONFIG",
                config.getId().toString(),
                AuditOutcome.SUCCESS,
                Map.of("reason", request.reason().trim()),
                httpRequest
        );
        return mapper.toResponse(config);
    }

    @Transactional
    public ElibroConfigValidationResponse validate(
            UUID configId,
            Admin actorAdmin,
            HttpServletRequest httpRequest
    ) {
        ElibroConfig config = findByIdOrThrow(configId);
        applyValidationStatus(config);
        config.setUpdatedByAdmin(actorAdmin);
        ElibroConfig saved = elibroConfigRepository.save(config);
        auditTrailService.auditAdminAction(
                actorAdmin,
                "ELIBRO_CONFIG_VALIDATE",
                "ELIBRO_CONFIG",
                saved.getId().toString(),
                AuditOutcome.SUCCESS,
                Map.of(
                        "validationStatus", saved.getValidationStatus().name(),
                        "validationMessage", saved.getValidationMessage()
                ),
                httpRequest
        );
        return new ElibroConfigValidationResponse(
                saved.getId(),
                saved.getValidationStatus(),
                saved.getValidationMessage(),
                saved.getLastValidatedAt()
        );
    }

    private void applyValidationStatus(ElibroConfig config) {
        try {
            String authToken = aes256CryptoService.decrypt(config.getAuthTokenEncrypted());
            String channelId = aes256CryptoService.decrypt(config.getChannelIdEncrypted());
            String channelSecret = aes256CryptoService.decrypt(config.getChannelSecretEncrypted());
            validateAuthEndpoint(config.getAuthEndpoint());
            if (!StringUtils.hasText(authToken) || !StringUtils.hasText(channelId) || !StringUtils.hasText(channelSecret)) {
                throw new IllegalStateException("Credenciales vacías");
            }
            config.setValidationStatus(ElibroValidationStatus.VALID);
            config.setValidationMessage("Configuración válida a nivel estructural.");
            config.setLastValidatedAt(Instant.now());
        } catch (Exception ex) {
            config.setValidationStatus(ElibroValidationStatus.INVALID);
            config.setValidationMessage("Configuración inválida: " + safeMessage(ex));
            config.setLastValidatedAt(Instant.now());
        }
    }

    private void deactivateOthers(UUID currentId) {
        if (currentId == null) {
            elibroConfigRepository.findAll().forEach(item -> {
                if (item.isActive()) {
                    item.setActive(false);
                    elibroConfigRepository.save(item);
                }
            });
            return;
        }
        elibroConfigRepository.findAllByActiveTrueAndIdNot(currentId).forEach(item -> {
            item.setActive(false);
            elibroConfigRepository.save(item);
        });
    }

    private void validateAuthEndpoint(String endpoint) {
        try {
            URI uri = URI.create(endpoint.trim());
            if (!uri.isAbsolute() || !"https".equalsIgnoreCase(uri.getScheme()) || !StringUtils.hasText(uri.getHost())) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR, "authEndpoint inválido.");
            }
        } catch (IllegalArgumentException ex) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "authEndpoint inválido.");
        }
    }

    private ElibroConfig findByIdOrThrow(UUID configId) {
        return elibroConfigRepository.findById(configId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Configuración eLibro no encontrada."));
    }

    private String safeMessage(Exception ex) {
        String msg = ex.getMessage();
        if (!StringUtils.hasText(msg)) {
            return "error desconocido";
        }
        if (msg.length() > 200) {
            return msg.substring(0, 200);
        }
        return msg;
    }
}
