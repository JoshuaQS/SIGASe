package mx.edu.utez.server.modules.elibro.service;

import mx.edu.utez.server.modules.elibro.dto.StudentElibroAccessResponse;
import mx.edu.utez.server.modules.elibro.entity.ElibroConfig;
import mx.edu.utez.server.modules.elibro.repository.ElibroConfigRepository;
import mx.edu.utez.server.modules.logs.access.service.AccessLogCommand;
import mx.edu.utez.server.modules.logs.access.service.AccessLogService;
import mx.edu.utez.server.modules.logs.access.service.StudentAccessAlertService;
import mx.edu.utez.server.modules.students.entity.Student;
import mx.edu.utez.server.modules.students.repository.StudentRepository;
import mx.edu.utez.server.shared.context.RequestContext;
import mx.edu.utez.server.shared.crypto.Aes256CryptoService;
import mx.edu.utez.server.shared.enums.AccessResult;
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
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class ElibroSsoService {

    private static final String ELIBRO_PROVIDER_NAME = "ELIBRO";

    private final StudentRepository studentRepository;
    private final ElibroConfigRepository elibroConfigRepository;
    private final Aes256CryptoService aes256CryptoService;
    private final NextUrlValidator nextUrlValidator;
    private final AccessLogService accessLogService;
    private final StudentAccessAlertService studentAccessAlertService;
    private final ClientIpResolver clientIpResolver;
    private final RestClient elibroRestClient;

    public ElibroSsoService(
            StudentRepository studentRepository,
            ElibroConfigRepository elibroConfigRepository,
            Aes256CryptoService aes256CryptoService,
            NextUrlValidator nextUrlValidator,
            AccessLogService accessLogService,
            StudentAccessAlertService studentAccessAlertService,
            ClientIpResolver clientIpResolver,
            RestClient elibroRestClient
    ) {
        this.studentRepository = studentRepository;
        this.elibroConfigRepository = elibroConfigRepository;
        this.aes256CryptoService = aes256CryptoService;
        this.nextUrlValidator = nextUrlValidator;
        this.accessLogService = accessLogService;
        this.studentAccessAlertService = studentAccessAlertService;
        this.clientIpResolver = clientIpResolver;
        this.elibroRestClient = elibroRestClient;
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

        if (student.getStatus() != StudentStatus.ACTIVE) {
            studentAccessAlertService.registerFailedAttempt(normalizedEmail, student);
            accessLogService.log(new AccessLogCommand(
                    student,
                    attemptedEmail,
                    normalizedEmail,
                    AccessResult.FAILED_STUDENT_INACTIVE,
                    "STUDENT_INACTIVE",
                    "Estudiante inactivo.",
                    elapsed(startMs),
                    requestId,
                    correlationId,
                    ipAddress,
                    userAgent,
                    ELIBRO_PROVIDER_NAME,
                    next,
                    null
            ));
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Estudiante inactivo.");
        }

        Optional<String> normalizedNext;
        try {
            normalizedNext = nextUrlValidator.validateAndNormalize(next);
        } catch (BusinessException ex) {
            studentAccessAlertService.registerFailedAttempt(normalizedEmail, student);
            accessLogService.log(new AccessLogCommand(
                    student,
                    attemptedEmail,
                    normalizedEmail,
                    AccessResult.FAILED_NEXT_URL_VALIDATION,
                    "INVALID_NEXT",
                    "Parámetro next inválido.",
                    elapsed(startMs),
                    requestId,
                    correlationId,
                    ipAddress,
                    userAgent,
                    ELIBRO_PROVIDER_NAME,
                    next,
                    null
            ));
            throw ex;
        }

        ElibroConfig config = elibroConfigRepository.findFirstByActiveTrueOrderByUpdatedAtDesc()
                .orElseThrow(() -> missingConfig(
                        student,
                        attemptedEmail,
                        normalizedEmail,
                        requestId,
                        correlationId,
                        ipAddress,
                        userAgent,
                        normalizedNext.orElse(null),
                        startMs
                ));

        String authEndpoint = config.getAuthEndpoint();
        if (!StringUtils.hasText(authEndpoint)) {
            throw missingConfig(
                    student,
                    attemptedEmail,
                    normalizedEmail,
                    requestId,
                    correlationId,
                    ipAddress,
                    userAgent,
                    normalizedNext.orElse(null),
                    startMs
            );
        }

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
                    normalizedNext.orElse(null),
                    startMs
            );
        }

        URI requestUri = buildRequestUri(authEndpoint, normalizedNext);
        Map<String, String> payload = new LinkedHashMap<>();
        payload.put("secret", channelSecret);
        payload.put("channel_id", channelId);
        payload.put("user", attemptedEmail);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> responseBody = elibroRestClient.post()
                    .uri(requestUri)
                    .header(HttpHeaders.AUTHORIZATION, "Token " + authToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(Map.class);

            String redirectUrl = responseBody == null ? null : (String) responseBody.get("url");
            if (!StringUtils.hasText(redirectUrl)) {
                throw new IllegalStateException("No redirect URL in eLibro response");
            }

            studentAccessAlertService.registerSuccess(normalizedEmail);
            accessLogService.log(new AccessLogCommand(
                    student,
                    attemptedEmail,
                    normalizedEmail,
                    AccessResult.SUCCESS,
                    null,
                    null,
                    elapsed(startMs),
                    requestId,
                    correlationId,
                    ipAddress,
                    userAgent,
                    ELIBRO_PROVIDER_NAME,
                    normalizedNext.orElse(null),
                    redirectUrl
            ));
            return new StudentElibroAccessResponse(redirectUrl);
        } catch (Exception ex) {
            studentAccessAlertService.registerFailedAttempt(normalizedEmail, student);
            accessLogService.log(new AccessLogCommand(
                    student,
                    attemptedEmail,
                    normalizedEmail,
                    AccessResult.FAILED_ELIBRO_API,
                    "ELIBRO_API_ERROR",
                    "Error al consumir API SSO de eLibro.",
                    elapsed(startMs),
                    requestId,
                    correlationId,
                    ipAddress,
                    userAgent,
                    ELIBRO_PROVIDER_NAME,
                    normalizedNext.orElse(null),
                    null
            ));
            throw new BusinessException(ErrorCode.PROVIDER_ERROR, "Proveedor eLibro no disponible temporalmente.");
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
            String nextUrl,
            long startMs
    ) {
        studentAccessAlertService.registerFailedAttempt(normalizedEmail, student);
        accessLogService.log(new AccessLogCommand(
                student,
                attemptedEmail,
                normalizedEmail,
                AccessResult.FAILED_ELIBRO_CONFIG,
                "ELIBRO_CONFIG_MISSING",
                "Configuración eLibro incompleta o inactiva.",
                elapsed(startMs),
                requestId,
                correlationId,
                ipAddress,
                userAgent,
                ELIBRO_PROVIDER_NAME,
                nextUrl,
                null
        ));
        return new BusinessException(ErrorCode.SERVICE_UNAVAILABLE, "Configuración eLibro no disponible.");
    }

    private URI buildRequestUri(String endpoint, Optional<String> next) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(endpoint);
        next.ifPresent(value -> builder.queryParam("next", value));
        return builder.build(true).toUri();
    }

    private long elapsed(long startMs) {
        return Math.max(0, System.currentTimeMillis() - startMs);
    }
}
