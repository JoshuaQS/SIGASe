package mx.edu.utez.server.modules.admins.service;

import mx.edu.utez.server.modules.admins.dto.AdminResetPasswordRequest;
import mx.edu.utez.server.modules.admins.dto.AdminResponse;
import mx.edu.utez.server.modules.admins.dto.AdminStatusChangeRequest;
import mx.edu.utez.server.modules.admins.dto.CreateAdminRequest;
import mx.edu.utez.server.modules.admins.dto.UpdateAdminRequest;
import mx.edu.utez.server.modules.admins.entity.Admin;
import mx.edu.utez.server.modules.admins.mapper.AdminMapper;
import mx.edu.utez.server.modules.admins.repository.AdminRepository;
import mx.edu.utez.server.modules.logs.audit.service.AuditTrailService;
import mx.edu.utez.server.modules.notifications.service.NotificationService;
import mx.edu.utez.server.modules.notifications.repository.NotificationRepository;
import mx.edu.utez.server.modules.auth.repository.AdminPasswordResetTokenRepository;
import mx.edu.utez.server.modules.auth.repository.AdminAuthEventRepository;
import mx.edu.utez.server.modules.notifications.service.EmailDispatchService;
import mx.edu.utez.server.shared.api.PageResponse;
import mx.edu.utez.server.shared.enums.AdminRole;
import mx.edu.utez.server.shared.enums.AdminStatus;
import mx.edu.utez.server.shared.enums.EmailDispatchJobType;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import mx.edu.utez.server.shared.util.EmailNormalizer;
import mx.edu.utez.server.shared.validation.DomainTextPolicy;
import mx.edu.utez.server.shared.validation.PasswordPolicy;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.mail.internet.MimeMessage;
import java.time.Instant;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class AdminManagementService {

    private static final Logger log = LoggerFactory.getLogger(AdminManagementService.class);

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "createdAt", "updatedAt", "email", "name", "lastNamePaternal", "lastNameMaternal", "role", "status", "lastLoginAt"
    );

    private final AdminRepository adminRepository;
    private final AdminMapper adminMapper;
    private final EmailNormalizer emailNormalizer;
    private final PasswordEncoder passwordEncoder;
    private final AuditTrailService auditTrailService;
    private final NotificationService notificationService;
    private final NotificationRepository notificationRepository;
    private final EmailDispatchService emailDispatchService;
    private final JavaMailSender mailSender;
    private final String mailFrom;
    private final AdminPasswordResetTokenRepository adminPasswordResetTokenRepository;
    private final AdminAuthEventRepository adminAuthEventRepository;

    public AdminManagementService(
            AdminRepository adminRepository,
            AdminMapper adminMapper,
            EmailNormalizer emailNormalizer,
            PasswordEncoder passwordEncoder,
            AuditTrailService auditTrailService,
            NotificationService notificationService,
            NotificationRepository notificationRepository,
            EmailDispatchService emailDispatchService,
            JavaMailSender mailSender,
            @Value("${app.mail.from:}") String mailFrom,
            AdminPasswordResetTokenRepository adminPasswordResetTokenRepository,
            AdminAuthEventRepository adminAuthEventRepository
    ) {
        this.adminRepository = adminRepository;
        this.adminMapper = adminMapper;
        this.emailNormalizer = emailNormalizer;
        this.passwordEncoder = passwordEncoder;
        this.auditTrailService = auditTrailService;
        this.notificationService = notificationService;
        this.notificationRepository = notificationRepository;
        this.emailDispatchService = emailDispatchService;
        this.mailSender = mailSender;
        this.mailFrom = mailFrom;
        this.adminPasswordResetTokenRepository = adminPasswordResetTokenRepository;
        this.adminAuthEventRepository = adminAuthEventRepository;
    }

    @Transactional
    public AdminResponse create(CreateAdminRequest request, Admin actorAdmin, HttpServletRequest httpRequest) {
        String normalizedEmail = emailNormalizer.normalize(request.email());
        if (adminRepository.existsByEmail(normalizedEmail)) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "El correo administrador ya existe.");
        }
        if (actorAdmin.getRole() == AdminRole.ADMIN_TI && request.role() == AdminRole.ADMIN_TI) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "Un admin TI no puede gestionar a otro admin TI.");
        }

        Admin admin = new Admin();
        admin.setEmail(normalizedEmail);
        admin.setName(normalizeRequiredName(request.name()));
        admin.setLastNamePaternal(normalizeRequiredName(request.lastNamePaternal()));
        admin.setLastNameMaternal(normalizeOptionalName(request.lastNameMaternal()));
        String temporaryPassword = PasswordPolicy.generateCompliantTemporaryPassword();
        admin.setPasswordHash(passwordEncoder.encode(temporaryPassword));
        admin.setRole(request.role());
            admin.setStatus(AdminStatus.ACTIVE);
            admin.setHasChangedTemporaryPassword(false);
            admin.setTemporaryPasswordGeneratedAt(Instant.now());
            admin.setTemporaryPasswordNotifiedAt(null);
            admin.setPasswordChangedAt(null);

        Admin saved = adminRepository.save(admin);
        notificationService.ensureDefaultPreferences(saved);
        enqueueTemporaryPasswordEmail(saved, temporaryPassword, "ADMIN_CREATE");
        auditTrailService.auditAdminAction(
                actorAdmin,
                "ADMIN_CREATE",
                "ADMIN",
                saved.getId().toString(),
                AuditOutcome.SUCCESS,
                Map.of(
                        "email", saved.getEmail(),
                        "role", saved.getRole().name(),
                        "status", saved.getStatus().name(),
                        "hasChangedTemporaryPassword", saved.isHasChangedTemporaryPassword()
                ),
                httpRequest
        );
        return adminMapper.toResponse(saved);
    }

    @Transactional
    public AdminResponse update(UUID adminId, UpdateAdminRequest request, Admin actorAdmin, HttpServletRequest httpRequest) {
        Admin admin = findByIdOrThrow(adminId);
        ensureActorCanManageTargetAdmin(actorAdmin, admin);
        String normalizedEmail = emailNormalizer.normalize(request.email());
        if (adminRepository.existsByEmailAndIdNot(normalizedEmail, adminId)) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "El correo administrador ya está en uso.");
        }

        admin.setEmail(normalizedEmail);
        admin.setName(normalizeRequiredName(request.name()));
        admin.setLastNamePaternal(normalizeRequiredName(request.lastNamePaternal()));
        admin.setLastNameMaternal(normalizeOptionalName(request.lastNameMaternal()));
        admin.setRole(request.role());
        try {
            Admin saved = adminRepository.save(admin);
            auditTrailService.auditAdminAction(
                    actorAdmin,
                    "ADMIN_UPDATE",
                    "ADMIN",
                    saved.getId().toString(),
                    AuditOutcome.SUCCESS,
                    Map.of("email", saved.getEmail(), "role", saved.getRole().name()),
                    httpRequest
            );
            return adminMapper.toResponse(saved);
        } catch (DataIntegrityViolationException ex) {
            throw new BusinessException(
                    ErrorCode.BUSINESS_RULE_VIOLATION,
                    "No se pudo actualizar el administrador por conflicto de integridad. Verifica correo y datos únicos."
            );
        }
    }

    @Transactional(readOnly = true)
    public AdminResponse getById(UUID adminId, Admin actorAdmin, HttpServletRequest httpRequest) {
        Admin admin = findByIdOrThrow(adminId);
        return adminMapper.toResponse(admin);
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminResponse> list(
            String q,
            AdminStatus status,
            AdminRole role,
            String sortBy,
            String sortDir,
            int page,
            int size,
            Admin actorAdmin,
            HttpServletRequest httpRequest
    ) {
        if (page < 0 || size <= 0 || size > 500) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Parámetros de paginación inválidos.");
        }
        Pageable pageable = PageRequest.of(page, size, buildSort(sortBy, sortDir));
        Specification<Admin> spec = buildSpecification(q, status, role);
        Page<AdminResponse> result = adminRepository.findAll(spec, pageable).map(adminMapper::toResponse);

        return new PageResponse<>(
                result.getContent(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages()
        );
    }

    @Transactional
    public AdminResponse activate(
            UUID adminId,
            AdminStatusChangeRequest request,
            Admin actorAdmin,
            HttpServletRequest httpRequest
    ) {
        Admin admin = findByIdOrThrow(adminId);
        ensureActorCanManageTargetAdmin(actorAdmin, admin);
        if (admin.getStatus() == AdminStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "El administrador ya está activo.");
        }
        admin.setStatus(AdminStatus.ACTIVE);
        Admin saved = adminRepository.save(admin);

        auditTrailService.auditAdminAction(
                actorAdmin,
                "ADMIN_ACTIVATE",
                "ADMIN",
                saved.getId().toString(),
                AuditOutcome.SUCCESS,
                Map.of("reason", request.reason().trim()),
                httpRequest
        );
        return adminMapper.toResponse(saved);
    }

    @Transactional
    public AdminResponse deactivate(
            UUID adminId,
            AdminStatusChangeRequest request,
            Admin actorAdmin,
            HttpServletRequest httpRequest
    ) {
        Admin admin = findByIdOrThrow(adminId);
        ensureActorCanManageTargetAdmin(actorAdmin, admin);
        if (admin.getStatus() == AdminStatus.INACTIVE) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "El administrador ya está inactivo.");
        }

        admin.setStatus(AdminStatus.INACTIVE);
        Admin saved = adminRepository.save(admin);
        auditTrailService.auditAdminAction(
                actorAdmin,
                "ADMIN_DEACTIVATE",
                "ADMIN",
                saved.getId().toString(),
                AuditOutcome.SUCCESS,
                Map.of("reason", request.reason().trim()),
                httpRequest
        );
        return adminMapper.toResponse(saved);
    }

    @Transactional
    public void resetPassword(
            UUID adminId,
            AdminResetPasswordRequest request,
            Admin actorAdmin,
            HttpServletRequest httpRequest
    ) {
        Admin admin = findByIdOrThrow(adminId);
        ensureActorCanManageTargetAdmin(actorAdmin, admin);
        String temporaryPassword = PasswordPolicy.generateCompliantTemporaryPassword();
        admin.setPasswordHash(passwordEncoder.encode(temporaryPassword));
        admin.setFailedLoginAttempts(0);
        admin.setLockedUntil(null);
        admin.setTokenVersion(admin.getTokenVersion() + 1);
        admin.setHasChangedTemporaryPassword(false);
        admin.setTemporaryPasswordGeneratedAt(Instant.now());
        admin.setTemporaryPasswordNotifiedAt(null);
        admin.setPasswordChangedAt(null);
        adminRepository.save(admin);
        enqueueTemporaryPasswordEmail(admin, temporaryPassword, "ADMIN_RESET_PASSWORD");

        auditTrailService.auditAdminAction(
                actorAdmin,
                "ADMIN_RESET_PASSWORD",
                "ADMIN",
                admin.getId().toString(),
                AuditOutcome.SUCCESS,
                Map.of("resetByAdminId", actorAdmin.getId().toString()),
                httpRequest
        );
    }

    @Transactional
    public void delete(UUID adminId, Admin actorAdmin, HttpServletRequest httpRequest) {
        Admin admin = findByIdOrThrow(adminId);
        ensureActorCanManageTargetAdmin(actorAdmin, admin);
        String snapshotEmail = admin.getEmail();

        try {
            // Detach / cleanup dependent records that would block deletion.
            adminAuthEventRepository.detachAdminReferences(adminId);
            adminPasswordResetTokenRepository.deleteAllByAdminId(adminId);
            notificationRepository.deleteAllByAdminId(adminId);

            adminRepository.delete(admin);
            adminRepository.flush();

            auditTrailService.auditAdminAction(
                    actorAdmin,
                    "ADMIN_DELETE",
                    "ADMIN",
                    adminId.toString(),
                    AuditOutcome.SUCCESS,
                    Map.of("email", snapshotEmail),
                    httpRequest
            );
        } catch (DataIntegrityViolationException ex) {
            auditTrailService.auditAdminAction(
                    actorAdmin,
                    "ADMIN_DELETE",
                    "ADMIN",
                    adminId.toString(),
                    AuditOutcome.FAILURE,
                    Map.of("email", snapshotEmail, "error", "INTEGRITY_VIOLATION"),
                    httpRequest
            );
            throw new BusinessException(
                    ErrorCode.BUSINESS_RULE_VIOLATION,
                    "No se puede eliminar el administrador porque tiene referencias en otros módulos. Desactívalo en su lugar."
            );
        }
    }

    private Specification<Admin> buildSpecification(String q, AdminStatus status, AdminRole role) {
        return (root, query, cb) -> {
            var predicate = cb.conjunction();
            if (StringUtils.hasText(q)) {
                String term = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
                predicate = cb.and(predicate, cb.or(
                        cb.like(cb.lower(root.get("email")), term),
                        cb.like(cb.lower(root.get("name")), term),
                        cb.like(cb.lower(root.get("lastNamePaternal")), term),
                        cb.like(cb.lower(root.get("lastNameMaternal")), term)
                ));
            }
            if (status != null) {
                predicate = cb.and(predicate, cb.equal(root.get("status"), status));
            }
            if (role != null) {
                predicate = cb.and(predicate, cb.equal(root.get("role"), role));
            }
            return predicate;
        };
    }

    private String normalizeRequiredName(String value) {
        String normalized = DomainTextPolicy.normalizeHumanNameWithInitialCaps(value);
        if (!StringUtils.hasText(normalized) || normalized.length() < 2 || normalized.length() > 100 || !DomainTextPolicy.isValidHumanName(normalized)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Nombre o apellido inválido.");
        }
        return normalized;
    }

    private String normalizeOptionalName(String value) {
        String normalized = DomainTextPolicy.normalizeHumanNameWithInitialCaps(value);
        if (!StringUtils.hasText(normalized)) {
            return null;
        }
        if (normalized.length() < 2 || normalized.length() > 100 || !DomainTextPolicy.isValidHumanName(normalized)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Nombre o apellido inválido.");
        }
        return normalized;
    }

    private void ensureActorCanManageTargetAdmin(Admin actorAdmin, Admin targetAdmin) {
        if (actorAdmin.getRole() == AdminRole.ADMIN_TI && targetAdmin.getRole() == AdminRole.ADMIN_TI) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "Un admin TI no puede gestionar a otro admin TI.");
        }
    }

    private void enqueueTemporaryPasswordEmail(Admin admin, String temporaryPassword, String action) {
        try {
            String plainText = """
                    Hola %s,

                    Tu cuenta administrativa en SIGASe fue creada o restablecida.

                    Contraseña temporal: %s

                    Por seguridad, ingresa al sistema y cambia tu contraseña cuando puedas.

                    Equipo SIGASe
                    """.formatted(admin.getName(), temporaryPassword);
            String html = """
                    <!doctype html>
                    <html lang="es">
                      <body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
                        <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;">
                          <h1 style="margin:0 0 12px 0;font-size:22px;">Tu acceso administrativo en SIGASe</h1>
                          <p style="margin:0 0 16px 0;line-height:1.6;">Hola %s,</p>
                          <p style="margin:0 0 16px 0;line-height:1.6;">Tu cuenta administrativa fue creada o restablecida.</p>
                          <div style="padding:14px 16px;background:#eff6ff;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:0.03em;">%s</div>
                          <p style="margin:16px 0 0 0;line-height:1.6;font-size:13px;color:#6b7280;">Ingresa al sistema y cambia tu contraseña cuando puedas.</p>
                        </div>
                      </body>
                    </html>
                    """.formatted(admin.getName(), admin.getName(), temporaryPassword);
            emailDispatchService.enqueue(
                    EmailDispatchJobType.ADMIN_TEMPORARY_PASSWORD,
                    admin.getEmail(),
                    "SIGASe | Tu contraseña temporal",
                    plainText,
                    html,
                    "ADMIN",
                    admin.getId().toString()
            );
            // The worker marks temporaryPasswordNotifiedAt when the message is actually sent.
        } catch (Exception ex) {
            log.error("Could not enqueue temporary password email for admin {}: {}", admin.getEmail(), ex.getMessage(), ex);
            try {
                sendTemporaryPasswordEmailDirect(admin.getEmail(), admin.getName(), temporaryPassword);
                admin.setTemporaryPasswordNotifiedAt(Instant.now());
                adminRepository.save(admin);
            } catch (Exception directEx) {
                log.error("Fallback direct email send failed for admin {}: {}", admin.getEmail(), directEx.getMessage(), directEx);
            }
        }
    }

    private void sendTemporaryPasswordEmailDirect(String recipientEmail, String recipientName, String temporaryPassword) throws Exception {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
        if (StringUtils.hasText(mailFrom)) {
            helper.setFrom(mailFrom.trim());
        }
        helper.setTo(recipientEmail);
        helper.setSubject("SIGASe | Tu contraseña temporal");
        helper.setText(
                """
                        Hola %s,

                        Tu cuenta administrativa en SIGASe fue creada o restablecida.

                        Contraseña temporal: %s

                        Por seguridad, ingresa al sistema y cambia tu contraseña cuando puedas.

                        Equipo SIGASe
                        """.formatted(recipientName, temporaryPassword),
                """
                        <!doctype html>
                        <html lang="es">
                          <body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
                            <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;">
                              <h1 style="margin:0 0 12px 0;font-size:22px;">Tu acceso administrativo en SIGASe</h1>
                              <p style="margin:0 0 16px 0;line-height:1.6;">Hola %s,</p>
                              <p style="margin:0 0 16px 0;line-height:1.6;">Tu cuenta administrativa fue creada o restablecida.</p>
                              <div style="padding:14px 16px;background:#eff6ff;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:0.03em;">%s</div>
                              <p style="margin:16px 0 0 0;line-height:1.6;font-size:13px;color:#6b7280;">Ingresa al sistema y cambia tu contraseña cuando puedas.</p>
                            </div>
                          </body>
                        </html>
                        """.formatted(recipientName, temporaryPassword)
        );
        mailSender.send(message);
    }

    private Sort buildSort(String sortBy, String sortDir) {
        String safeSortBy = StringUtils.hasText(sortBy) ? sortBy.trim() : "createdAt";
        if (!ALLOWED_SORT_FIELDS.contains(safeSortBy)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "sortBy no permitido.");
        }
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(direction, safeSortBy);
    }

    private Admin findByIdOrThrow(UUID adminId) {
        return adminRepository.findById(adminId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Administrador no encontrado."));
    }
}
