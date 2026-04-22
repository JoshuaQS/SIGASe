package mx.edu.utez.server.modules.elibro.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import mx.edu.utez.server.config.AppProperties;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.elibro.dto.ElibroConfigResponse;
import mx.edu.utez.server.modules.elibro.dto.ElibroConfigStatusChangeRequest;
import mx.edu.utez.server.modules.elibro.dto.ElibroConfigValidationResponse;
import mx.edu.utez.server.modules.elibro.dto.ElibroControlledValidationRequest;
import mx.edu.utez.server.modules.elibro.dto.ElibroControlledValidationResponse;
import mx.edu.utez.server.modules.elibro.dto.ElibroDraftValidationRequest;
import mx.edu.utez.server.modules.elibro.dto.PatchElibroConfigRequest;
import mx.edu.utez.server.modules.elibro.dto.UpsertElibroConfigRequest;
import mx.edu.utez.server.modules.elibro.entity.ElibroConfig;
import mx.edu.utez.server.modules.elibro.entity.ElibroValidationRun;
import mx.edu.utez.server.modules.elibro.mapper.ElibroConfigMapper;
import mx.edu.utez.server.modules.elibro.repository.ElibroConfigRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroValidationRunRepository;
import mx.edu.utez.server.modules.logs.audit.service.AuditTrailService;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.shared.context.RequestContext;
import mx.edu.utez.server.shared.crypto.Aes256CryptoService;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.ElibroConfigStatus;
import mx.edu.utez.server.shared.enums.ElibroValidationRunStatus;
import mx.edu.utez.server.shared.enums.ElibroValidationStatus;
import mx.edu.utez.server.shared.enums.ElibroValidationType;
import mx.edu.utez.server.shared.enums.StudentStatus;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class ElibroConfigService {

    private static final String PROVIDER_NAME = "eLibro";
    private static final String VALIDATION_ACTION = "ELIBRO_CONFIG_VALIDATE";

    private final ElibroConfigRepository elibroConfigRepository;
    private final ElibroValidationRunRepository validationRunRepository;
    private final StudentRepository studentRepository;
    private final ElibroConfigMapper mapper;
    private final Aes256CryptoService aes256CryptoService;
    private final AuditTrailService auditTrailService;
    private final NextUrlValidator nextUrlValidator;
    private final AppProperties appProperties;
    private final RestClient elibroRestClient;
    private final ObjectMapper objectMapper;

    public ElibroConfigService(
            ElibroConfigRepository elibroConfigRepository,
            ElibroValidationRunRepository validationRunRepository,
            StudentRepository studentRepository,
            ElibroConfigMapper mapper,
            Aes256CryptoService aes256CryptoService,
            AuditTrailService auditTrailService,
            NextUrlValidator nextUrlValidator,
            AppProperties appProperties,
            RestClient elibroRestClient,
            ObjectMapper objectMapper
    ) {
        this.elibroConfigRepository = elibroConfigRepository;
        this.validationRunRepository = validationRunRepository;
        this.studentRepository = studentRepository;
        this.mapper = mapper;
        this.aes256CryptoService = aes256CryptoService;
        this.auditTrailService = auditTrailService;
        this.nextUrlValidator = nextUrlValidator;
        this.appProperties = appProperties;
        this.elibroRestClient = elibroRestClient;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public ElibroConfigResponse getActive(Admin actorAdmin, HttpServletRequest httpRequest) {
        ElibroConfig config = getActiveConfigOrThrow();
        return mapper.toResponse(config);
    }

    @Transactional(readOnly = true)
    public List<ElibroConfigResponse> listAll(Admin actorAdmin, HttpServletRequest httpRequest) {
        return elibroConfigRepository.findAllByOrderByUpdatedAtDesc()
                .stream()
                .map(mapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ElibroConfig getActiveConfigOrThrow() {
        return elibroConfigRepository.findFirstByStatusOrderByUpdatedAtDesc(ElibroConfigStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "No hay configuración eLibro activa."));
    }

    @Transactional
    public ElibroConfigResponse create(
            UpsertElibroConfigRequest request,
            Admin actorAdmin,
            HttpServletRequest httpRequest
    ) {
        validateNextUrl(request.nextUrl());

        ElibroConfig config = new ElibroConfig();
        config.setName(resolveConfigName(request.name(), request.channelName()));
        config.setAuthTokenEncrypted(aes256CryptoService.encrypt(request.authToken().trim()));
        config.setChannelIdEncrypted(aes256CryptoService.encrypt(request.channelId().trim()));
        config.setChannelSecretEncrypted(aes256CryptoService.encrypt(request.channelSecret().trim()));
        config.setChannelName(request.channelName().trim());
        config.setNextUrl(normalizeNextUrl(request.nextUrl()));
        config.setStatus(resolveStatus(request.status()));
        config.setCreatedByAdmin(actorAdmin);
        config.setUpdatedByAdmin(actorAdmin);

        if (config.getStatus() == ElibroConfigStatus.ACTIVE) {
            deactivateOtherActiveConfigs(null, actorAdmin);
        }

        applyStructuralStatus(config);
        ElibroConfig saved = elibroConfigRepository.save(config);
        if (saved.getStatus() == ElibroConfigStatus.ACTIVE) {
            executeValidation(saved, actorAdmin, httpRequest);
        }

        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("name", saved.getName());
        metadata.put("channelName", saved.getChannelName());
        metadata.put("nextUrl", saved.getNextUrl());
        metadata.put("status", saved.getStatus().name());
        metadata.put("validationStatus", saved.getValidationStatus().name());
        metadata.put("hasAuthToken", StringUtils.hasText(saved.getAuthTokenEncrypted()));
        metadata.put("hasChannelSecret", StringUtils.hasText(saved.getChannelSecretEncrypted()));
        metadata.put("hasChannelId", StringUtils.hasText(saved.getChannelIdEncrypted()));

        auditTrailService.auditAdminAction(
                actorAdmin,
                "ELIBRO_CONFIG_CREATE",
                "ELIBRO_CONFIG",
                saved.getId().toString(),
                AuditOutcome.SUCCESS,
                metadata,
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
        boolean secretRotated = false;
        List<String> changedFields = new ArrayList<>();

        if (StringUtils.hasText(request.name())) {
            config.setName(request.name().trim());
            changedFields.add("name");
            changed = true;
        }
        if (StringUtils.hasText(request.authToken())) {
            config.setAuthTokenEncrypted(aes256CryptoService.encrypt(request.authToken().trim()));
            changedFields.add("authToken");
            changed = true;
            secretRotated = true;
        }
        if (StringUtils.hasText(request.channelId())) {
            config.setChannelIdEncrypted(aes256CryptoService.encrypt(request.channelId().trim()));
            changedFields.add("channelId");
            changed = true;
            secretRotated = true;
        }
        if (StringUtils.hasText(request.channelSecret())) {
            config.setChannelSecretEncrypted(aes256CryptoService.encrypt(request.channelSecret().trim()));
            changedFields.add("channelSecret");
            changed = true;
            secretRotated = true;
        }
        if (StringUtils.hasText(request.channelName())) {
            config.setChannelName(request.channelName().trim());
            changedFields.add("channelName");
            changed = true;
        }
        if (request.nextUrl() != null) {
            validateNextUrl(request.nextUrl());
            config.setNextUrl(normalizeNextUrl(request.nextUrl()));
            changedFields.add("nextUrl");
            changed = true;
        }
        if (request.status() != null) {
            config.setStatus(request.status());
            changedFields.add("status");
            changed = true;
        }

        if (!changed) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "No hay cambios válidos para actualizar.");
        }

        config.setUpdatedByAdmin(actorAdmin);

        if (config.getStatus() == ElibroConfigStatus.ACTIVE) {
            deactivateOtherActiveConfigs(config.getId(), actorAdmin);
        }

        applyStructuralStatus(config);
        ElibroConfig saved = elibroConfigRepository.save(config);
        if (saved.getStatus() == ElibroConfigStatus.ACTIVE) {
            executeValidation(saved, actorAdmin, httpRequest);
        }

        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("name", saved.getName());
        metadata.put("status", saved.getStatus().name());
        metadata.put("nextUrl", saved.getNextUrl());
        metadata.put("validationStatus", saved.getValidationStatus().name());
        metadata.put("changedFields", changedFields);
        metadata.put("secretRotated", secretRotated);

        auditTrailService.auditAdminAction(
                actorAdmin,
                "ELIBRO_CONFIG_UPDATE",
                "ELIBRO_CONFIG",
                saved.getId().toString(),
                AuditOutcome.SUCCESS,
                metadata,
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
        deactivateOtherActiveConfigs(config.getId(), actorAdmin);
        if (config.getStatus() != ElibroConfigStatus.ACTIVE) {
            config.setStatus(ElibroConfigStatus.ACTIVE);
        }
        config.setUpdatedByAdmin(actorAdmin);
        config = elibroConfigRepository.save(config);
        executeValidation(config, actorAdmin, httpRequest);
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
        if (config.getStatus() == ElibroConfigStatus.ACTIVE) {
            config.setStatus(ElibroConfigStatus.INACTIVE);
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
        ValidationExecutionResult result = executeValidation(config, actorAdmin, httpRequest);

        auditTrailService.auditAdminAction(
                actorAdmin,
                VALIDATION_ACTION,
                "ELIBRO_CONFIG",
                config.getId().toString(),
                result.outcome,
                buildValidationAuditMetadata(result),
                httpRequest
        );

        return new ElibroConfigValidationResponse(
                config.getId(),
                config.getValidationStatus(),
                config.getValidationMessage(),
                result.latencyMs,
                result.errorCode,
                result.requestId,
                result.correlationId,
                config.getLastValidatedAt()
        );
    }

    @Transactional(readOnly = true)
    public ElibroConfigValidationResponse validateDraft(
            ElibroDraftValidationRequest request,
            Admin actorAdmin,
            HttpServletRequest httpRequest
    ) {
        String requestId = requestAttribute(httpRequest, RequestContext.REQUEST_ID_ATTR, "system");
        String correlationId = requestAttribute(httpRequest, RequestContext.CORRELATION_ID_ATTR, "system");
        Instant checkedAt = Instant.now();

        validateNextUrl(request.nextUrl());
        String probeUser = resolveProbeUserForValidation();

        StructuralValidationResult structural = new StructuralValidationResult(
                true,
                request.authToken().trim(),
                request.channelId().trim(),
                request.channelSecret().trim(),
                null
        );

        ControlledProbeResult result = executeControlledProbe(
                new ElibroConfig(),
                structural,
                probeUser,
                normalizeNextUrl(request.nextUrl()),
                requestId,
                correlationId,
                checkedAt,
                false
        );

        ValidationExecutionResult executionResult = new ValidationExecutionResult(
                result.outcome == AuditOutcome.SUCCESS ? ElibroValidationRunStatus.SUCCESS : ElibroValidationRunStatus.FAILURE,
                result.message,
                result.latencyMs,
                result.errorCode,
                result.requestId,
                result.correlationId,
                result.checkedAt,
                result.outcome
        );

        auditTrailService.auditAdminAction(
                actorAdmin,
                "ELIBRO_CONFIG_VALIDATE_DRAFT",
                "ELIBRO_CONFIG",
                request.baseConfigId() == null ? "DRAFT" : request.baseConfigId().toString(),
                executionResult.outcome,
                buildValidationAuditMetadata(executionResult),
                httpRequest
        );

        return new ElibroConfigValidationResponse(
                request.baseConfigId(),
                result.outcome == AuditOutcome.SUCCESS ? ElibroValidationStatus.VALID : ElibroValidationStatus.INVALID,
                result.message,
                result.latencyMs,
                result.errorCode,
                result.requestId,
                result.correlationId,
                result.checkedAt
        );
    }

    @Transactional
    public ElibroControlledValidationResponse validateControlled(
            UUID configId,
            ElibroControlledValidationRequest request,
            Admin actorAdmin,
            HttpServletRequest httpRequest
    ) {
        ElibroConfig config = findByIdOrThrow(configId);
        String requestId = requestAttribute(httpRequest, RequestContext.REQUEST_ID_ATTR, "system");
        String correlationId = requestAttribute(httpRequest, RequestContext.CORRELATION_ID_ATTR, "system");
        Instant checkedAt = Instant.now();

        StructuralValidationResult structural = evaluateStructure(config);
        String normalizedTestUser = request.testUser().trim().toLowerCase(Locale.ROOT);
        String normalizedNextUrl = normalizeNextUrl(request.nextUrl());

        ControlledProbeResult result;
        if (!structural.valid) {
            String message = structural.message;
            config.setValidationStatus(ElibroValidationStatus.INVALID);
            config.setValidationMessage(message);
            config.setLastValidatedAt(checkedAt);
            result = new ControlledProbeResult(
                    message,
                    null,
                    "STRUCTURAL_INVALID",
                    null,
                    requestId,
                    correlationId,
                    checkedAt,
                    AuditOutcome.FAILURE
            );
        } else {
            result = executeControlledProbe(config, structural, normalizedTestUser, normalizedNextUrl, requestId, correlationId, checkedAt, true);
        }

        config.setUpdatedByAdmin(actorAdmin);
        elibroConfigRepository.save(config);
        saveValidationRun(config, actorAdmin, new ValidationExecutionResult(
                result.outcome == AuditOutcome.SUCCESS ? ElibroValidationRunStatus.SUCCESS : ElibroValidationRunStatus.FAILURE,
                result.message,
                result.latencyMs,
                result.errorCode,
                result.requestId,
                result.correlationId,
                result.checkedAt,
                result.outcome
        ));

        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("validationType", "CONTROLLED");
        metadata.put("status", config.getValidationStatus().name());
        metadata.put("message", result.message);
        metadata.put("latencyMs", result.latencyMs);
        metadata.put("errorCode", result.errorCode);
        metadata.put("testUser", normalizedTestUser);
        metadata.put("nextUrl", normalizedNextUrl);
        metadata.put("hasRedirectUrl", StringUtils.hasText(result.redirectUrl));

        auditTrailService.auditAdminAction(
                actorAdmin,
                "ELIBRO_CONFIG_VALIDATE_CONTROLLED",
                "ELIBRO_CONFIG",
                config.getId().toString(),
                result.outcome,
                metadata,
                httpRequest
        );

        return new ElibroControlledValidationResponse(
                config.getId(),
                normalizedTestUser,
                normalizedNextUrl,
                result.redirectUrl,
                config.getValidationStatus(),
                result.message,
                result.latencyMs,
                result.errorCode,
                result.requestId,
                result.correlationId,
                config.getLastValidatedAt()
        );
    }

    @Transactional
    public void delete(
            UUID configId,
            Admin actorAdmin,
            HttpServletRequest httpRequest
    ) {
        ElibroConfig config = findByIdOrThrow(configId);
        String configEntityId = config.getId().toString();

        elibroConfigRepository.delete(config);
        elibroConfigRepository.flush();

        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("name", config.getName());
        metadata.put("channelName", config.getChannelName());
        metadata.put("status", config.getStatus().name());
        metadata.put("validationStatus", config.getValidationStatus().name());

        auditTrailService.auditAdminAction(
                actorAdmin,
                "ELIBRO_CONFIG_DELETE",
                "ELIBRO_CONFIG",
                configEntityId,
                AuditOutcome.SUCCESS,
                metadata,
                httpRequest
        );
    }

    private ValidationExecutionResult executeValidation(ElibroConfig config, Admin actorAdmin, HttpServletRequest request) {
        String requestId = requestAttribute(request, RequestContext.REQUEST_ID_ATTR, "system");
        String correlationId = requestAttribute(request, RequestContext.CORRELATION_ID_ATTR, "system");
        Instant checkedAt = Instant.now();

        StructuralValidationResult structural = evaluateStructure(config);
        ValidationExecutionResult result;
        if (!structural.valid) {
            config.setValidationStatus(ElibroValidationStatus.INVALID);
            config.setValidationMessage(structural.message);
            config.setLastValidatedAt(checkedAt);
            result = new ValidationExecutionResult(
                    ElibroValidationRunStatus.FAILURE,
                    structural.message,
                    null,
                    "STRUCTURAL_INVALID",
                    requestId,
                    correlationId,
                    checkedAt,
                    AuditOutcome.FAILURE
            );
        } else {
            result = runOperationalValidationIfApplicable(config, structural, requestId, correlationId, checkedAt);
        }

        config.setUpdatedByAdmin(actorAdmin);
        elibroConfigRepository.save(config);
        saveValidationRun(config, actorAdmin, result);
        return result;
    }

    private ValidationExecutionResult runOperationalValidationIfApplicable(
            ElibroConfig config,
            StructuralValidationResult structural,
            String requestId,
            String correlationId,
            Instant checkedAt
    ) {
        String probeUser;
        try {
            probeUser = resolveProbeUserForValidation();
        } catch (BusinessException ex) {
            String message = "Validación operativa falló: no hay estudiante activo disponible para la prueba.";
            config.setValidationStatus(ElibroValidationStatus.INVALID);
            config.setValidationMessage(message);
            config.setLastValidatedAt(checkedAt);
            return new ValidationExecutionResult(
                    ElibroValidationRunStatus.FAILURE,
                    message,
                    null,
                    "PROBE_STUDENT_NOT_FOUND",
                    requestId,
                    correlationId,
                    checkedAt,
                    AuditOutcome.FAILURE
            );
        }
        ControlledProbeResult probeResult = executeControlledProbe(
                config,
                structural,
                probeUser,
                null,
                requestId,
                correlationId,
                checkedAt,
                false
        );
        return new ValidationExecutionResult(
                probeResult.outcome == AuditOutcome.SUCCESS ? ElibroValidationRunStatus.SUCCESS : ElibroValidationRunStatus.FAILURE,
                probeResult.message,
                probeResult.latencyMs,
                probeResult.errorCode,
                probeResult.requestId,
                probeResult.correlationId,
                probeResult.checkedAt,
                probeResult.outcome
        );
    }

    private ControlledProbeResult executeControlledProbe(
            ElibroConfig config,
            StructuralValidationResult structural,
            String testUser,
            String nextUrl,
            String requestId,
            String correlationId,
            Instant checkedAt,
            boolean controlled
    ) {
        Map<String, String> payload = Map.of(
                "secret", structural.channelSecret,
                "channel_id", structural.channelId,
                "user", testUser
        );
        String payloadJson = serializePayload(payload);
        byte[] payloadBytes = payloadJson.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        long payloadLength = payloadBytes.length;
        long startedAt = System.nanoTime();
        try {
            Object responseBody = elibroRestClient.post()
                    .uri(buildValidationUri(nextUrl))
                    .header(HttpHeaders.AUTHORIZATION, "Token " + structural.authToken)
                    .header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                    .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(payloadLength))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payloadBytes)
                    .retrieve()
                    .body(Object.class);

            long latencyMs = elapsedMillis(startedAt);
            String redirectUrl = extractRedirectUrl(responseBody);
            if (!StringUtils.hasText(redirectUrl)) {
                String message = controlled
                        ? "Prueba controlada falló: respuesta sin URL de redirección."
                        : "Validación operativa falló: respuesta sin URL de redirección.";
                config.setValidationStatus(ElibroValidationStatus.INVALID);
                config.setValidationMessage(message);
                config.setLastValidatedAt(checkedAt);
                return new ControlledProbeResult(message, latencyMs, "MISSING_REDIRECT_URL", null, requestId, correlationId, checkedAt, AuditOutcome.FAILURE);
            }

            String message = controlled
                    ? "Prueba controlada exitosa con " + PROVIDER_NAME + "."
                    : "Validación operativa exitosa con " + PROVIDER_NAME + ".";
            config.setValidationStatus(ElibroValidationStatus.VALID);
            config.setValidationMessage(message);
            config.setLastValidatedAt(checkedAt);
            return new ControlledProbeResult(message, latencyMs, null, redirectUrl, requestId, correlationId, checkedAt, AuditOutcome.SUCCESS);
        } catch (Exception ex) {
            long latencyMs = elapsedMillis(startedAt);
            String message = (controlled ? "Prueba controlada falló: " : "Validación operativa falló: ") + safeMessage(ex);
            config.setValidationStatus(ElibroValidationStatus.INVALID);
            config.setValidationMessage(message);
            config.setLastValidatedAt(checkedAt);
            return new ControlledProbeResult(message, latencyMs, "ELIBRO_API_ERROR", null, requestId, correlationId, checkedAt, AuditOutcome.FAILURE);
        }
    }

    private void saveValidationRun(ElibroConfig config, Admin actorAdmin, ValidationExecutionResult result) {
        ElibroValidationRun run = new ElibroValidationRun();
        run.setConfig(config);
        run.setExecutedByAdmin(actorAdmin);
        run.setStatus(result.status);
        run.setValidationType(ElibroValidationType.MANUAL);
        run.setMessage(result.message);
        run.setLatencyMs(result.latencyMs);
        run.setErrorCode(result.errorCode);
        run.setEndpointTested(appProperties.getElibro().getBaseUrl());
        run.setRequestId(result.requestId);
        run.setCorrelationId(result.correlationId);
        run.setCheckedAt(result.checkedAt);
        validationRunRepository.save(run);
    }

    private Map<String, Object> buildValidationAuditMetadata(ValidationExecutionResult result) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("validationType", ElibroValidationType.MANUAL.name());
        metadata.put("status", result.status.name());
        metadata.put("message", result.message);
        metadata.put("latencyMs", result.latencyMs);
        metadata.put("errorCode", result.errorCode);
        return metadata;
    }

    private void applyStructuralStatus(ElibroConfig config) {
        StructuralValidationResult structural = evaluateStructure(config);
        if (structural.valid) {
            config.setValidationStatus(ElibroValidationStatus.NOT_VALIDATED);
            config.setValidationMessage("Configuración estructural correcta. Pendiente validación operativa.");
            config.setLastValidatedAt(null);
            return;
        }
        config.setValidationStatus(ElibroValidationStatus.INVALID);
        config.setValidationMessage(structural.message);
        config.setLastValidatedAt(Instant.now());
    }

    private StructuralValidationResult evaluateStructure(ElibroConfig config) {
        try {
            validateNextUrl(config.getNextUrl());
            String authToken = aes256CryptoService.decrypt(config.getAuthTokenEncrypted());
            String channelId = aes256CryptoService.decrypt(config.getChannelIdEncrypted());
            String channelSecret = aes256CryptoService.decrypt(config.getChannelSecretEncrypted());
            if (!StringUtils.hasText(authToken) || !StringUtils.hasText(channelId) || !StringUtils.hasText(channelSecret)) {
                return new StructuralValidationResult(false, null, null, null, "Configuración inválida: credenciales vacías.");
            }
            return new StructuralValidationResult(true, authToken.trim(), channelId.trim(), channelSecret.trim(), null);
        } catch (BusinessException ex) {
            return new StructuralValidationResult(false, null, null, null, ex.getMessage());
        } catch (Exception ex) {
            return new StructuralValidationResult(false, null, null, null, "Configuración inválida: " + safeMessage(ex));
        }
    }

    private String resolveProbeUserForValidation() {
        Optional<Student> probeStudent = studentRepository
                .findFirstByStatusAndInstitutionalEmailNormalizedIsNotNullOrderByUpdatedAtDesc(StudentStatus.ACTIVE);
        if (probeStudent.isEmpty()) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "No hay estudiante activo disponible para la validación de eLibro."
            );
        }
        return probeStudent.get().getInstitutionalEmailNormalized();
    }

    private void deactivateOtherActiveConfigs(UUID keepConfigId, Admin actorAdmin) {
        List<ElibroConfig> activeConfigs = keepConfigId == null
                ? elibroConfigRepository.findAllByStatusOrderByUpdatedAtDesc(ElibroConfigStatus.ACTIVE)
                : elibroConfigRepository.findAllByStatusAndIdNotOrderByUpdatedAtDesc(ElibroConfigStatus.ACTIVE, keepConfigId);

        if (activeConfigs.isEmpty()) {
            return;
        }

        for (ElibroConfig activeConfig : activeConfigs) {
            activeConfig.setStatus(ElibroConfigStatus.INACTIVE);
            activeConfig.setUpdatedByAdmin(actorAdmin);
        }
        elibroConfigRepository.saveAll(activeConfigs);
    }

    private void validateNextUrl(String nextUrl) {
        if (!StringUtils.hasText(nextUrl)) {
            return;
        }
        try {
            nextUrlValidator.validateAndNormalize(nextUrl);
        } catch (BusinessException ex) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "nextUrl inválido.");
        }
    }

    private String normalizeNextUrl(String nextUrl) {
        if (!StringUtils.hasText(nextUrl)) {
            return null;
        }
        return nextUrlValidator.validateAndNormalize(nextUrl).orElse(null);
    }

    private ElibroConfigStatus resolveStatus(ElibroConfigStatus status) {
        return status == null ? ElibroConfigStatus.ACTIVE : status;
    }

    private String resolveConfigName(String requestName, String fallbackChannelName) {
        if (StringUtils.hasText(requestName)) {
            return requestName.trim();
        }
        if (StringUtils.hasText(fallbackChannelName)) {
            return "SSO " + fallbackChannelName.trim().toUpperCase(Locale.ROOT);
        }
        return "Configuración SSO eLibro";
    }

    private ElibroConfig findByIdOrThrow(UUID configId) {
        return elibroConfigRepository.findById(configId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Configuración eLibro no encontrada."));
    }

    private String requestAttribute(HttpServletRequest request, String attribute, String fallback) {
        if (request == null) {
            return fallback;
        }
        Object value = request.getAttribute(attribute);
        if (value == null) {
            return fallback;
        }
        String text = value.toString();
        return StringUtils.hasText(text) ? text : fallback;
    }

    private long elapsedMillis(long startedAtNanos) {
        return Math.max(0L, (System.nanoTime() - startedAtNanos) / 1_000_000L);
    }

    private URI buildValidationUri(String nextUrl) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(appProperties.getElibro().getBaseUrl());
        if (StringUtils.hasText(nextUrl)) {
            builder.queryParam("next", nextUrl);
        }
        return builder.build(true).toUri();
    }

    private String stringValue(Object value) {
        return value == null ? null : value.toString();
    }

    private String extractRedirectUrl(Object responseBody) {
        if (responseBody == null) {
            return null;
        }
        if (responseBody instanceof Map<?, ?> map) {
            String direct = firstText(map, "url", "redirectUrl", "redirect_url");
            if (StringUtils.hasText(direct)) {
                return direct;
            }
            Object nestedData = map.get("data");
            if (nestedData instanceof Map<?, ?> nested) {
                return firstText(nested, "url", "redirectUrl", "redirect_url");
            }
            return null;
        }
        return stringValue(responseBody);
    }

    private String firstText(Map<?, ?> map, String... keys) {
        for (String key : keys) {
            Object value = map.get(key);
            if (value != null) {
                String text = value.toString().trim();
                if (StringUtils.hasText(text)) {
                    return text;
                }
            }
        }
        return null;
    }

    private String serializePayload(Map<String, String> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "No se pudo preparar el payload de validación eLibro.");
        }
    }

    private String safeMessage(Exception ex) {
        if (ex instanceof RestClientResponseException restEx) {
            String responseBody = restEx.getResponseBodyAsString();
            String statusLine = "HTTP " + restEx.getStatusCode().value();
            if (StringUtils.hasText(responseBody)) {
                String sanitizedResponse = responseBody.replaceAll("[\\r\\n\\t]", " ").trim();
                String combined = statusLine + " - " + sanitizedResponse;
                if (combined.length() > 200) {
                    return combined.substring(0, 200);
                }
                return combined;
            }
            return statusLine;
        }

        String msg = ex.getMessage();
        if (!StringUtils.hasText(msg)) {
            return "error desconocido";
        }
        String sanitized = msg.replaceAll("[\\r\\n\\t]", " ").trim();
        if (sanitized.length() > 200) {
            return sanitized.substring(0, 200);
        }
        return sanitized;
    }

    private static final class StructuralValidationResult {
        private final boolean valid;
        private final String authToken;
        private final String channelId;
        private final String channelSecret;
        private final String message;

        private StructuralValidationResult(
                boolean valid,
                String authToken,
                String channelId,
                String channelSecret,
                String message
        ) {
            this.valid = valid;
            this.authToken = authToken;
            this.channelId = channelId;
            this.channelSecret = channelSecret;
            this.message = message;
        }
    }

    private static final class ValidationExecutionResult {
        private final ElibroValidationRunStatus status;
        private final String message;
        private final Long latencyMs;
        private final String errorCode;
        private final String requestId;
        private final String correlationId;
        private final Instant checkedAt;
        private final AuditOutcome outcome;

        private ValidationExecutionResult(
                ElibroValidationRunStatus status,
                String message,
                Long latencyMs,
                String errorCode,
                String requestId,
                String correlationId,
                Instant checkedAt,
                AuditOutcome outcome
        ) {
            this.status = status;
            this.message = message;
            this.latencyMs = latencyMs;
            this.errorCode = errorCode;
            this.requestId = requestId;
            this.correlationId = correlationId;
            this.checkedAt = checkedAt;
            this.outcome = outcome;
        }
    }

    private static final class ControlledProbeResult {
        private final String message;
        private final Long latencyMs;
        private final String errorCode;
        private final String redirectUrl;
        private final String requestId;
        private final String correlationId;
        private final Instant checkedAt;
        private final AuditOutcome outcome;

        private ControlledProbeResult(
                String message,
                Long latencyMs,
                String errorCode,
                String redirectUrl,
                String requestId,
                String correlationId,
                Instant checkedAt,
                AuditOutcome outcome
        ) {
            this.message = message;
            this.latencyMs = latencyMs;
            this.errorCode = errorCode;
            this.redirectUrl = redirectUrl;
            this.requestId = requestId;
            this.correlationId = correlationId;
            this.checkedAt = checkedAt;
            this.outcome = outcome;
        }
    }
}
