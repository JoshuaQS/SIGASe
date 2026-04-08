package mx.edu.utez.server.modules.notifications.service;

import jakarta.persistence.EntityManager;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.elibro.entity.ElibroAccessLog;
import mx.edu.utez.server.modules.logs.audit.entity.AuditLog;
import mx.edu.utez.server.modules.notifications.dto.NotificationPreferenceResponse;
import mx.edu.utez.server.modules.notifications.dto.NotificationResponse;
import mx.edu.utez.server.modules.notifications.dto.UnreadCountResponse;
import mx.edu.utez.server.modules.notifications.dto.UpdateNotificationPreferenceRequest;
import mx.edu.utez.server.modules.notifications.entity.Notification;
import mx.edu.utez.server.modules.notifications.entity.NotificationPreference;
import mx.edu.utez.server.modules.notifications.entity.NotificationReferenceType;
import mx.edu.utez.server.modules.notifications.entity.NotificationSeverity;
import mx.edu.utez.server.modules.notifications.entity.NotificationType;
import mx.edu.utez.server.modules.notifications.repository.NotificationPreferenceRepository;
import mx.edu.utez.server.modules.notifications.repository.NotificationRepository;
import mx.edu.utez.server.shared.api.PageResponse;
import mx.edu.utez.server.shared.enums.AdminStatus;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.enums.AuditSeverity;
import mx.edu.utez.server.shared.enums.AuditSourceModule;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import mx.edu.utez.server.shared.util.SecurityLogSanitizer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class NotificationService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> AUDIT_ENTITY_TYPES = Set.of("STUDENT", "ADMIN", "ELIBRO_CONFIG", "REPORT");

    private final NotificationRepository notificationRepository;
    private final NotificationPreferenceRepository notificationPreferenceRepository;
    private final SecurityLogSanitizer securityLogSanitizer;
    private final EntityManager entityManager;

    public NotificationService(
            NotificationRepository notificationRepository,
            NotificationPreferenceRepository notificationPreferenceRepository,
            SecurityLogSanitizer securityLogSanitizer,
            EntityManager entityManager
    ) {
        this.notificationRepository = notificationRepository;
        this.notificationPreferenceRepository = notificationPreferenceRepository;
        this.securityLogSanitizer = securityLogSanitizer;
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> listForAdmin(Admin admin, int page, int size) {
        validatePagination(page, size);
        Page<NotificationResponse> result = notificationRepository.findByAdmin_IdAndDismissedFalse(
                admin.getId(),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))
        ).map(this::toResponse);
        return new PageResponse<>(
                result.getContent(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages()
        );
    }

    @Transactional(readOnly = true)
    public UnreadCountResponse getUnreadCount(Admin admin) {
        return new UnreadCountResponse(notificationRepository.countByAdmin_IdAndReadFalseAndDismissedFalse(admin.getId()));
    }

    @Transactional
    public void markAsRead(Admin admin, Long notificationId) {
        Notification notification = notificationRepository.findByIdAndAdmin_IdAndDismissedFalse(notificationId, admin.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Notificación no encontrada."));
        if (!notification.isRead()) {
            notification.setRead(true);
            notificationRepository.save(notification);
        }
    }

    @Transactional
    public void markAllAsRead(Admin admin) {
        notificationRepository.markAllRead(admin.getId());
    }

    @Transactional
    public void dismiss(Admin admin, Long notificationId) {
        Notification notification = notificationRepository.findByIdAndAdmin_IdAndDismissedFalse(notificationId, admin.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Notificación no encontrada."));
        notification.setDismissed(true);
        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void dismissAll(Admin admin) {
        notificationRepository.dismissAll(admin.getId());
    }

    @Transactional
    public NotificationPreferenceResponse getPreferences(Admin admin) {
        return toPreferenceResponse(getOrCreatePreference(admin));
    }

    @Transactional
    public NotificationPreferenceResponse updatePreferences(Admin admin, UpdateNotificationPreferenceRequest request) {
        NotificationPreference preference = getOrCreatePreference(admin);
        preference.setNotifyCritical(request.notifyCritical());
        preference.setNotifySecurity(request.notifySecurity());
        preference.setNotifyAccessFailures(request.notifyAccessFailures());
        preference.setNotifyStudentChanges(request.notifyStudentChanges());
        preference.setNotifyConfigChanges(request.notifyConfigChanges());
        preference.setNotifyAdminChanges(request.notifyAdminChanges());
        return toPreferenceResponse(notificationPreferenceRepository.save(preference));
    }

    @Transactional
    public void ensureDefaultPreferences(Admin admin) {
        if (admin != null && !notificationPreferenceRepository.existsById(admin.getId())) {
            createDefaultPreference(admin.getId());
        }
    }

    @Transactional
    public void handleAuditEvent(AuditLog auditLog) {
        if (auditLog == null || !shouldGenerateAuditNotification(auditLog)) {
            return;
        }

        List<Notification> notifications = new ArrayList<>();
        for (NotificationPreferenceRepository.AdminPreferenceView view :
                notificationPreferenceRepository.findAdminPreferenceViewsByStatus(AdminStatus.ACTIVE)) {
            if (shouldSkipAuditRecipient(view.getAdminId(), auditLog)) {
                continue;
            }
            if (!canReceiveAuditNotification(view, auditLog)) {
                continue;
            }
            notifications.add(buildAuditNotification(view.getAdminId(), auditLog));
        }

        if (!notifications.isEmpty()) {
            notificationRepository.saveAll(notifications);
        }
    }

    @Transactional
    public void handleAccessEvent(ElibroAccessLog accessLog) {
        if (accessLog == null || !shouldGenerateAccessNotification(accessLog)) {
            return;
        }

        List<Notification> notifications = new ArrayList<>();
        for (NotificationPreferenceRepository.AdminPreferenceView view :
                notificationPreferenceRepository.findAdminPreferenceViewsByStatus(AdminStatus.ACTIVE)) {
            if (!Boolean.TRUE.equals(view.getNotifyAccessFailures())) {
                continue;
            }
            notifications.add(buildAccessNotification(view.getAdminId(), accessLog));
        }

        if (!notifications.isEmpty()) {
            notificationRepository.saveAll(notifications);
        }
    }

    private NotificationPreference getOrCreatePreference(Admin admin) {
        return notificationPreferenceRepository.findByAdminId(admin.getId())
                .orElseGet(() -> createDefaultPreference(admin.getId()));
    }

    private NotificationPreference createDefaultPreference(UUID adminId) {
        NotificationPreference preference = new NotificationPreference();
        preference.setAdmin(entityManager.getReference(Admin.class, adminId));
        entityManager.persist(preference);
        return preference;
    }

    private boolean shouldGenerateAuditNotification(AuditLog auditLog) {
        if ("STUDENT".equals(auditLog.getEntityType())
                && auditLog.getSourceModule() == AuditSourceModule.AUTH
                && auditLog.getOutcome() == AuditOutcome.SUCCESS) {
            return false;
        }
        return auditLog.getSeverity() == AuditSeverity.CRITICAL
                || auditLog.getSeverity() == AuditSeverity.SECURITY
                || auditLog.getOutcome() == AuditOutcome.FAILURE
                || AUDIT_ENTITY_TYPES.contains(auditLog.getEntityType());
    }

    private boolean canReceiveAuditNotification(
            NotificationPreferenceRepository.AdminPreferenceView view,
            AuditLog auditLog
    ) {
        boolean matchesCritical = auditLog.getSeverity() == AuditSeverity.CRITICAL
                && Boolean.TRUE.equals(view.getNotifyCritical());
        boolean matchesSecurity = auditLog.getSeverity() == AuditSeverity.SECURITY
                && Boolean.TRUE.equals(view.getNotifySecurity());
        boolean matchesStudent = "STUDENT".equals(auditLog.getEntityType())
                && Boolean.TRUE.equals(view.getNotifyStudentChanges());
        boolean matchesAdmin = "ADMIN".equals(auditLog.getEntityType())
                && Boolean.TRUE.equals(view.getNotifyAdminChanges());
        boolean matchesConfig = ("ELIBRO_CONFIG".equals(auditLog.getEntityType()) || "REPORT".equals(auditLog.getEntityType()))
                && Boolean.TRUE.equals(view.getNotifyConfigChanges());

        return matchesCritical || matchesSecurity || matchesStudent || matchesAdmin || matchesConfig;
    }

    private boolean shouldGenerateAccessNotification(ElibroAccessLog accessLog) {
        String resultName = accessLog.getResult().name();
        return resultName.startsWith("FAILED_")
                || "RATE_LIMIT".equals(resultName)
                || "TOKEN_INVALID".equals(resultName)
                || "ACCOUNT_LOCKED".equals(resultName);
    }

    private boolean shouldSkipAuditRecipient(UUID adminId, AuditLog auditLog) {
        return adminId != null
                && "ADMIN".equals(auditLog.getEntityType())
                && adminId.toString().equals(auditLog.getEntityId())
                && ("ADMIN_DEACTIVATE".equals(auditLog.getAction()) || "ADMIN_DELETE".equals(auditLog.getAction()));
    }

    private Notification buildAuditNotification(UUID adminId, AuditLog auditLog) {
        Notification notification = new Notification();
        notification.setAdmin(entityManager.getReference(Admin.class, adminId));
        notification.setTitle(sanitizeTitle(buildAuditTitle(auditLog)));
        notification.setMessage(sanitizeMessage(buildAuditMessage(auditLog)));
        notification.setType(NotificationType.AUDIT);
        notification.setSeverity(mapAuditSeverity(auditLog.getSeverity()));
        notification.setRead(false);
        notification.setDismissed(false);
        notification.setReferenceType(NotificationReferenceType.AUDIT_LOG);
        notification.setReferenceId(auditLog.getId());
        return notification;
    }

    private Notification buildAccessNotification(UUID adminId, ElibroAccessLog accessLog) {
        Notification notification = new Notification();
        notification.setAdmin(entityManager.getReference(Admin.class, adminId));
        notification.setTitle(sanitizeTitle(buildAccessTitle(accessLog)));
        notification.setMessage(sanitizeMessage(buildAccessMessage(accessLog)));
        notification.setType(NotificationType.ACCESS);
        notification.setSeverity(mapAccessSeverity(accessLog));
        notification.setRead(false);
        notification.setDismissed(false);
        notification.setReferenceType(NotificationReferenceType.ACCESS_LOG);
        notification.setReferenceId(accessLog.getId());
        return notification;
    }

    private NotificationSeverity mapAuditSeverity(AuditSeverity severity) {
        if (severity == null) {
            return NotificationSeverity.INFO;
        }
        return switch (severity) {
            case INFO -> NotificationSeverity.INFO;
            case NOTICE -> NotificationSeverity.NOTICE;
            case WARNING -> NotificationSeverity.WARNING;
            case SECURITY -> NotificationSeverity.SECURITY;
            case CRITICAL -> NotificationSeverity.CRITICAL;
        };
    }

    private NotificationSeverity mapAccessSeverity(ElibroAccessLog accessLog) {
        String resultName = accessLog.getResult().name();
        if ("FAILED_ACCOUNT_LOCKED".equals(resultName) || "ACCOUNT_LOCKED".equals(resultName)) {
            return NotificationSeverity.SECURITY;
        }
        if ("FAILED_NEXT_URL_VALIDATION".equals(resultName)) {
            return NotificationSeverity.SECURITY;
        }
        if ("FAILED_INTERNAL_ERROR".equals(resultName)
                || "FAILED_ELIBRO_CONFIG".equals(resultName)
                || "FAILED_ELIBRO_API".equals(resultName)
                || "FAILED_ELIBRO_TIMEOUT".equals(resultName)) {
            return NotificationSeverity.CRITICAL;
        }
        if ("FAILED_STUDENT_NOT_FOUND".equals(resultName)) {
            return NotificationSeverity.NOTICE;
        }
        return NotificationSeverity.WARNING;
    }

    private String buildAuditTitle(AuditLog auditLog) {
        if (auditLog.getSeverity() == AuditSeverity.CRITICAL) {
            return "Evento crítico de auditoría";
        }
        if (auditLog.getSeverity() == AuditSeverity.SECURITY) {
            return "Evento de seguridad";
        }
        return switch (defaultText(auditLog.getEntityType())) {
            case "STUDENT" -> "Cambio en estudiantes";
            case "ADMIN" -> "Cambio administrativo";
            case "ELIBRO_CONFIG" -> "Cambio en configuración eLibro";
            case "REPORT" -> "Actividad de reportes";
            default -> auditLog.getOutcome() == AuditOutcome.FAILURE
                    ? "Fallo registrado en auditoría"
                    : "Nuevo evento de auditoría";
        };
    }

    private String buildAuditMessage(AuditLog auditLog) {
        String actor = auditLog.getActorAdmin() != null
                ? auditLog.getActorAdmin().getName()
                : "El sistema";
        String action = humanizeAction(auditLog.getAction());
        String outcome = humanizeOutcome(auditLog.getOutcome());
        if (StringUtils.hasText(action)) {
            return actor + " registró " + action + " con resultado " + outcome + ".";
        }
        return actor + " registró un evento de auditoría con resultado " + outcome + ".";
    }

    private String buildAccessTitle(ElibroAccessLog accessLog) {
        return switch (accessLog.getResult().name()) {
            case "FAILED_ACCOUNT_LOCKED", "ACCOUNT_LOCKED" -> "Acceso eLibro bloqueado";
            case "FAILED_ELIBRO_CONFIG" -> "Fallo de configuración en acceso eLibro";
            case "FAILED_NEXT_URL_VALIDATION" -> "Solicitud inválida de acceso eLibro";
            case "FAILED_ELIBRO_TIMEOUT" -> "Timeout en acceso eLibro";
            case "FAILED_ELIBRO_API" -> "Fallo del proveedor eLibro";
            case "FAILED_INTERNAL_ERROR" -> "Error interno en acceso eLibro";
            case "FAILED_STUDENT_INACTIVE" -> "Estudiante inactivo intentó acceder";
            case "FAILED_STUDENT_NOT_FOUND" -> "Estudiante no encontrado para eLibro";
            default -> "Fallo de acceso hacia eLibro";
        };
    }

    private String buildAccessMessage(ElibroAccessLog accessLog) {
        String result = humanizeAction(accessLog.getResult().name());
        String detail = securityLogSanitizer.sanitizeText(accessLog.getErrorDetail(), 160);
        if (StringUtils.hasText(detail)) {
            return "Se registró un intento fallido hacia eLibro: " + result + ". " + detail;
        }
        return "Se registró un intento fallido hacia eLibro: " + result + ".";
    }

    private String humanizeAction(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        return value.trim()
                .toLowerCase(Locale.ROOT)
                .replace('_', ' ');
    }

    private String humanizeOutcome(AuditOutcome outcome) {
        if (outcome == null) {
            return "desconocido";
        }
        return switch (outcome) {
            case SUCCESS -> "éxito";
            case FAILURE -> "fallo";
            case DENIED -> "denegado";
            case ERROR -> "error";
        };
    }

    private String sanitizeTitle(String title) {
        return defaultText(securityLogSanitizer.sanitizeText(title, 160));
    }

    private String sanitizeMessage(String message) {
        return defaultText(securityLogSanitizer.sanitizeText(message, 500));
    }

    private String defaultText(String value) {
        return StringUtils.hasText(value) ? value : "Sin detalle disponible.";
    }

    private NotificationResponse toResponse(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getType(),
                notification.getSeverity(),
                notification.isRead(),
                notification.isDismissed(),
                notification.getCreatedAt(),
                notification.getReferenceType(),
                notification.getReferenceId()
        );
    }

    private NotificationPreferenceResponse toPreferenceResponse(NotificationPreference preference) {
        return new NotificationPreferenceResponse(
                preference.isNotifyCritical(),
                preference.isNotifySecurity(),
                preference.isNotifyAccessFailures(),
                preference.isNotifyStudentChanges(),
                preference.isNotifyConfigChanges(),
                preference.isNotifyAdminChanges()
        );
    }

    private void validatePagination(int page, int size) {
        if (page < 0 || size <= 0 || size > MAX_PAGE_SIZE) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Parámetros de paginación inválidos.");
        }
    }
}
