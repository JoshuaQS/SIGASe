package mx.edu.utez.server.modules.elibro.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import mx.edu.utez.server.config.AppProperties;
import mx.edu.utez.server.modules.elibro.dto.StudentElibroAccessResponse;
import mx.edu.utez.server.modules.elibro.entity.ElibroConfig;
import mx.edu.utez.server.modules.elibro.repository.ElibroConfigRepository;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.shared.context.RequestContext;
import mx.edu.utez.server.shared.crypto.Aes256CryptoService;
import mx.edu.utez.server.shared.enums.ElibroAccessResult;
import mx.edu.utez.server.shared.enums.ElibroConfigStatus;
import mx.edu.utez.server.shared.enums.StudentStatus;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import mx.edu.utez.server.shared.util.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class ElibroSsoService {

    private final StudentRepository studentRepository;
    private final ElibroConfigRepository elibroConfigRepository;
    private final Aes256CryptoService aes256CryptoService;
    private final NextUrlValidator nextUrlValidator;
    private final ElibroAccessLogService elibroAccessLogService;
    private final ClientIpResolver clientIpResolver;
    private final AppProperties appProperties;
    private final RestClient elibroRestClient;
    private final ObjectMapper objectMapper;

    public ElibroSsoService(
            StudentRepository studentRepository,
            ElibroConfigRepository elibroConfigRepository,
            Aes256CryptoService aes256CryptoService,
            NextUrlValidator nextUrlValidator,
            ElibroAccessLogService elibroAccessLogService,
            ClientIpResolver clientIpResolver,
            AppProperties appProperties,
            RestClient elibroRestClient,
            ObjectMapper objectMapper
    ) {
        this.studentRepository = studentRepository;
        this.elibroConfigRepository = elibroConfigRepository;
        this.aes256CryptoService = aes256CryptoService;
        this.nextUrlValidator = nextUrlValidator;
        this.elibroAccessLogService = elibroAccessLogService;
        this.clientIpResolver = clientIpResolver;
        this.appProperties = appProperties;
        this.elibroRestClient = elibroRestClient;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public StudentElibroAccessResponse generateAccess(UUID studentId, String next, HttpServletRequest request) {
        long startMs = System.currentTimeMillis();
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED, "Sesión inválida."));
        String attemptedEmail = student.getInstitutionalEmail();
        String normalizedEmail = student.getInstitutionalEmailNormalized();
        String requestId = (String) request.getAttribute(RequestContext.REQUEST_ID_ATTR);
        String correlationId = (String) request.getAttribute(RequestContext.CORRELATION_ID_ATTR);
        String ipAddress = clientIpResolver.resolve(request);
        String userAgent = request.getHeader("User-Agent");
        String sessionId = request.getRequestedSessionId();
        String origin = request.getHeader("Origin");
        String referer = request.getHeader("Referer");
        String httpMethod = request.getMethod();
        String requestPath = request.getRequestURI();

        if (student.getStatus() != StudentStatus.ACTIVE) {
            elibroAccessLogService.log(new ElibroAccessLogCommand(
                    student,
                    attemptedEmail,
                    normalizedEmail,
                    ElibroAccessResult.FAILED_STUDENT_INACTIVE,
                    "STUDENT_INACTIVE",
                    "Estudiante inactivo.",
                    elapsed(startMs),
                    requestId,
                    correlationId,
                    ipAddress,
                    userAgent,
                    sessionId,
                    origin,
                    referer,
                    httpMethod,
                    requestPath,
                    next,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null
            ));
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Estudiante inactivo.");
        }

        Optional<String> normalizedNext;
        try {
            normalizedNext = nextUrlValidator.validateAndNormalize(next);
        } catch (BusinessException ex) {
            elibroAccessLogService.log(new ElibroAccessLogCommand(
                    student,
                    attemptedEmail,
                    normalizedEmail,
                    ElibroAccessResult.FAILED_NEXT_URL_VALIDATION,
                    "INVALID_NEXT",
                    "Parámetro next inválido.",
                    elapsed(startMs),
                    requestId,
                    correlationId,
                    ipAddress,
                    userAgent,
                    sessionId,
                    origin,
                    referer,
                    httpMethod,
                    requestPath,
                    next,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null
            ));
            throw ex;
        }

        ElibroConfig config = elibroConfigRepository.findFirstByStatusOrderByUpdatedAtDesc(ElibroConfigStatus.ACTIVE)
                .orElseThrow(() -> missingConfig(
                        student,
                        attemptedEmail,
                        normalizedEmail,
                        requestId,
                        correlationId,
                        ipAddress,
                        userAgent,
                        sessionId,
                        origin,
                        referer,
                        httpMethod,
                        requestPath,
                        normalizedNext.orElse(null),
                        startMs
                ));

        String authToken;
        String channelId;
        String channelSecret;
        try {
            authToken = aes256CryptoService.decrypt(config.getAuthTokenEncrypted());
            channelId = aes256CryptoService.decrypt(config.getChannelIdEncrypted());
            channelSecret = aes256CryptoService.decrypt(config.getChannelSecretEncrypted());
            if (!StringUtils.hasText(authToken) || !StringUtils.hasText(channelId) || !StringUtils.hasText(channelSecret)) {
                throw new IllegalStateException("Credenciales eLibro vacías.");
            }
        } catch (Exception ex) {
            throw missingConfig(
                    student,
                    attemptedEmail,
                    normalizedEmail,
                    requestId,
                    correlationId,
                    ipAddress,
                    userAgent,
                    sessionId,
                    origin,
                    referer,
                    httpMethod,
                    requestPath,
                    normalizedNext.orElse(null),
                    startMs
            );
        }

        String effectiveNext = normalizedNext.orElse(config.getNextUrl());
        URI requestUri = buildRequestUri(effectiveNext);
        Map<String, String> payload = new LinkedHashMap<>();
        payload.put("secret", channelSecret);
        payload.put("channel_id", channelId);
        payload.put("user", attemptedEmail);
        String payloadJson = serializePayload(payload);
        byte[] payloadBytes = payloadJson.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        long payloadLength = payloadBytes.length;

        try {
            Object responseBody = elibroRestClient.post()
                    .uri(requestUri)
                    .header(HttpHeaders.AUTHORIZATION, "Token " + authToken)
                    .header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                    .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(payloadLength))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payloadBytes)
                    .retrieve()
                    .body(Object.class);

            String redirectUrl = extractRedirectUrl(responseBody);
            if (!StringUtils.hasText(redirectUrl)) {
                throw new IllegalStateException("No redirect URL in eLibro response");
            }

            elibroAccessLogService.log(new ElibroAccessLogCommand(
                    student,
                    attemptedEmail,
                    normalizedEmail,
                    ElibroAccessResult.SUCCESS,
                    null,
                    null,
                    elapsed(startMs),
                    requestId,
                    correlationId,
                    ipAddress,
                    userAgent,
                    sessionId,
                    origin,
                    referer,
                    httpMethod,
                    requestPath,
                    effectiveNext,
                    redirectUrl,
                    config.getChannelName(),
                    200,
                    null,
                    null,
                    null
            ));
            return new StudentElibroAccessResponse(redirectUrl);
        } catch (Exception ex) {
            String providerErrorDetail = buildProviderErrorDetail(ex);
            Integer providerStatusCode = extractProviderStatusCode(ex);
            elibroAccessLogService.log(new ElibroAccessLogCommand(
                    student,
                    attemptedEmail,
                    normalizedEmail,
                    ElibroAccessResult.FAILED_ELIBRO_API,
                    "ELIBRO_API_ERROR",
                    providerErrorDetail,
                    elapsed(startMs),
                    requestId,
                    correlationId,
                    ipAddress,
                    userAgent,
                    sessionId,
                    origin,
                    referer,
                    httpMethod,
                    requestPath,
                    effectiveNext,
                    null,
                    config.getChannelName(),
                    providerStatusCode,
                    "ELIBRO_API_ERROR",
                    providerErrorDetail,
                    null
            ));
            throw new BusinessException(ErrorCode.PROVIDER_ERROR, "No se pudo abrir sesión en eLibro. " + providerErrorDetail);
        }
    }

    private BusinessException missingConfig(
            Student student,
            String attemptedEmail,
            String normalizedEmail,
            String requestId,
            String correlationId,
            String ipAddress,
            String userAgent,
            String sessionId,
            String origin,
            String referer,
            String httpMethod,
            String requestPath,
            String nextUrl,
            long startMs
    ) {
        elibroAccessLogService.log(new ElibroAccessLogCommand(
                student,
                attemptedEmail,
                normalizedEmail,
                ElibroAccessResult.FAILED_ELIBRO_CONFIG,
                "ELIBRO_CONFIG_MISSING",
                "Configuración eLibro incompleta o inactiva.",
                elapsed(startMs),
                requestId,
                correlationId,
                ipAddress,
                userAgent,
                sessionId,
                origin,
                referer,
                httpMethod,
                requestPath,
                nextUrl,
                null,
                null,
                null,
                null,
                null,
                null
        ));
        return new BusinessException(ErrorCode.SERVICE_UNAVAILABLE, "Configuración eLibro no disponible.");
    }

    private URI buildRequestUri(String nextUrl) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(appProperties.getElibro().getBaseUrl());
        if (StringUtils.hasText(nextUrl)) {
            builder.queryParam("next", nextUrl);
        }
        return builder.build(true).toUri();
    }

    private long elapsed(long startMs) {
        return Math.max(0, System.currentTimeMillis() - startMs);
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
        if (responseBody instanceof String text) {
            return text.trim();
        }
        return responseBody.toString();
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

    private String buildProviderErrorDetail(Exception ex) {
        if (ex instanceof RestClientResponseException restEx) {
            String responseBody = sanitize(restEx.getResponseBodyAsString());
            String statusLine = "HTTP " + restEx.getStatusCode().value();
            if (StringUtils.hasText(responseBody)) {
                return truncate(statusLine + " - " + responseBody, 220);
            }
            return statusLine;
        }
        return truncate(sanitize(ex.getMessage()), 220);
    }

    private Integer extractProviderStatusCode(Exception ex) {
        if (ex instanceof RestClientResponseException restEx) {
            return restEx.getStatusCode().value();
        }
        return null;
    }

    private String serializePayload(Map<String, String> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "No se pudo preparar el payload de eLibro.");
        }
    }

    private String sanitize(String text) {
        if (!StringUtils.hasText(text)) {
            return "error desconocido";
        }
        return text.replaceAll("[\\r\\n\\t]", " ").trim();
    }

    private String truncate(String text, int maxLen) {
        if (!StringUtils.hasText(text)) {
            return "error desconocido";
        }
        if (text.length() <= maxLen) {
            return text;
        }
        return text.substring(0, maxLen);
    }
}
