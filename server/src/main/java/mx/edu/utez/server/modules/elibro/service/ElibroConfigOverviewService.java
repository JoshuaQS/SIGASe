package mx.edu.utez.server.modules.elibro.service;

import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.elibro.dto.ElibroConfigOverviewResponse;
import mx.edu.utez.server.modules.elibro.dto.ElibroOverviewCharts;
import mx.edu.utez.server.modules.elibro.dto.ElibroOverviewChecklist;
import mx.edu.utez.server.modules.elibro.dto.ElibroOverviewInsight;
import mx.edu.utez.server.modules.elibro.dto.ElibroOverviewKpis;
import mx.edu.utez.server.modules.elibro.dto.ElibroOverviewLatencyPoint;
import mx.edu.utez.server.modules.elibro.dto.ElibroOverviewRecentActivity;
import mx.edu.utez.server.modules.elibro.dto.ElibroOverviewStatus;
import mx.edu.utez.server.modules.elibro.dto.ElibroOverviewUptimeWeekly;
import mx.edu.utez.server.modules.elibro.dto.ElibroOverviewValidationPoint;
import mx.edu.utez.server.modules.elibro.entity.ElibroConfig;
import mx.edu.utez.server.modules.elibro.entity.ElibroAccessLog;
import mx.edu.utez.server.modules.elibro.entity.ElibroValidationRun;
import mx.edu.utez.server.modules.elibro.mapper.ElibroConfigMapper;
import mx.edu.utez.server.modules.elibro.repository.ElibroAccessLogRepository;
import mx.edu.utez.server.modules.elibro.repository.ElibroValidationRunRepository;
import mx.edu.utez.server.modules.logs.audit.entity.AuditLog;
import mx.edu.utez.server.modules.logs.audit.repository.AuditLogRepository;
import mx.edu.utez.server.config.AppProperties;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.ElibroConfigStatus;
import mx.edu.utez.server.shared.enums.ElibroValidationRunStatus;
import mx.edu.utez.server.shared.enums.ElibroValidationStatus;
import mx.edu.utez.server.shared.enums.ElibroValidationType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class ElibroConfigOverviewService {

    private static final String PROVIDER_LABEL = "eLibro";
    private static final String DEFAULT_SSO_ENDPOINT = "https://auth.elibro.net/auth/sso/";

    private static final List<String> RECENT_ACTIVITY_ACTIONS = List.of(
            "ELIBRO_CONFIG_CREATE",
            "ELIBRO_CONFIG_UPDATE",
            "ELIBRO_CONFIG_VALIDATE",
            "ELIBRO_CONFIG_ACTIVATE",
            "ELIBRO_CONFIG_DEACTIVATE"
    );

    private final ElibroConfigService elibroConfigService;
    private final ElibroConfigMapper mapper;
    private final ElibroAccessLogRepository elibroAccessLogRepository;
    private final ElibroValidationRunRepository validationRunRepository;
    private final AuditLogRepository auditLogRepository;
    private final AppProperties appProperties;

    public ElibroConfigOverviewService(
            ElibroConfigService elibroConfigService,
            ElibroConfigMapper mapper,
            ElibroAccessLogRepository elibroAccessLogRepository,
            ElibroValidationRunRepository validationRunRepository,
            AuditLogRepository auditLogRepository,
            AppProperties appProperties
    ) {
        this.elibroConfigService = elibroConfigService;
        this.mapper = mapper;
        this.elibroAccessLogRepository = elibroAccessLogRepository;
        this.validationRunRepository = validationRunRepository;
        this.auditLogRepository = auditLogRepository;
        this.appProperties = appProperties;
    }

    @Transactional(readOnly = true)
    public ElibroConfigOverviewResponse getActiveOverview(Admin actorAdmin, HttpServletRequest request) {
        ElibroConfig config = elibroConfigService.getActiveConfigOrThrow();
        var configDto = mapper.toOverviewConfig(config);

        ElibroOverviewChecklist checklist = new ElibroOverviewChecklist(
                configDto.hasAuthToken(),
                configDto.hasChannelId(),
                configDto.hasChannelSecret(),
                hasValidEndpoint(resolveSsoEndpoint()),
                configDto.hasChannelId() && StringUtils.hasText(config.getChannelName())
        );

        String state = deriveState(config, checklist);

        ElibroOverviewStatus status = new ElibroOverviewStatus(
                state,
                PROVIDER_LABEL,
                config.getLastValidatedAt(),
                config.getValidationMessage(),
                config.getUpdatedAt(),
                mapper.adminDisplayName(config.getUpdatedByAdmin())
        );

        Instant now = Instant.now();
        Instant from24h = now.minusSeconds(24L * 60L * 60L);
        Instant from7d = now.minusSeconds(7L * 24L * 60L * 60L);

        List<ElibroAccessLog> recentAccessLogs = elibroAccessLogRepository
                .findByOccurredAtGreaterThanEqualOrderByOccurredAtAsc(from24h);
        Long avgLatency24hMs = averageLatencyMs(recentAccessLogs);
        List<ElibroOverviewLatencyPoint> latency24h = buildLatency24h(recentAccessLogs, now);

        List<ElibroValidationRun> runs7d = validationRunRepository
                .findByConfig_IdAndCheckedAtGreaterThanEqualOrderByCheckedAtAsc(config.getId(), from7d);
        List<ElibroOverviewValidationPoint> validations7d = buildValidation7d(runs7d, now);
        long validations7dTotal = runs7d.size();

        ElibroOverviewUptimeWeekly uptimeWeekly = buildUptimeWeekly(config.getId(), from7d);

        ElibroOverviewKpis kpis = new ElibroOverviewKpis(
                integrationStateLabel(state),
                uptimeWeekly.pct(),
                avgLatency24hMs,
                validations7dTotal
        );

        ElibroOverviewCharts charts = new ElibroOverviewCharts(latency24h, validations7d, uptimeWeekly);

        List<ElibroOverviewRecentActivity> recentActivity = buildRecentActivity();
        List<ElibroOverviewInsight> insights = buildInsights(config, checklist, avgLatency24hMs, validations7dTotal, uptimeWeekly);

        return new ElibroConfigOverviewResponse(
                configDto,
                status,
                checklist,
                kpis,
                charts,
                recentActivity,
                insights
        );
    }

    private List<ElibroOverviewRecentActivity> buildRecentActivity() {
        List<AuditLog> logs = auditLogRepository
                .findTop20ByActionInAndEntityTypeOrderByOccurredAtDesc(RECENT_ACTIVITY_ACTIONS, "ELIBRO_CONFIG");

        List<ElibroOverviewRecentActivity> items = new ArrayList<>(logs.size());
        for (AuditLog log : logs) {
            items.add(new ElibroOverviewRecentActivity(
                    activityLabel(log.getAction()),
                    mapper.adminDisplayName(log.getActorAdmin()),
                    log.getOccurredAt(),
                    activityType(log)
            ));
        }
        return items;
    }

    private List<ElibroOverviewInsight> buildInsights(
            ElibroConfig config,
            ElibroOverviewChecklist checklist,
            Long avgLatency24hMs,
            long validations7dTotal,
            ElibroOverviewUptimeWeekly uptimeWeekly
    ) {
        int configuredSecrets = (checklist.hasAuthToken() ? 1 : 0) + (checklist.hasChannelSecret() ? 1 : 0);
        String latencyValue = avgLatency24hMs == null ? "Sin datos" : avgLatency24hMs + " ms";
        String validationValue = validations7dTotal + " validaciones";
        String secretsValue = configuredSecrets + " / 2";
        String uptimeValue = uptimeWeekly.pct() == null ? "Sin datos programados" : String.format(Locale.ROOT, "%.1f%%", uptimeWeekly.pct());

        List<ElibroOverviewInsight> insights = new ArrayList<>();
        insights.add(new ElibroOverviewInsight("Latencia promedio 24h", latencyValue, avgLatency24hMs == null ? "neutral" : "info"));
        insights.add(new ElibroOverviewInsight("Validaciones 7 días", validationValue, validations7dTotal > 0 ? "success" : "neutral"));
        insights.add(new ElibroOverviewInsight("Secretos configurados", secretsValue, configuredSecrets == 2 ? "success" : "warning"));
        insights.add(new ElibroOverviewInsight("Uptime semanal", uptimeValue, uptimeWeekly.pct() == null ? "neutral" : "info"));

        if (config.getLastValidatedAt() != null) {
            insights.add(new ElibroOverviewInsight(
                    "Última validación",
                    DateTimeFormatter.ISO_INSTANT.format(config.getLastValidatedAt()),
                    "neutral"
            ));
        }
        return insights;
    }

    private ElibroOverviewUptimeWeekly buildUptimeWeekly(UUID configId, Instant from7d) {
        List<ElibroValidationRun> scheduledRuns = validationRunRepository
                .findByConfig_IdAndValidationTypeAndCheckedAtGreaterThanEqualOrderByCheckedAtAsc(
                        configId,
                        ElibroValidationType.SCHEDULED,
                        from7d
                );

        if (scheduledRuns.isEmpty()) {
            return new ElibroOverviewUptimeWeekly(null, "Sin datos programados");
        }

        long successful = scheduledRuns.stream()
                .filter(run -> run.getStatus() == ElibroValidationRunStatus.SUCCESS)
                .count();
        double pct = (successful * 100.0d) / scheduledRuns.size();
        return new ElibroOverviewUptimeWeekly(roundOneDecimal(pct), uptimeStatusLabel(pct));
    }

    private List<ElibroOverviewValidationPoint> buildValidation7d(List<ElibroValidationRun> runs, Instant now) {
        LocalDate today = now.atOffset(ZoneOffset.UTC).toLocalDate();

        Map<LocalDate, long[]> countersByDay = new LinkedHashMap<>();
        for (int offset = 6; offset >= 0; offset--) {
            countersByDay.put(today.minusDays(offset), new long[] {0L, 0L});
        }

        for (ElibroValidationRun run : runs) {
            LocalDate day = run.getCheckedAt().atOffset(ZoneOffset.UTC).toLocalDate();
            long[] counters = countersByDay.get(day);
            if (counters == null) {
                continue;
            }
            if (run.getStatus() == ElibroValidationRunStatus.SUCCESS) {
                counters[0]++;
            } else {
                counters[1]++;
            }
        }

        List<ElibroOverviewValidationPoint> points = new ArrayList<>(countersByDay.size());
        for (Map.Entry<LocalDate, long[]> entry : countersByDay.entrySet()) {
            LocalDate day = entry.getKey();
            long[] counters = entry.getValue();
            String label = day.equals(today) ? "Hoy" : shortDayLabel(day.getDayOfWeek());
            points.add(new ElibroOverviewValidationPoint(label, counters[0], counters[1]));
        }
        return points;
    }

    private List<ElibroOverviewLatencyPoint> buildLatency24h(List<ElibroAccessLog> logs, Instant now) {
        Instant floorHour = now.truncatedTo(java.time.temporal.ChronoUnit.HOURS);
        List<Instant> hourSlots = new ArrayList<>(24);
        for (int i = 23; i >= 0; i--) {
            hourSlots.add(floorHour.minusSeconds(i * 3600L));
        }

        Map<Instant, long[]> countersByHour = new LinkedHashMap<>();
        for (Instant hour : hourSlots) {
            countersByHour.put(hour, new long[] {0L, 0L});
        }

        for (ElibroAccessLog log : logs) {
            if (log.getOccurredAt() == null || log.getLatencyMs() == null) {
                continue;
            }
            Instant bucket = log.getOccurredAt().truncatedTo(java.time.temporal.ChronoUnit.HOURS);
            long[] counters = countersByHour.get(bucket);
            if (counters == null) {
                continue;
            }
            counters[0] += log.getLatencyMs();
            counters[1] += 1;
        }

        List<ElibroOverviewLatencyPoint> points = new ArrayList<>(countersByHour.size());
        for (Map.Entry<Instant, long[]> entry : countersByHour.entrySet()) {
            long[] counters = entry.getValue();
            Long avg = counters[1] == 0 ? null : Math.round((double) counters[0] / counters[1]);
            int hour = entry.getKey().atOffset(ZoneOffset.UTC).getHour();
            points.add(new ElibroOverviewLatencyPoint(String.format(Locale.ROOT, "%02dh", hour), avg));
        }
        return points;
    }

    private String deriveState(ElibroConfig config, ElibroOverviewChecklist checklist) {
        if (!checklist.hasAuthToken() || !checklist.hasChannelSecret() || !checklist.hasChannelId()) {
            return "incomplete";
        }
        if (!checklist.validEndpoint() || !checklist.buildableChannel()) {
            return "incomplete";
        }
        if (config.getStatus() != ElibroConfigStatus.ACTIVE) {
            return "pending";
        }
        if (config.getValidationStatus() == ElibroValidationStatus.INVALID) {
            return "invalid";
        }
        if (config.getValidationStatus() == ElibroValidationStatus.VALID) {
            return "configured";
        }
        return "pending";
    }

    private String integrationStateLabel(String state) {
        return switch (state) {
            case "configured" -> "Configurado";
            case "invalid" -> "Inválido";
            case "incomplete" -> "Incompleto";
            default -> "Pendiente";
        };
    }

    private String activityLabel(String action) {
        return switch (action) {
            case "ELIBRO_CONFIG_CREATE" -> "Configuración creada";
            case "ELIBRO_CONFIG_UPDATE" -> "Configuración actualizada";
            case "ELIBRO_CONFIG_VALIDATE" -> "Validación ejecutada";
            case "ELIBRO_CONFIG_ACTIVATE" -> "Configuración activada";
            case "ELIBRO_CONFIG_DEACTIVATE" -> "Configuración desactivada";
            default -> action;
        };
    }

    private String activityType(AuditLog log) {
        if (log.getOutcome() == AuditOutcome.FAILURE) {
            return "error";
        }
        return switch (log.getAction()) {
            case "ELIBRO_CONFIG_VALIDATE" -> "success";
            case "ELIBRO_CONFIG_ACTIVATE", "ELIBRO_CONFIG_DEACTIVATE" -> "warning";
            default -> "info";
        };
    }

    private String uptimeStatusLabel(double pct) {
        if (pct >= 99.0d) {
            return "Operativo";
        }
        if (pct >= 95.0d) {
            return "Estable";
        }
        return "Inestable";
    }

    private boolean hasValidEndpoint(String endpoint) {
        if (!StringUtils.hasText(endpoint)) {
            return false;
        }
        try {
            URI uri = URI.create(endpoint.trim());
            return uri.isAbsolute() && "https".equalsIgnoreCase(uri.getScheme()) && StringUtils.hasText(uri.getHost());
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private String resolveSsoEndpoint() {
        String configuredEndpoint = appProperties.getElibro().getBaseUrl();
        if (StringUtils.hasText(configuredEndpoint)) {
            return configuredEndpoint;
        }
        return DEFAULT_SSO_ENDPOINT;
    }

    private Long averageLatencyMs(List<ElibroAccessLog> logs) {
        long total = 0L;
        long count = 0L;
        for (ElibroAccessLog log : logs) {
            if (log.getLatencyMs() == null) {
                continue;
            }
            total += log.getLatencyMs();
            count++;
        }
        if (count == 0) {
            return null;
        }
        return Math.round((double) total / count);
    }

    private String shortDayLabel(DayOfWeek dayOfWeek) {
        return switch (dayOfWeek) {
            case MONDAY -> "Lun";
            case TUESDAY -> "Mar";
            case WEDNESDAY -> "Mié";
            case THURSDAY -> "Jue";
            case FRIDAY -> "Vie";
            case SATURDAY -> "Sáb";
            case SUNDAY -> "Dom";
        };
    }

    private Double roundOneDecimal(double value) {
        return Math.round(value * 10.0d) / 10.0d;
    }
}
