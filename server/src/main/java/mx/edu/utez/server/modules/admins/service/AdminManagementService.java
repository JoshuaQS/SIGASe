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
import mx.edu.utez.server.shared.api.PageResponse;
import mx.edu.utez.server.shared.enums.AdminRole;
import mx.edu.utez.server.shared.enums.AuditOutcome;
import mx.edu.utez.server.shared.exception.BusinessException;
import mx.edu.utez.server.shared.exception.ErrorCode;
import mx.edu.utez.server.shared.util.EmailNormalizer;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class AdminManagementService {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "createdAt", "updatedAt", "email", "name", "lastNamePaternal", "lastNameMaternal", "role", "active", "lastLoginAt"
    );

    private final AdminRepository adminRepository;
    private final AdminMapper adminMapper;
    private final EmailNormalizer emailNormalizer;
    private final PasswordEncoder passwordEncoder;
    private final AuditTrailService auditTrailService;

    public AdminManagementService(
            AdminRepository adminRepository,
            AdminMapper adminMapper,
            EmailNormalizer emailNormalizer,
            PasswordEncoder passwordEncoder,
            AuditTrailService auditTrailService
    ) {
        this.adminRepository = adminRepository;
        this.adminMapper = adminMapper;
        this.emailNormalizer = emailNormalizer;
        this.passwordEncoder = passwordEncoder;
        this.auditTrailService = auditTrailService;
    }

    @Transactional
    public AdminResponse create(CreateAdminRequest request, Admin actorAdmin, HttpServletRequest httpRequest) {
        String normalizedEmail = emailNormalizer.normalize(request.email());
        if (adminRepository.existsByEmail(normalizedEmail)) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "El correo administrador ya existe.");
        }

        Admin admin = new Admin();
        admin.setEmail(normalizedEmail);
        admin.setName(request.name().trim());
        admin.setLastNamePaternal(request.lastNamePaternal().trim());
        admin.setLastNameMaternal(trimToNull(request.lastNameMaternal()));
        admin.setPasswordHash(passwordEncoder.encode(request.password()));
        admin.setRole(request.role());
        admin.setActive(request.active());

        Admin saved = adminRepository.save(admin);
        auditTrailService.auditAdminAction(
                actorAdmin,
                "ADMIN_CREATE",
                "ADMIN",
                saved.getId().toString(),
                AuditOutcome.SUCCESS,
                Map.of("email", saved.getEmail(), "role", saved.getRole().name(), "active", saved.isActive()),
                httpRequest
        );
        return adminMapper.toResponse(saved);
    }

    @Transactional
    public AdminResponse update(UUID adminId, UpdateAdminRequest request, Admin actorAdmin, HttpServletRequest httpRequest) {
        Admin admin = findByIdOrThrow(adminId);
        String normalizedEmail = emailNormalizer.normalize(request.email());
        if (adminRepository.existsByEmailAndIdNot(normalizedEmail, adminId)) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "El correo administrador ya está en uso.");
        }

        admin.setEmail(normalizedEmail);
        admin.setName(request.name().trim());
        admin.setLastNamePaternal(request.lastNamePaternal().trim());
        admin.setLastNameMaternal(trimToNull(request.lastNameMaternal()));
        admin.setRole(request.role());

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
    }

    @Transactional(readOnly = true)
    public AdminResponse getById(UUID adminId, Admin actorAdmin, HttpServletRequest httpRequest) {
        Admin admin = findByIdOrThrow(adminId);
        return adminMapper.toResponse(admin);
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminResponse> list(
            String q,
            Boolean active,
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
        Specification<Admin> spec = buildSpecification(q, active, role);
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
        if (admin.isActive()) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "El administrador ya está activo.");
        }
        admin.setActive(true);
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
        if (actorAdmin.getId().equals(adminId)) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "No puedes desactivarte a ti mismo.");
        }
        Admin admin = findByIdOrThrow(adminId);
        if (!admin.isActive()) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "El administrador ya está inactivo.");
        }

        admin.setActive(false);
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
        admin.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        admin.setFailedLoginAttempts(0);
        admin.setLockedUntil(null);
        adminRepository.save(admin);

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

    private Specification<Admin> buildSpecification(String q, Boolean active, AdminRole role) {
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
            if (active != null) {
                predicate = cb.and(predicate, cb.equal(root.get("active"), active));
            }
            if (role != null) {
                predicate = cb.and(predicate, cb.equal(root.get("role"), role));
            }
            return predicate;
        };
    }

    private String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
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
